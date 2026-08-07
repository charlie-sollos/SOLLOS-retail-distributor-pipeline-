"use client";

import { useEffect, useRef, useState } from "react";
import { Page, PageTitle, EmptyState, inputClass } from "@/components/ui";
import { PixelAvatar } from "@/components/PixelAvatar";
import { MessageBody } from "@/components/MessageBody";
import { LocalOnlyNotice } from "@/components/LocalOnlyNotice";
import { useCurrentUser } from "@/components/CurrentUser";
import { PEOPLE, displayName, type Person } from "@/lib/people";
import {
  addMessage,
  markChatRead,
  newId,
  removeMessage,
  store,
  useMessages,
} from "@/lib/teamStore";
import {
  applyMention,
  mentionQueryAt,
  peopleMatching,
  sortByTime,
  type ChatMessage,
  type MentionQuery,
} from "@/lib/chat";
import { addDays, formatDate, relativeTime, todayIso } from "@/lib/assignments";

/**
 * The company room.
 *
 * Deliberately one long page rather than a fixed-height scroller with its own
 * inner scrollbar: this is a tool people dip into a few times a day, not one
 * they sit in, and a page that scrolls the way every other page scrolls is
 * easier to search with the browser's own find.
 */
export function ChatClient() {
  const me = useCurrentUser();
  const messages = sortByTime(useMessages());
  const bottom = useRef<HTMLDivElement>(null);

  /**
   * Where the unread line goes: what had been read when the page opened,
   * captured before the effect below moves the marker forward.
   *
   * Read straight out of storage in a one-shot initialiser rather than through
   * the hook, because during hydration the hook is still reporting the server's
   * view, which knows about nothing. Safe to read here for the same reason:
   * hydration renders an empty room, so no divider is drawn from it until the
   * re-render that follows.
   */
  const [readUpTo] = useState<string | null>(() =>
    typeof window === "undefined" || !me ? null : store.getLastRead(me)
  );

  /**
   * Opening the room reads it. Marked up to the newest message rather than to
   * the clock, so this settles after one write instead of chasing "now" on
   * every render.
   */
  useEffect(() => {
    if (!me || messages.length === 0) return;
    const newest = messages[messages.length - 1].createdAt;
    const seen = store.getLastRead(me);
    if (!seen || newest > seen) markChatRead(me, newest);
  }, [me, messages]);

  // Land on the newest message, the way a chat room should. Only once there is
  // one: scrolling an empty room just pushes the page heading off the top.
  useEffect(() => {
    if (messages.length === 0) return;
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const firstUnread = me
    ? messages.find((m) => m.authorEmail !== me && (!readUpTo || m.createdAt > readUpTo))?.id
    : undefined;

  return (
    <Page>
      <PageTitle
        title="Chat"
        subtitle="One room for the whole company. Type @ and a name to put something on somebody."
      />

      <Roster />
      <LocalOnlyNotice />

      {messages.length === 0 ? (
        <EmptyState title="Nothing said yet">
          Whatever gets typed here stays in this browser for now, so treat it as a
          scratchpad rather than a way to reach anybody.
        </EmptyState>
      ) : (
        <ol className="grid gap-1">
          {messages.map((message, i) => {
            const previous = messages[i - 1];
            const newDay = !previous || dayOf(previous) !== dayOf(message);
            /* Consecutive lines from one person drop the avatar and the name, so
               a back and forth reads as a conversation rather than a list. */
            const runOn =
              !newDay &&
              previous?.authorEmail === message.authorEmail &&
              message.id !== firstUnread &&
              withinMinutes(previous.createdAt, message.createdAt, 10);

            return (
              <li key={message.id}>
                {newDay && <DayDivider day={dayOf(message)} />}
                {message.id === firstUnread && <UnreadDivider />}
                <MessageRow message={message} runOn={runOn} me={me} />
              </li>
            );
          })}
        </ol>
      )}

      <div ref={bottom} />
      <Composer me={me} />
    </Page>
  );
}

/** Who is in the room, and what to type to reach them. */
function Roster() {
  const me = useCurrentUser();
  return (
    <div className="card mb-6 flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-4">
      {PEOPLE.map((person) => (
        <span key={person.email} className="flex items-center gap-2">
          <PixelAvatar email={person.email} size={28} />
          <span className="leading-tight">
            <span className="block text-sm font-semibold text-sollos-navy">
              {person.name}
              {person.email === me && (
                <span className="ml-1.5 font-normal text-sollos-navy/45">you</span>
              )}
            </span>
            <span className="pixel-face block text-[10px] text-sollos-navy/45">
              @{person.handle}
            </span>
          </span>
        </span>
      ))}
    </div>
  );
}

function MessageRow({
  message,
  runOn,
  me,
}: {
  message: ChatMessage;
  runOn: boolean;
  me: string | null;
}) {
  return (
    <div className={`group flex items-start gap-3 px-1 ${runOn ? "py-0.5" : "pt-3"}`}>
      <div className="w-8 shrink-0">
        {!runOn && <PixelAvatar email={message.authorEmail} size={32} />}
      </div>

      <div className="min-w-0 flex-1">
        {!runOn && (
          <p className="pixel-face text-[11px] text-sollos-navy">
            {displayName(message.authorEmail)}
            <span className="ml-2 font-normal text-sollos-navy/45">
              {relativeTime(message.createdAt)}
            </span>
          </p>
        )}

        <div className={runOn ? "" : "mt-1"}>
          <MessageBody body={message.body} />
        </div>
      </div>

      {message.authorEmail === me && (
        <button
          type="button"
          onClick={() => removeMessage(message.id)}
          aria-label="Delete this message"
          className="pixel-face shrink-0 px-1 text-[10px] text-transparent transition-colors group-hover:text-sollos-navy/35 hover:!text-sollos-orange focus-visible:text-sollos-navy/60"
        >
          X
        </button>
      )}
    </div>
  );
}

function DayDivider({ day }: { day: string }) {
  const today = todayIso();
  const label =
    day === today ? "Today" : day === addDays(today, -1) ? "Yesterday" : formatDate(day);
  return (
    <div className="mt-6 mb-1 flex items-center gap-3">
      <span className="eyebrow shrink-0">{label}</span>
      <span aria-hidden="true" className="h-0.5 flex-1 bg-sollos-navy/10" />
    </div>
  );
}

function UnreadDivider() {
  return (
    <div className="mt-4 mb-1 flex items-center gap-3">
      <span className="pixel-face shrink-0 border-2 border-sollos-orange bg-sollos-orange px-1.5 py-1 text-[10px] leading-none text-white">
        NEW
      </span>
      <span aria-hidden="true" className="h-0.5 flex-1 bg-sollos-orange/40" />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Composer                                                                   */
/* -------------------------------------------------------------------------- */

function Composer({ me }: { me: string | null }) {
  const [body, setBody] = useState("");
  const [mention, setMention] = useState<MentionQuery | null>(null);
  const [highlighted, setHighlighted] = useState(0);
  const input = useRef<HTMLTextAreaElement>(null);

  const matches = mention ? peopleMatching(mention.query) : [];
  const picking = mention !== null && matches.length > 0;

  /**
   * Where the caret belongs once a name has been filled in, held until React
   * has written the new text into the textarea. Non-null means a completion is
   * still in flight.
   */
  const pendingCaret = useRef<number | null>(null);

  useEffect(() => {
    const caret = pendingCaret.current;
    if (caret === null) return;
    pendingCaret.current = null;
    input.current?.focus();
    input.current?.setSelectionRange(caret, caret);
  }, [body]);

  const syncMention = (el: HTMLTextAreaElement) => {
    // Completing @rod into @rodolfo fires a keyup straight afterwards, while
    // the caret is still sitting where the fragment used to end. Reading it
    // then would find "rod" again and pop the picker back open on a name that
    // has already been chosen, so nothing is re-derived until the caret lands.
    if (pendingCaret.current !== null) return;
    setMention(mentionQueryAt(el.value, el.selectionStart ?? el.value.length));
    setHighlighted(0);
  };

  const choose = (person: Person) => {
    if (!mention) return;
    const next = applyMention(body, mention, person);
    pendingCaret.current = next.caret;
    setBody(next.body);
    setMention(null);
  };

  const send = () => {
    const trimmed = body.trim();
    if (!trimmed || !me) return;
    addMessage({
      id: newId("msg"),
      authorEmail: me,
      body: trimmed,
      createdAt: new Date().toISOString(),
    });
    setBody("");
    setMention(null);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (picking) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlighted((h) => (h + 1) % matches.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlighted((h) => (h - 1 + matches.length) % matches.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        choose(matches[highlighted]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMention(null);
        return;
      }
    }
    // Enter sends, shift-enter breaks the line. The other way round means every
    // one-line message needs a trip to the mouse.
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="sticky bottom-0 -mx-1 mt-6 bg-sollos-cream pb-2 pt-3">
      <div className="card relative p-3">
        {picking && (
          <ul className="pixel-edge absolute bottom-full left-3 z-10 mb-2 w-56 bg-white py-1">
            {matches.map((person, i) => (
              <li key={person.email}>
                <button
                  type="button"
                  // The textarea keeps focus, so the caret is still where it was
                  // when the click lands.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(person)}
                  className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition-colors ${
                    i === highlighted ? "bg-sollos-navy text-white" : "hover:bg-sollos-sky/50"
                  }`}
                >
                  <PixelAvatar email={person.email} size={22} />
                  <span className="text-sm font-medium">{person.name}</span>
                  <span
                    className={`pixel-face ml-auto text-[10px] ${
                      i === highlighted ? "text-white/70" : "text-sollos-navy/40"
                    }`}
                  >
                    @{person.handle}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <label htmlFor="chat-message" className="sr-only">
          Write a message
        </label>
        <textarea
          id="chat-message"
          ref={input}
          value={body}
          rows={2}
          placeholder="Say something. @ a name to put it on them."
          onChange={(e) => {
            setBody(e.target.value);
            syncMention(e.target);
          }}
          onKeyUp={(e) => syncMention(e.currentTarget)}
          onClick={(e) => syncMention(e.currentTarget)}
          onKeyDown={onKeyDown}
          className={`${inputClass} resize-none border-0 focus:border-0`}
        />

        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-xs text-sollos-navy/40">
            Enter sends, shift-enter starts a line.
          </span>
          <button
            type="button"
            onClick={send}
            disabled={!body.trim() || !me}
            className="pixel-btn bg-sollos-navy text-white transition-colors hover:bg-sollos-navy-dark disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * The day a message belongs to, in the reader's timezone.
 *
 * Not createdAt.slice(0, 10), which is the UTC day: anything typed after
 * about 8pm on the east coast carries tomorrow's UTC date, and the room would
 * start a "Tomorrow" section every evening.
 */
function dayOf(message: ChatMessage): string {
  const at = new Date(message.createdAt);
  return Number.isFinite(at.getTime()) ? todayIso(at) : message.createdAt.slice(0, 10);
}

function withinMinutes(a: string, b: string, minutes: number): boolean {
  const gap = new Date(b).getTime() - new Date(a).getTime();
  return Number.isFinite(gap) && gap >= 0 && gap <= minutes * 60 * 1000;
}
