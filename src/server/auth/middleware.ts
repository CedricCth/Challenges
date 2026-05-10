import "server-only";

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/server/env";

const PUBLIC_PATHS = ["/", "/login", "/auth/callback", "/api/health"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.includes(pathname) || pathname.startsWith("/_next");
}

/**
 * Per Supabase SSR docs: middleware refreshes the session cookie on every
 * request and re-validates the user via getUser() (NOT getSession() — see
 * ADR-004). Unauthenticated users hitting a gated route are redirected to
 * /login.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // CRITICAL: this call must be `getUser()`, not `getSession()`.
  // getSession() trusts the local cookie; getUser() validates against
  // Supabase Auth servers. See ADR-004.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}
