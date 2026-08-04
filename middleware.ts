import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, readAuthConfig, verifySessionToken } from "@/lib/auth";

/**
 * Nothing renders until there is a valid session.
 *
 * The gate lives in middleware rather than in each page so that a new route is
 * protected by default. Forgetting to add a check to a page is the usual way
 * this kind of thing leaks, and this makes forgetting the safe direction.
 */
export async function middleware(request: NextRequest) {
  const config = readAuthConfig(process.env);

  // Fail closed. Without the secrets set, the only reachable page is one that
  // says so, rather than the app quietly serving itself unprotected.
  if (!config) {
    if (request.nextUrl.pathname === "/login") return NextResponse.next();
    return NextResponse.redirect(new URL("/login?error=unconfigured", request.url));
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token, config.secret);

  if (request.nextUrl.pathname === "/login") {
    // Already signed in, so skip the form.
    if (session) return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.next();
  }

  if (session) return NextResponse.next();

  // Remember where they were headed so signing in lands them there, not on a
  // dashboard they then have to navigate away from.
  const login = new URL("/login", request.url);
  const from = request.nextUrl.pathname + request.nextUrl.search;
  if (from && from !== "/") login.searchParams.set("from", from);
  return NextResponse.redirect(login);
}

export const config = {
  /**
   * Everything except the auth endpoints, Next's own assets, and the files a
   * browser or crawler fetches before any session could exist. robots.txt stays
   * public on purpose: a crawler that cannot read it cannot obey it.
   */
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|icon.svg|robots.txt|logo/).*)",
  ],
};
