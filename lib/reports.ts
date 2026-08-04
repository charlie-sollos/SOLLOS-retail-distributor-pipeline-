import productionSeed from "@/data/reports/weekly-production.json";

/**
 * The weekly reports SOLLOS collects. Each one arrives as a spreadsheet and gets
 * read into here by hand, once a week, so the shape is deliberately close to the
 * source columns rather than normalised away from them.
 */
export type ReportKey = "production" | "account-check-in" | "distributor-inventory";

export type ReportMeta = {
  key: ReportKey;
  title: string;
  /** What the report is for, in one line. */
  purpose: string;
  href: string;
  /** "live" once a spreadsheet has been received and read in. */
  status: "live" | "awaiting";
};

export const REPORTS: ReportMeta[] = [
  {
    key: "production",
    title: "Weekly Production Report",
    purpose: "What the co-packer planned, ran, holds and shipped each week.",
    href: "/reports/production",
    status: "live",
  },
  {
    key: "account-check-in",
    title: "Weekly Account Check-In",
    purpose: "Door-level check-ins from the field.",
    href: "/reports/account-check-in",
    status: "awaiting",
  },
  {
    key: "distributor-inventory",
    title: "Weekly Distributor Inventory Report",
    purpose: "What each distributor is holding.",
    href: "/reports/distributor-inventory",
    status: "awaiting",
  },
];

export type ProductionStatus = "Running" | "Not Running";

/** One row of the Weekly Production Report, which is one submission. */
export type ProductionEntry = {
  id: string;
  completedBy: string;
  /** Often blank in practice, which is why it cannot be relied on to order rows. */
  dateCompleted: string | null;
  status: ProductionStatus | string;
  batchNumber: string;
  plannedCases: number;
  actualCases: number;
  nextProductionDate: string | null;
  /** A stock level at the moment of reporting, not a flow. Never summed. */
  finishedGoodsCases: number;
  casesShippedThisWeek: number;
  nextShipmentDate: string | null;
  notes: string;
};

export type ProductionReport = {
  /** True while the file holds sample rows rather than real submissions. */
  placeholder: boolean;
  sourceFile: string;
  receivedOn: string;
  entries: ProductionEntry[];
};

export const productionReport = productionSeed as ProductionReport;

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * A note only counts as a note when it says something. The source column is
 * "Any production risks/other notes worth mentioning" and gets filled in with a
 * bare yes or no, so a "no" is an answer to the question, not a remark.
 */
export function hasNote(entry: ProductionEntry): boolean {
  // These rows are transcribed by hand from a spreadsheet whose columns may move,
  // so a missing field reads as "nothing flagged" rather than taking the page down.
  const n = (entry.notes ?? "").trim().toLowerCase();
  return n !== "" && n !== "no" && n !== "n/a" && n !== "none";
}

export type ProductionSummary = {
  submissions: number;
  /** Cases planned and produced are flows, so they add up across submissions. */
  plannedCases: number;
  actualCases: number;
  casesShipped: number;
  /** Actual over planned, as a percentage. Null when nothing was planned. */
  attainmentPct: number | null;
  /** Submissions that produced less than they planned. */
  underPlan: ProductionEntry[];
  running: number;
  notRunning: number;
  flagged: ProductionEntry[];
  /**
   * Finished goods is a stock reading, so the latest submission is the answer
   * and adding them up would be a category error. Null when there is nothing to
   * read. See latestEntry for the caveat about what "latest" can mean here.
   */
  finishedGoodsCases: number | null;
};

/**
 * The most recent submission.
 *
 * Falls back to file order, because the report has no week-ending column and
 * Date Completed is usually blank. That makes "latest" an assumption about the
 * order rows were added in, which is why the dashboard says so out loud rather
 * than presenting the finished goods figure as current fact.
 */
export function latestEntry(entries: ProductionEntry[]): ProductionEntry | null {
  if (entries.length === 0) return null;
  const dated = entries.filter((e) => e.dateCompleted);
  if (dated.length > 0) {
    return dated.reduce((a, e) => (e.dateCompleted! > a.dateCompleted! ? e : a));
  }
  return entries[entries.length - 1];
}

export function summarizeProduction(entries: ProductionEntry[]): ProductionSummary {
  const plannedCases = entries.reduce((s, e) => s + e.plannedCases, 0);
  const actualCases = entries.reduce((s, e) => s + e.actualCases, 0);
  const latest = latestEntry(entries);
  return {
    submissions: entries.length,
    plannedCases,
    actualCases,
    casesShipped: entries.reduce((s, e) => s + e.casesShippedThisWeek, 0),
    attainmentPct: plannedCases > 0 ? round1((actualCases / plannedCases) * 100) : null,
    underPlan: entries.filter((e) => e.actualCases < e.plannedCases),
    running: entries.filter((e) => e.status === "Running").length,
    notRunning: entries.filter((e) => e.status !== "Running").length,
    flagged: entries.filter(hasNote),
    finishedGoodsCases: latest ? latest.finishedGoodsCases : null,
  };
}

export type DataGap = { field: string; detail: string };

/**
 * What the report cannot answer as it currently stands.
 *
 * Surfaced in the UI rather than kept in a note somewhere, because these are
 * fixable at the source with one column, and every week the form goes out
 * unchanged is another week of submissions that cannot be placed in time.
 */
export function productionDataGaps(entries: ProductionEntry[]): DataGap[] {
  const gaps: DataGap[] = [];
  if (entries.length === 0) return gaps;

  const missingDate = entries.filter((e) => !e.dateCompleted).length;
  if (missingDate > 0) {
    gaps.push({
      field: "Date Completed",
      detail: `Blank on ${missingDate} of ${entries.length} submissions, so rows cannot be ordered by when they were filled in.`,
    });
  }

  gaps.push({
    field: "Week ending",
    detail:
      "The report has no week column at all. Without one, two submissions from the same week look identical to two from different weeks, and nothing here can be trended.",
  });

  const duplicateBatches = new Map<string, number>();
  for (const e of entries) {
    duplicateBatches.set(e.batchNumber, (duplicateBatches.get(e.batchNumber) ?? 0) + 1);
  }
  const repeated = [...duplicateBatches.entries()].filter(([, n]) => n > 1).map(([b]) => b);
  if (repeated.length > 0) {
    const list =
      repeated.length === 1
        ? `Batch ${repeated[0]} appears`
        : `Batches ${repeated.slice(0, -1).join(", ")} and ${repeated[repeated.length - 1]} appear`;
    gaps.push({
      field: "Batch/Lot Number",
      detail: `${list} on more than one submission. If a lot number is meant to be unique, these collide.`,
    });
  }

  return gaps;
}

/** Upcoming production and shipment dates, soonest first. */
export type ScheduledDate = { date: string; kind: "Production" | "Shipment"; entry: ProductionEntry };

export function upcomingSchedule(entries: ProductionEntry[]): ScheduledDate[] {
  const out: ScheduledDate[] = [];
  for (const e of entries) {
    if (e.nextProductionDate) out.push({ date: e.nextProductionDate, kind: "Production", entry: e });
    if (e.nextShipmentDate) out.push({ date: e.nextShipmentDate, kind: "Shipment", entry: e });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
