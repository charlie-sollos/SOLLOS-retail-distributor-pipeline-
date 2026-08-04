import { describe, expect, it } from "vitest";
import {
  hasNote,
  latestEntry,
  productionDataGaps,
  productionReport,
  summarizeProduction,
  upcomingSchedule,
  type ProductionEntry,
} from "@/lib/reports";

const entry = (over: Partial<ProductionEntry> = {}): ProductionEntry => ({
  id: "e",
  completedBy: "someone",
  dateCompleted: null,
  status: "Running",
  batchNumber: "1",
  plannedCases: 10,
  actualCases: 10,
  nextProductionDate: null,
  finishedGoodsCases: 0,
  casesShippedThisWeek: 0,
  nextShipmentDate: null,
  notes: "no",
  ...over,
});

describe("hasNote", () => {
  it("reads a bare no as an answer, not a remark", () => {
    expect(hasNote(entry({ notes: "no" }))).toBe(false);
    expect(hasNote(entry({ notes: "No" }))).toBe(false);
    expect(hasNote(entry({ notes: "  " }))).toBe(false);
    expect(hasNote(entry({ notes: "none" }))).toBe(false);
  });

  it("survives a row transcribed without the notes column", () => {
    expect(hasNote({ ...entry(), notes: undefined as unknown as string })).toBe(false);
  });

  it("treats anything else as worth surfacing", () => {
    expect(hasNote(entry({ notes: "yes" }))).toBe(true);
    expect(hasNote(entry({ notes: "capper jammed twice" }))).toBe(true);
  });
});

describe("summarizeProduction", () => {
  const entries = [
    entry({ id: "a", plannedCases: 5, actualCases: 4, finishedGoodsCases: 4, casesShippedThisWeek: 3 }),
    entry({ id: "b", plannedCases: 5, actualCases: 5, finishedGoodsCases: 8, casesShippedThisWeek: 9, status: "Not Running" }),
  ];

  it("adds up the flows", () => {
    const s = summarizeProduction(entries);
    expect(s.plannedCases).toBe(10);
    expect(s.actualCases).toBe(9);
    expect(s.casesShipped).toBe(12);
    expect(s.attainmentPct).toBe(90);
  });

  it("takes the latest reading for finished goods rather than adding them", () => {
    // 4 and 8 are two readings of the same shelf, so 12 would be nonsense.
    expect(summarizeProduction(entries).finishedGoodsCases).toBe(8);
  });

  it("names the submissions that came in under plan", () => {
    expect(summarizeProduction(entries).underPlan.map((e) => e.id)).toEqual(["a"]);
  });

  it("counts a stopped line", () => {
    const s = summarizeProduction(entries);
    expect(s.running).toBe(1);
    expect(s.notRunning).toBe(1);
  });

  it("does not divide by a zero plan", () => {
    expect(summarizeProduction([entry({ plannedCases: 0, actualCases: 0 })]).attainmentPct).toBeNull();
  });

  it("copes with nothing at all", () => {
    const s = summarizeProduction([]);
    expect(s.submissions).toBe(0);
    expect(s.finishedGoodsCases).toBeNull();
  });
});

describe("latestEntry", () => {
  it("prefers a real date when one is filled in", () => {
    const rows = [
      entry({ id: "old", dateCompleted: "2026-07-01" }),
      entry({ id: "new", dateCompleted: "2026-08-04" }),
      entry({ id: "undated" }),
    ];
    expect(latestEntry(rows)?.id).toBe("new");
  });

  it("falls back to file order when every date is blank", () => {
    expect(latestEntry([entry({ id: "a" }), entry({ id: "b" })])?.id).toBe("b");
  });

  it("returns null for an empty report", () => {
    expect(latestEntry([])).toBeNull();
  });
});

describe("productionDataGaps", () => {
  it("calls out the missing week column, which is the one that matters", () => {
    const gaps = productionDataGaps([entry()]);
    expect(gaps.some((g) => g.field === "Week ending")).toBe(true);
  });

  it("counts blank completion dates", () => {
    const gaps = productionDataGaps([entry({ dateCompleted: null }), entry({ dateCompleted: "2026-08-04" })]);
    expect(gaps.find((g) => g.field === "Date Completed")?.detail).toContain("1 of 2");
  });

  it("catches a batch number used twice", () => {
    const gaps = productionDataGaps([entry({ batchNumber: "5" }), entry({ batchNumber: "5" })]);
    expect(gaps.find((g) => g.field === "Batch/Lot Number")?.detail).toContain("Batch 5 appears");
  });

  it("reads properly when several batch numbers collide", () => {
    const gaps = productionDataGaps([
      entry({ batchNumber: "5" }),
      entry({ batchNumber: "5" }),
      entry({ batchNumber: "4" }),
      entry({ batchNumber: "4" }),
    ]);
    expect(gaps.find((g) => g.field === "Batch/Lot Number")?.detail).toContain(
      "Batches 5 and 4 appear"
    );
  });

  it("says nothing about an empty report", () => {
    expect(productionDataGaps([])).toEqual([]);
  });
});

describe("upcomingSchedule", () => {
  it("interleaves production and shipment dates, soonest first", () => {
    const rows = [
      entry({ id: "a", nextProductionDate: "2026-08-20", nextShipmentDate: "2026-08-14" }),
      entry({ id: "b", nextProductionDate: "2026-08-12" }),
    ];
    expect(upcomingSchedule(rows).map((s) => s.date)).toEqual([
      "2026-08-12",
      "2026-08-14",
      "2026-08-20",
    ]);
  });

  it("skips blank dates rather than emitting empty rows", () => {
    expect(upcomingSchedule([entry()])).toEqual([]);
  });
});

describe("the transcribed report", () => {
  it("is still marked as placeholder data", () => {
    // Fails the moment a real report replaces it, which is the reminder to
    // drop the placeholder banner and check the figures are real.
    expect(productionReport.placeholder).toBe(true);
    expect(productionReport.entries).toHaveLength(4);
  });

  it("matches the spreadsheet totals", () => {
    const s = summarizeProduction(productionReport.entries);
    expect(s.plannedCases).toBe(18);
    expect(s.actualCases).toBe(16);
    expect(s.casesShipped).toBe(16);
    expect(s.attainmentPct).toBe(88.9);
  });
});
