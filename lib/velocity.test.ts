import { describe, expect, it } from "vitest";
import {
  aggregateByWeek,
  computeEntry,
  daysBetween,
  daysOfCover,
  isoWeekStart,
  summarize,
  trailingRate,
  trendSignal,
  validateEntry,
  weeklyCasesEstimate,
  weekBucket,
  type VelocityEntry,
} from "@/lib/velocity";
import { DEFAULT_PRICING, derivePricing, sanitizePricing } from "@/lib/pricing";

const P = derivePricing(DEFAULT_PRICING);

/** The real Golden Hog record, the only store with actual data. */
const GOLDEN_HOG: VelocityEntry[] = [
  computeEntry("2026-07-02", "2026-07-04", 12, P),
  computeEntry("2026-07-07", "2026-07-11", 11, P),
  computeEntry("2026-07-12", "2026-07-18", 11, P),
  computeEntry("2026-07-19", "2026-07-25", 10, P),
];

describe("pricing", () => {
  it("derives cost and gross profit per can from the sell sheet", () => {
    expect(P.costPerCan).toBeCloseTo(2.3, 10);
    expect(P.gpPerCan).toBeCloseTo(1.69, 10);
  });

  it("never lets a cleared or zero field produce NaN or Infinity", () => {
    expect(sanitizePricing({ caseSize: 0, caseCost: 27.6, srp: 3.99 }).caseSize).toBe(12);
    expect(sanitizePricing({ caseSize: NaN }).caseSize).toBe(12);
    expect(derivePricing({ caseSize: 0, caseCost: 27.6, srp: 3.99 }).costPerCan).toBeCloseTo(2.3, 10);
    expect(Number.isFinite(derivePricing({ caseSize: 0, caseCost: 1, srp: 1 }).gpPerCan)).toBe(true);
  });
});

describe("computeEntry", () => {
  it("counts an inclusive day span", () => {
    expect(daysBetween("2026-07-02", "2026-07-04")).toBe(3);
    expect(daysBetween("2026-07-19", "2026-07-25")).toBe(7);
  });

  it("matches the numbers in the velocity tracker spreadsheet", () => {
    const e = computeEntry("2026-07-02", "2026-07-04", 12, P);
    expect(e.days).toBe(3);
    expect(e.unitsPerDay).toBe(4);
    expect(e.revenue).toBe(47.88);
    expect(e.grossProfit).toBe(20.28);
  });

  it("bills SOLLOS by the case, not at retail", () => {
    // 12 cans is exactly one case at $27.60, while the shelf rings $47.88.
    const e = computeEntry("2026-07-02", "2026-07-04", 12, P);
    expect(e.sollosRevenue).toBe(27.6);
    expect(e.revenue).toBe(47.88);
  });

  it("snapshots the pricing that produced the row", () => {
    const e = computeEntry("2026-08-01", "2026-08-07", 10, derivePricing({ ...DEFAULT_PRICING, srp: 5 }));
    expect(e.pricing).toEqual({ srp: 5, caseCost: 27.6, caseSize: 12 });
    expect(e.revenue).toBe(50);
  });
});

describe("rates", () => {
  it("reports the trailing rate, not the flattering lifetime average", () => {
    const s = summarize(GOLDEN_HOG);
    expect(s.totalUnits).toBe(44);
    expect(s.lifetimeUnitsPerDay).toBe(2); // 44 / 22 days
    // The last 28 days of coverage is the whole record here, but the rate is
    // pooled over days so the 3 day window stops carrying a full week's weight.
    expect(s.avgUnitsPerDay).toBe(2);
    expect(trailingRate(GOLDEN_HOG, 7)).toBe(1.43); // the actual current week
  });

  it("does not let one hot week hold up a dead store's restock estimate", () => {
    const spikeThenDead: VelocityEntry[] = [
      computeEntry("2026-07-06", "2026-07-12", 70, P),
      computeEntry("2026-07-13", "2026-07-19", 0, P),
      computeEntry("2026-07-20", "2026-07-26", 0, P),
      computeEntry("2026-07-27", "2026-08-02", 0, P),
    ];
    expect(summarize(spikeThenDead).lifetimeUnitsPerDay).toBe(2.5); // lifetime says restock
    expect(trailingRate(spikeThenDead, 21)).toBe(0); // trailing tells the truth
  });

  it("converts a daily rate to cases per week and survives a zero case size", () => {
    expect(weeklyCasesEstimate(1.43, 12)).toBe(0.83);
    expect(weeklyCasesEstimate(2, 12)).toBe(1.17);
    expect(Number.isFinite(weeklyCasesEstimate(2, 0))).toBe(true);
  });
});

describe("trendSignal", () => {
  it("does not call Golden Hog a collapse on the back of a 3 day holiday window", () => {
    // The old rule read 4.00 u/day (3 days) against 1.43 (7 days) and said
    // "Declining, worth a check-in". Comparing like windows, it is slowing.
    expect(trendSignal(GOLDEN_HOG)).toEqual({ label: "Slowing down", tone: "declining" });
  });

  it("sees a real crash that the first-vs-last rule called steady", () => {
    const crashed: VelocityEntry[] = [
      computeEntry("2026-06-01", "2026-06-07", 7, P),
      computeEntry("2026-06-08", "2026-06-14", 21, P),
      computeEntry("2026-06-15", "2026-06-21", 22, P),
      computeEntry("2026-06-22", "2026-06-28", 22, P),
      computeEntry("2026-06-29", "2026-07-05", 7, P),
    ];
    expect(trendSignal(crashed).tone).toBe("declining");
  });

  it("flags real growth", () => {
    const growing: VelocityEntry[] = [
      computeEntry("2026-06-01", "2026-06-07", 7, P),
      computeEntry("2026-06-08", "2026-06-14", 8, P),
      computeEntry("2026-06-15", "2026-06-21", 20, P),
      computeEntry("2026-06-22", "2026-06-28", 24, P),
    ];
    expect(trendSignal(growing).tone).toBe("growing");
  });

  it("holds steady when the rate barely moves", () => {
    const steady: VelocityEntry[] = [
      computeEntry("2026-06-01", "2026-06-07", 14, P),
      computeEntry("2026-06-08", "2026-06-14", 14, P),
      computeEntry("2026-06-15", "2026-06-21", 15, P),
      computeEntry("2026-06-22", "2026-06-28", 14, P),
    ];
    expect(trendSignal(steady)).toEqual({ label: "Steady", tone: "steady" });
  });

  it("asks for more data instead of guessing", () => {
    expect(trendSignal([]).tone).toBe("no-data");
    expect(trendSignal([GOLDEN_HOG[0]]).tone).toBe("no-data");
  });
});

describe("aggregateByWeek", () => {
  it("puts two stores reporting the same real week in one bucket", () => {
    // Jul 1 (Wed) and Jul 2 (Thu) 2026 are both in the ISO week starting Jun 29.
    const rows = aggregateByWeek([
      computeEntry("2026-07-01", "2026-07-07", 10, P),
      computeEntry("2026-07-02", "2026-07-08", 10, P),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].weekStart).toBe("2026-06-29");
    expect(rows[0].unitsSold).toBe(20);
    expect(rows[0].storeCount).toBe(2);
  });

  it("keeps money clean instead of leaking float noise", () => {
    const rows = aggregateByWeek(GOLDEN_HOG);
    const total = rows.reduce((s, r) => s + r.revenue, 0);
    expect(Number(total.toFixed(2))).toBe(175.56);
    for (const r of rows) expect(r.revenue).toBe(Number(r.revenue.toFixed(2)));
  });

  it("anchors every week to a Monday", () => {
    expect(isoWeekStart("2026-07-04")).toBe("2026-06-29"); // Saturday
    expect(isoWeekStart("2026-06-29")).toBe("2026-06-29"); // Monday itself
    expect(isoWeekStart("2026-07-05")).toBe("2026-06-29"); // Sunday closes the week
  });

  it("files a Sunday to Saturday week under the week it mostly covers", () => {
    // Jul 12 2026 is a Sunday. Filing by start date would put this period in the
    // week beginning Jul 6, colliding with the period before it.
    expect(weekBucket("2026-07-12", "2026-07-18")).toBe("2026-07-13");
    expect(weekBucket("2026-07-07", "2026-07-11")).toBe("2026-07-06");
  });

  it("keeps four reported periods as four distinct weeks", () => {
    const rows = aggregateByWeek(GOLDEN_HOG);
    expect(rows).toHaveLength(4);
    expect(rows.map((r) => r.unitsSold)).toEqual([12, 11, 11, 10]);
  });
});

describe("daysOfCover", () => {
  it("names how long the shelf lasts", () => {
    expect(daysOfCover(24, 1.43)).toBe(16);
    expect(daysOfCover(0, 2)).toBe(0);
  });
  it("refuses to divide by a dead rate", () => {
    expect(daysOfCover(24, 0)).toBeNull();
  });
});

describe("validateEntry", () => {
  const today = "2026-08-10";
  it("accepts a clean period", () => {
    expect(validateEntry("2026-08-03", "2026-08-09", "14", [], today)).toEqual([]);
  });
  it("rejects a period that overlaps one already recorded", () => {
    const problems = validateEntry("2026-07-20", "2026-07-26", "9", GOLDEN_HOG, today);
    expect(problems.some((p) => p.message.includes("overlaps"))).toBe(true);
  });
  it("rejects an exact duplicate week", () => {
    expect(validateEntry("2026-07-19", "2026-07-25", "10", GOLDEN_HOG, today)).not.toEqual([]);
  });
  it("rejects the future, backwards ranges, absurd spans, and fractional cans", () => {
    expect(validateEntry("2026-09-01", "2026-09-07", "5", [], today)).not.toEqual([]);
    expect(validateEntry("2026-08-09", "2026-08-03", "5", [], today)).not.toEqual([]);
    expect(validateEntry("2026-01-01", "2026-07-01", "5", [], today)).not.toEqual([]);
    expect(validateEntry("2026-08-03", "2026-08-09", "2.5", [], today)).not.toEqual([]);
    expect(validateEntry("2026-08-03", "2026-08-09", "-1", [], today)).not.toEqual([]);
  });
});
