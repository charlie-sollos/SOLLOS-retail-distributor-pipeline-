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
const HEIGHT = 220;
const PAD_LEFT = 44;
const PAD_RIGHT = 16;
const PAD_TOP = 20;
const PAD_BOTTOM = 28;

function niceMax(value: number): number {
  const withHeadroom = Math.max(value, 0.5) * 1.2;
  const step = withHeadroom > 4 ? Math.pow(10, Math.floor(Math.log10(withHeadroom))) : 0.5;
  return Math.ceil(withHeadroom / step) * step;
}

export function TrendChart({
  points,
  title,
  yTickFormat = (v) => String(Math.round(v * 100) / 100),
  endLabel,
}: {
  points: TrendPoint[];
  title: string;
  yTickFormat?: (v: number) => string;
  endLabel?: string;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (points.length < 2) return null;

  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const maxY = niceMax(Math.max(...points.map((p) => p.y)));

  const xFor = (i: number) =>
    PAD_LEFT + (points.length === 1 ? plotWidth / 2 : (i / (points.length - 1)) * plotWidth);
  const yFor = (v: number) => PAD_TOP + plotHeight - (v / maxY) * plotHeight;

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(p.y)}`).join(" ");
  const areaPath = `${linePath} L ${xFor(points.length - 1)} ${PAD_TOP + plotHeight} L ${xFor(0)} ${PAD_TOP + plotHeight} Z`;

  const yTicks = [0, maxY / 2, maxY];
  const lastIndex = points.length - 1;
  const hovered = hoverIndex ?? lastIndex;
  const hoveredPoint = points[hovered];

  function handlePointerMove(e: PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const ratio = (px - PAD_LEFT) / plotWidth;
    const index = Math.round(ratio * (points.length - 1));
    setHoverIndex(Math.min(points.length - 1, Math.max(0, index)));
  }

  return (
    <div className="relative rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{title}</p>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full touch-none"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverIndex(null)}
      >
        {yTicks.map((t) => (
          <g key={t}>
            <line
              x1={PAD_LEFT}
              x2={WIDTH - PAD_RIGHT}
              y1={yFor(t)}
              y2={yFor(t)}
              className="stroke-zinc-200 dark:stroke-zinc-800"
              strokeWidth={1}
            />
            <text
              x={PAD_LEFT - 8}
              y={yFor(t)}
              textAnchor="end"
              dominantBaseline="middle"
              fill="currentColor"
              className="text-[10px] text-zinc-500 dark:text-zinc-400"
            >
              {yTickFormat(t)}
            </text>
          </g>
        ))}

        {points.map((p, i) =>
          i % Math.ceil(points.length / 6 || 1) === 0 || i === lastIndex ? (
            <text
              key={p.key}
              x={xFor(i)}
              y={HEIGHT - 6}
              textAnchor="middle"
              fill="currentColor"
              className="text-[10px] text-zinc-500 dark:text-zinc-400"
            >
              {p.x}
            </text>
          ) : null
        )}

        <path d={areaPath} className="fill-sollos-navy dark:fill-sollos-sky" fillOpacity={0.1} />
        <path
          d={linePath}
          fill="none"
          className="stroke-sollos-navy dark:stroke-sollos-sky"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {hoverIndex !== null && (
          <line
            x1={xFor(hoverIndex)}
            x2={xFor(hoverIndex)}
            y1={PAD_TOP}
            y2={PAD_TOP + plotHeight}
            className="stroke-zinc-300 dark:stroke-zinc-700"
            strokeWidth={1}
          />
        )}

        {points.map((p, i) => {
          const isEnd = i === lastIndex;
          const isHovered = i === hovered;
          if (!isEnd && !isHovered) return null;
          return (
            <circle
              key={p.key}
              cx={xFor(i)}
              cy={yFor(p.y)}
              r={4}
              className="fill-sollos-navy stroke-white dark:fill-sollos-sky dark:stroke-zinc-950"
              strokeWidth={2}
            />
          );
        })}

        <text
          x={xFor(lastIndex)}
          y={yFor(points[lastIndex].y) - 10}
          textAnchor="end"
          fill="currentColor"
          className="text-[11px] font-medium text-sollos-navy dark:text-sollos-sky"
        >
          {endLabel ?? yTickFormat(points[lastIndex].y)}
        </text>
      </svg>

      <div className="mt-1 flex items-center justify-between rounded-md bg-zinc-50 px-3 py-1.5 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
        <span>{hoveredPoint.tooltipLabel}</span>
        <span className="font-medium text-black dark:text-zinc-50">{hoveredPoint.tooltipValue}</span>
      </div>
    </div>
  );
}
