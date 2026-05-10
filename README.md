# Couples Challenge App — Plan

A private website for two people (Stef and Stefi) to track their friendly competitions —
the current one is a fitness contest (until you meet again), but the system is built so
you can spin up new "life challenges" forever: cooking, reading, steps, anything.

**Status:** Phase 1 (scaffold) complete — Next.js 16 + TypeScript + Tailwind + Supabase + Drizzle + Vitest are wired up. The full README (run/deploy instructions + "how to add a new challenge type in 3 minutes") lands in Phase 10.

---

## What's in here

| File | Purpose |
|------|---------|
| [`docs/01-PROJECT-OVERVIEW.md`](docs/01-PROJECT-OVERVIEW.md) | Goals, users, scope, what we're not building |
| [`docs/02-TECH-STACK.md`](docs/02-TECH-STACK.md) | Every library, why it was picked, what was rejected |
| [`docs/03-ARCHITECTURE.md`](docs/03-ARCHITECTURE.md) | High-level + layered architecture, request flow, security model |
| [`docs/04-DATABASE-SCHEMA.md`](docs/04-DATABASE-SCHEMA.md) | Tables, columns, RLS policies, sample SQL |
| [`docs/05-DESIGN-DECISIONS.md`](docs/05-DESIGN-DECISIONS.md) | Architecture Decision Records (ADRs) — the *why* of every major call |
| [`docs/06-CODING-STANDARDS.md`](docs/06-CODING-STANDARDS.md) | SOLID, DRY, Factory, naming, folders, testing |
| [`docs/07-PROJECT-PLAN.md`](docs/07-PROJECT-PLAN.md) | Phased implementation plan for Claude Code |
| [`docs/08-SETUP-GUIDE.md`](docs/08-SETUP-GUIDE.md) | The manual steps **you** need to do (signups, secrets, domain) |
| [`docs/09-CLAUDE-CODE-HANDOFF.md`](docs/09-CLAUDE-CODE-HANDOFF.md) | Exact prompt + checklist to give Claude Code |
| [`docs/diagrams/`](docs/diagrams/) | Architecture, ER, flow, deployment, factory PNGs |
| [`docs/diagrams/gen_diagrams.py`](docs/diagrams/gen_diagrams.py) | Source for regenerating the diagrams (graphviz) |

---

## TL;DR — the stack we picked

- **Framework:** Next.js 16 (App Router, Server Components, Server Actions) + TypeScript (strict). Falls back to latest stable 15.x if 16 isn't installable.
- **UI:** Tailwind CSS v4 + shadcn/ui (Radix-based) + Lucide icons + `next-themes` for dark mode.
- **State:** Server-first. Server Components + Server Actions + `revalidatePath`. No TanStack Query / Zustand in v1.
- **Data:** Supabase Postgres + Drizzle ORM + Zod. RLS on every table, plus storage policies.
- **Auth:** Supabase Auth (email + password + reset flow), enforced at three layers: middleware → page guard → RLS.
- **Forms / validation:** React Hook Form + Zod.
- **Charts:** Recharts (the default in shadcn/ui's chart module).
- **Hosting:** Vercel Hobby (free, personal use) — auto-deploy on push to GitHub.
- **Source control:** GitHub private repo, GitHub Actions for lint / typecheck / test / build.
- **Tooling:** pnpm, ESLint, Prettier, Vitest. (Husky / Playwright / commitlint deliberately cut for v1.)

Everything is on a free tier and stays free for two users.

---

## High-level architecture

![Architecture](docs/diagrams/01_architecture.png)

For the full picture (ER diagram, user flow, deployment, factory pattern, layered
architecture) open the `docs/diagrams/` folder.

---

## What you do next

1. Read `docs/01` through `docs/06` (≈ 30 minutes total). They tell you exactly
   what's being built and why.
2. Read `docs/08-SETUP-GUIDE.md` — there are a handful of accounts you need to create
   yourself (GitHub, Supabase, Vercel) before Claude Code can finish wiring things up.
3. If you're happy with the plan, hand `docs/09-CLAUDE-CODE-HANDOFF.md` to Claude Code
   and let it build the app from scratch.
4. If anything in the plan feels wrong, say so and we'll iterate before any code is
   written.
