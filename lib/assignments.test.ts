import { describe, expect, it } from "vitest";
import {
  addDays,
  daysBetween,
  dueLabel,
  dueState,
  formatDate,
  isOverdue,
  openAssignedTo,
  openForSubject,
  relativeTime,
  sortForList,
  subjectHref,
  todayIso,
  type Assignment,
} from "@/lib/assignments";

const TODAY = "2026-08-07";

function assignment(over: Partial<Assignment> = {}): Assignment {
  return {
    id: "asg_1",
    subject: { kind: "store", id: "golden-hog" },
    subjectLabel: "The Golden Hog",
    assigneeEmail: "rodolfo@drinksollos.com",
    assignedByEmail: "charlie@drinksollos.com",
    note: "Count what is on the shelf.",
    dueDate: null,
    createdAt: "2026-08-01T12:00:00.000Z",
    doneAt: null,
    doneByEmail: null,
    ...over,
  };
}

describe("todayIso", () => {
  /**
   * The bug this guards against: toISOString().slice(0, 10) is the UTC day, so
   * anywhere west of Greenwich it reports tomorrow all evening and marks a
   * due-today item late several hours early.
   */
  it("reads the local day, not the UTC one", () => {
    // 8pm on the US east coast, which is already the 8th in UTC.
    const evening = new Date(2026, 7, 7, 20, 30);
    expect(todayIso(evening)).toBe("2026-08-07");
  });

  it("pads a single-digit month and day", () => {
    expect(todayIso(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("addDays", () => {
  it("crosses a month end", () => {
    expect(addDays("2026-08-30", 3)).toBe("2026-09-02");
  });

  it("goes backwards", () => {
    expect(addDays("2026-09-01", -1)).toBe("2026-08-31");
  });

  /** Built and read in UTC so a clock change never lands it on the wrong day. */
  it("survives the spring daylight-saving jump", () => {
    expect(addDays("2026-03-07", 1)).toBe("2026-03-08");
    expect(addDays("2026-03-08", 1)).toBe("2026-03-09");
  });
});

describe("dueState", () => {
  it("has no state without a date", () => {
    expect(dueState(assignment(), TODAY)).toBe("none");
  });

  it("reads yesterday as overdue and today as today", () => {
    expect(dueState(assignment({ dueDate: "2026-08-06" }), TODAY)).toBe("overdue");
    expect(dueState(assignment({ dueDate: TODAY }), TODAY)).toBe("today");
  });

  it("calls the next three days soon and anything past that later", () => {
    expect(dueState(assignment({ dueDate: "2026-08-10" }), TODAY)).toBe("soon");
    expect(dueState(assignment({ dueDate: "2026-08-11" }), TODAY)).toBe("later");
  });

  /** Something finished late is finished, not a standing alert. */
  it("drops the state once the item is done", () => {
    const done = assignment({ dueDate: "2026-07-01", doneAt: "2026-08-01T09:00:00.000Z" });
    expect(dueState(done, TODAY)).toBe("none");
    expect(isOverdue(done, TODAY)).toBe(false);
  });
});

describe("dueLabel", () => {
  it("counts the days late", () => {
    expect(dueLabel(assignment({ dueDate: "2026-08-06" }), TODAY)).toBe("1 day late");
    expect(dueLabel(assignment({ dueDate: "2026-08-02" }), TODAY)).toBe("5 days late");
  });

  it("uses words up close and a date further out", () => {
    expect(dueLabel(assignment({ dueDate: TODAY }), TODAY)).toBe("Due today");
    expect(dueLabel(assignment({ dueDate: "2026-08-08" }), TODAY)).toBe("Due tomorrow");
    expect(dueLabel(assignment({ dueDate: "2026-08-11" }), TODAY)).toBe("Due in 4 days");
    expect(dueLabel(assignment({ dueDate: "2026-09-01" }), TODAY)).toBe("Due 1 Sep");
  });

  it("says nothing when there is no date", () => {
    expect(dueLabel(assignment(), TODAY)).toBeNull();
  });
});

describe("sortForList", () => {
  it("puts the late first, then the soonest, then the undated", () => {
    const rows = [
      assignment({ id: "undated" }),
      assignment({ id: "far", dueDate: "2026-09-01" }),
      assignment({ id: "late", dueDate: "2026-08-01" }),
      assignment({ id: "today", dueDate: TODAY }),
      assignment({ id: "soon", dueDate: "2026-08-09" }),
    ];
    expect(sortForList(rows, TODAY).map((a) => a.id)).toEqual([
      "late",
      "today",
      "soon",
      "far",
      "undated",
    ]);
  });

  it("breaks a tie on when the work was handed over", () => {
    const rows = [
      assignment({ id: "second", createdAt: "2026-08-05T09:00:00.000Z" }),
      assignment({ id: "first", createdAt: "2026-08-02T09:00:00.000Z" }),
    ];
    expect(sortForList(rows, TODAY).map((a) => a.id)).toEqual(["first", "second"]);
  });

  it("leaves the input alone", () => {
    const rows = [assignment({ id: "b", dueDate: "2026-09-01" }), assignment({ id: "a" })];
    sortForList(rows, TODAY);
    expect(rows.map((a) => a.id)).toEqual(["b", "a"]);
  });
});

describe("filtering", () => {
  const rows = [
    assignment({ id: "mine-open" }),
    assignment({ id: "mine-done", doneAt: "2026-08-06T09:00:00.000Z" }),
    assignment({ id: "theirs", assigneeEmail: "dillon@drinksollos.com" }),
    assignment({ id: "other-door", subject: { kind: "store", id: "al-fresco" } }),
    assignment({ id: "a-report", subject: { kind: "report", id: "production" } }),
  ];

  it("finds what is open against one person", () => {
    expect(openAssignedTo(rows, "rodolfo@drinksollos.com").map((a) => a.id)).toEqual([
      "mine-open",
      "other-door",
      "a-report",
    ]);
  });

  it("keeps a door and a report with the same id apart", () => {
    const clash = [
      assignment({ id: "door", subject: { kind: "store", id: "production" } }),
      assignment({ id: "report", subject: { kind: "report", id: "production" } }),
    ];
    expect(openForSubject(clash, { kind: "report", id: "production" }).map((a) => a.id)).toEqual([
      "report",
    ]);
  });
});

describe("subjectHref", () => {
  it("points at the door", () => {
    expect(subjectHref({ kind: "store", id: "golden-hog" })).toBe("/stores/golden-hog");
  });

  it("points at the report", () => {
    expect(subjectHref({ kind: "report", id: "account-check-in" })).toBe(
      "/reports/account-check-in"
    );
  });

  it("falls back to the index rather than a dead link", () => {
    expect(subjectHref({ kind: "report", id: "not-a-report" })).toBe("/reports");
  });
});

describe("formatDate", () => {
  it("leaves this year's dates without a year", () => {
    expect(formatDate("2026-08-07", TODAY)).toBe("7 Aug");
  });

  it("adds the year for anything else", () => {
    expect(formatDate("2025-12-24", TODAY)).toBe("24 Dec 2025");
  });
});

describe("relativeTime", () => {
  const now = new Date("2026-08-07T12:00:00.000Z");

  it("counts up through the units", () => {
    expect(relativeTime("2026-08-07T11:59:40.000Z", now)).toBe("just now");
    expect(relativeTime("2026-08-07T11:30:00.000Z", now)).toBe("30m ago");
    expect(relativeTime("2026-08-07T08:00:00.000Z", now)).toBe("4h ago");
    expect(relativeTime("2026-08-06T12:00:00.000Z", now)).toBe("yesterday");
    expect(relativeTime("2026-08-04T12:00:00.000Z", now)).toBe("3 days ago");
  });

  it("gives a date once counting days stops helping", () => {
    expect(relativeTime("2026-07-01T12:00:00.000Z", now)).toBe("1 Jul");
  });

  it("says nothing rather than NaN on a broken timestamp", () => {
    expect(relativeTime("not a date", now)).toBe("");
  });
});

describe("daysBetween", () => {
  it("counts forwards and backwards", () => {
    expect(daysBetween("2026-08-07", "2026-08-10")).toBe(3);
    expect(daysBetween("2026-08-10", "2026-08-07")).toBe(-3);
  });
});
