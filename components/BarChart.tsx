export type Bar = {
  key: string;
  label: string;
  value: number;
  /** Shown instead of the raw number, for units or a caveat. */
  display?: string;
  /** Marks a bar as an estimate rather than a confirmed figure. */
  provisional?: boolean;
};

/**
 * A horizontal bar chart, built from blocks rather than an SVG path.
 *
 * Blocks because the bars are the pixel motif doing real work: a hard-edged
 * rectangle scaled by a percentage is both the honest shape for a comparison of
 * magnitudes and the one that survives a narrow screen without redrawing.
 *
 * Every bar keeps its number in text beside it, so the chart is never the only
 * place a figure appears.
 */
export function BarChart({
  bars,
  tone = "navy",
  emptyLabel = "Nothing to chart yet.",
}: {
  bars: Bar[];
  tone?: "navy" | "orange" | "sea";
  emptyLabel?: string;
}) {
  const max = Math.max(0, ...bars.map((b) => b.value));

  if (bars.length === 0 || max === 0) {
    return <p className="text-sm text-sollos-navy/45">{emptyLabel}</p>;
  }

  const fill =
    tone === "orange"
      ? "bg-sollos-orange"
      : tone === "sea"
        ? "bg-beach-sea-deep"
        : "bg-sollos-navy";

  return (
    <ul className="space-y-2.5">
      {bars.map((b) => {
        const pct = (b.value / max) * 100;
        return (
          <li key={b.key} className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-3">
            <span className="truncate text-xs text-sollos-navy/70" title={b.label}>
              {b.label}
            </span>
            <span className="h-3 w-full border-2 border-sollos-navy/12 bg-sollos-sky/40">
              <span
                className={`block h-full ${fill} ${b.provisional ? "opacity-45" : ""}`}
                style={{ width: `${Math.max(pct, 2)}%` }}
              />
            </span>
            <span className="num text-xs font-semibold text-sollos-navy">
              {b.display ?? b.value.toLocaleString()}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
