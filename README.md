# Cedi vs Stefi — Challenges

A private, two-person web app for tracking friendly competitions: fitness,
reading, anything else you both want to compete on. Built so adding a new
challenge type is **one file**.

Production: <https://couple-challenges.vercel.app>

---

## Stack

- **Next.js 16** App Router (Server Components + Server Actions), TypeScript
  strict, Tailwind v4, shadcn/ui (Radix primitives), Recharts, RHF + Zod,
  next-themes.
- **Supabase** Postgres + Auth + Storage. **Drizzle** ORM. RLS on every
  table; storage policies for `stat-photos`.
- **Vercel** Hobby for hosting, **GitHub Actions** for CI
  (`lint + typecheck + test + build`).
- **pnpm** + Vitest. Free tier all the way down.

See [`docs/02-TECH-STACK.md`](docs/02-TECH-STACK.md) for the full rationale
and [`docs/05-DESIGN-DECISIONS.md`](docs/05-DESIGN-DECISIONS.md) for the ADRs.

---

## Run it locally

Prereqs: **Node 20.9+** (we use 24 LTS), **pnpm 11**, a Supabase project
and its keys.

```powershell
# 1. Install deps
pnpm install

# 2. Configure env
Copy-Item .env.example .env.local
# then edit .env.local and fill in:
#   NEXT_PUBLIC_SUPABASE_URL
#   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY    (sb_publishable_...)
#   SUPABASE_SECRET_KEY                     (sb_secret_..., server only)
#   SUPABASE_DB_URL                         (the TRANSACTION POOLER url, port 6543)

# 3. Run the DB migrations (creates tables, RLS, seed challenge types)
pnpm db:migrate

# 4. Dev server
pnpm dev
# → http://localhost:3000
```

Then create two users in **Supabase → Authentication → Users** (Auto Confirm
ticked), with display names set in their `raw_user_meta_data` like
`{ "display_name": "Cedi" }`. The Postgres trigger from migration 0001 fills
in their `profiles` row automatically.

### Common scripts

| Command | What |
|---|---|
| `pnpm dev` | Next.js dev server with Turbopack |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint (flat config) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest run |
| `pnpm db:generate` | Diff schema → new migration SQL |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:studio` | Drizzle Studio (web UI on local DB) |

---

## Deploy

1. **Vercel** → import the GitHub repo. Pick `couple-challenges` as the
   project name. Set **Framework Preset = Next.js** (or rely on the
   committed [`vercel.json`](vercel.json) which pins it).
2. Add env vars (Production + Preview):
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
   `SUPABASE_SECRET_KEY`, `SUPABASE_DB_URL`.
3. **Supabase** → Project Settings → Auth → **URL Configuration**: add the
   Vercel prod URL + `https://*.vercel.app` (or your wildcard preview
   pattern) as allowed redirect URLs, so the password-reset email link
   works on both environments.
4. Push to `main` → Vercel auto-deploys. The CI workflow in
   [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs lint +
   typecheck + test + build on every push.
5. **(Recommended)** Set up an UptimeRobot HTTP monitor on
   `https://<your-domain>/api/health` every 6 hours. The route runs a
   `select 1` against Postgres, which keeps the free-tier Supabase project
   from auto-pausing after 7 idle days
   ([ADR-011](docs/05-DESIGN-DECISIONS.md)).

---

## Add a new challenge type — in 3 minutes

This is the core extensibility win. Adding "Steps", "Cooking", "Sleep",
whatever, takes:

### 1. Write the strategy file

`src/features/challenges/strategies/<your-type>.ts`:

```ts
import { z } from "zod";
import type { MetricSpec, ScoreInput } from "@/domain/entities";
import { BaseChallengeStrategy } from "./_base";

const METRICS = ["steps", "active_minutes"] as const;

export class StepsStrategy extends BaseChallengeStrategy {
  readonly key = "steps";
  readonly label = "Steps";
  readonly icon = "footprints";          // any lucide icon name
  readonly metrics: MetricSpec[] = [
    { metric: "steps", unit: "steps", direction: "higher", label: "Steps" },
    { metric: "active_minutes", unit: "min", direction: "higher", label: "Active minutes" },
  ];

  readonly challengeSchema = z.object({
    title: z.string().min(1).max(120),
    description: z.string().max(2000).optional(),
    goalMetric: z.enum(METRICS),
    goalTarget: z.number().positive(),
    goalDirection: z.enum(["higher", "lower"]),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  }).refine((d) => d.endDate >= d.startDate, {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });

  readonly statSchema = z.object({
    metric: z.enum(METRICS),
    value: z.number().positive(),
    note: z.string().max(280).optional(),
  });

  computeScore({ entries, goal }: ScoreInput): number {
    if (goal.target <= 0) return 0;
    const total = entries
      .filter((e) => e.metric === goal.metric)
      .reduce((acc, e) => acc + e.value, 0);
    return Math.max(0, Math.min(1, total / goal.target));
  }
}
```

### 2. Register it in the composition root

`src/server/composition.ts`:

```diff
 import { FitnessStrategy } from "@/features/challenges/strategies/fitness";
 import { ReadingStrategy } from "@/features/challenges/strategies/reading";
+import { StepsStrategy } from "@/features/challenges/strategies/steps";

 if (ChallengeTypeFactory.list().length === 0) {
   ChallengeTypeFactory.register(new FitnessStrategy());
   ChallengeTypeFactory.register(new ReadingStrategy());
+  ChallengeTypeFactory.register(new StepsStrategy());
 }
```

### 3. Add the seed row

Generate a custom migration and insert one row:

```powershell
pnpm exec drizzle-kit generate --custom --name seed_steps
```

Then put this in the new SQL file:

```sql
insert into public.challenge_types (key, label, icon, default_metrics) values
  ('steps', 'Steps', 'footprints', $${
    "schema_version": 1,
    "metrics": [
      {"metric":"steps","unit":"steps","direction":"higher"},
      {"metric":"active_minutes","unit":"min","direction":"higher"}
    ]
  }$$::jsonb)
on conflict (key) do nothing;
```

Apply: `pnpm db:migrate`. Done. The type picker at `/challenges/new` will
show "Steps" automatically, the create + entry forms will use your Zod
schemas, scoring + winner picking come from your `computeScore` +
inherited `decideWinner`. **No other file changes.** That's [ADR-006] in
action.

[ADR-006]: docs/05-DESIGN-DECISIONS.md

---

## Project structure

```
src/
  app/                          # Next.js App Router (pages, layouts, route handlers)
    (public)/                   # landing + login + auth callback
    (authed)/                   # dashboard, challenges, news, leaderboard, settings, about-us
    api/                        # health, log-error
  features/                     # vertical slices, one folder per area
    auth/                       # login/reset/logout actions + components
    challenges/                 # repo, service, actions, schemas, strategies, factory, components
    stats/                      # repo, service, actions, components (form + chart + list)
    profiles/                   # repo, schema, actions, component (settings form)
    notifications/              # producer + repo + /news consumer
    leaderboard/                # pure computeLeaderboard() — six Vitest cases
  domain/                       # pure-TS entities + ports (no infrastructure imports)
  server/                       # server-only adapters
    auth/                       # Supabase SSR clients (server/middleware)
    db/                         # Drizzle client + schema + migrations
    composition.ts              # the only file that knows every concrete strategy
  components/                   # shadcn/ui copies + cross-cutting (theme toggle, skeleton)
  lib/                          # pure helpers (cn, format, image-resize, supabase browser client)
  middleware.ts                 # Next.js middleware (auth gate)
docs/                           # the plan, the why, the diagrams
```

See [`docs/03-ARCHITECTURE.md`](docs/03-ARCHITECTURE.md) for the layered
view and the dependency rules.

---

## Docs

| File | Purpose |
|------|---------|
| [`docs/01-PROJECT-OVERVIEW.md`](docs/01-PROJECT-OVERVIEW.md) | Goals, users, scope |
| [`docs/02-TECH-STACK.md`](docs/02-TECH-STACK.md) | Every library, why; rejected options |
| [`docs/03-ARCHITECTURE.md`](docs/03-ARCHITECTURE.md) | Layered architecture, request flow, defence-in-depth auth |
| [`docs/04-DATABASE-SCHEMA.md`](docs/04-DATABASE-SCHEMA.md) | Tables, RLS, storage policies |
| [`docs/05-DESIGN-DECISIONS.md`](docs/05-DESIGN-DECISIONS.md) | ADRs |
| [`docs/06-CODING-STANDARDS.md`](docs/06-CODING-STANDARDS.md) | SOLID, DRY, Factory, naming, testing |
| [`docs/07-PROJECT-PLAN.md`](docs/07-PROJECT-PLAN.md) | The phased build plan (now done) |
| [`docs/08-SETUP-GUIDE.md`](docs/08-SETUP-GUIDE.md) | Manual steps (GitHub / Supabase / Vercel) |
| [`docs/09-CLAUDE-CODE-HANDOFF.md`](docs/09-CLAUDE-CODE-HANDOFF.md) | Original handoff prompt |
| [`docs/10-FUTURE-EMAIL-NOTIFICATIONS.md`](docs/10-FUTURE-EMAIL-NOTIFICATIONS.md) | Producer/consumer pattern + how to add an email worker |

---

## Status

All v1 phases per [`docs/07-PROJECT-PLAN.md`](docs/07-PROJECT-PLAN.md) are
shipped. **31 Vitest tests pass.** Lighthouse perf/a11y pass left as a
manual task on the deployed URL.

Future work tracked in:
- [`docs/10-FUTURE-EMAIL-NOTIFICATIONS.md`](docs/10-FUTURE-EMAIL-NOTIFICATIONS.md) — email digest worker (in-app notifications are already wired up; this is the second consumer)
