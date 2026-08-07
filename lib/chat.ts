import { PEOPLE, type Person } from "@/lib/people";

/**
 * One company-wide room.
 *
 * Not channels, not threads, not direct messages. Four people talking about one
 * brand do not need routing, and every channel added is somewhere a question
 * can be asked and missed. What the room does have is mentions, because
 * "somebody should look at this" needs to land on a specific somebody.
 *
 * Pure logic only. Persistence is lib/teamStore.ts.
 */

export type ChatMessage = {
  id: string;
  authorEmail: string;
  body: string;
  createdAt: string;
};

/** A run of a message body: either plain text, or a name that resolved. */
export type Segment =
  | { kind: "text"; text: string }
  | { kind: "mention"; text: string; person: Person };

/**
 * The characters an @ can be followed by. Kept deliberately tight so ordinary
 * punctuation ends a mention: "@rodolfo, can you" mentions Rodolfo and leaves
 * the comma in the sentence.
 */
const MENTION_PATTERN = /@([A-Za-z0-9._-]+)/g;

/**
 * The person a typed name refers to, or nobody.
 *
 * The whole name has to match. Matching on a prefix instead would read
 * "@charliex" as Charlie and leave a stray x behind, which is worse than not
 * matching: a mention that lands on the wrong person is not obviously wrong to
 * the person who typed it.
 *
 * Trailing punctuation is stripped first, because "@rodolfo," is a sentence
 * with a mention in it and the comma belongs to the sentence.
 */
function matchHandle(typed: string): Person | undefined {
  const trimmed = typed.replace(/[._-]+$/, "").toLowerCase();
  if (!trimmed) return undefined;
  return PEOPLE.find((p) => p.handle === trimmed);
}

/**
 * Splits a message into text and mentions, ready to render.
 *
 * An @ that matches nobody stays plain text rather than being highlighted or
 * dropped: writing "@ the warehouse" should not look like a failed mention, and
 * a typo'd name should look wrong so it gets fixed.
 */
export function parseMessage(body: string): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;

  for (const match of body.matchAll(MENTION_PATTERN)) {
    const start = match.index ?? 0;
    const person = matchHandle(match[1]);
    if (!person) continue;

    if (start > cursor) segments.push({ kind: "text", text: body.slice(cursor, start) });
    segments.push({ kind: "mention", text: `@${person.handle}`, person });
    cursor = start + 1 + person.handle.length;
  }

  if (cursor < body.length) segments.push({ kind: "text", text: body.slice(cursor) });
  return segments;
}

/** Every person mentioned in a body, deduplicated, in the order they appear. */
export function mentionedEmails(body: string): string[] {
  const out: string[] = [];
  for (const segment of parseMessage(body)) {
    if (segment.kind === "mention" && !out.includes(segment.person.email)) {
      out.push(segment.person.email);
    }
  }
  return out;
}

export function mentions(message: ChatMessage, email: string): boolean {
  return mentionedEmails(message.body).includes(email);
}

export function sortByTime(messages: ChatMessage[]): ChatMessage[] {
  return [...messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * Messages this person has not seen.
 *
 * Their own never count, however long ago they were sent. Nobody needs telling
 * about something they typed.
 */
export function unreadFor(
  messages: ChatMessage[],
  email: string,
  lastRead: string | null
): ChatMessage[] {
  return messages.filter(
    (m) => m.authorEmail !== email && (!lastRead || m.createdAt > lastRead)
  );
}

export function unreadMentionsFor(
  messages: ChatMessage[],
  email: string,
  lastRead: string | null
): ChatMessage[] {
  return unreadFor(messages, email, lastRead).filter((m) => mentions(m, email));
}

/* -------------------------------------------------------------------------- */
/*  Typing a mention                                                           */
/* -------------------------------------------------------------------------- */

export type MentionQuery = {
  /** Index of the @ in the body. */
  start: number;
  /** What has been typed after it so far, lowercased. May be empty. */
  query: string;
};

/**
 * The mention being typed at the caret, if there is one.
 *
 * Requires the @ to start a word, so an email address typed into chat does not
 * open the picker on its domain.
 */
export function mentionQueryAt(body: string, caret: number): MentionQuery | null {
  const before = body.slice(0, caret);
  const at = before.lastIndexOf("@");
  if (at === -1) return null;

  const preceding = at === 0 ? "" : before[at - 1];
  if (preceding && !/\s/.test(preceding)) return null;

  const query = before.slice(at + 1);
  if (/[^A-Za-z0-9._-]/.test(query)) return null;

  return { start: at, query: query.toLowerCase() };
}

export function peopleMatching(query: string): Person[] {
  if (!query) return PEOPLE;
  return PEOPLE.filter(
    (p) => p.handle.startsWith(query) || p.name.toLowerCase().startsWith(query)
  );
}

/** Replaces the half-typed mention with a whole one, and says where the caret goes. */
export function applyMention(
  body: string,
  mention: MentionQuery,
  person: Person
): { body: string; caret: number } {
  const after = body.slice(mention.start + 1 + mention.query.length);
  // A trailing space so the next word can just be typed, unless completing a
  // name in the middle of a finished sentence would double one up.
  const inserted = `@${person.handle}${after.startsWith(" ") ? "" : " "}`;
  return {
    body: body.slice(0, mention.start) + inserted + after,
    caret: mention.start + inserted.length,
  };
}
