import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  checkCredentials,
  createSessionToken,
  readAuthConfig,
} from "@/lib/auth";

/** Only ever land somewhere inside this app, never wherever ?from= points. */
function safeRedirect(from: string | null): string {
  if (!from) return "/";
  if (!from.startsWith("/") || from.startsWith("//")) return "/";
  return from;
}

export async function POST(request: NextRequest) {
  const config = readAuthConfig(process.env);
  const form = await request.formData();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const from = safeRedirect(String(form.get("from") ?? "") || null);

  const fail = (error: string) => {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", error);
    if (from !== "/") url.searchParams.set("from", from);
    return NextResponse.redirect(url, { status: 303 });
  };

  const result = await checkCredentials(email, password, config);
  if (!result.ok) return fail("invalid");

  const expiresAtMs = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const token = await createSessionToken(result.email, config.secret, expiresAtMs);

  const response = NextResponse.redirect(new URL(from, request.url), { status: 303 });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    // Not readable from JavaScript, not sent cross-site, HTTPS only in production.
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
