# 08 — Setup Guide (manual steps for Stef)

These are the things only **you** can do because they involve creating accounts
and clicking through OAuth. Plan for ~30–45 minutes the first time.

## 1. GitHub

1. If you don't have one, sign up at <https://github.com/join>.
2. Create a **new private repository** named, say, `couples-challenges`. Don't
   initialize with README/License — Claude Code will populate it.
3. Make sure 2-factor auth is on (GitHub now requires it for most accounts).
4. Note the SSH or HTTPS clone URL. You'll give it to Claude Code.

## 2. Supabase

1. Sign up at <https://supabase.com> with a Google account or email.
2. Create an **organization** (free).
3. Create a **project**:
   - Name: `couples-challenges`
   - Region: pick the closest one to you both (Europe-Frankfurt, US-East, etc.)
   - Plan: **Free**.
   - Strong DB password — save it in your password manager.
4. Wait ~2 minutes while Supabase provisions.
5. **One project is enough for v1** — local dev, previews, and prod all use
   it. (See `03-ARCHITECTURE.md` for when to split.)
6. **Disable signups:**
   - Project → **Authentication** → **Sign In / Providers** → **Email**.
   - Turn **"Enable signups"** off.
7. **Create your two users:**  .---->>> TODO!!:
   - Project → **Authentication** → **Users** → **Add user** → **Create new user**.
   - Repeat for the second user. Give them strong passwords; share via your
     password manager.
8. **Get keys** (Project → **Project Settings** → **API**):
   - `Project URL`
   - `Publishable key` (`sb_publishable_xxx`) — for browser code.
   - `Secret key` (`sb_secret_xxx`) — for server code only.
   - Save them. You'll paste these into Vercel and into your local `.env.local`.

## 3. Vercel

1. Sign up at <https://vercel.com/signup> with your GitHub account (cleanest
   integration).
2. Import the GitHub repo you created in step 1.
3. Vercel auto-detects Next.js. Don't deploy yet — first add env vars.
4. **Project Settings → Environment Variables**, add for *Production* and
   *Preview* (use **these exact names** — the codebase reads these and only these,
   see `02-TECH-STACK.md`):
   - `NEXT_PUBLIC_SUPABASE_URL` — your project URL.
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — the publishable key (`sb_publishable_…`).
   - `SUPABASE_SECRET_KEY` — the secret key (`sb_secret_…`, server only).
   - `SUPABASE_DB_URL` — for Drizzle migrations:
     `postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres`.
5. Trigger the first deploy after Claude Code pushes the initial commit.

## 4. Local environment

After Claude Code clones / scaffolds the repo:

1. Install Node 20+ and **pnpm** (`corepack enable && corepack prepare pnpm@latest --activate`).
2. Copy `.env.example` → `.env.local` and fill in the same values you put into
   Vercel (use the dev project's values locally).
3. `pnpm install`.
4. `pnpm db:migrate` runs Drizzle migrations against the dev project.
5. `pnpm dev` — open <http://localhost:3000>, log in with one of the seeded
   users.

## 5. Optional but recommended: keep Supabase awake

Free Supabase projects pause after 7 days idle. To prevent that:

1. Sign up at <https://uptimerobot.com> (free, no card).
2. Create a new HTTP(s) monitor.
3. URL: `https://<your-vercel-domain>/api/health`.
4. Interval: 6 hours is plenty (every 5 minutes also fine; both stay in the free
   tier).
5. Save. Done. Your DB never sleeps.

## 6. Optional: custom domain

If you want a cute `.love` or `.us` domain:

1. Buy from Porkbun, Namecheap, or Cloudflare Registrar (~€10/year for a `.love`).
2. In Vercel → Project → **Settings → Domains**, add the domain. Vercel will
   show you the DNS records to add at the registrar.
3. SSL is automatic.

## 7. Backups

You don't need to do anything. Supabase Free keeps 7 days of nightly backups.
We're not adding our own dump script — if/when the data feels valuable enough
that 7 days isn't enough, we'll add one then.

## 8. When something breaks

- **Vercel** logs are on the project → Deployments → the failing one → Logs.
- **Supabase** logs are at Project → Logs.
- For local issues, `pnpm dev` errors are usually self-explanatory.
- Last resort: rerun `pnpm db:migrate` against the dev project.
