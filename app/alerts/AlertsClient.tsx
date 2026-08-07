"use client";

import Link from "next/link";
import { Page, PageTitle, SectionHeading, EmptyState } from "@/components/ui";
import { Disclosure } from "@/components/Disclosure";
import { AssignmentCard } from "@/components/AssignmentCard";
import { PixelAvatar } from "@/components/PixelAvatar";
import { MessageBody } from "@/components/MessageBody";
import { LocalOnlyNotice } from "@/components/LocalOnlyNotice";
import { useCurrentUser } from "@/components/CurrentUser";
import { useAlerts } from "@/lib/useAlerts";
import { useAssignments } from "@/lib/teamStore";
import { displayName } from "@/lib/people";
import {
  isDone,
  isOpen,
  relativeTime,
  sortByDoneDesc,
  sortForList,
  type Assignment,
} from "@/lib/assignments";

/**
 * Everything waiting on the person reading, and then everything waiting on
 * anybody else.
 *
 * Ordered by who has to act rather than by what kind of thing it is: your own
 * mentions and assignments first, what you handed out second, the rest of the
 * team's open work folded away underneath. A page that opened on the whole
 * team's workload would make you find yourself in it every time.
 */
export function AlertsClient() {
  const me = useCurrentUser();
  const { openAssignments, overdue, unreadMentions } = useAlerts();
  const all = useAssignments();

  const handedOut = sortForList(
    all.filter((a) => isOpen(a) && a.assignedByEmail === me && a.assigneeEmail !== me)
  );
  const elsewhere = sortForList(
    all.filter((a) => isOpen(a) && a.assigneeEmail !== me && a.assignedByEmail !== me)
  );
  const doneLately = sortByDoneDesc(all.filter(isDone)).slice(0, 12);

  const clear = openAssignments.length === 0 && unreadMentions.length === 0;

  return (
    <Page>
      <PageTitle
        title="Alerts"
        subtitle={
          overdue.length > 0
            ? `${overdue.length} of your ${openAssignments.length} open ${
                openAssignments.length === 1 ? "item is" : "items are"
              } past their date.`
            : "Work with your name on it, and anyone who has called for you in chat."
        }
      />

      <SignedInAs email={me} />
      <LocalOnlyNotice />

      {unreadMentions.length > 0 && (
        <section className="mb-10">
          <SectionHeading
            action={
              <Link
                href="/chat"
                className="pixel-face text-[10px] text-sollos-orange underline underline-offset-4"
              >
                OPEN CHAT
              </Link>
            }
          >
            You were mentioned ({unreadMentions.length})
          </SectionHeading>
          <ul className="grid gap-3">
            {unreadMentions.map((m) => (
              <li key={m.id} className="card border-2 border-sollos-orange p-4">
                <div className="flex items-start gap-3">
                  <PixelAvatar email={m.authorEmail} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="pixel-face text-[11px] text-sollos-navy">
                      {displayName(m.authorEmail)}
                      <span className="ml-2 font-normal text-sollos-navy/45">
                        {relativeTime(m.createdAt)}
                      </span>
                    </p>
                    <div className="mt-1.5">
                      <MessageBody body={m.body} />
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-sollos-navy/45">
            These clear as soon as you open chat.
          </p>
        </section>
      )}

      <section className="mb-10">
        <SectionHeading>Waiting on you ({openAssignments.length})</SectionHeading>
        {openAssignments.length === 0 ? (
          <EmptyState title={clear ? "Nothing waiting on you" : "No open assignments"}>
            Anything assigned to you on a door or a report turns up here, with whatever
            is past its date at the top.
          </EmptyState>
        ) : (
          <ul className="grid gap-3">
            {openAssignments.map((a) => (
              <AssignmentCard key={a.id} assignment={a} showSubject />
            ))}
          </ul>
        )}
      </section>

      {handedOut.length > 0 && (
        <Disclosure
          id="alerts-handed-out"
          title="What you handed out"
          count={handedOut.length}
          summary="Still open with someone else's name on it"
          defaultOpen
        >
          <AssignmentList rows={handedOut} />
        </Disclosure>
      )}

      {elsewhere.length > 0 && (
        <Disclosure
          id="alerts-elsewhere"
          title="Open across the team"
          count={elsewhere.length}
          summary="Nothing here needs you"
        >
          <AssignmentList rows={elsewhere} />
        </Disclosure>
      )}

      {doneLately.length > 0 && (
        <Disclosure
          id="alerts-done"
          title="Done lately"
          count={doneLately.length}
          summary="The last dozen things closed out"
        >
          <AssignmentList rows={doneLately} />
        </Disclosure>
      )}

      <SignOut />
    </Page>
  );
}

/**
 * Whose alerts these are, said in full.
 *
 * The header shows a face and a number, which is enough to press but not enough
 * to answer "am I signed in as me?". Four people share one password, so landing
 * on somebody else's session is a real way to end up assigning work from the
 * wrong name. The address is spelled out rather than shortened to a first name
 * for exactly that reason.
 */
function SignedInAs({ email }: { email: string | null }) {
  if (!email) return null;
  return (
    <div className="card mb-8 flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
      <PixelAvatar email={email} size={40} label={`Your avatar, ${displayName(email)}`} />
      <div className="min-w-0">
        <p className="pixel-face text-[10px] uppercase tracking-[0.06em] text-sollos-navy/50">
          Signed in as
        </p>
        <p className="mt-1 break-all text-sm font-semibold text-sollos-navy">{email}</p>
      </div>
    </div>
  );
}

/**
 * At the bottom, where it cannot be hit by accident.
 *
 * It used to sit in the nav next to seven things people press all day, which is
 * a lot of exposure for an action that throws away an hour of unsaved local
 * work and is wanted about once a month.
 */
function SignOut() {
  return (
    <div className="mt-12 border-t-2 border-sollos-navy/10 pt-6">
      <form action="/api/auth/logout" method="POST">
        <button
          type="submit"
          className="pixel-btn border-sollos-navy/30 bg-white text-sollos-navy/70 transition-colors hover:border-sollos-navy hover:text-sollos-navy"
        >
          Sign out
        </button>
      </form>
      <p className="mt-2.5 max-w-lg text-xs text-sollos-navy/45">
        Signing out does not clear anything: assignments and chat stay in this browser
        until somebody clears the browser&rsquo;s own storage.
      </p>
    </div>
  );
}

function AssignmentList({ rows }: { rows: Assignment[] }) {
  return (
    <ul className="grid gap-3">
      {rows.map((a) => (
        <AssignmentCard key={a.id} assignment={a} showSubject />
      ))}
    </ul>
  );
}
