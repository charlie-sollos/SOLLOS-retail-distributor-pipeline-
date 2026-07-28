import { DEFAULT_PRICING, derivePricing, type DerivedPricing } from "@/lib/pricing";

export type VelocityEntry = {
  weekStart: string;
  weekEnd: string;
  days: number;
  unitsSold: number;
  unitsPerDay: number;
  revenue: number;
  grossProfit: number;
};

export function computeEntry(
  weekStart: string,
  weekEnd: string,
  unitsSold: number,
  pricing: DerivedPricing = derivePricing(DEFAULT_PRICING)
): VelocityEntry {
  const start = new Date(weekStart + "T00:00:00");
  const end = new Date(weekEnd + "T00:00:00");
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);
  return {
    weekStart,
    weekEnd,
    days,
    unitsSold,
    unitsPerDay: Math.round((unitsSold / days) * 100) / 100,
    revenue: Math.round(unitsSold * pricing.srp * 100) / 100,
    grossProfit: Math.round(unitsSold * pricing.gpPerCan * 100) / 100,
  };
}

export function sortByWeek(entries: VelocityEntry[]): VelocityEntry[] {
  return [...entries].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

export function summarize(entries: VelocityEntry[]) {
  const totalUnits = entries.reduce((sum, e) => sum + e.unitsSold, 0);
  const totalDays = entries.reduce((sum, e) => sum + e.days, 0);
  const avgUnitsPerDay = totalDays ? Math.round((totalUnits / totalDays) * 100) / 100 : 0;
  const totalRevenue = Math.round(entries.reduce((sum, e) => sum + e.revenue, 0) * 100) / 100;
  const totalGrossProfit = Math.round(entries.reduce((sum, e) => sum + e.grossProfit, 0) * 100) / 100;
  return { totalUnits, avgUnitsPerDay, totalRevenue, totalGrossProfit };
}

export type SignalTone = "growing" | "steady" | "declining" | "no-data";

export type Signal = { label: string; tone: SignalTone };

export const toneStyle: Record<SignalTone, string> = {
  growing: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  steady: "bg-sollos-sky text-sollos-navy dark:bg-sollos-navy/40 dark:text-sollos-sky",
  declining: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  "no-data": "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

export function trendSignal(entries: VelocityEntry[]): Signal {
  if (entries.length === 0) return { label: "No data yet", tone: "no-data" };
  if (entries.length === 1) return { label: "Needs more weeks of data", tone: "no-data" };

  const sorted = sortByWeek(entries);
  const first = sorted[0].unitsPerDay;
  const last = sorted[sorted.length - 1].unitsPerDay;
  const ratio = first === 0 ? (last === 0 ? 1 : 2) : last / first;

  if (ratio <= 0.5) return { label: "Declining, worth a check-in", tone: "declining" };
  if (ratio < 0.85) return { label: "Slowing down", tone: "declining" };
  if (ratio >= 1.15) return { label: "Growing, room to amp up", tone: "growing" };
  return { label: "Steady", tone: "steady" };
}

export function weeklyCasesEstimate(avgUnitsPerDay: number, caseSize: number = DEFAULT_PRICING.caseSize): number {
  return Math.round(((avgUnitsPerDay * 7) / caseSize) * 100) / 100;
}

export type WeeklyAggregate = {
  weekStart: string;
  weekEnd: string;
  unitsSold: number;
  revenue: number;
};

export function aggregateByWeek(allEntries: VelocityEntry[]): WeeklyAggregate[] {
  const byWeek = new Map<string, WeeklyAggregate>();
  for (const e of allEntries) {
    const existing = byWeek.get(e.weekStart);
    if (existing) {
      existing.unitsSold += e.unitsSold;
      existing.revenue += e.revenue;
      if (e.weekEnd > existing.weekEnd) existing.weekEnd = e.weekEnd;
    } else {
      byWeek.set(e.weekStart, {
        weekStart: e.weekStart,
        weekEnd: e.weekEnd,
        unitsSold: e.unitsSold,
        revenue: e.revenue,
      });
    }
  }
  return Array.from(byWeek.values()).sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}
