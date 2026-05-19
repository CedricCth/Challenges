# 07 — Project Plan (phased)

This is the build order for Claude Code. Each phase ends in something demoable.
Estimates assume Claude Code is doing the heavy lifting and you do the manual
account / signup steps from `08-SETUP-GUIDE.md` in parallel.

| Phase | Output | Approx duration (Claude Code time) |
|---|---|---|
| 0 | Manual prerequisites done by **you** (GitHub, Supabase, Vercel) | 30–45 min |
| 1 | Repo scaffold, tooling, CI green, "Hello World" deployed to Vercel preview | 30 min |
| 2 | Auth: middleware + login + password-reset flow, both users seeded | 45 min |
| 3 | Database schema + migrations + RLS policies + Storage policies + seed | 30 min |
| 4 | Domain layer: ports, entities, FitnessStrategy + factory + composition root + Vitest tests | 45 min |
| 5 | Challenges feature: list / detail / create / edit / declare winner | 1 h |
| 6 | Stats feature: add stat, chart, photo upload with client-side resize / EXIF strip | 1 h |
| 7 | Dashboard, leaderboard, About Us (plain TSX), settings | 45 min |
| 8 | Polish: empty states, loading skeletons, error boundary, mobile QA, soft-delete confirms | 45 min |
| 9 | Add **one** more strategy (Reading) end-to-end as the extensibility proof | 20 min |
| 10 | Health route (DB-touching), repo README, hand-off | 20 min |

Total: roughly **6–8 hours of Claude Code time**, spread across however many
sessions you want.

---

## Phase 0 — Manual prerequisites (you do these, see `08-SETUP-GUIDE.md`)

- Create GitHub account / repo.
- Create Supabase project + dev project.
- Create Vercel account, link the repo.
- Generate keys, store them in Vercel env vars.

## Phase 1 — Scaffold

```bash
# Install Next.js 16 if available; otherwise the create-next-app CLI grabs latest
# stable 15.x (note in 02-TECH-STACK.md).
pnpm create next-app@latest couples-challenges \
  --ts --eslint --tailwind --app --src-dir --import-alias "@/*" --use-pnpm
cd couples-challenges
pnpm dlx shadcn@latest init
pnpm add @supabase/ssr @supabase/supabase-js drizzle-orm zod \
         react-hook-form @hookform/resolvers \
         lucide-react recharts next-themes
pnpm add -D drizzle-kit vitest @testing-library/react @types/node \
            prettier prettier-plugin-tailwindcss
```

- Configure `tsconfig.json` strict.
- Add `.eslintrc.json` (see coding-standards) — including the `no-restricted-imports`
  rule for `@/server/*`.
- Add minimal GitHub Actions workflow (`lint`, `typecheck`, `test`, `build`).
- Push, link to Vercel, confirm preview deploys.

**Acceptance:** `pnpm dev` runs locally, Vercel preview URL shows the Next.js
welcome page, GitHub Actions is green.

## Phase 2 — Authentication

- `src/server/auth/server.ts`, `browser.ts`, `middleware.ts` clients per Supabase
  SSR docs (using `@supabase/ssr` — `auth-helpers-*` is deprecated since 2024).
- `src/middleware.ts` calls `getUser()` (never `getSession()`) and refreshes the
  cookie. Public paths: `/`, `/login`, `/auth/*`, `/api/health`. Everything
  else requires a user.
- `app/(public)/login/page.tsx` with email + password form (RHF + Zod).
- Server action `signInWithPassword`.
- **Password reset flow** (Supabase emails a magic link with a code):
  - `app/(public)/login/page.tsx` has a "Forgot password?" link calling
    `supabase.auth.resetPasswordForEmail(email, { redirectTo: <site>/auth/callback?next=/auth/update-password })`.
  - `app/(public)/auth/callback/route.ts` exchanges the code for a session and
    redirects to `next`.
  - `app/(authed)/auth/update-password/page.tsx` lets the (now-authenticated) user
    set a new password.
- `app/(public)/page.tsx` landing → "Log in" CTA.
- `app/(authed)/layout.tsx` wraps gated pages and shows nav with "Log out".
- Disable signups in Supabase dashboard.
- Manually create the two users in Supabase Auth.

**Acceptance:** logging in lands on `/dashboard`; logging out returns to `/login`;
"Forgot password?" sends an email and the link lets you set a new password; the
app refuses access to gated routes when not logged in.

## Phase 3 — Database

- `src/server/db/schema.ts` — Drizzle schema for every table in `04`.
- `drizzle.config.ts`.
- `pnpm db:generate` then `pnpm db:migrate` against the dev project.
- Apply RLS SQL from `04-DATABASE-SCHEMA.md` (run from Supabase SQL editor or
  ship as a `migrations/0001_rls.sql`).
- Trigger to auto-create `profiles` row when a `auth.users` row is created.
- Seed `challenge_types`.

**Acceptance:** Drizzle types are generated, the dev DB has all tables and seed
data, and RLS is on.

## Phase 4 — Domain layer + first strategy

- `src/domain/entities.ts`, `src/domain/ports.ts`.
- `src/features/challenges/strategy.ts` with the interface.
- `src/features/challenges/strategies/_base.ts` and `fitness.ts`.
- `src/features/challenges/factory.ts` with FitnessStrategy registered.
- Vitest tests for `FitnessStrategy.computeScore` and the factory.

**Acceptance:** `pnpm test` passes ≥ 6 strategy tests; importing
`ChallengeTypeFactory.get('fitness')` returns the right thing.

## Phase 5 — Challenges feature

- `repo.ts` (Drizzle queries), `service.ts`, `actions.ts` for create/edit/end/declare.
- Pages:
  - `app/(authed)/challenges/page.tsx` — list with filters and search.
  - `app/(authed)/challenges/new/page.tsx` — type picker (driven by the factory)
    + dynamic form (Zod schema from the strategy).
  - `app/(authed)/challenges/[id]/page.tsx` — detail view.
  - `app/(authed)/challenges/[id]/edit/page.tsx`.
- Components: `ChallengeCard`, `ChallengeForm`, `WinnerBadge`.
- "Declare winner" action with confirmation dialog and tie option.

**Acceptance:** Both of you can create a challenge, see it on the list, edit it,
and declare a winner. Works from a phone.

## Phase 6 — Stats feature

- `repo.ts`, `service.ts`, `actions.ts` for `addStatEntry`, `editStatEntry`
  (shipped 2026-05-19; see ADR-018), `deleteStatEntry`, optional photo upload
  (Supabase Storage bucket `stat-photos`, RLS policies from `04-DATABASE-SCHEMA.md`).
- `StatsForm` (RHF + Zod, schema from `strategy.statSchema`) — action-injected
  so the same component drives create + edit.
- **Photo handling — pinned approach (no improvising):**
  - **Client-side, in the browser** before upload, using `createImageBitmap` +
    `<canvas>` (no extra deps): resize so the longest side ≤ 1600 px, re-encode
    as JPEG quality 0.82, target ≤ 1 MB. This also strips EXIF (GPS, etc.) for
    free because canvas re-encoding drops it.
  - Validate MIME on the server action before forwarding to Storage; reject
    anything other than `image/jpeg | image/png | image/webp`.
  - Upload path: `stat-photos/<challenge_id>/<profile_id>/<uuid>.jpg`.
- `StatsChart` (Recharts: line chart, both participants, hover, units).
  - **Timezone:** store `recorded_at` as UTC (`timestamptz`); group/render in the
    *viewer's* local timezone using `Intl.DateTimeFormat`. Implement a
    `lib/format.ts` helper `formatLocalDay(utc: Date, tz?: string)` so we never
    inline `toLocaleDateString` in components.
- `MilestonesList` with checkboxes.

**Acceptance:** You can add a weight, see it as a point on the chart next to
Stefi's series, and (optionally) attach a photo of the scale that uploads in
under a second over 4G.

## Phase 7 — Dashboard, leaderboard, about us, settings

- `/dashboard`: hero card with active challenge, Stef-vs-Stefi score, quick stat
  add inline.
- `/leaderboard`: total wins, win rate, longest streak, biggest comeback.
  All computed in `services/scoring.ts`. **Definitions (pinned so Claude Code
  doesn't invent its own):**
  - **Total wins:** `count(challenges where winner_id = profile.id)`.
  - **Win rate:** `wins / completed_challenges_participated_in` (excluding ties
    and cancelled).
  - **Longest streak:** longest run of consecutive *completed* challenges (in
    `end_date` order) where the same person won. A tie breaks the streak.
  - **Biggest comeback:** challenge where the eventual winner had the lower
    `computeScore` at the chronological midpoint and still ended up winning.
- `/about-us`: a plain `app/(authed)/about-us/page.tsx` with two bios, two
  avatars, and an `<Image>`. No MDX dependency.
- `/settings`: edit display name, color, avatar.

**Acceptance:** The whole site is navigable, looks consistent, scores are
correct.

## Phase 8 — Polish

- Skeleton loaders on every async list.
- Empty states ("No challenges yet — start your first one").
- Global error boundary that posts to `/api/log-error`.
- **Soft-delete style confirmation** for destructive actions: deleting a challenge
  asks you to type the title; declaring a winner is also a typed-confirm because
  it's irreversible.
- Lighthouse mobile pass: ≥ 90 perf, ≥ 95 a11y.
- Dark mode toggle via `next-themes`.

## Phase 9 — Prove extensibility (one new strategy end-to-end)

- Add **`ReadingStrategy`** as the proof point. One new file, one new
  `register(...)` line in `composition.ts`, one new row in `challenge_types`.
- Confirm the create-challenge form picks it up automatically with no UI change.
- Smoke-test a "Most pages read in May" challenge end-to-end.
- Cooking / Steps / Custom are deferred to whenever you actually run them.

## Phase 10 — Health route, repo README, hand-off

- `app/api/health/route.ts` returning `{ ok: true, t: Date.now() }` **and
  performing a trivial DB query** (`select 1` via Drizzle). Without that DB
  hit, an external uptime ping keeps Vercel warm but lets the Supabase project
  sleep — exactly what we wanted to prevent.
- Repo `README.md` with run / deploy instructions and "How to add a new
  challenge type in 3 minutes."
- Show **you** how to set up an UptimeRobot ping (recipe in `08-SETUP-GUIDE.md`).

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Supabase free DB pauses after 7 days idle | UptimeRobot ping `/api/health` (which itself runs `select 1`) every 6 h |
| Vercel Hobby commercial-use clause | We're personal, non-commercial; if that ever changes, migrate to Cloudflare or pay $20/mo |
| Photo storage growth | Supabase Storage 1 GB free; client resizes to ≤ 1 MB and strips EXIF before upload |
| RLS misconfiguration leaks data | Defense in depth — middleware + page-level + RLS — plus a Vitest integration test against a local Supabase that asserts each policy denies what it should |
| Photos with GPS EXIF leaking | Client-side canvas re-encode strips EXIF before upload (Phase 6) |
| Free Supabase pause despite the ping | Health endpoint touches the DB. Verify in Supabase logs after 24 h |
| One person ends a challenge unilaterally | Declare-winner uses a typed-confirm dialog ("type the title to confirm"). Accepted as low-risk for two trusted users; could later require both confirmations |
| You hate the design after building | shadcn/ui is themeable in `globals.css`; swap palette in 5 minutes |
