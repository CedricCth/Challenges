# 01 — Project Overview

## What we're building

A small, private, password-protected web app where Stef and Stefi can:

- Create and track ongoing **challenges** against each other (the current one is a
  fitness contest until you meet again).
- Log **stats over time** for each challenge (e.g. weight, body-fat %, workouts,
  steps), plus optional photos.
- Mark **partial milestones** ("first 2 kg lost", "30 workouts done").
- Declare a **winner** when a challenge ends.
- See an "About Us" page and a **leaderboard / total wins** across all challenges.

The app is sized for exactly **two users** and stays free forever.

## Who uses it

Two people. Both have an account. Both can do everything (no admin/user split). All
data is private to the two of them — no other accounts can sign up.

## Why a separate site for this

- A shared, persistent record beats screenshots in chat.
- It becomes a *cute partner thing* — your own little arena.
- One place for the running fitness contest plus every future challenge.

## Functional scope (v1)

| # | Feature | Notes |
|---|---------|-------|
| F1 | Email + password login, no public sign-up | Two seeded accounts; new sign-ups disabled |
| F2 | Challenge CRUD | Create, edit, end, delete |
| F3 | Challenge **types** (Fitness, Cooking, Reading, Steps, Custom) | Extensible via Factory pattern — new types added in one file |
| F4 | Stat entries (numeric + unit + note + optional photo) | Per challenge per user |
| F5 | Milestones (partial results) | Optional list per challenge |
| F6 | Winner declaration (with "tie" option) | Manual, but the app suggests one based on the strategy |
| F7 | Charts of stats over time | Side-by-side, both participants |
| F8 | Dashboard | Active challenges + score Stef vs Stefi at a glance |
| F9 | Leaderboard | Total wins, win-rate, longest streak, biggest comeback |
| F10 | About Us page | Static TSX page with two bios + photo |
| F11 | Profile settings | Display name, avatar, accent colour |

## Non-functional requirements

| | |
|---|---|
| **Privacy** | Private repo, login required, RLS in DB, no public sign-up |
| **Cost** | Free tier on every service, no credit card needed |
| **Speed** | Pages should feel instant on phone over 4G (server-rendered, small bundle) |
| **Mobile** | Designed mobile-first (you'll add stats from your phone) |
| **Extensibility** | New challenge types = one file. New pages = one folder under `src/app` |
| **Maintainability** | SOLID, DRY, Factory; tests for the domain layer |
| **Backups** | Supabase nightly backup is free; export script ships in repo |

## Out of scope (for now)

- Public sign-ups / multi-couple support
- Push notifications (could be added later via web push or email digests)
- Real-time presence ("Stefi is logging stats now")
- Native mobile app (PWA install is enough)
- Payments, ads, anything commercial

These are explicitly *not* being built so we can ship a tight v1 in a few days of
focused work.

## What "done" looks like

You and Stefi can both:
1. Log in from your phones.
2. See the active fitness challenge on the dashboard.
3. Tap "+ stat", enter a weight, save.
4. See a chart of both your weights side by side.
5. Open "Leaderboard" and see total wins.

That's v1. Everything else (cooking challenge, reading challenge, etc.) is just a new
strategy file plus seed data.
