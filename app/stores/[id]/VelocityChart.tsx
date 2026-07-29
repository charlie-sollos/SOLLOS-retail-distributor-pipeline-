import { TrendChart, type TrendPoint } from "@/components/TrendChart";
import { trendSignal, type VelocityEntry } from "@/lib/velocity";

function shortDate(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${month}/${day}`;
}

export function VelocityChart({ entries }: { entries: VelocityEntry[] }) {
  if (entries.length < 2) return null;

  const points: TrendPoint[] = entries.map((e) => ({
    key: e.id ?? e.weekStart,
    x: shortDate(e.weekStart),
    y: e.unitsPerDay,
    tooltipLabel: `${shortDate(e.weekStart)} to ${shortDate(e.weekEnd)} (${e.days}d)`,
    tooltipValue: `${e.unitsPerDay} cans/day, ${e.unitsSold} total`,
  }));

  // The line carries the verdict: orange when the store needs a look.
  const tone = trendSignal(entries).tone === "declining" ? "orange" : "navy";

  return <TrendChart points={points} title="Cans per day" tone={tone} />;
}
