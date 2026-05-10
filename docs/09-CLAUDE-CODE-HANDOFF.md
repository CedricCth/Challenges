# 09 — Claude Code Hand-off

Once you're happy with the plan and have done the manual prerequisites in
`08-SETUP-GUIDE.md`, paste the prompt below into Claude Code. It assumes
Claude Code can read every file in this folder.

---

## Prompt to paste

> I have a fully written plan in this folder for a private couples-challenge
> tracking web app. Please read it before doing anything:
>
> 1. Start by reading every file under `docs/` (overview, tech stack, architecture,
>    DB schema, design decisions, coding standards, project plan, setup guide).
>    The diagrams under `docs/diagrams/` are PNGs; treat the markdown next to them
>    as the source of truth.
> 2. Confirm you've understood by listing the phases from `docs/07-PROJECT-PLAN.md`
>    and the chosen tech stack from `docs/02-TECH-STACK.md`.
> 3. Then ask me for these prerequisites (I will paste them):
>    - GitHub repo URL.
>    - Supabase project URL + publishable key + secret key + DB connection string
>      (for both prod and dev if I created two).
>    - Vercel project name (or "I'll let Vercel auto-create it").
>    - The two display names ("Stef", "Stefi") and accent colours.
> 4. Build phase by phase exactly as written in `docs/07-PROJECT-PLAN.md`. Stop
>    after each phase, run the acceptance test, summarise what's done, and let me
>    confirm before moving on.
> 5. Follow `docs/06-CODING-STANDARDS.md` strictly: SOLID, Factory + Strategy for
>    challenge types, Repository pattern via interfaces, Zod for validation,
>    server-first / client-light, defence-in-depth auth (middleware + page guard
>    + RLS).
> 6. Use Drizzle for the DB schema and migrations; never bypass RLS by using the
>    Supabase secret key from a client component. The `sb_publishable_*` key goes
>    in browser code; `sb_secret_*` only in server code.
> 7. Tests: write Vitest tests for every Strategy's `computeScore` and
>    `decideWinner` and for the factory. Run `pnpm test` after each phase.
> 8. CI: ensure GitHub Actions runs lint + typecheck + test + build on every PR.
> 9. Don't add any service or library that isn't in `docs/02-TECH-STACK.md`
>    without flagging it for me first.
> 10. When the whole thing is built, write a `README.md` at the repo root that
>     covers local dev + deploy, then summarise everything I'll need to do
>     manually after that.

---

## Checklist (so you can tell what "done" looks like)

Hand-off is complete when:

- [ ] Repo is on GitHub, private.
- [ ] Vercel production deploy is green at a `*.vercel.app` URL.
- [ ] You and Stefi can both log in.
- [ ] One seeded fitness challenge exists; you can both add stat entries and see
      the chart.
- [ ] Declaring a winner shows on the leaderboard.
- [ ] All four extra strategies (Cooking / Reading / Steps / Custom) are
      registered and selectable when creating a new challenge.
- [ ] `pnpm test` passes.
- [ ] `pnpm lint && pnpm typecheck && pnpm build` all pass.
- [ ] `/api/health` returns 200.
- [ ] UptimeRobot is pinging it (this is a *you* step from `08-SETUP-GUIDE.md`).
- [ ] Repo `README.md` documents how to run locally and how to add a new
      challenge type in 3 minutes.

## Things to push back on if Claude Code suggests them

- Adding **Auth.js / NextAuth / Clerk**: we already use Supabase Auth. Don't
  layer another auth lib on top.
- Switching to **Prisma**: ADR-005 explicitly chose Drizzle.
- Using `getSession()` in middleware: it's unsafe; always `getUser()`.
- Storing the Supabase secret key in client code or in `NEXT_PUBLIC_*` env vars.
- Adding **TanStack Query / Zustand** "for safety" — ADR-008/014 cut them.
- Adding **Husky / lint-staged / commitlint / Playwright / MDX** — ADR-014 cut them.
- Adding **Realtime / WebSockets** — out of scope for v1.
- Adding **Tailwind plugins** beyond what shadcn ships — extra weight, not needed.
- Skipping RLS because "we trust the app code" — ADR-004 is non-negotiable.
- Inventing env-var names — ADR-015 pins them to the table in `02-TECH-STACK.md`.
- Using `auth-helpers-nextjs` — deprecated since 2024, use `@supabase/ssr`.

## When in doubt

Read the relevant doc and quote it back to me with your proposed deviation.
We'd rather amend an ADR consciously than drift.
