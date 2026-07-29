import { TrendChart, type TrendPoint } from "@/components/TrendChart";
import type { WeeklyAggregate } from "@/lib/velocity";

function shortDate(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${month}/${day}`;
}

export function SalesChart({ weeklySales }: { weeklySales: WeeklyAggregate[] }) {
  if (weeklySales.length < 2) return null;

  const points: TrendPoint[] = weeklySales.map((w) => ({
    key: w.weekStart,
    x: shortDate(w.weekStart),
    y: w.unitsSold,
    tooltipLabel: `Week of ${shortDate(w.weekStart)} (${w.storeCount} ${
      w.storeCount === 1 ? "door" : "doors"
    })`,
    tooltipValue: `${w.unitsSold} cans, $${w.sollosRevenue.toFixed(2)} to SOLLOS`,
  }));

  const last = weeklySales[weeklySales.length - 1];

  return (
    <TrendChart
      points={points}
      title="Cans sold per week, all doors"
      yTickFormat={(v) => String(Math.round(v))}
      endLabel={`${last.unitsSold} cans`}
    />
  );
}
