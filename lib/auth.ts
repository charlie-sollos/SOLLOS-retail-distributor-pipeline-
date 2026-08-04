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

/**
 * The built-in credentials, so the app works on deploy with nothing to
 * configure. This only holds up while the repository is private: anyone who can
 * read this file can read BUILT_IN_SIGNING_SECRET, and with it forge a session
 * cookie without ever seeing the login. A public repo makes this decorative.
 *
 * The password is stored as a PBKDF2 derivation rather than as text, so reading
 * the file does not immediately hand over the password itself. That is a second
 * line, not the first one. The first one is the repo being private.
 *
 * Setting AUTH_SECRET and AUTH_PASSWORD in the hosting environment overrides
 * both of these, which is the better arrangement whenever it is worth the setup.
 */
const BUILT_IN_SIGNING_SECRET =
  "b0674f004a8237eefcd279955ad2c2b62dc820c1b73e279c11cbaf613382fcf0";
const BUILT_IN_PASSWORD_SALT = "Jl4HCfwFuzu1WT6G1RhE2Q==";
const BUILT_IN_PASSWORD_HASH = "2lfnl+NzE41Bklux7Jjum59Yp+yd41bF0YAWGvdYAtQ=";
const PBKDF2_ITERATIONS = 100_000;

export type AuthConfig = {
  secret: string;
  /** Set when a plain password came from the environment. */
  password?: string;
  /** Set when falling back to the derivation compiled in above. */
  passwordHash?: { salt: string; hash: string; iterations: number };
};

/**
 * Prefers the environment and falls back to the built-in credentials, so there
 * is no state in which the app is deployed but nobody can sign in. An
 * AUTH_SECRET too short to be worth anything is ignored rather than trusted.
 */
export function readAuthConfig(env: Record<string, string | undefined>): AuthConfig {
  const secret = env.AUTH_SECRET && env.AUTH_SECRET.length >= 16 ? env.AUTH_SECRET : null;
  const password = env.AUTH_PASSWORD || null;

  if (secret && password) return { secret, password };

  return {
    secret: secret ?? BUILT_IN_SIGNING_SECRET,
    passwordHash: {
      salt: BUILT_IN_PASSWORD_SALT,
      hash: BUILT_IN_PASSWORD_HASH,
      iterations: PBKDF2_ITERATIONS,
    },
  };
}

/** True when the app is running on credentials compiled into the source. */
export function usingBuiltInCredentials(config: AuthConfig): boolean {
  return config.passwordHash !== undefined;
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function derive(
  password: string,
  salt: Uint8Array,
  iterations: number
): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    key,
    256
  );
  return toBase64Url(new Uint8Array(bits));
}

export type LoginResult = { ok: true; email: string } | { ok: false; reason: string };

/**
 * One message for every failure. Saying "no such user" would confirm which
 * addresses are real to anyone working through a list.
 *
 * Both halves are always evaluated, so a wrong email and a wrong password take
 * the same path and the same time.
 */
export async function checkCredentials(
  email: string,
  password: string,
  config: AuthConfig
): Promise<LoginResult> {
  const generic = { ok: false as const, reason: "That email and password did not match." };

  const emailOk = isAllowedEmail(email);

  let passwordOk = false;
  if (config.password !== undefined) {
    passwordOk = constantTimeEqual(password, config.password);
  } else if (config.passwordHash) {
    const { salt, hash, iterations } = config.passwordHash;
    const candidate = await derive(password, fromBase64(salt), iterations);
    passwordOk = constantTimeEqual(candidate, toBase64Url(fromBase64(hash)));
  }

  if (!emailOk || !passwordOk) return generic;
  return { ok: true, email: normalizeEmail(email) };
}
