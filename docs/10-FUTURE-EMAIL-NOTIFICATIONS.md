# 10 — Future: Email Notifications

The in-app **News** tab landed in Phase 8.5 as a producer/consumer pattern:

- **Producer** = every server action that writes (addStatEntry,
  updateChallenge, declareWinner, createChallenge) calls
  [`notifyChallengeParticipants()`][producer] which inserts one row per
  *other* participant of the affected challenge.
- **Queue** = the [`public.notifications`][schema] table. RLS lets each
  recipient read and update only their own rows.
- **Consumer #1** = `/news` page reads recent rows for the current user,
  renders the feed, marks them read on visit.

The point of doing it this way is that **a second consumer is trivial to
add**: an email worker reading the same queue. This file documents how to
wire that up when we want it. Nothing here is built yet.

[producer]: ../src/features/notifications/producer.ts
[schema]: ../src/server/db/schema.ts

---

## What we want it to do

When someone logs an entry / edits a challenge / declares a winner, the
other participant should receive **one email** with a one-line summary
and a link back into the app — even if they don't have the app open.

It should **not** include:

- The photo (photo is a private signed URL; email recipients are not
  authenticated)
- The free-text note from declare-winner (might contain personal stuff;
  the receiver is going to open the app anyway)

It **should** include:

- Who did it (display name)
- What (e.g. "logged 79.4 kg for weight_kg")
- Which challenge (title)
- A link to `/challenges/<id>` (deep-link; auth gate handles login)

## Architecture

```
┌──────────────┐  insert  ┌────────────────┐  poll   ┌─────────────────┐  REST
│ Server Action├─────────►│ notifications  │◄────────┤ Vercel Cron     ├────►Resend
│ (Producer)   │          │ (queue)        │   un-   │ (Consumer #2)   │     API
└──────────────┘          └────────────────┘ emailed └─────────────────┘
                                  ▲                            │
                                  │                            │
                                  │ select unread              │ mark emailed_at
                                  │                            │
                                  └────────── /news (Consumer #1)
```

The queue does the buffering. Workers are decoupled. Adding a Slack
consumer later means another worker over the same table — no producer
changes.

## Implementation plan (when you want this)

### 1. Pick a sender

**Resend** ([resend.com](https://resend.com)) — 100 emails/day free, no
credit card needed for the free tier. Sign up, verify a sender domain
(or use `onboarding@resend.dev` for testing).

Add `RESEND_API_KEY` to Vercel env vars (Production + Preview, server
only — do not prefix with `NEXT_PUBLIC_`). Mirror in `.env.local` for
local testing.

Update the env schema in [src/server/env.ts] to require it.

[src/server/env.ts]: ../src/server/env.ts

### 2. Add an `emailed_at` column (already there)

Good news — the Phase 8.5 schema already includes
`notifications.emailed_at timestamptz` so the worker can mark rows it's
processed.

### 3. Write the worker route

```ts
// src/app/api/cron/email-notifications/route.ts
import { NextResponse } from "next/server";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { db } from "@/server/db/client";
import { notifications, profiles } from "@/server/db/schema";
import { env } from "@/server/env";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Vercel Cron sends a `Authorization: Bearer <CRON_SECRET>` header.
  // Reject anything else so this isn't a public sender.
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const due = await db
    .select()
    .from(notifications)
    .where(isNull(notifications.emailedAt))
    .limit(50);

  if (due.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  // Group by recipient so we can send digests instead of one email per row.
  const byRecipient = new Map<string, typeof due>();
  for (const n of due) {
    const bucket = byRecipient.get(n.recipientId) ?? [];
    bucket.push(n);
    byRecipient.set(n.recipientId, bucket);
  }

  const recipientProfiles = await db
    .select({ id: profiles.id, email: sql<string>`auth.email(${profiles.id})`, displayName: profiles.displayName })
    .from(profiles)
    .where(inArray(profiles.id, [...byRecipient.keys()]));

  // ... build email body per recipient (use the same renderLine() helper
  // that /news uses, but stripped of links to private URLs) ...
  // ... POST to Resend ...

  await db
    .update(notifications)
    .set({ emailedAt: new Date() })
    .where(inArray(notifications.id, due.map((n) => n.id)));

  return NextResponse.json({ ok: true, sent: due.length });
}
```

(Real implementation will need the recipient's email — that's on
`auth.users.email`, not on `profiles`. Either join through the auth
schema or replicate the email onto profiles.)

### 4. Schedule it in Vercel

Add to [vercel.json]:

```json
{
  "framework": "nextjs",
  "crons": [
    {
      "path": "/api/cron/email-notifications",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

[vercel.json]: ../vercel.json

Every 15 minutes is plenty — this app isn't time-critical. Also generate
a long random `CRON_SECRET`, save to Vercel env vars + `.env.local`.

### 5. Email content

Use a tiny inline template — no MDX, no template engine. Plain HTML
string with the existing CSS variables for branding. Subject line:

> Cedi just logged a new entry — couple-challenges

Body:

> Hi Stefi,
>
> Cedi logged **79.4 kg** for weight_kg on **Spring fitness contest**.
>
> See it: https://couple-challenges.vercel.app/challenges/&lt;id&gt;
>
> — couple-challenges

Don't paste the note or the photo. Don't include unsubscribe (it's a
private 2-person app; the only way to "unsubscribe" is to ask the other
person to stop logging entries, which is the entire point of the app).

### 6. Privacy / safety notes

- **Don't log emails** in `/api/cron/...` console.error beyond the
  recipient ID. Vercel function logs are not encrypted at rest.
- **Don't include the photo signed URL** in the email — those URLs are
  1-hour-valid but they'd still leak via mail-provider link previews.
- **Be careful with Resend's batch endpoint** — it logs payloads to
  their dashboard. For a private 2-person app this is fine; if you ever
  add more users, switch to single sends or self-host.

## Cost

- Resend free: 100 emails/day, 3000/month. We expect ~1-5 emails/day
  for this app. 100× headroom.
- Vercel cron: free on Hobby plan. 1 cron job slot. We use 1.

## Testing locally

You can hit the cron route directly:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/email-notifications
```

Add an integration test (Vitest) that:

1. Inserts a fake notification via Drizzle.
2. Calls the cron route handler.
3. Asserts `emailed_at` is now set and that a stub Resend client was
   called once with the expected subject.

## When to build this

After the v1 hand-off is done (Phase 10) and once you've used the app
for a few weeks. If you both check the News tab daily, you may not
need email at all. If one of you forgets, this fixes it.
