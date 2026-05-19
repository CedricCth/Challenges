# 05 — Design Decisions (ADRs)

These are short Architecture Decision Records — the *why* behind the calls in
`02-TECH-STACK.md` and `03-ARCHITECTURE.md`. Each one is dated; if we revisit a
choice later, we'll add a follow-up ADR rather than rewriting history.

> Format: `# ADR-NNN — title` · *Status* · *Context* → *Decision* → *Consequences* → *Alternatives*

---

## ADR-001 — Use Next.js 16 (App Router) on Vercel
**Date:** 2026-05-10 · **Status:** Accepted

**Context.** We need an authenticated, server-rendered web app for two people, ideally
free to host. Picking the framework also picks the deployment story.

**Decision.** Next.js 16 with the App Router (Server Components + Server Actions),
hosted on Vercel Hobby tier. As of Next.js 16, Turbopack is **stable for both dev
and production builds** and is the default — 2–5× faster builds with zero config.
Custom Webpack configs are no longer required (and a build will fail loudly if one
is detected, which is what we want).

**Consequences.**
- Best-in-class Next.js DX (built by Vercel).
- Free for personal/non-commercial usage.
- Per-PR preview deployments are automatic.
- Lock-in to React/Vercel idioms; *minor* migration cost if we ever leave.

**Alternatives considered.** SvelteKit (smaller bundles, smaller ecosystem),
Remix / React Router 7 (great loaders, less polished hosting), Cloudflare Pages
+ Next.js (cheaper at scale, but Cloudflare's Next.js adapter still has edge
cases on App Router features).

---

## ADR-002 — Use Supabase as the BaaS (Postgres + Auth + Storage)
**Date:** 2026-05-10 · **Status:** Accepted

**Context.** We want a relational store for challenges/stats, login, optional photo
uploads, and a generous free tier.

**Decision.** Supabase Free tier — Postgres + Auth + Storage in one platform.

**Consequences.**
- Real SQL, joins, JSONB.
- Row-Level Security replaces a lot of authorisation code in the app.
- Open-source means we can self-host or migrate to vanilla Postgres if needed.
- One project pause risk: free DB pauses after 7 idle days. Mitigated by an
  external uptime ping.

**Alternatives.** Firebase (NoSQL + daily caps + harder relational queries),
Convex (lovely DX, but smaller community and no SQL), Neon + Auth.js (more moving
parts; we'd have to wire auth+DB+storage ourselves).

---

## ADR-003 — Disable public sign-up; seed two accounts
**Date:** 2026-05-10 · **Status:** Accepted

**Context.** Only two humans should ever be able to sign in.

**Decision.** Turn off Supabase's "Enable signups" setting, never expose a `/signup`
route, and create two users by hand from the Supabase dashboard. A Postgres trigger
auto-creates the matching `profiles` row.

**Consequences.** No accidental account creation; recovery is via Supabase's
password reset email.

**Alternative.** Email allow-list policy on signups. Slightly more flexible but adds
code; we don't need that flexibility.

---

## ADR-004 — Defence in depth: middleware + page guard + RLS
**Date:** 2026-05-10 · **Status:** Accepted

**Context.** Supabase's official guidance is to *never trust middleware alone* —
`getSession()` can be spoofed, `getUser()` must be used, and even then a buggy
query can leak data.

**Decision.** Auth check at three layers:
1. **Middleware** calls `supabase.auth.getUser()` and refreshes the cookie.
2. Every server action / Server Component re-calls `getUser()` before doing work.
3. **Postgres RLS** filters every read/write at the DB level.

**Consequences.** A bug at any one layer can't leak data. Slightly more code, but
each guard is one helper function call.

---

## ADR-005 — Drizzle ORM (not Prisma)
**Date:** 2026-05-10 · **Status:** Accepted

**Context.** We want type-safe DB access in a serverless environment.

**Decision.** Drizzle.

**Consequences.**
- Schema is pure TypeScript (no extra DSL).
- Tiny runtime, fast cold starts on Vercel.
- No `prisma generate` step in the dev loop or CI.

**Alternatives.** Prisma (heavier, codegen step, larger client). Knex / raw SQL
(no types).

---

## ADR-006 — Factory + Strategy for challenge types
**Date:** 2026-05-10 · **Status:** Accepted

**Context.** New challenge types ("cooking", "reading", "monthly steps") are
expected. They differ in metrics, scoring rules, and form fields.

**Decision.** Each type is a class implementing a `ChallengeStrategy` interface
(metrics, Zod schema, `computeScore`, `decideWinner`, `renderSummary`). A
`ChallengeTypeFactory` registry maps the `type_key` column to a strategy. Adding
a type = one new file + one factory registration + one seed row.

**Consequences.** OCP-friendly (open for extension, closed for modification). DRY
(common logic lives in `BaseChallengeStrategy`). Adds a small indirection but
avoids `if (type === 'fitness') ...` ladders everywhere.

**Alternatives.** A switch-statement service. Works for 2 types, gets ugly fast.

See `06-CODING-STANDARDS.md` for the interface and a worked example.

---

## ADR-007 — Repository pattern via interfaces (DIP)
**Date:** 2026-05-10 · **Status:** Accepted

**Context.** We want to unit-test the domain/strategy layer without booting a DB.

**Decision.** Domain layer declares ports (`IChallengeRepo`, `IStatsRepo`).
Drizzle implementations live in the infrastructure layer. Services receive a
repo via dependency injection (just a function arg / module-level
factory in TS — no IoC container needed).

**Consequences.** Strategies and services can be tested with in-memory fakes.

**Trade-off.** Slightly more boilerplate than calling Drizzle directly. Worth it
because the strategies are where most of the *logic* lives and we want to test
them.

---

## ADR-008 — Server-first, client-light state model
**Date:** 2026-05-10 · **Status:** Accepted

**Context.** Modern Next.js can render most lists and details on the server with
zero client-side data fetching code. For two users with simple needs, adding a
client-side cache library is overhead.

**Decision.** Default to Server Components for reads. Use **Server Actions** for
mutations + `revalidatePath` for cache busting. **No** TanStack Query and **no**
Zustand in v1. UI state (drawer open, etc.) uses `useState`; theme uses
`next-themes`. Reintroduce a server-state library only when a feature genuinely
needs optimistic updates / infinite scroll / cross-tab sync.

**Consequences.** Tiny client bundle, fewer "loading…" spinners, simpler mental
model. Less library churn to upgrade.

---

## ADR-009 — shadcn/ui over a packaged component library
**Date:** 2026-05-10 · **Status:** Accepted

**Context.** We want a beautiful UI without painting every pixel.

**Decision.** shadcn/ui (Radix primitives + Tailwind, copied into our repo).

**Consequences.** We *own* the component code, no upgrade hell, easy to theme.
Recharts comes for free via shadcn's chart module.

**Alternatives.** MUI, Mantine, Chakra (heavier bundles, harder to customise),
HeadlessUI alone (more wiring).

---

## ADR-010 — Vercel Hobby for hosting
**Date:** 2026-05-10 · **Status:** Accepted

**Context.** This is a personal app for two people; needs to be free.

**Decision.** Vercel Hobby. Vercel's terms allow non-commercial personal use; this
is a private app for a couple, no monetisation. Limits: 100 GB bandwidth, 1M
function invocations, 4 h CPU/mo — far above what two people will hit.

**Consequences.** If the project ever becomes commercial we'd need to upgrade or
migrate.

**Alternatives.** Cloudflare Pages (cheaper at scale; but its Next.js adapter
still trails Vercel for the latest App Router features). Netlify (fine, but
worse Next.js support than Vercel).

---

## ADR-011 — Prevent free-tier DB pause with an external ping
**Date:** 2026-05-10 · **Status:** Accepted

**Context.** Supabase Free pauses projects after 7 idle days. Wake-up takes ~30 s.

**Decision.** Ship a `/api/health` route. Recommend the user set up a free
UptimeRobot monitor pinging it every 6 hours.

**Consequences.** Avoids the pause without paying. UptimeRobot is free for 50
monitors at 5-minute intervals.

---

## ADR-012 — Use the new Supabase API keys (`sb_publishable_*` / `sb_secret_*`)
**Date:** 2026-05-10 · **Status:** Accepted

**Context.** Supabase has migrated away from the legacy `anon` / `service_role`
key naming. The legacy keys keep working through end of 2026 but new projects
should use the new format.

**Decision.** Generate new-style keys when the project is created. Use
`sb_publishable_*` in the browser; `sb_secret_*` only on the server (and
absolutely never shipped to a client component).

---

## ADR-013 — Vitest for unit tests; no E2E in v1
**Date:** 2026-05-10 · **Status:** Accepted

**Context.** We want fast feedback and high confidence in the strategy layer
without paying maintenance tax on a Playwright suite.

**Decision.** Vitest for strategies, services, utils, and a **policy-coverage
integration test** that asserts each RLS policy denies what it should. **No
Playwright** — for two users, broken login is noticed in seconds; not worth
the maintenance.

**Consequences.** CI stays under a minute. RLS tests catch the most dangerous
class of regressions (auth/authorization).

---

## ADR-014 — Cut what we don't need yet
**Date:** 2026-05-10 · **Status:** Accepted

**Context.** A first-pass plan accumulates "nice to have" libraries and tables
that are speculative for a 2-user app.

**Decision.** v1 explicitly drops:
- TanStack Query, Zustand (see ADR-008).
- Husky / lint-staged / commitlint / Conventional Commits (CI is the gate).
- Playwright (see ADR-013).
- A separate `comments` table (defer until we want it; mirror the existing RLS
  shape when we add it).
- MDX (the About Us page is plain TSX with `<Image>`).
- A separate dev/prod Supabase project (one project + idempotent seed for now).
- A `pnpm db:dump` backup script (Supabase nightly backup is enough at this
  size).

**Consequences.** Smaller surface area to maintain, a faster build, fewer
dependencies to keep current. Each cut item has a clear "add it back when X"
trigger written down.

---

## ADR-015 — Pinned env-var names
**Date:** 2026-05-10 · **Status:** Accepted

**Context.** Three docs referenced Supabase keys with slightly different names,
which would lead to drift the moment Claude Code generates code.

**Decision.** The canonical names are `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_DB_URL`.
Documented in `02-TECH-STACK.md`. Every other doc references that table rather
than restating names.

---

## ADR-016 — Photo handling: client-side resize + EXIF strip
**Date:** 2026-05-10 · **Status:** Accepted

**Context.** Phone JPEGs are 4–12 MB and carry GPS in EXIF. We don't want to
either burn Storage quota or accidentally leak location data.

**Decision.** Resize and re-encode in the browser via `createImageBitmap` +
`<canvas>` before upload (longest side ≤ 1600 px, JPEG quality 0.82, target
≤ 1 MB). Canvas re-encoding strips EXIF for free. Server validates MIME on the
upload server action.

**Consequences.** No extra deps (`sharp` would have been the alternative).
Trade-off: very old browsers without `createImageBitmap` get a fallback that
uploads the original — acceptable for a 2-user app on modern phones.

---

## ADR-017 — Timezone: store UTC, render in viewer's TZ
**Date:** 2026-05-10 · **Status:** Accepted

**Decision.** All timestamps are `timestamptz` (UTC). Date grouping ("today",
"this week", chart axis labels) uses `Intl.DateTimeFormat` with the browser's
TZ. A single `lib/format.ts` helper does the conversion; nothing else inlines
date logic.

**Why now:** the user is between two countries until the next visit; same wall
date in different TZs would otherwise show two separate points on the chart.

---

## ADR-018 — Generic edit via the existing Factory/Strategy/Port
**Date:** 2026-05-19 · **Status:** Accepted

**Context.** Cedi asked for an **edit** option on stat entries, but explicitly
required it to be generic across all challenge types and easily extensible
when new types are added. Two shapes were on the table:

1. **Per-type edit handlers** — each `XxxStrategy` exposes its own
   `editEntry`/`schema`/UI. Reads as "every type owns its CRUD". Implies
   touching every strategy file when the CRUD surface changes.
2. **Generic edit via the existing pipeline** — extend the `IStatsRepo`
   port with `update` + `findOwned`, add a sibling `service.update` that
   re-uses the strategy's existing `statSchema`, and inject the same form
   component with a different action prop.

**Decision.** Shape **(2)**. The Factory + Strategy split (ADR-006) plus the
DIP port (ADR-007) were designed exactly for this case: type-specific
knowledge stays in the strategy (`metrics`, `statSchema`), and verbs
(add/update/list/delete) are generic functions over a port. Adding a future
challenge type still requires only:

  1. write `strategies/<type>.ts`,
  2. register it in `composition.ts`,
  3. insert a row into `public.challenge_types`.

It now lights up **add + edit + list + chart + leaderboard** without any
other file changing. The `src/features/challenges/strategies/` folder is
untouched by this ADR's implementation — that is the OCP proof.

**Consequences.**
- One generic `StatsForm` covers both create and edit; the page route
  injects the right server action. A test can unit-test `service.update`
  with a fake `IStatsRepo`, exercising the DIP seam.
- Ownership is enforced at three layers: page-level `findOwnedEntry`
  returns `null` for foreign rows (URL-tampering → 404), the repo's
  `update` filters on `profile_id`, and the `stats update own` RLS policy
  is the last line of defence. See ADR-004 (defence in depth).
- Photo edits are explicit (`keep | replace | remove`) via a hidden form
  field. The action cleans up the old storage object only after the DB
  write succeeds; on Zod failure or non-owner result we roll back the
  freshly uploaded object so we don't leak orphans.
- The form became the first client component to import server actions
  *as props* rather than statically. That stays compatible with Next.js'
  server-action serialisation because both `addStatEntry` and
  `editStatEntry` are exported from the same `"use server"` module.

**Alternatives considered.** Inline an "edit" mode toggle on the list row
(no dedicated page) — rejected because the form already has photo, date,
and a `<select>` that don't fit a row's footprint. Keep delete-and-recreate
as the only edit path — rejected because it would re-issue notifications
and reset `recordedAt`.
