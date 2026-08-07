"use client";

import Link from "next/link";
import { PixelAvatar } from "@/components/PixelAvatar";
import { useCurrentUser } from "@/components/CurrentUser";
import { displayName } from "@/lib/people";
import { removeAssignment, updateAssignment } from "@/lib/teamStore";
import {
  dueLabel,
  dueState,
  isDone,
  relativeTime,
  subjectHref,
  subjectKindLabel,
  type Assignment,
} from "@/lib/assignments";

/**
 * One assignment, as it appears in every list that shows them.
 *
 * Shared between the panel on a door or report page and the alerts page, so
 * that marking something done works identically wherever you happen to be
 * standing when you notice it is done.
 */
export function AssignmentCard({
  assignment,
  showSubject = false,
}: {
  assignment: Assignment;
  /** On a door or report page the subject is the page you are on already. */
  showSubject?: boolean;
}) {
  const me = useCurrentUser();
  const done = isDone(assignment);
  const state = dueState(assignment);
  const due = dueLabel(assignment);

  // Only whoever handed the work over can withdraw it. Marking it done is open
  // to anyone, because the person who did it is not always the person named.
  const canWithdraw = me !== null && assignment.assignedByEmail === me;
  const mine = me !== null && assignment.assigneeEmail === me;

  const toneClass =
    done
      ? "border-sollos-navy/12"
      : state === "overdue"
        ? "border-sollos-orange"
        : mine
          ? "border-sollos-navy/45"
          : "border-sollos-navy/12";

  return (
    <li className={`card border-2 p-4 ${toneClass} ${done ? "opacity-60" : ""}`}>
      {/* The buttons drop onto their own line rather than squeezing the note
          into a four-word column on a phone. flex-wrap plus a minimum width on
          the text does it without a breakpoint or a second copy of the row. */}
      <div className="flex flex-wrap items-start gap-3">
        <PixelAvatar email={assignment.assigneeEmail} size={32} />

        <div className="min-w-[11rem] flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="pixel-face text-[11px] text-sollos-navy">
              {mine ? "You" : displayName(assignment.assigneeEmail)}
            </span>
            {due && (
              <span
                className={`badge ${
                  done
                    ? "text-sollos-navy/40"
                    : state === "overdue"
                      ? "bg-sollos-orange text-white"
                      : state === "today"
                        ? "text-sollos-orange"
                        : "text-sollos-navy/55"
                }`}
              >
                {due}
              </span>
            )}
            {done && <span className="badge text-sollos-good">Done</span>}
          </div>

          <p className={`mt-1.5 text-sm ${done ? "text-sollos-navy/50 line-through" : "text-sollos-navy"}`}>
            {assignment.note || "No instructions given."}
          </p>

          {showSubject && (
            <Link
              href={subjectHref(assignment.subject)}
              className="mt-1.5 inline-block text-sm font-medium text-sollos-orange underline decoration-sollos-orange/30 underline-offset-4 hover:decoration-sollos-orange"
            >
              {subjectKindLabel(assignment.subject.kind)}: {assignment.subjectLabel}
            </Link>
          )}

          <p className="mt-2 text-xs text-sollos-navy/45">
            {assignment.assignedByEmail === me
              ? "You assigned this"
              : `${displayName(assignment.assignedByEmail)} assigned this`}{" "}
            {relativeTime(assignment.createdAt)}
            {done && assignment.doneAt && (
              <>
                {" · "}
                marked done by {displayName(assignment.doneByEmail)}{" "}
                {relativeTime(assignment.doneAt)}
              </>
            )}
          </p>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:flex-col sm:items-end sm:gap-1.5">
          <button
            type="button"
            onClick={() =>
              updateAssignment(assignment.id, {
                doneAt: done ? null : new Date().toISOString(),
                doneByEmail: done ? null : me,
              })
            }
            className="pixel-btn border-sollos-navy/30 bg-white text-[10px] text-sollos-navy/70 transition-colors hover:text-sollos-navy"
          >
            {done ? "Reopen" : "Mark done"}
          </button>
          {canWithdraw && (
            <button
              type="button"
              onClick={() => removeAssignment(assignment.id)}
              className="pixel-face px-1 text-[10px] text-sollos-navy/40 underline underline-offset-4 transition-colors hover:text-sollos-orange"
            >
              Withdraw
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
