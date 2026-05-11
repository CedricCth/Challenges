import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/server/env";
import { sendDigestEmails } from "@/features/notifications/email";

/**
 * Daily safety-net cron. Most emails go out **immediately** when the
 * producer fires (see notifications/producer.ts using Next.js `after()`).
 * This route exists to retry anything the immediate path failed to send
 * (network blip, Resend hiccup, function killed before `after()` finished).
 *
 * Schedule lives in vercel.json. Vercel Hobby caps cron frequency to
 * once per day — that's plenty for a retry net.
 */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (env.CRON_SECRET) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${env.CRON_SECRET}`) {
      // Temporary diagnostic — confirms the auth header is parsed and what
      // length / first-chars the server sees vs. what env has. Remove once
      // the secret mismatch is resolved.
      return NextResponse.json(
        {
          ok: false,
          reason: "secret mismatch",
          hasAuthHeader: Boolean(auth),
          authHeaderLength: auth?.length ?? 0,
          authStartsWith: auth?.slice(0, 14) ?? null,
          envSecretLength: env.CRON_SECRET.length,
          envSecretStartsWith: env.CRON_SECRET.slice(0, 6),
          envSecretEndsWith: env.CRON_SECRET.slice(-6),
        },
        { status: 401 },
      );
    }
  }

  const result = await sendDigestEmails({
    siteUrl: env.NEXT_PUBLIC_SITE_URL ?? request.headers.get("origin") ?? undefined,
  });
  return NextResponse.json(result);
}
