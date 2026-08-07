import productionSeed from "@/data/reports/weekly-production.json";
import checkInSeed from "@/data/reports/weekly-account-check-in.json";
import distributorSeed from "@/data/reports/weekly-distributor-inventory.json";
import { locations } from "@/lib/locations";

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
    status: "live",
  },
  {
    key: "distributor-inventory",
    title: "Weekly Distributor Inventory Report",
    purpose: "What each distributor is holding.",
    href: "/reports/distributor-inventory",
    status: "live",
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
  return isRealNote(entry.notes);
}

/**
 * The same question is asked on every one of the weekly forms, and gets the same
 * bare yes or no back, so the test for "did this actually say something" is shared.
 */
export function isRealNote(note: string | null | undefined): boolean {
  // These rows are transcribed by hand from a spreadsheet whose columns may move,
  // so a missing field reads as "nothing flagged" rather than taking the page down.
  const n = (note ?? "").trim().toLowerCase();
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

/* -------------------------------------------------------------------------- */
/*  Weekly Account Check-In                                                    */
/* -------------------------------------------------------------------------- */

/** How the field rates the chance of the door running dry before it reorders. */
export type StockoutRisk = "High" | "Medium" | "Low";

/** One row of the Weekly Account Check-In, which is one door visited once. */
export type CheckInEntry = {
  id: string;
  accountManager: string;
  /** Free text, typed by the manager. There is no store id on the form. */
  accountName: string;
  dateCompleted: string | null;
  /** One flavour per row, so a door carrying three needs three rows. */
  sku: string;
  /** Cases sitting at the door when it was visited. A stock level, not a flow. */
  currentCases: number;
  expectedReorderDate: string | null;
  expectedReorderCases: number;
  /** Self-reported, with no definition of the scale on the form. */
  stockoutRisk: StockoutRisk | string;
  promoComing: string;
  notes: string;
};

export type CheckInReport = {
  placeholder: boolean;
  sourceFile: string;
  receivedOn: string;
  entries: CheckInEntry[];
};

export const checkInReport = checkInSeed as CheckInReport;

/**
 * Whether a check-in row lines up with a door the app already tracks.
 *
 * The match is exact once punctuation and casing are set aside, and nothing
 * looser. A near match would quietly attach a manager's check-in to the wrong
 * door, and a wrong door is worse than an unmatched one: it reads as confirmed.
 */
function normalizeAccountName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/^the /, "")
    .trim();
}

const locationsByName = new Map(locations.map((l) => [normalizeAccountName(l.name), l]));

export function matchedDoorId(accountName: string): string | null {
  return locationsByName.get(normalizeAccountName(accountName))?.id ?? null;
}

export type CheckInSummary = {
  checkIns: number;
  /** Distinct account names, since one door can file a row per flavour. */
  accounts: number;
  managers: number;
  /** Cases standing at the doors that reported. A stock level, never a trend. */
  casesOnHand: number;
  /** Cases the field expects to reorder, which is a forecast and not an order. */
  expectedReorderCases: number;
  atRisk: CheckInEntry[];
  promos: CheckInEntry[];
  flagged: CheckInEntry[];
  /** Check-ins whose account name matches no door in the pipeline. */
  unmatched: CheckInEntry[];
};

const RISK_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

export function summarizeCheckIn(entries: CheckInEntry[]): CheckInSummary {
  return {
    checkIns: entries.length,
    accounts: new Set(entries.map((e) => normalizeAccountName(e.accountName))).size,
    managers: new Set(entries.map((e) => e.accountManager.trim().toLowerCase())).size,
    casesOnHand: entries.reduce((s, e) => s + e.currentCases, 0),
    expectedReorderCases: entries.reduce((s, e) => s + e.expectedReorderCases, 0),
    atRisk: entries
      .filter((e) => e.stockoutRisk === "High" || e.stockoutRisk === "Medium")
      .sort((a, b) => (RISK_ORDER[a.stockoutRisk] ?? 3) - (RISK_ORDER[b.stockoutRisk] ?? 3)),
    promos: entries.filter((e) => e.promoComing.trim().toLowerCase() === "yes"),
    flagged: entries.filter((e) => isRealNote(e.notes)),
    unmatched: entries.filter((e) => matchedDoorId(e.accountName) === null),
  };
}

/** Reorders the field expects, soonest first. Rows with no date sit at the end. */
export function upcomingReorders(entries: CheckInEntry[]): CheckInEntry[] {
  return [...entries].sort((a, b) => {
    if (!a.expectedReorderDate) return 1;
    if (!b.expectedReorderDate) return -1;
    return a.expectedReorderDate.localeCompare(b.expectedReorderDate);
  });
}

export function checkInDataGaps(entries: CheckInEntry[]): DataGap[] {
  const gaps: DataGap[] = [];
  if (entries.length === 0) return gaps;

  gaps.push({
    field: "Week ending",
    detail:
      "No week column, the same gap the production report has. Date Completed says when the form was filled in, not which week it describes, so two visits to one door cannot be placed in order with any confidence.",
  });

  const unmatched = entries.filter((e) => matchedDoorId(e.accountName) === null);
  if (unmatched.length > 0) {
    gaps.push({
      field: "Account Name",
      detail: `Free text with no store id, so ${unmatched.length} of ${entries.length} check-ins match no door in the pipeline by name. Until they tie to a door, none of this can meet the velocity, shipment or restock figures already held for that account.`,
    });
  }

  gaps.push({
    field: "SKU's",
    detail:
      "One flavour and one inventory number per row, where the distributor form has a column per SKU. A door carrying all three either files three rows or reports one flavour and leaves the rest invisible.",
  });

  gaps.push({
    field: "Stockout Risk",
    detail:
      "Rated by hand with no scale on the form, and nothing ties it to the cases on hand or the door's velocity. A Low next to a week of cover and a Low next to a month read the same here.",
  });

  return gaps;
}

/* -------------------------------------------------------------------------- */
/*  Weekly Distributor Inventory Report                                        */
/* -------------------------------------------------------------------------- */

/** The three flavours the form asks about by name, in the form's own order. */
export const SKUS = ["Pineapple Coconut", "Summer Peach", "Lemon Mint"] as const;
export type Sku = (typeof SKUS)[number];

/** One row of the Weekly Distributor Inventory Report, which is one distributor. */
export type DistributorEntry = {
  id: string;
  completedBy: string;
  /** Free text, like the account name on the check-in form. No id. */
  distributorName: string;
  dateCompleted: string | null;
  /** The SKUs the distributor says it holds, kept separate from the case counts. */
  skusOnHand: string[];
  /** Cases per flavour, from one column each. A stock level, not a flow. */
  casesOnHand: Partial<Record<Sku, number>>;
  /** Counted in something the form never names: orders, cases or pallets. */
  ordersReceived: number;
  ordersShipped: number;
  damaged: string;
  /** Same unit problem, and never attributed to a flavour. */
  damagedAmount: number;
  notes: string;
};

export type DistributorReport = {
  placeholder: boolean;
  sourceFile: string;
  receivedOn: string;
  entries: DistributorEntry[];
};

export const distributorReport = distributorSeed as DistributorReport;

export function casesOnHand(entry: DistributorEntry): number {
  return SKUS.reduce((s, sku) => s + (entry.casesOnHand[sku] ?? 0), 0);
}

export function hasDamage(entry: DistributorEntry): boolean {
  return entry.damaged.trim().toLowerCase() === "yes" || entry.damagedAmount > 0;
}

export type DistributorSummary = {
  distributors: number;
  /** Cases standing in distributor warehouses. Added across distributors, never across weeks. */
  casesOnHand: number;
  bySku: { sku: Sku; cases: number }[];
  ordersReceived: number;
  ordersShipped: number;
  damaged: DistributorEntry[];
  damagedAmount: number;
  flagged: DistributorEntry[];
};

export function summarizeDistributor(entries: DistributorEntry[]): DistributorSummary {
  return {
    distributors: entries.length,
    casesOnHand: entries.reduce((s, e) => s + casesOnHand(e), 0),
    bySku: SKUS.map((sku) => ({
      sku,
      cases: entries.reduce((s, e) => s + (e.casesOnHand[sku] ?? 0), 0),
    })),
    ordersReceived: entries.reduce((s, e) => s + e.ordersReceived, 0),
    ordersShipped: entries.reduce((s, e) => s + e.ordersShipped, 0),
    damaged: entries.filter(hasDamage),
    damagedAmount: entries.reduce((s, e) => s + e.damagedAmount, 0),
    flagged: entries.filter((e) => isRealNote(e.notes)),
  };
}

/**
 * Where the SKU list and the per-flavour case columns disagree.
 *
 * Both are on the same row, filled in by the same person, so a disagreement is a
 * transcription question rather than a finding: either the flavour is held and
 * the count is missing, or it is not held and the count belongs to something else.
 */
export type SkuMismatch = { entry: DistributorEntry; sku: string; kind: "listed-no-cases" | "cases-not-listed" };

export function skuMismatches(entries: DistributorEntry[]): SkuMismatch[] {
  const out: SkuMismatch[] = [];
  for (const entry of entries) {
    const listed = new Set(entry.skusOnHand);
    for (const sku of entry.skusOnHand) {
      if (!(entry.casesOnHand[sku as Sku] ?? 0)) out.push({ entry, sku, kind: "listed-no-cases" });
    }
    for (const sku of SKUS) {
      if ((entry.casesOnHand[sku] ?? 0) > 0 && !listed.has(sku)) {
        out.push({ entry, sku, kind: "cases-not-listed" });
      }
    }
  }
  return out;
}

export function distributorDataGaps(entries: DistributorEntry[]): DataGap[] {
  const gaps: DataGap[] = [];
  if (entries.length === 0) return gaps;

  gaps.push({
    field: "Week ending",
    detail:
      "No week column here either. Cases on hand is a stock reading, so without a week it cannot be put next to last week's and nothing can be said about whether a distributor is drawing down or sitting on stock.",
  });

  gaps.push({
    field: "Orders Received / Shipped This Week",
    detail:
      "Neither column names a unit. Orders, cases and pallets are three different numbers, and until the form says which, the gap between received and shipped cannot be read as a backlog.",
  });

  gaps.push({
    field: "Damaged Inventory",
    detail:
      "Recorded as one amount with no flavour and no unit, so damage cannot be netted off the cases on hand it belongs to.",
  });

  const mismatches = skuMismatches(entries);
  if (mismatches.length > 0) {
    gaps.push({
      field: "Name of SKU(s) on Hand",
      detail: `The SKU list and the per-flavour case columns disagree on ${mismatches.length} ${mismatches.length === 1 ? "row" : "rows"}. One of the two is redundant: dropping the list and reading the case columns would remove the chance of them contradicting each other.`,
    });
  }

  gaps.push({
    field: "Distributor Name",
    detail:
      "Free text with no id, so a distributor typed two ways looks like two distributors and their stock never adds up.",
  });

  return gaps;
}
