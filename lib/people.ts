import { ALLOWED_EMAILS, normalizeEmail } from "@/lib/auth";

/**
 * The people this tool knows about.
 *
 * Derived from ALLOWED_EMAILS rather than kept as a second list, so there is one
 * place a person is added or removed. Taking someone off the sign-in list also
 * takes them out of the assignee picker and the mention autocomplete, which is
 * the behaviour you want: an account nobody can sign into should not be
 * collecting assignments.
 *
 * Everything here is derived from the address alone. There is no profile to
 * fill in, and deliberately so while the app has no shared storage: a display
 * name typed into one browser would not reach anybody else's.
 */

export type Person = {
  email: string;
  /** "Rodolfo". What gets shown in almost every place a person appears. */
  name: string;
  /** What you type after an @ in chat. Unique across the roster. */
  handle: string;
  /** Two letters, for the rare spot too small for an avatar. */
  initials: string;
};

/** "rodolfo@drinksollos.com" becomes "Rodolfo". */
function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._\-+]/).filter(Boolean);
  if (parts.length === 0) return email;
  return parts
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
}

function initialsFromName(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Handles are first names, because that is what someone reaches for when they
 * type an @. Two people sharing a first name would make one of the two handles
 * ambiguous, so in that case both fall back to the whole local part rather than
 * one of them silently winning.
 */
function buildHandles(emails: string[]): Map<string, string> {
  const firsts = new Map<string, number>();
  for (const email of emails) {
    const first = (email.split("@")[0] ?? "").split(/[._\-+]/)[0]?.toLowerCase() ?? "";
    firsts.set(first, (firsts.get(first) ?? 0) + 1);
  }

  const handles = new Map<string, string>();
  for (const email of emails) {
    const local = (email.split("@")[0] ?? "").toLowerCase();
    const first = local.split(/[._\-+]/)[0] ?? "";
    handles.set(email, first && firsts.get(first) === 1 ? first : local);
  }
  return handles;
}

export function buildRoster(emails: string[]): Person[] {
  const normalized = emails.map(normalizeEmail);
  const handles = buildHandles(normalized);
  return normalized.map((email) => {
    const name = nameFromEmail(email);
    return {
      email,
      name,
      handle: handles.get(email) ?? email,
      initials: initialsFromName(name),
    };
  });
}

export const PEOPLE: Person[] = buildRoster(ALLOWED_EMAILS);

export function findPerson(email: string | null | undefined): Person | undefined {
  if (!email) return undefined;
  const wanted = normalizeEmail(email);
  return PEOPLE.find((p) => p.email === wanted);
}

export function findPersonByHandle(handle: string): Person | undefined {
  const wanted = handle.toLowerCase();
  return PEOPLE.find((p) => p.handle === wanted);
}

/**
 * A name for an address that is not on the roster.
 *
 * Assignments and messages keep the address they were written with, so someone
 * removed from ALLOWED_EMAILS still has to render somewhere. Showing the
 * address rather than dropping the row means the history stays readable.
 */
export function displayName(email: string | null | undefined): string {
  if (!email) return "Someone";
  return findPerson(email)?.name ?? nameFromEmail(email);
}

export function isSamePerson(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return normalizeEmail(a) === normalizeEmail(b);
}
