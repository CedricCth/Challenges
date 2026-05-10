import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/server/auth/server";

/**
 * OAuth / password-reset callback.
 * Supabase redirects here with `?code=...` after the user clicks the email
 * link. We exchange the code for a session, then redirect to `next`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=invalid_code`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
