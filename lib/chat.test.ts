import { describe, expect, it } from "vitest";
import {
  applyMention,
  mentionQueryAt,
  mentionedEmails,
  parseMessage,
  peopleMatching,
  sortByTime,
  unreadFor,
  unreadMentionsFor,
  type ChatMessage,
} from "@/lib/chat";
import { findPersonByHandle } from "@/lib/people";

const CHARLIE = "charlie@drinksollos.com";
const RODOLFO = "rodolfo@drinksollos.com";
const DILLON = "dillon@drinksollos.com";

function message(over: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: "msg_1",
    authorEmail: CHARLIE,
    body: "Anyone been past the Golden Hog?",
    createdAt: "2026-08-07T12:00:00.000Z",
    ...over,
  };
}

const texts = (body: string) => parseMessage(body).map((s) => s.text);

describe("parseMessage", () => {
  it("leaves a message with no mention in one piece", () => {
    expect(parseMessage("no names here")).toEqual([{ kind: "text", text: "no names here" }]);
  });

  it("picks a name out of the middle of a sentence", () => {
    expect(parseMessage("ask @rodolfo about it")).toEqual([
      { kind: "text", text: "ask " },
      { kind: "mention", text: "@rodolfo", person: findPersonByHandle("rodolfo") },
      { kind: "text", text: " about it" },
    ]);
  });

  /** The comma belongs to the sentence, not to the name. */
  it("stops a mention at punctuation", () => {
    expect(texts("@rodolfo, can you check?")).toEqual(["@rodolfo", ", can you check?"]);
    expect(texts("that was @dillon.")).toEqual(["that was ", "@dillon", "."]);
  });

  /**
   * The important negative. A prefix match would read this as Charlie plus a
   * stray "x", and a mention landing on the wrong person is not obviously
   * wrong to whoever typed it.
   */
  it("does not match a name that only starts the same", () => {
    expect(parseMessage("@charliex")).toEqual([{ kind: "text", text: "@charliex" }]);
  });

  it("leaves an unknown name as plain text rather than highlighting it", () => {
    expect(parseMessage("@stephen said no")).toEqual([{ kind: "text", text: "@stephen said no" }]);
  });

  it("leaves a bare @ alone", () => {
    expect(parseMessage("@ the warehouse")).toEqual([{ kind: "text", text: "@ the warehouse" }]);
  });

  it("takes several names in one message", () => {
    expect(mentionedEmails("@rodolfo and @dillon, both of you")).toEqual([RODOLFO, DILLON]);
  });

  it("counts a repeated name once", () => {
    expect(mentionedEmails("@dillon @dillon @dillon")).toEqual([DILLON]);
  });

  it("normalises the casing someone typed", () => {
    expect(texts("@Rodolfo hi")).toEqual(["@rodolfo", " hi"]);
    expect(mentionedEmails("@RODOLFO")).toEqual([RODOLFO]);
  });

  /** Nothing may be lost in the split, or a message would render short. */
  it("rebuilds the original text from the pieces", () => {
    const body = "morning @rodolfo, @dillon has the key. @nobody does not.";
    expect(texts(body).join("")).toBe(body);
  });
});

describe("unread", () => {
  const messages = [
    message({ id: "old", createdAt: "2026-08-01T09:00:00.000Z", authorEmail: RODOLFO }),
    message({ id: "mine", createdAt: "2026-08-07T09:00:00.000Z", authorEmail: CHARLIE }),
    message({
      id: "new-plain",
      createdAt: "2026-08-07T10:00:00.000Z",
      authorEmail: RODOLFO,
      body: "shelf looked thin",
    }),
    message({
      id: "new-mention",
      createdAt: "2026-08-07T11:00:00.000Z",
      authorEmail: RODOLFO,
      body: "@charlie can you call them",
    }),
  ];

  it("counts what arrived after the last look", () => {
    expect(unreadFor(messages, CHARLIE, "2026-08-07T09:30:00.000Z").map((m) => m.id)).toEqual([
      "new-plain",
      "new-mention",
    ]);
  });

  /** Nobody needs telling about something they typed themselves. */
  it("never counts your own messages, however old the marker", () => {
    expect(unreadFor(messages, CHARLIE, null).map((m) => m.id)).toEqual([
      "old",
      "new-plain",
      "new-mention",
    ]);
  });

  it("treats a room never opened as all unread", () => {
    expect(unreadFor(messages, DILLON, null)).toHaveLength(4);
  });

  it("narrows to the ones that name you", () => {
    expect(unreadMentionsFor(messages, CHARLIE, null).map((m) => m.id)).toEqual(["new-mention"]);
    expect(unreadMentionsFor(messages, DILLON, null)).toEqual([]);
  });
});

describe("sortByTime", () => {
  it("puts the oldest first and leaves the input alone", () => {
    const rows = [message({ id: "b", createdAt: "2026-08-07T12:00:00.000Z" }), message({ id: "a", createdAt: "2026-08-01T12:00:00.000Z" })];
    expect(sortByTime(rows).map((m) => m.id)).toEqual(["a", "b"]);
    expect(rows.map((m) => m.id)).toEqual(["b", "a"]);
  });
});

describe("mentionQueryAt", () => {
  it("finds a name being typed at the caret", () => {
    expect(mentionQueryAt("ask @rod", 8)).toEqual({ start: 4, query: "rod" });
  });

  it("opens on a bare @, so the picker lists everybody", () => {
    expect(mentionQueryAt("ask @", 5)).toEqual({ start: 4, query: "" });
  });

  /** Otherwise typing an email address into chat opens the picker on its domain. */
  it("ignores an @ that is not starting a word", () => {
    expect(mentionQueryAt("mail me at charlie@drinksollos.com", 33)).toBeNull();
  });

  it("closes once the name is finished with a space", () => {
    expect(mentionQueryAt("ask @rodolfo now", 16)).toBeNull();
  });

  it("is null with no @ at all", () => {
    expect(mentionQueryAt("nothing here", 12)).toBeNull();
  });

  it("reads the caret, not the end of the line", () => {
    expect(mentionQueryAt("@rod and more text", 4)).toEqual({ start: 0, query: "rod" });
  });
});

describe("peopleMatching", () => {
  it("lists everybody on an empty query", () => {
    expect(peopleMatching("")).toHaveLength(4);
  });

  it("matches on the handle or the name", () => {
    expect(peopleMatching("rod").map((p) => p.handle)).toEqual(["rodolfo"]);
    expect(peopleMatching("dil").map((p) => p.handle)).toEqual(["dillon"]);
  });

  it("comes back empty rather than guessing", () => {
    expect(peopleMatching("zzz")).toEqual([]);
  });
});

describe("applyMention", () => {
  it("completes the half-typed name and leaves the caret after it", () => {
    const person = findPersonByHandle("rodolfo")!;
    expect(applyMention("ask @rod", { start: 4, query: "rod" }, person)).toEqual({
      body: "ask @rodolfo ",
      caret: 13,
    });
  });

  it("keeps whatever was already after the caret, without doubling the space", () => {
    const person = findPersonByHandle("dillon")!;
    expect(applyMention("@dil has the key", { start: 0, query: "dil" }, person)).toEqual({
      body: "@dillon has the key",
      caret: 7,
    });
  });
});
