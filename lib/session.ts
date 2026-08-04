import { cookies } from "next/headers";
import { SESSION_COOKIE, readAuthConfig, verifySessionToken, type Session } from "@/lib/auth";

/**
 * The signed-in user, read on the server.
 *
 * Middleware has already turned away anyone without a valid session, so this is
 * for knowing who it is rather than whether to let them in. It still verifies
 * rather than trusting the cookie, so a page cannot be tricked into greeting
 * someone by a hand-written cookie if it is ever reached another way.
 */
export async function getSession(): Promise<Session | null> {
  const config = readAuthConfig(process.env);
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySessionToken(token, config.secret);
}

/**
 * "rodolfo@drinksollos.com" becomes "Rodolfo". Good enough for a greeting, and
 * it degrades to an empty string rather than something odd if the address is
 * shaped unexpectedly.
 */
export function firstNameFromEmail(email: string | undefined | null): string {
  if (!email) return "";
  const local = email.split("@")[0] ?? "";
  const first = local.split(/[.\-_+]/)[0] ?? "";
  if (!first) return "";
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}
