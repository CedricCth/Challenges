import type { NextRequest } from "next/server";

import { updateSession } from "@/server/auth/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  /*
   * Match every path except:
   * - _next/static (static assets)
   * - _next/image (image optimisation)
   * - favicon.ico, robots.txt, sitemap.xml
   * - common image file extensions
   * Auth gating happens inside updateSession; this is just a perf filter.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
