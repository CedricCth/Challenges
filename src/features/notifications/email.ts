import "server-only";

import { alias } from "drizzle-orm/pg-core";
import { desc, eq, inArray, isNull } from "drizzle-orm";
import { Resend } from "resend";

import { db } from "@/server/db/client";
import { env } from "@/server/env";
import {
  authUsers,
  challenges,
  notifications,
  profiles,
} from "@/server/db/schema";

/**
 * Shared email-sending logic used by two consumers of the notifications
 * queue:
 *   - the cron worker (/api/cron/email-notifications) for batch / retry
 *   - the producer (notifyChallengeParticipants) via Next.js `after()` for
 *     immediate, fire-and-forget delivery
 *
 * Both paths converge here. Marking `emailed_at` on send means the cron
 * never double-sends what the immediate path already handled.
 *
 * `sendForIds` lets the immediate path target only the rows it just
 * inserted (so we don't accidentally batch up unrelated unsent emails
 * onto a request that just wanted to email one notification). Cron passes
 * undefined → "everything unsent up to the batch cap".
 */

type AggregatedRow = {
  notificationId: string;
  recipientId: string;
  recipientEmail: string | null;
  recipientName: string | null;
  actorName: string | null;
  challengeId: string | null;
  challengeTitle: string | null;
  kind: string;
  payload: Record<string, unknown>;
  createdAt: Date;
};

const BATCH_SIZE = 50;

export interface SendResult {
  ok: boolean;
  candidateRecipients: number;
  sent: number;
  skipped?: string;
}

export async function sendDigestEmails(opts?: {
  sendForIds?: string[];
  siteUrl?: string;
}): Promise<SendResult> {
  if (!env.RESEND_API_KEY || !env.RESEND_FROM) {
    return {
      ok: true,
      candidateRecipients: 0,
      sent: 0,
      skipped: "RESEND_API_KEY/RESEND_FROM not configured",
    };
  }

  const recipientProfile = alias(profiles, "recipient_profile");
  const actorProfile = alias(profiles, "actor_profile");

  const rows: AggregatedRow[] = await db
    .select({
      notificationId: notifications.id,
      recipientId: notifications.recipientId,
      recipientEmail: authUsers.email,
      recipientName: recipientProfile.displayName,
      actorName: actorProfile.displayName,
      challengeId: notifications.challengeId,
      challengeTitle: challenges.title,
      kind: notifications.kind,
      payload: notifications.payload,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .innerJoin(authUsers, eq(authUsers.id, notifications.recipientId))
    .leftJoin(
      recipientProfile,
      eq(recipientProfile.id, notifications.recipientId),
    )
    .leftJoin(actorProfile, eq(actorProfile.id, notifications.actorId))
    .leftJoin(challenges, eq(challenges.id, notifications.challengeId))
    .where(
      opts?.sendForIds && opts.sendForIds.length > 0
        ? inArray(notifications.id, opts.sendForIds)
        : isNull(notifications.emailedAt),
    )
    .orderBy(desc(notifications.createdAt))
    .limit(BATCH_SIZE)
    .then((res) =>
      res
        .filter((r) => r.recipientEmail !== null)
        .map((r) => ({
          ...r,
          payload: (r.payload as Record<string, unknown>) ?? {},
        })),
    );

  if (rows.length === 0) {
    return { ok: true, candidateRecipients: 0, sent: 0 };
  }

  const byRecipient = new Map<
    string,
    { email: string; name: string; events: AggregatedRow[] }
  >();
  for (const row of rows) {
    if (!row.recipientEmail) continue;
    const bucket = byRecipient.get(row.recipientId);
    if (bucket) {
      bucket.events.push(row);
    } else {
      byRecipient.set(row.recipientId, {
        email: row.recipientEmail,
        name: row.recipientName ?? "friend",
        events: [row],
      });
    }
  }

  const resend = new Resend(env.RESEND_API_KEY);
  const siteUrl =
    opts?.siteUrl ??
    env.NEXT_PUBLIC_SITE_URL ??
    "https://couple-challenges-amber.vercel.app";
  const successfulIds: string[] = [];

  for (const [, { email, name, events }] of byRecipient) {
    const subject = buildSubject(events);
    const html = buildHtml({ recipientName: name, events, siteUrl });
    try {
      // The Resend SDK returns { data, error } rather than throwing on
      // API-level rejections (e.g. "free tier can only send to your own
      // verified address"). We need to inspect `error` explicitly — a
      // try/catch alone silently marks rejections as success.
      const response = await resend.emails.send({
        from: env.RESEND_FROM,
        to: email,
        subject,
        html,
      });
      if (response.error) {
        console.error(
          `[email] resend rejected for ${name} <${email}>:`,
          response.error,
        );
        continue;
      }
      successfulIds.push(...events.map((e) => e.notificationId));
    } catch (err) {
      console.error(`[email] resend threw for ${name}:`, err);
    }
  }

  if (successfulIds.length > 0) {
    await db
      .update(notifications)
      .set({ emailedAt: new Date() })
      .where(inArray(notifications.id, successfulIds));
  }

  return {
    ok: true,
    candidateRecipients: byRecipient.size,
    sent: successfulIds.length,
  };
}

function buildSubject(events: AggregatedRow[]): string {
  if (events.length === 1) return summaryLine(events[0]).subject;
  return `${events.length} updates from couple-challenges`;
}

function buildHtml({
  recipientName,
  events,
  siteUrl,
}: {
  recipientName: string;
  events: AggregatedRow[];
  siteUrl: string;
}): string {
  const items = events
    .map((e) => {
      const { body } = summaryLine(e);
      const href = e.challengeId
        ? `${siteUrl}/challenges/${e.challengeId}`
        : `${siteUrl}/dashboard`;
      return `<li style="margin: 0 0 10px; line-height: 1.45;">${body} <a href="${href}" style="color: #2563EB;">Open →</a></li>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en"><body style="font-family: -apple-system, system-ui, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #18181b;">
  <h2 style="margin: 0 0 16px; font-size: 18px;">Hi ${escapeHtml(recipientName)},</h2>
  <p style="margin: 0 0 12px; color: #52525b;">
    Quick update from your couple-challenges:
  </p>
  <ul style="padding-left: 18px; margin: 0 0 20px;">${items}</ul>
  <p style="margin: 0; color: #71717a; font-size: 13px;">
    <a href="${siteUrl}/news" style="color: #2563EB;">See it in the app</a>
  </p>
</body></html>`;
}

function summaryLine(e: AggregatedRow): { subject: string; body: string } {
  const actor = e.actorName ?? "Someone";
  const title = e.challengeTitle ?? "a challenge";
  switch (e.kind) {
    case "stat_added": {
      const value = e.payload.value;
      const unit = (e.payload.unit as string | undefined) ?? "";
      const metric = (e.payload.metric as string | undefined) ?? "an entry";
      return {
        subject: `${actor} logged a new entry`,
        body: `<strong>${escapeHtml(actor)}</strong> logged ${
          typeof value === "number"
            ? `<strong>${value} ${escapeHtml(unit)}</strong> `
            : ""
        }for ${escapeHtml(metric)} on <strong>${escapeHtml(title)}</strong>.`,
      };
    }
    case "challenge_edited":
      return {
        subject: `${actor} edited ${title}`,
        body: `<strong>${escapeHtml(actor)}</strong> edited <strong>${escapeHtml(title)}</strong>.`,
      };
    case "winner_declared":
      return {
        subject: `${actor} declared a winner`,
        body: e.payload.tie
          ? `<strong>${escapeHtml(actor)}</strong> called <strong>${escapeHtml(title)}</strong> a tie.`
          : `<strong>${escapeHtml(actor)}</strong> declared a winner on <strong>${escapeHtml(title)}</strong>.`,
      };
    case "challenge_created":
      return {
        subject: `${actor} started a new challenge`,
        body: `<strong>${escapeHtml(actor)}</strong> started a new challenge: <strong>${escapeHtml(title)}</strong>.`,
      };
    default:
      return {
        subject: `New activity in couple-challenges`,
        body: `<strong>${escapeHtml(actor)}</strong> did something on <strong>${escapeHtml(title)}</strong>.`,
      };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
