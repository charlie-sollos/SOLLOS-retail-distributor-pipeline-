"use client";

import { useState } from "react";
import { PixelAvatar } from "@/components/PixelAvatar";
import { AssignmentCard } from "@/components/AssignmentCard";
import { useCurrentUser } from "@/components/CurrentUser";
import { PEOPLE } from "@/lib/people";
import { SectionHeading, PrimaryButton, GhostButton, inputClass } from "@/components/ui";
import { addAssignment, newId, useAssignments } from "@/lib/teamStore";
import {
  forSubject,
  isDone,
  isOpen,
  sortByDoneDesc,
  sortForList,
  todayIso,
  type Subject,
} from "@/lib/assignments";

/**
 * The assignment panel that sits on a door page and on each report page.
 *
 * One component for both, because "somebody go and look at this" is the same
 * job whether the thing to look at is a shop or a spreadsheet, and having two
 * of these would mean fixing everything twice.
 */
export function SubjectAssignments({
  subject,
  subjectLabel,
  heading = "Assigned",
}: {
  subject: Subject;
  /** Captured onto each new assignment so the row survives a rename. */
  subjectLabel: string;
  heading?: string;
}) {
  const me = useCurrentUser();
  const all = useAssignments();
  const [open, setOpen] = useState(false);
  const [showDone, setShowDone] = useState(false);

  const mine = forSubject(all, subject);
  const openRows = sortForList(mine.filter(isOpen));
  const doneRows = sortByDoneDesc(mine.filter(isDone));

  const noun = subject.kind === "store" ? "door" : "report";

  return (
    <section className="mb-10">
      <SectionHeading
        action={
          !open && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="pixel-face text-[10px] text-sollos-orange underline underline-offset-4"
            >
              ASSIGN THIS {noun.toUpperCase()}
            </button>
          )
        }
      >
        {heading}
        {openRows.length > 0 ? ` (${openRows.length})` : ""}
      </SectionHeading>

      {open && (
        <AssignForm
          subject={subject}
          subjectLabel={subjectLabel}
          me={me}
          noun={noun}
          onClose={() => setOpen(false)}
        />
      )}

      {openRows.length === 0 && !open && (
        <p className="text-sm text-sollos-navy/50">
          Nobody is on this {noun} right now.
        </p>
      )}

      {openRows.length > 0 && (
        <ul className="grid gap-3">
          {openRows.map((a) => (
            <AssignmentCard key={a.id} assignment={a} />
          ))}
        </ul>
      )}

      {doneRows.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            className="pixel-face text-[10px] text-sollos-navy/45 underline underline-offset-4 transition-colors hover:text-sollos-navy"
          >
            {showDone ? "HIDE" : "SHOW"} {doneRows.length} DONE
          </button>
          {showDone && (
            <ul className="mt-3 grid gap-3">
              {doneRows.map((a) => (
                <AssignmentCard key={a.id} assignment={a} />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function AssignForm({
  subject,
  subjectLabel,
  me,
  noun,
  onClose,
}: {
  subject: Subject;
  subjectLabel: string;
  me: string | null;
  noun: string;
  onClose: () => void;
}) {
  // Defaulting to yourself is the common case: most of these get written down
  // by the person who just noticed the problem and intends to handle it.
  const [assignee, setAssignee] = useState(me ?? PEOPLE[0]?.email ?? "");
  const [note, setNote] = useState("");
  const [dueDate, setDueDate] = useState("");

  const submit = () => {
    if (!assignee) return;
    addAssignment({
      id: newId("asg"),
      subject,
      subjectLabel,
      assigneeEmail: assignee,
      assignedByEmail: me ?? assignee,
      note: note.trim(),
      dueDate: dueDate || null,
      createdAt: new Date().toISOString(),
      doneAt: null,
      doneByEmail: null,
    });
    onClose();
  };

  return (
    <div className="card mb-4 p-5">
      <fieldset>
        <legend className="pixel-face mb-2.5 text-[10px] uppercase tracking-[0.06em] text-sollos-navy/50">
          Who is on it
        </legend>
        <div className="flex flex-wrap gap-2">
          {PEOPLE.map((person) => {
            const picked = person.email === assignee;
            return (
              <button
                key={person.email}
                type="button"
                aria-pressed={picked}
                onClick={() => setAssignee(person.email)}
                className={`inline-flex items-center gap-2 border-2 px-2.5 py-1.5 transition-colors ${
                  picked
                    ? "border-sollos-navy bg-sollos-navy text-white"
                    : "border-sollos-navy/15 bg-white text-sollos-navy/70 hover:border-sollos-navy/40"
                }`}
              >
                <PixelAvatar email={person.email} size={22} />
                <span className="pixel-face text-[10px]">
                  {person.email === me ? "You" : person.name}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="mt-4 block text-xs font-medium text-sollos-navy/60">
        What needs doing
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder={
            noun === "door"
              ? "Call and check whether the last two cases moved."
              : "Chase the missing week-ending column before Friday."
          }
          className={`mt-1.5 ${inputClass}`}
        />
      </label>

      <label className="mt-3 block text-xs font-medium text-sollos-navy/60">
        Due by (optional)
        <input
          type="date"
          value={dueDate}
          min={todayIso()}
          onChange={(e) => setDueDate(e.target.value)}
          className={`mt-1.5 ${inputClass}`}
        />
      </label>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <PrimaryButton onClick={submit} disabled={!assignee}>
          Assign
        </PrimaryButton>
        <GhostButton onClick={onClose}>Cancel</GhostButton>
        <span className="text-xs text-sollos-navy/45">Saved to this browser only.</span>
      </div>
    </div>
  );
}
