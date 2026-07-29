/** A recorded delivery of cases to a store. */
export type ShipmentEntry = {
  /** Stable id so entries can be edited and deleted. Seed rows predate this and may omit it. */
  id?: string;
  date: string;
  cases: number;
};

export function sortByDate(entries: ShipmentEntry[]): ShipmentEntry[] {
  return [...entries].sort((a, b) => a.date.localeCompare(b.date));
}

export function mostRecentShipment(entries: ShipmentEntry[]): ShipmentEntry | null {
  const sorted = sortByDate(entries);
  return sorted.length ? sorted[sorted.length - 1] : null;
}

export function computeShipment(date: string, cases: number, id?: string): ShipmentEntry {
  return { id: id ?? `e_${date}_${Date.now()}`, date, cases };
}

export function daysSince(dateIso: string, today: Date = new Date()): number {
  const then = new Date(dateIso + "T00:00:00Z").getTime();
  const now = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.max(0, Math.round((now - then) / 86_400_000));
}

/** "7/21" — short enough for a badge or a table cell. */
export function formatShortDate(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${m}/${d}`;
}

export function formatCases(n: number): string {
  return `${n} ${n === 1 ? "case" : "cases"}`;
}

/** A shipment can't wait this long with nothing logged before it's worth a flag. */
export const STALE_SHIPMENT_DAYS = 14;

export type ShipmentSignal =
  | { stale: true; label: string; daysSince: number }
  | { stale: false };

/**
 * The gap the velocity signal alone can't see: a door that took cases in but
 * hasn't logged a single can sold since. Two conditions, both required:
 * the latest shipment has to be old enough that a report was plausible, and
 * no velocity period on record can have started on or after it landed — a
 * period that ends before the shipment date only covers stock that arrived
 * earlier, so it doesn't clear the flag.
 */
export function shipmentStalenessSignal(
  shipments: ShipmentEntry[],
  velocityEntries: { weekStart: string; weekEnd: string }[],
  today: Date = new Date()
): ShipmentSignal {
  const last = mostRecentShipment(shipments);
  if (!last) return { stale: false };

  const since = daysSince(last.date, today);
  if (since < STALE_SHIPMENT_DAYS) return { stale: false };

  const soldSince = velocityEntries.some((e) => e.weekEnd >= last.date);
  if (soldSince) return { stale: false };

  const weeks = Math.floor(since / 7);
  return {
    stale: true,
    daysSince: since,
    label: `Shipped ${weeks} week${weeks === 1 ? "" : "s"} ago, no sell-through logged since`,
  };
}

export type ShipmentProblem = { field: "date" | "cases"; message: string };

/** Everything the log-a-shipment form must reject before it can write. */
export function validateShipment(
  dateRaw: string,
  casesRaw: string,
  today: string
): ShipmentProblem[] {
  const problems: ShipmentProblem[] = [];
  if (!dateRaw) problems.push({ field: "date", message: "Pick a date." });
  if (!casesRaw.trim()) problems.push({ field: "cases", message: "Enter a case count." });
  if (problems.length) return problems;

  if (dateRaw > today) {
    problems.push({ field: "date", message: "That has not happened yet." });
  }

  const cases = Number(casesRaw);
  if (!Number.isFinite(cases) || cases <= 0) {
    problems.push({ field: "cases", message: "Cases must be more than zero." });
  } else if (!Number.isInteger(cases)) {
    problems.push({ field: "cases", message: "Cases must be a whole number." });
  } else if (cases > 1000) {
    problems.push({ field: "cases", message: "That looks like a typo. Check the number." });
  }

  return problems;
}
