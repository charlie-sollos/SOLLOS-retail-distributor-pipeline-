import { TrendChart, type TrendPoint } from "@/components/TrendChart";
import type { VelocityEntry } from "@/lib/velocity";

function formatShortDate(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${month}/${day}`;
}

export function VelocityChart({ entries }: { entries: VelocityEntry[] }) {
  if (entries.length < 2) return null;

  const points: TrendPoint[] = entries.map((e) => ({
    key: e.weekStart,
    x: formatShortDate(e.weekStart),
    y: e.unitsPerDay,
    tooltipLabel: `Week of ${formatShortDate(e.weekStart)} to ${formatShortDate(e.weekEnd)}`,
    tooltipValue: `${e.unitsPerDay} units/day, $${e.revenue.toFixed(2)} revenue`,
  }));

  return <TrendChart points={points} title="Units / Day Trend" />;
}
