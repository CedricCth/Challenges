# 02 — Tech Stack

Every choice below was made with three constraints in mind:

1. **Free** for two users, with no surprise bills.
2. **Modern, mainstream best practices as of May 2026** — boring tech where
   possible, avoiding anything that's experimental or about to be replaced.
3. **Easy to extend** — adding a new challenge type, page, or chart is a
   one-file change.

The decisions are summarised here; the *why* is recorded as ADRs in `05-DESIGN-DECISIONS.md`.

---

## Final stack

### Frontend

| Layer | Pick | Why |
|---|---|---|
| Framework | **Next.js 16** (App Router), with a fallback to **latest stable 15.x** | Mature, batteries included (routing, SSR, server actions, API routes). Next.js 16 makes Turbopack the default and stable for production. **At install time, verify `npm view next version` resolves to 16.x; if it doesn't, install latest 15.x and skip the Turbopack-default note — App Router code is identical.** |
| Language | **TypeScript 5.x**, `strict: true` | Catch bugs at compile time; pairs with Drizzle/Zod for end-to-end types. |
| Styling | **Tailwind CSS v4** | Standard. Tiny bundle. shadcn/ui is built on it. |
| Components | **shadcn/ui** (Radix primitives) | Copy-paste accessible components — you own the code, no upgrade hell. The default in 2026 for Next.js + Tailwind. |
| Icons | **lucide-react** | The icon set shadcn/ui ships with. |
| Charts | **Recharts** | The default in shadcn's chart module; declarative, TypeScript-friendly, fine for our small datasets. |
| Forms | **React Hook Form + Zod** | Performant, uncontrolled by default, schema validation shared with server actions. |
| Server state | **None** in v1 — Server Components + Server Actions + `revalidatePath` cover us. Add **TanStack Query** later only if a feature actually needs optimistic updates / infinite scroll. |
| Client UI state | **`useState`** + **`next-themes`** for the theme toggle. No global store; we don't have enough state to justify Zustand. |

### Backend / data

| Layer | Pick | Why |
|---|---|---|
| BaaS | **Supabase** (Free Tier) | Postgres + Auth + Storage in one place; RLS enforces privacy at DB level. Open-source so we can self-host later if we ever wanted to. |
| Database | **Postgres 15+** (managed by Supabase) | Real SQL, joins, JSONB for extensible metadata, great free tier. |
| ORM | **Drizzle ORM** | Schema-as-TypeScript, no codegen step, tiny bundle, plays nicely with serverless. |
| Auth | **Supabase Auth** (`@supabase/ssr`) | Session-cookie auth that integrates with Next.js middleware and Server Components. |
| Storage | **Supabase Storage** | For optional progress photos attached to stat entries. |
| Validation | **Zod** | One schema → form validation + server-action input + DB invariants. |

### Hosting & ops

| Layer | Pick | Why |
|---|---|---|
| Hosting | **Vercel Hobby** | Free for personal/non-commercial use. Built for Next.js; auto-deploys from GitHub; preview URL per PR. |
| Source | **GitHub** (private repo) | Standard. Drives Vercel deploys. |
| CI | **GitHub Actions** | Free for private repos at our scale. Lint + typecheck + test on every PR. |
| Domain (optional) | `*.vercel.app` is fine; or buy a `.love` / `.cute` domain for a few €/year | Custom domain is one click in Vercel. |
| Backups | Supabase nightly backups (free tier: 7 days). No custom dump script in v1; add when data feels valuable enough. | Keeps the repo tiny. |

### Tooling

| Tool | Purpose |
|---|---|
| **pnpm** | Faster, less disk than npm/yarn; lockfile is deterministic. |
| **ESLint** + `@typescript-eslint` + `eslint-config-next` | Linting. |
| **Prettier** + `prettier-plugin-tailwindcss` | Auto-format + Tailwind class sorting. |
| **Vitest** | Unit tests for domain/strategy code. Run in CI; that's enough quality gate for two users. |
| **Drizzle Kit** | Migrations: `drizzle-kit generate` + `drizzle-kit migrate`. |

**Cut from v1 (intentionally):** Husky / lint-staged / commitlint (ceremony for a 2-person repo — CI catches lint/format), Playwright (broken login is noticed within seconds; not worth the maintenance), dedicated comments table, MDX (a plain `.tsx` About Us page is enough). All can be added later if we feel the gap.

---

## What we considered and rejected

| Option | Why we passed |
|---|---|
| **SvelteKit** | Smaller ecosystem, fewer hires-of-the-hour examples. Lovely, but Next.js wins for tutorial coverage and shadcn ecosystem. |
| **Remix / React Router 7** | Equally good technically, but the Next.js + Vercel + Supabase combo has the best compounded DX in 2026. |
| **Plain GitHub Pages + static** | Can't host a Postgres-backed authenticated app on Pages. |
| **Firebase** | NoSQL doesn't fit relational challenge data; daily read/write caps on free tier; harder RLS. |
| **Convex** | Lovely DX, but TypeScript-only backend functions and a smaller community than Supabase; we want SQL freedom. |
| **Prisma** | Heavier, codegen step, slower cold starts. Drizzle is the modern pick for serverless + Next.js. |
| **MUI / Chakra / Mantine** | All fine, but heavier bundle and less ownable than shadcn/ui (where you copy components into your repo). |
| **Cloudflare Pages** | Cheaper at scale, unlimited bandwidth — but Cloudflare's Next.js adapter still trails Vercel for the latest App Router features (Image, ISR, RSC streaming). We don't need scale; we need ease. |
| **Auth.js / Clerk / WorkOS** | Adds a third party; Supabase Auth is already in the stack and good enough for two users. |

---

## Environment variable names (canonical — used everywhere)

| Name | Where used | Value |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | client + server | `sb_publishable_…` |
| `SUPABASE_SECRET_KEY` | **server only** | `sb_secret_…` (never in `NEXT_PUBLIC_*`) |
| `SUPABASE_DB_URL` | server only (Drizzle migrations) | `postgresql://…` |

These exact names appear in `.env.example`, in Vercel env-var settings, and in any
`process.env.*` reference. Do not invent variants.

## Free-tier headroom check (2 users, real-world usage)

| Service | Free tier | Our expected use | Headroom |
|---|---|---|---|
| Vercel Hobby | 100 GB bandwidth, 1M function calls, 4 h CPU/mo | <1 GB, <10k calls | 100× |
| Supabase Free | 500 MB DB, 50k MAU, 1 GB storage, 5 GB bandwidth | <50 MB, 2 MAU, <100 MB photos | 10–50× |
| GitHub Free | unlimited private repos, 2k Action minutes/mo | <50 minutes/mo | 40× |
| GitHub Actions | 2k minutes/mo for private repos | small CI | plenty |

We can grow this app 50× before any tier matters.

> ⚠️ One real risk: Supabase **pauses** free-tier projects after 7 consecutive days
> with zero activity. If neither of you opens the app for a week, the DB sleeps and
> the next visit takes ~30 s to wake. Two ways to avoid it: (a) just open the app
> weekly (you will) or (b) set up a free uptime ping (UptimeRobot, free) hitting
> a `/api/health` route every 6 hours. We'll add `/api/health` and recommend it.

---

## Sources & further reading

- Next.js framework comparison 2026: [LogRocket](https://blog.logrocket.com/react-remix-vs-next-js-vs-sveltekit/), [DEV / Pockit](https://dev.to/pockit_tools/nextjs-vs-remix-vs-astro-vs-sveltekit-in-2026-the-definitive-framework-decision-guide-lp5)
- Supabase vs Firebase vs Convex 2026: [VibeStack](https://www.vibestack.io/blog/supabase-vs-firebase-vs-convex-2026), [Tech Insider](https://tech-insider.org/supabase-vs-firebase-2026/)
- Vercel Hobby plan limits: [Vercel docs](https://vercel.com/docs/plans/hobby), [Fair use guidelines](https://vercel.com/docs/limits/fair-use-guidelines)
- Cloudflare Pages vs Vercel for Next.js 2026: [DanubeData](https://danubedata.ro/blog/cloudflare-pages-vs-netlify-vs-vercel-static-hosting-2026)
- Supabase RLS best practices: [Supabase docs](https://supabase.com/docs/guides/database/postgres/row-level-security), [MakerKit](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices)
- Supabase + Next.js auth pitfalls: [Supabase server-side auth docs](https://supabase.com/docs/guides/auth/server-side/nextjs), [WorkOS guide](https://workos.com/blog/nextjs-app-router-authentication-guide-2026)
- Drizzle vs Prisma 2026: [Bytebase](https://www.bytebase.com/blog/drizzle-vs-prisma/), [MakerKit](https://makerkit.dev/blog/tutorials/drizzle-vs-prisma)
- shadcn/ui + Tailwind v4: [shadcn/ui docs](https://ui.shadcn.com/docs/tailwind-v4)
- Recharts in 2026 (default in shadcn): [PkgPulse](https://www.pkgpulse.com/guides/recharts-vs-chartjs-vs-nivo-vs-visx-react-charting-2026)
- TanStack Query + Zustand pattern: [DEV / NextSteps](https://www.nextsteps.dev/en/posts/federated-state-done-righ/)
