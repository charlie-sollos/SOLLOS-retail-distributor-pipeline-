"use client";

import { useState, type PointerEvent } from "react";

export type TrendPoint = {
  key: string;
  x: string;
  y: number;
  tooltipLabel: string;
  tooltipValue: string;
};

const WIDTH = 640;
const HEIGHT = 200;
const PAD_LEFT = 46;
const PAD_RIGHT = 18;
const PAD_TOP = 18;
const PAD_BOTTOM = 26;

function niceMax(value: number): number {
  const withHeadroom = Math.max(value, 0.5) * 1.2;
  const step = withHeadroom > 4 ? Math.pow(10, Math.floor(Math.log10(withHeadroom))) : 0.5;
  return Math.ceil(withHeadroom / step) * step;
}

/**
 * A single series line chart. Hover and keyboard both move the readout, and the
 * same numbers are available as a table so the chart is never the only copy.
 */
export function TrendChart({
  points,
  title,
  yTickFormat = (v) => String(Math.round(v * 100) / 100),
  endLabel,
  tone = "navy",
}: {
  points: TrendPoint[];
  title: string;
  yTickFormat?: (v: number) => string;
  endLabel?: string;
  tone?: "navy" | "orange";
}) {
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  if (points.length < 2) return null;

  const stroke = tone === "orange" ? "stroke-sollos-orange" : "stroke-sollos-navy";
  const fill = tone === "orange" ? "fill-sollos-orange" : "fill-sollos-navy";

  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const maxY = niceMax(Math.max(...points.map((p) => p.y)));

  const xFor = (i: number) => PAD_LEFT + (i / (points.length - 1)) * plotWidth;
  const yFor = (v: number) => PAD_TOP + plotHeight - (v / maxY) * plotHeight;

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(p.y)}`).join(" ");
  const areaPath = `${linePath} L ${xFor(points.length - 1)} ${PAD_TOP + plotHeight} L ${xFor(0)} ${
    PAD_TOP + plotHeight
  } Z`;

  const lastIndex = points.length - 1;
  const shown = active ?? lastIndex;
  const shownPoint = points[shown];
  // Thin the x labels so they never collide on a narrow screen.
  const labelEvery = Math.ceil(points.length / 5);

  function handlePointerMove(e: PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (((e.clientX - rect.left) / rect.width) * WIDTH - PAD_LEFT) / plotWidth;
    setActive(Math.min(lastIndex, Math.max(0, Math.round(ratio * lastIndex))));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") {
      setActive(Math.min(lastIndex, shown + 1));
      e.preventDefault();
    } else if (e.key === "ArrowLeft") {
      setActive(Math.max(0, shown - 1));
      e.preventDefault();
    } else if (e.key === "Home") {
      setActive(0);
      e.preventDefault();
    } else if (e.key === "End") {
      setActive(lastIndex);
      e.preventDefault();
    }
  }

  return (
    <figure className="card p-4">
      <figcaption className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="eyebrow">{title}</span>
        <button
          onClick={() => setShowTable((v) => !v)}
          aria-expanded={showTable}
          className="text-xs font-medium text-sollos-navy/50 underline underline-offset-4 transition-colors hover:text-sollos-navy"
        >
          {showTable ? "Hide values" : "Show values"}
        </button>
      </figcaption>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full touch-none"
        role="img"
        tabIndex={0}
        aria-label={`${title}. ${points.length} periods, from ${points[0].tooltipValue} to ${points[lastIndex].tooltipValue}. Use arrow keys to step through values.`}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setActive(null)}
        onKeyDown={handleKeyDown}
      >
        {[0, maxY / 2, maxY].map((t) => (
          <g key={t}>
            <line
              x1={PAD_LEFT}
              x2={WIDTH - PAD_RIGHT}
              y1={yFor(t)}
              y2={yFor(t)}
              className="stroke-sollos-navy/10"
              strokeWidth={1}
            />
            <text
              x={PAD_LEFT - 9}
              y={yFor(t)}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-sollos-navy/45 text-[10px]"
            >
              {yTickFormat(t)}
            </text>
          </g>
        ))}

        {points.map((p, i) =>
          i % labelEvery === 0 || i === lastIndex ? (
            <text
              key={p.key}
              x={xFor(i)}
              y={HEIGHT - 6}
              textAnchor={i === lastIndex ? "end" : i === 0 ? "start" : "middle"}
              className="fill-sollos-navy/45 text-[10px]"
            >
              {p.x}
            </text>
          ) : null
        )}

        <path d={areaPath} className={fill} fillOpacity={0.08} />
        <path
          d={linePath}
          fill="none"
          className={stroke}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {active !== null && (
          <line
            x1={xFor(active)}
            x2={xFor(active)}
            y1={PAD_TOP}
            y2={PAD_TOP + plotHeight}
            className="stroke-sollos-navy/25"
            strokeWidth={1}
          />
        )}

        {[lastIndex, shown].map((i) => (
          <circle
            key={i}
            cx={xFor(i)}
            cy={yFor(points[i].y)}
            r={4}
            className={`${fill} stroke-white`}
            strokeWidth={2}
          />
        ))}

        <text
          x={xFor(lastIndex)}
          y={yFor(points[lastIndex].y) - 11}
          textAnchor="end"
          className={`${tone === "orange" ? "fill-sollos-orange" : "fill-sollos-navy"} text-[11px] font-semibold`}
        >
          {endLabel ?? yTickFormat(points[lastIndex].y)}
        </text>
      </svg>

      <p
        aria-live="polite"
        className="panel mt-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-3 py-2 text-xs text-sollos-navy/65"
      >
        <span>{shownPoint.tooltipLabel}</span>
        <span className="num font-semibold text-sollos-navy">{shownPoint.tooltipValue}</span>
      </p>

      {showTable && (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">{title}, tabular values</caption>
            <thead>
              <tr className="border-b border-sollos-navy/10">
                <th scope="col" className="py-1.5 pr-3 font-semibold text-sollos-navy/60">
                  Period
                </th>
                <th scope="col" className="py-1.5 text-right font-semibold text-sollos-navy/60">
                  Value
                </th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.key} className="border-b border-sollos-navy/6">
                  <td className="py-1.5 pr-3 text-sollos-navy/65">{p.tooltipLabel}</td>
                  <td className="num py-1.5 text-right font-medium text-sollos-navy">
                    {p.tooltipValue}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </figure>
  );
}
