import { REPORTS, type ReportKey } from "@/lib/reports";

/**
 * Putting somebody's name against a door or a report.
 *
 * The unit is deliberately small: one person, one thing, one line about what to
 * do. There is no status beyond open and done, no priority field and no
 * comments thread, because a four-person team does not need a ticket system and
 * anything more elaborate would go stale faster than it got read.
 *
 * Everything in this file is pure. What it means for the app to remember an
 * assignment lives in lib/teamStore.ts.
 */

export type SubjectKind = "store" | "report";

/** What is being assigned. Stores carry a location id, reports a ReportKey. */
export type Subject = { kind: SubjectKind; id: string };

export type Assignment = {
  id: string;
  subject: Subject;
  /**
   * The door or report name as it read when the assignment was made.
   *
   * Kept on the row rather than looked up, so an assignment against a door that
   * was since renamed, or one of the custom stores that only exists in this
   * browser, still renders as something a person recognises.
   */
  subjectLabel: string;
  assigneeEmail: string;
  assignedByEmail: string;
  /** What to actually do. Free text, and the only description there is. */
  note: string;
  /** "YYYY-MM-DD", or null for no date. */
  dueDate: string | null;
  createdAt: string;
  doneAt: string | null;
  doneByEmail: string | null;
};

export function isOpen(a: Assignment): boolean {
  return !a.doneAt;
}

export function isDone(a: Assignment): boolean {
  return Boolean(a.doneAt);
}

/**
 * Today as "YYYY-MM-DD" in the reader's own timezone.
 *
 * Not toISOString().slice(0, 10), which is UTC: for anyone west of Greenwich
 * that reports tomorrow's date all evening, and would mark a due-today item
 * overdue several hours early.
 */
export function todayIso(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export type DueState = "none" | "overdue" | "today" | "soon" | "later";

/** "soon" is the next three days, which is about as far ahead as this is useful. */
export function dueState(a: Assignment, today: string = todayIso()): DueState {
  if (!a.dueDate || isDone(a)) return "none";
  if (a.dueDate < today) return "overdue";
  if (a.dueDate === today) return "today";
  return a.dueDate <= addDays(today, 3) ? "soon" : "later";
}

export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  // Built in UTC and read back in UTC, so the arithmetic never crosses a DST
  // boundary and lands on the wrong day.
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function isOverdue(a: Assignment, today: string = todayIso()): boolean {
  return dueState(a, today) === "overdue";
}

export function assignedTo(rows: Assignment[], email: string): Assignment[] {
  return rows.filter((a) => a.assigneeEmail === email);
}

export function openAssignedTo(rows: Assignment[], email: string): Assignment[] {
  return rows.filter((a) => isOpen(a) && a.assigneeEmail === email);
}

export function openForSubject(rows: Assignment[], subject: Subject): Assignment[] {
  return rows.filter((a) => isOpen(a) && sameSubject(a.subject, subject));
}

export function forSubject(rows: Assignment[], subject: Subject): Assignment[] {
  return rows.filter((a) => sameSubject(a.subject, subject));
}

export function sameSubject(a: Subject, b: Subject): boolean {
  return a.kind === b.kind && a.id === b.id;
}

/**
 * The order the alert list reads in: anything late first, then anything dated
 * by how soon, then undated work by when it was handed over. An undated item
 * sorting below a dated one is the point, since a date is somebody saying this
 * one matters by then.
 */
export function sortForList(rows: Assignment[], today: string = todayIso()): Assignment[] {
  const rank = (a: Assignment) => {
    const state = dueState(a, today);
    if (state === "overdue") return 0;
    if (state === "today") return 1;
    if (state === "soon") return 2;
    if (state === "later") return 3;
    return 4;
  };
  return [...rows].sort((a, b) => {
    const byRank = rank(a) - rank(b);
    if (byRank !== 0) return byRank;
    if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) {
      return a.dueDate.localeCompare(b.dueDate);
    }
    return a.createdAt.localeCompare(b.createdAt);
  });
}

/** Most recently finished first, for the "done lately" list. */
export function sortByDoneDesc(rows: Assignment[]): Assignment[] {
  return [...rows].sort((a, b) => (b.doneAt ?? "").localeCompare(a.doneAt ?? ""));
}

export function subjectHref(subject: Subject): string {
  if (subject.kind === "store") return `/stores/${subject.id}`;
  return REPORTS.find((r) => r.key === (subject.id as ReportKey))?.href ?? "/reports";
}

export function subjectKindLabel(kind: SubjectKind): string {
  return kind === "store" ? "Door" : "Report";
}

/**
 * How a due date reads in a list. Relative for the near dates, because "in 2
 * days" is the thing you act on, and absolute once it is far enough out that
 * counting days stops meaning anything.
 */
export function dueLabel(a: Assignment, today: string = todayIso()): string | null {
  if (!a.dueDate) return null;
  if (isDone(a)) return `Was due ${formatDate(a.dueDate)}`;

  const state = dueState(a, today);
  if (state === "today") return "Due today";

  const days = daysBetween(today, a.dueDate);
  if (state === "overdue") {
    const late = Math.abs(days);
    return late === 1 ? "1 day late" : `${late} days late`;
  }
  if (days === 1) return "Due tomorrow";
  if (days <= 6) return `Due in ${days} days`;
  return `Due ${formatDate(a.dueDate)}`;
}

export function daysBetween(fromIso: string, toIso: string): number {
  const day = 24 * 60 * 60 * 1000;
  const [fy, fm, fd] = fromIso.split("-").map(Number);
  const [ty, tm, td] = toIso.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / day);
}

/** "2026-08-07" becomes "7 Aug". The year only when it is not this one. */
export function formatDate(isoDate: string, today: string = todayIso()): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const base = `${d} ${months[m - 1] ?? ""}`.trim();
  return String(y) === today.slice(0, 4) ? base : `${base} ${y}`;
}

/** "just now", "3h ago", "yesterday". Used on chat messages and done stamps. */
export function relativeTime(isoTimestamp: string, now: Date = new Date()): string {
  const then = new Date(isoTimestamp).getTime();
  if (!Number.isFinite(then)) return "";
  const seconds = Math.round((now.getTime() - then) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return formatDate(isoTimestamp.slice(0, 10), todayIso(now));
}
