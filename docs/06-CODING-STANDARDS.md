# 06 — Coding Standards

Short, opinionated rules. Anything not covered here defaults to whatever Prettier
+ ESLint say.

## SOLID — applied

| Principle | How it shows up |
|---|---|
| **S**ingle Responsibility | One file = one thing. A React component renders, a service orchestrates, a repository talks to the DB. No god-files. |
| **O**pen/Closed | New challenge types, new metrics, new chart kinds are added by *creating* a new file (a Strategy, a chart variant) — never by editing a `switch` in core code. |
| **L**iskov Substitution | All `ChallengeStrategy` subclasses must be safely interchangeable. Anything that looks at "is this fitness?" is a smell — ask the strategy. |
| **I**nterface Segregation | Ports are small (`IChallengeRepo` has *only* what challenge-related services need; `IStatsRepo` is separate). |
| **D**ependency Inversion | Services depend on `IXxxRepo`, not on Drizzle. Drizzle implementations are wired up in the composition root (`server/composition.ts`). |

## DRY — applied

- All input validation goes through Zod schemas in `features/<area>/schemas.ts`.
  The same schema validates the form (RHF) **and** the server action input.
- `BaseChallengeStrategy` provides default `decideWinner` / `renderSummary` so each
  concrete strategy only overrides what differs.
- A single `lib/db-result.ts` wraps Drizzle errors into `{ ok, data | error }` so
  every action handles errors the same way.
- A single `lib/format.ts` for date / number / unit formatting (no inline
  `new Date(...).toLocaleDateString(...)`).

## The Factory + Strategy pattern, concretely

```ts
// src/features/challenges/strategy.ts
import type { z } from 'zod';

export interface MetricSpec {
  metric: string;       // 'weight_kg'
  unit: string;         // 'kg'
  direction: 'higher' | 'lower';
  label: string;
}

export interface ChallengeStrategy {
  readonly key: string;                       // 'fitness'
  readonly label: string;                     // 'Fitness'
  readonly icon: string;                      // lucide name
  readonly metrics: MetricSpec[];
  readonly challengeSchema: z.ZodTypeAny;     // for the create-challenge form (goal, dates, type-specific metadata)
  readonly statSchema: z.ZodTypeAny;          // for the stat-entry form (one numeric reading)

  computeScore(input: ScoreInput): number;            // higher = better progress
  decideWinner(input: WinnerInput): WinnerResult;     // { winnerId | tie }
  renderSummary(c: ChallengeWithStats): React.ReactNode;
}

// src/features/challenges/strategies/_base.ts
export abstract class BaseChallengeStrategy implements ChallengeStrategy {
  abstract readonly key: string;
  abstract readonly label: string;
  abstract readonly icon: string;
  abstract readonly metrics: MetricSpec[];
  abstract readonly statSchema: z.ZodTypeAny;

  abstract computeScore(input: ScoreInput): number;

  decideWinner(input: WinnerInput): WinnerResult {
    // sensible default: highest score wins, ties allowed
    const scores = input.participants.map(p => ({ id: p.id, s: this.computeScore(p) }));
    scores.sort((a,b) => b.s - a.s);
    if (scores.length >= 2 && scores[0].s === scores[1].s) return { tie: true };
    return { winnerId: scores[0].id, tie: false };
  }

  renderSummary(c: ChallengeWithStats): React.ReactNode {
    return <DefaultSummary challenge={c} />;
  }
}

// src/features/challenges/strategies/fitness.ts
export class FitnessStrategy extends BaseChallengeStrategy {
  key = 'fitness';
  label = 'Fitness';
  icon = 'dumbbell';
  metrics: MetricSpec[] = [
    { metric: 'weight_kg',    unit: 'kg',     direction: 'lower',  label: 'Weight' },
    { metric: 'body_fat_pct', unit: '%',      direction: 'lower',  label: 'Body fat' },
    { metric: 'workouts',     unit: 'count',  direction: 'higher', label: 'Workouts' },
    { metric: 'steps',        unit: 'steps',  direction: 'higher', label: 'Steps' },
  ];

  // Used by the *create-challenge* form.
  challengeSchema = z.object({
    title: z.string().min(1).max(120),
    description: z.string().max(2000).optional(),
    goalMetric: z.enum(['weight_kg','body_fat_pct','workouts','steps']),
    goalTarget: z.number().positive(),
    goalDirection: z.enum(['higher','lower']),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  }).refine(d => d.endDate >= d.startDate, { message: 'End date must be ≥ start date', path: ['endDate'] });

  // Used by the *stat-entry* form.
  statSchema = z.object({
    metric: z.enum(['weight_kg','body_fat_pct','workouts','steps']),
    value: z.number().positive(),
    note: z.string().max(280).optional(),
    photo: z.instanceof(File).optional(),
  });

  computeScore({ entries, baseline, goal }: ScoreInput) {
    // % progress toward the headline goal
    const latest = lastValueOf(entries, goal.metric);
    if (latest == null) return 0;
    const delta = goal.direction === 'lower' ? baseline - latest : latest - baseline;
    return Math.max(0, Math.min(1, delta / goal.target));
  }
}

// src/features/challenges/factory.ts  — *just* the registry; no concrete strategies imported here.
class ChallengeTypeFactoryImpl {
  private map = new Map<string, ChallengeStrategy>();
  register(s: ChallengeStrategy) { this.map.set(s.key, s); }
  get(key: string) {
    const s = this.map.get(key);
    if (!s) throw new Error(`Unknown challenge type: ${key}`);
    return s;
  }
  list() { return [...this.map.values()]; }
}
export const ChallengeTypeFactory = new ChallengeTypeFactoryImpl();

// src/server/composition.ts  — the composition root: where everything is wired up.
import { ChallengeTypeFactory } from '@/features/challenges/factory';
import { FitnessStrategy } from '@/features/challenges/strategies/fitness';
// import { CookingStrategy } from '@/features/challenges/strategies/cooking'; // when added
ChallengeTypeFactory.register(new FitnessStrategy());

import { challengeRepo } from '@/features/challenges/repo';
import { makeChallengeService } from '@/features/challenges/service';
export const challengeService = makeChallengeService(challengeRepo);
```

Why this matters: `factory.ts` no longer imports any concrete strategy. Adding a
new type means (a) creating one new strategy file, (b) adding one `register(...)`
line in `composition.ts`. That's the only place that knows the full list — every
other file iterates the factory.

## Repository pattern (DIP)

```ts
// src/domain/ports.ts
export interface IChallengeRepo {
  findById(id: string): Promise<Challenge | null>;
  findActiveForUser(userId: string): Promise<Challenge[]>;
  create(input: CreateChallengeInput): Promise<Challenge>;
  declareWinner(id: string, winnerId: string | null): Promise<void>;
}

// src/features/challenges/repo.ts (infrastructure)
export const challengeRepo: IChallengeRepo = {
  async findById(id) { /* drizzle query */ },
  async findActiveForUser(userId) { /* … */ },
  async create(input) { /* … */ },
  async declareWinner(id, winnerId) { /* … */ },
};

// src/features/challenges/service.ts (application)
export function makeChallengeService(repo: IChallengeRepo) {
  return {
    async create(userId: string, input: CreateChallengeInput) {
      const strategy = ChallengeTypeFactory.get(input.typeKey);
      const parsed = strategy.challengeSchema.parse(input); // <- challengeSchema, not statSchema
      // … validation, defaults …
      return repo.create({ ...parsed, typeKey: input.typeKey, createdBy: userId });
    },
    /* … */
  };
}
```

(Composition root is in `src/server/composition.ts` — see the previous code block.)
This makes services trivially unit-testable — pass in a fake repo.

### Scope of the Repository pattern

We use the port-and-adapter (DIP) pattern **only** where we'll actually unit-test
or swap implementations:

- `IChallengeRepo`, `IStatsRepo` — the strategy/service layer is the heart of the
  domain logic and it gets fakes in tests. Keep these.
- For tiny CRUD (`profiles`, future `comments`) — call Drizzle directly from a
  Server Action. Wrapping these in interfaces is overhead with no payoff.

The rule: if a function will be called from a unit test with a fake, give it a
port. Otherwise, just call Drizzle.

## File / folder conventions

- `kebab-case` for files (`challenge-card.tsx`).
- `PascalCase` for React components and TypeScript classes/interfaces.
- `camelCase` for variables, functions, hooks.
- Hooks live in `src/hooks/` and are prefixed `use*`.
- A feature folder is the *only* place imports from another feature happen via
  its public `index.ts` barrel — *not* deep imports across feature boundaries.

## Server vs client component rules

- Default to a Server Component (no `'use client'`).
- Add `'use client'` *only* when you need state, effects, or browser APIs.
- Server Actions: top of file `'use server'`, one action per export, always
  `await getUser()` first.
- Never import from `@/server/...` in a file that has `'use client'`. ESLint
  will block this with a `no-restricted-imports` rule.

## Testing

- **Unit (Vitest):** every strategy's `computeScore` and `decideWinner`. Pure
  functions, fast tests. Aim for ~100% on the strategy layer.
- **Integration:** services with an in-memory fake repo (LSP test: fake repo
  must satisfy the same interface contract).
- **RLS integration test:** start a local Supabase (`supabase start`), connect
  with a test user's JWT, and assert each policy denies what it should
  (a stranger profile cannot read your stats, etc.). This catches the most
  dangerous regressions.
- **No Playwright** in v1 (ADR-013).
- Run on every PR via GitHub Actions.

## Linting & formatting

```jsonc
// .eslintrc.json (excerpt)
{
  "extends": ["next/core-web-vitals", "@typescript-eslint/strict"],
  "rules": {
    "no-restricted-imports": ["error", {
      "patterns": [
        { "group": ["@/server/*"], "message": "Server-only modules cannot be imported from client code." }
      ]
    }],
    "@typescript-eslint/consistent-type-imports": "error"
  }
}
```

CI runs `eslint` and `prettier --check` on every PR. We deliberately don't use
Husky / lint-staged in v1 (ADR-014) — the formatter only runs in CI, which is
fine for two contributors.

## Commits

Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`,
`ci:`. Optional but lets us auto-generate a changelog later.

## Performance budgets (modest)

- Initial JS budget per route: **< 150 KB gzipped** (the shadcn/Tailwind/Recharts
  combo comfortably fits).
- LCP on a real phone, 4G: **< 2.5 s**.
- Images served from Supabase Storage via Next.js `<Image>` for automatic resizing.

## Accessibility

shadcn/ui components are accessible by default (Radix primitives). We:
- Always provide labels for inputs.
- Hit at least WCAG AA on contrast (Tailwind v4's `oklch` palette helps).
- Make every action reachable by keyboard.
