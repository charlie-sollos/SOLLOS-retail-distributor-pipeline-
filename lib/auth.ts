/**
 * A small shared-password gate for an internal tool.
 *
 * Deliberately modest: one password the whole team shares, checked on the
 * server, with a signed cookie holding the session. It is enough to stop the
 * app being readable by anyone who has the URL, which is the actual problem.
 * It is not per-person identity, so it cannot tell you who entered a figure and
 * cannot revoke one person without changing the password for everybody.
 *
 * Everything here runs on the edge runtime, because middleware does, so it uses
 * Web Crypto rather than node:crypto.
 */

const encoder = new TextEncoder();

/**
 * Who can sign in. Emails are not secret, so they live in the repo where they
 * are easy to review and change. The password is not here: see requireEnv.
 */
export const ALLOWED_EMAILS: string[] = [
  "charlie@drinksollos.com",
  "rodolfo@drinksollos.com",
  "dillon@drinksollos.com",
];

export const SESSION_COOKIE = "sollos_session";
/** A week, so nobody is retyping it daily, short enough that a stale laptop expires. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isAllowedEmail(email: string): boolean {
  return ALLOWED_EMAILS.includes(normalizeEmail(email));
}

/**
 * Compares without leaking, through timing, how much of the value was right.
 * Always walks the full length rather than returning early on the first
 * mismatch, which is the whole point.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  // Lengths differing is not itself secret, but bail in a way that still does
  // the same amount of work against a same-length value.
  if (aBytes.length !== bBytes.length) return false;
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i];
  return diff === 0;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  return atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toBase64Url(new Uint8Array(signature));
}

/** A session is the email and an expiry, signed so neither can be edited. */
export async function createSessionToken(
  email: string,
  secret: string,
  expiresAtMs: number
): Promise<string> {
  const payload = `${normalizeEmail(email)}|${expiresAtMs}`;
  const encoded = toBase64Url(encoder.encode(payload));
  return `${encoded}.${await sign(payload, secret)}`;
}

export type Session = { email: string; expiresAtMs: number };

/**
 * Returns the session only if the signature holds, the clock has not passed the
 * expiry, and the email is still on the list. That last check means removing
 * someone from ALLOWED_EMAILS logs them out on their next request rather than
 * whenever their cookie happens to lapse.
 */
export async function verifySessionToken(
  token: string | undefined | null,
  secret: string,
  nowMs: number = Date.now()
): Promise<Session | null> {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;

  const encoded = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  let payload: string;
  try {
    payload = fromBase64Url(encoded);
  } catch {
    return null;
  }

  const expected = await sign(payload, secret);
  if (!constantTimeEqual(signature, expected)) return null;

  const separator = payload.lastIndexOf("|");
  if (separator <= 0) return null;

  const email = payload.slice(0, separator);
  const expiresAtMs = Number(payload.slice(separator + 1));
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= nowMs) return null;
  if (!isAllowedEmail(email)) return null;

  return { email, expiresAtMs };
}

export type AuthConfig = { secret: string; password: string };

/**
 * Fails closed. If either secret is missing the app refuses every login rather
 * than falling back to a default, because a default password on a deployment
 * that is reachable from the internet is worse than a broken login.
 */
export function readAuthConfig(env: Record<string, string | undefined>): AuthConfig | null {
  const secret = env.AUTH_SECRET;
  const password = env.AUTH_PASSWORD;
  if (!secret || !password) return null;
  if (secret.length < 16) return null;
  return { secret, password };
}

export type LoginResult = { ok: true; email: string } | { ok: false; reason: string };

/**
 * One message for every failure. Saying "no such user" would confirm which
 * addresses are real to anyone guessing.
 */
export function checkCredentials(
  email: string,
  password: string,
  config: AuthConfig
): LoginResult {
  const generic = { ok: false as const, reason: "That email and password did not match." };
  const emailOk = isAllowedEmail(email);
  const passwordOk = constantTimeEqual(password, config.password);
  if (!emailOk || !passwordOk) return generic;
  return { ok: true, email: normalizeEmail(email) };
}
