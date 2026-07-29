import { DEFAULT_PRICING, derivePricing, type DerivedPricing } from "@/lib/pricing";

/** A reporting period's sell-through at one store. */
export type VelocityEntry = {
  /** Stable id so entries can be edited and deleted. Seed rows predate this and may omit it. */
  id?: string;
  weekStart: string;
  weekEnd: string;
  days: number;
  unitsSold: number;
  unitsPerDay: number;
  /** Retail sell-through at SRP. This is the store's ring, not SOLLOS revenue. */
  revenue: number;
  /** The retailer's margin at SRP. */
  grossProfit: number;
  /** What SOLLOS billed for the cases these units came from. */
  sollosRevenue?: number;
  /** The pricing in force when this row was entered, so history stays auditable. */
  pricing?: { srp: number; caseCost: number; caseSize: number };
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** A period shorter than this cannot be fairly compared against a full week. */
export const MIN_COMPARABLE_DAYS = 5;
/** How far back "current rate" looks. */
export const TRAILING_WINDOW_DAYS = 28;

export function daysBetween(startIso: string, endIso: string): number {
  const start = new Date(startIso + "T00:00:00Z").getTime();
  const end = new Date(endIso + "T00:00:00Z").getTime();
  return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
}

export function computeEntry(
  weekStart: string,
  weekEnd: string,
  unitsSold: number,
  pricing: DerivedPricing = derivePricing(DEFAULT_PRICING),
  id?: string
): VelocityEntry {
  const days = daysBetween(weekStart, weekEnd);
  return {
    id: id ?? `e_${weekStart}_${weekEnd}_${unitsSold}`,
    weekStart,
    weekEnd,
    days,
    unitsSold,
    unitsPerDay: round2(unitsSold / days),
    revenue: round2(unitsSold * pricing.srp),
    grossProfit: round2(unitsSold * pricing.gpPerCan),
    sollosRevenue: round2((unitsSold / pricing.caseSize) * pricing.caseCost),
    pricing: { srp: pricing.srp, caseCost: pricing.caseCost, caseSize: pricing.caseSize },
  };
}

export function sortByWeek(entries: VelocityEntry[]): VelocityEntry[] {
  return [...entries].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

/**
 * Pooled units/day over the most recent stretch of recorded coverage.
 * This, not the lifetime average, is what should drive restock decisions:
 * a store that sold hard once and then died must not keep a high estimate.
 */
export function trailingRate(
  entries: VelocityEntry[],
  windowDays: number = TRAILING_WINDOW_DAYS
): number {
  const sorted = sortByWeek(entries);
  let units = 0;
  let days = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    units += sorted[i].unitsSold;
    days += sorted[i].days;
    if (days >= windowDays) break;
  }
  return days ? round2(units / days) : 0;
}

export function summarize(entries: VelocityEntry[]) {
  const totalUnits = entries.reduce((sum, e) => sum + e.unitsSold, 0);
  const totalDays = entries.reduce((sum, e) => sum + e.days, 0);
  const lifetimeUnitsPerDay = totalDays ? round2(totalUnits / totalDays) : 0;
  return {
    totalUnits,
    totalDays,
    /** Recency weighted. Use this for anything forward looking. */
    avgUnitsPerDay: trailingRate(entries),
    /** All time pooled rate. Historical context only. */
    lifetimeUnitsPerDay,
    totalRevenue: round2(entries.reduce((sum, e) => sum + e.revenue, 0)),
    totalGrossProfit: round2(entries.reduce((sum, e) => sum + e.grossProfit, 0)),
    totalSollosRevenue: round2(
      entries.reduce((sum, e) => sum + (e.sollosRevenue ?? estimateSollosRevenue(e)), 0)
    ),
  };
}

/** Back-fill for rows saved before sollosRevenue existed. */
function estimateSollosRevenue(e: VelocityEntry): number {
  const caseSize = e.pricing?.caseSize ?? DEFAULT_PRICING.caseSize;
  const caseCost = e.pricing?.caseCost ?? DEFAULT_PRICING.caseCost;
  return (e.unitsSold / caseSize) * caseCost;
}

export type SignalTone = "growing" | "steady" | "declining" | "no-data";

export type Signal = { label: string; tone: SignalTone };

export const toneStyle: Record<SignalTone, string> = {
  growing: "bg-sollos-good/12 text-sollos-good",
  steady: "bg-sollos-sky text-sollos-navy",
  declining: "bg-sollos-orange/12 text-sollos-orange",
  "no-data": "bg-sollos-navy/8 text-sollos-navy/55",
};

/**
 * Asks the question an operator actually has: is this store selling slower right
 * now than it has been? Compares the latest period against every period before it,
 * pooling the baseline by days so no period counts more than it covers.
 *
 * Three deliberate choices:
 * - Periods shorter than MIN_COMPARABLE_DAYS drop out, because holding a 3 day
 *   holiday window against a full week reads as a collapse that never happened.
 * - The baseline is the whole prior record, not the first half. Splitting the
 *   series down the middle lets one weak opening week drag the baseline under the
 *   current rate, which reports a genuine crash as growth.
 * - The latest single period is "now". That makes the signal responsive enough to
 *   catch a fresh drop, at the cost of reacting to one noisy week, which is the
 *   right trade for a label that only ever says "worth a check-in".
 */
export function trendSignal(entries: VelocityEntry[]): Signal {
  if (entries.length === 0) return { label: "No data yet", tone: "no-data" };

  const comparable = sortByWeek(entries).filter((e) => e.days >= MIN_COMPARABLE_DAYS);
  const series = comparable.length >= 2 ? comparable : sortByWeek(entries);
  if (series.length < 2) return { label: "Needs another week", tone: "no-data" };

  const pooled = (arr: VelocityEntry[]) => {
    const d = arr.reduce((s, e) => s + e.days, 0);
    return d ? arr.reduce((s, e) => s + e.unitsSold, 0) / d : 0;
  };

  const split = series.length - 1;
  const before = pooled(series.slice(0, split));
  const after = pooled(series.slice(split));

  if (before === 0) {
    return after > 0
      ? { label: "Growing, room to amp up", tone: "growing" }
      : { label: "No movement", tone: "declining" };
  }

  const ratio = after / before;
  if (ratio <= 0.5) return { label: "Declining, worth a check-in", tone: "declining" };
  if (ratio < 0.85) return { label: "Slowing down", tone: "declining" };
  if (ratio >= 1.15) return { label: "Growing, room to amp up", tone: "growing" };
  return { label: "Steady", tone: "steady" };
}

export function weeklyCasesEstimate(
  unitsPerDay: number,
  caseSize: number = DEFAULT_PRICING.caseSize
): number {
  const size = caseSize > 0 ? caseSize : DEFAULT_PRICING.caseSize;
  return round2((unitsPerDay * 7) / size);
}

/** Monday of the ISO week containing the given date, so ad hoc start dates align. */
export function isoWeekStart(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().slice(0, 10);
}

/**
 * Which calendar week a reporting period belongs to. Uses the midpoint, not the
 * start, because a Sunday-to-Saturday week starts in the previous ISO week and
 * would otherwise be filed one week early and collide with its predecessor.
 */
export function weekBucket(weekStart: string, weekEnd: string): string {
  const start = new Date(weekStart + "T00:00:00Z").getTime();
  const end = new Date(weekEnd + "T00:00:00Z").getTime();
  const mid = new Date(start + (end - start) / 2);
  return isoWeekStart(mid.toISOString().slice(0, 10));
}

export type WeeklyAggregate = {
  weekStart: string;
  weekEnd: string;
  unitsSold: number;
  revenue: number;
  sollosRevenue: number;
  storeCount: number;
};

/**
 * Rolls every store's entries up into calendar weeks. Buckets on the Monday of
 * the ISO week rather than the raw typed start date, so two stores reporting the
 * same real week as the 1st and the 2nd land in one point instead of two.
 */
export function aggregateByWeek(allEntries: VelocityEntry[]): WeeklyAggregate[] {
  const byWeek = new Map<string, WeeklyAggregate>();
  for (const e of allEntries) {
    const key = weekBucket(e.weekStart, e.weekEnd);
    const existing = byWeek.get(key);
    if (existing) {
      existing.unitsSold += e.unitsSold;
      existing.revenue += e.revenue;
      existing.sollosRevenue += e.sollosRevenue ?? estimateSollosRevenue(e);
      existing.storeCount += 1;
      if (e.weekEnd > existing.weekEnd) existing.weekEnd = e.weekEnd;
    } else {
      byWeek.set(key, {
        weekStart: key,
        weekEnd: e.weekEnd,
        unitsSold: e.unitsSold,
        revenue: e.revenue,
        sollosRevenue: e.sollosRevenue ?? estimateSollosRevenue(e),
        storeCount: 1,
      });
    }
  }
  return Array.from(byWeek.values())
    .map((w) => ({ ...w, revenue: round2(w.revenue), sollosRevenue: round2(w.sollosRevenue) }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

/** Days until the shelf runs dry, given what is on hand and the current rate. */
export function daysOfCover(unitsOnHand: number, unitsPerDay: number): number | null {
  if (unitsPerDay <= 0) return null;
  return Math.floor(unitsOnHand / unitsPerDay);
}

export type EntryProblem = { field: "weekStart" | "weekEnd" | "unitsSold"; message: string };

/** Everything the add-a-week form must reject before it can write. */
export function validateEntry(
  weekStart: string,
  weekEnd: string,
  unitsSoldRaw: string,
  existing: VelocityEntry[],
  today: string
): EntryProblem[] {
  const problems: EntryProblem[] = [];
  if (!weekStart) problems.push({ field: "weekStart", message: "Pick a start date." });
  if (!weekEnd) problems.push({ field: "weekEnd", message: "Pick an end date." });
  if (!unitsSoldRaw.trim()) problems.push({ field: "unitsSold", message: "Enter units sold." });
  if (problems.length) return problems;

  if (weekEnd < weekStart) {
    return [{ field: "weekEnd", message: "End date must be on or after the start date." }];
  }
  if (weekEnd > today) {
    problems.push({ field: "weekEnd", message: "That period has not finished yet." });
  }
  const days = daysBetween(weekStart, weekEnd);
  if (days > 31) {
    problems.push({ field: "weekEnd", message: `That is ${days} days. Enter one period at a time.` });
  }

  const units = Number(unitsSoldRaw);
  if (!Number.isFinite(units) || units < 0) {
    problems.push({ field: "unitsSold", message: "Units must be zero or more." });
  } else if (!Number.isInteger(units)) {
    problems.push({ field: "unitsSold", message: "Units must be a whole number of cans." });
  } else if (units > 100_000) {
    problems.push({ field: "unitsSold", message: "That looks like a typo. Check the number." });
  }

  // Any calendar overlap double counts sales, so block it rather than warn.
  for (const e of existing) {
    if (weekStart <= e.weekEnd && e.weekStart <= weekEnd) {
      problems.push({
        field: "weekStart",
        message: `That overlaps a period already recorded (${e.weekStart} to ${e.weekEnd}).`,
      });
      break;
    }
  }
  return problems;
}
