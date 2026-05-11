import { NextResponse, type NextRequest } from "next/server";

/**
 * Minimal client-error reporter. Client components POST here when the error
 * boundary catches a render error. We just `console.error` so the report
 * shows up in Vercel function logs — no DB write, no third-party SaaS.
 *
 * Body shape (best-effort, validate loosely):
 *   { message: string; digest?: string; path?: string; userAgent?: string }
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const safe =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};
  console.error("[client-error]", {
    message: typeof safe.message === "string" ? safe.message : "(no message)",
    digest: typeof safe.digest === "string" ? safe.digest : undefined,
    path: typeof safe.path === "string" ? safe.path : undefined,
    userAgent:
      typeof safe.userAgent === "string"
        ? safe.userAgent.slice(0, 200)
        : undefined,
  });
  return NextResponse.json({ ok: true });
}
