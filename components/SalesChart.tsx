import { TrendChart, type TrendPoint } from "@/components/TrendChart";
import type { WeeklyAggregate } from "@/lib/velocity";

function formatShortDate(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${month}/${day}`;
}

export function SalesChart({ weeklySales }: { weeklySales: WeeklyAggregate[] }) {
  if (weeklySales.length < 2) return null;

  const points: TrendPoint[] = weeklySales.map((w) => ({
    key: w.weekStart,
    x: formatShortDate(w.weekStart),
    y: w.revenue,
    tooltipLabel: `Week of ${formatShortDate(w.weekStart)} to ${formatShortDate(w.weekEnd)}`,
    tooltipValue: `$${w.revenue.toFixed(2)} in sales, ${w.unitsSold} units`,
  }));

  const last = weeklySales[weeklySales.length - 1];

  return (
    <TrendChart
      points={points}
      title="Weekly Sales, All Stores"
      yTickFormat={(v) => `$${Math.round(v)}`}
      endLabel={`$${last.revenue.toFixed(0)}`}
    />
  );
}
