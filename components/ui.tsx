import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

/** Page shell: consistent width, padding, and the main landmark. */
export function Page({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 sm:px-8 sm:py-14">
        {children}
      </main>
    </div>
  );
}

export function PageTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="pixel-face text-lg leading-snug text-sollos-navy sm:text-2xl">
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 text-sm text-sollos-navy/60">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function SectionHeading({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
      <h2 className="eyebrow">{children}</h2>
      {action}
    </div>
  );
}

/** A KPI tile. The number is the loudest thing in it, by design. */
export function Stat({
  label,
  value,
  unit,
  hint,
}: {
  label: string;
  value: number | string;
  unit?: string;
  hint?: string;
}) {
  return (
    <div className="card px-4 py-3.5">
      <p className="pixel-face text-[10px] uppercase tracking-[0.06em] text-sollos-navy/50">
        {label}
      </p>
      <p className="mt-1.5 flex items-baseline gap-1">
        <span className="num text-3xl font-semibold leading-none tracking-[-0.02em] text-sollos-navy">
          {value}
        </span>
        {unit && <span className="text-xs font-medium text-sollos-navy/45">{unit}</span>}
      </p>
      {hint && <p className="mt-1.5 text-xs text-sollos-navy/45">{hint}</p>}
    </div>
  );
}

export function PrimaryButton({
  children,
  type = "button",
  onClick,
  disabled,
  className = "",
}: {
  children: ReactNode;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`pixel-btn bg-sollos-navy text-white transition-colors hover:bg-sollos-navy-dark disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="pixel-btn border-sollos-navy/30 bg-white text-sollos-navy/70 transition-colors hover:text-sollos-navy"
    >
      {children}
    </button>
  );
}

export function PrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="pixel-btn bg-sollos-navy text-white transition-colors hover:bg-sollos-navy-dark"
    >
      {children}
    </Link>
  );
}

export const inputClass =
  "w-full border-2 border-sollos-navy/15 bg-white px-3 py-2 text-sm text-sollos-navy placeholder:text-sollos-navy/35 focus:border-sollos-navy/40 focus:outline-none";

export function Field({
  label,
  value,
  onChange,
  type = "text",
  min,
  step,
  placeholder,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  min?: string;
  step?: string;
  placeholder?: string;
}) {
  return (
    <label className="block text-xs font-medium text-sollos-navy/60">
      {label}
      <input
        type={type}
        min={min}
        step={step}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-1.5 ${inputClass}`}
      />
    </label>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card relative overflow-hidden px-6 py-10 text-center">
      <Image
        src="/art/pixel-can.png"
        alt=""
        width={239}
        height={712}
        unoptimized
        aria-hidden="true"
        className="pixelated pointer-events-none absolute -bottom-10 -right-6 h-56 w-auto opacity-[0.10]"
      />
      <p className="relative font-semibold text-sollos-navy">{title}</p>
      {children && (
        <div className="relative mx-auto mt-1.5 max-w-md text-sm text-sollos-navy/60">
          {children}
        </div>
      )}
    </div>
  );
}

/** A slim progress track. Used for data coverage and days of cover. */
export function Meter({
  value,
  max,
  tone = "orange",
}: {
  value: number;
  max: number;
  tone?: "orange" | "navy" | "good";
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const fill =
    tone === "good" ? "bg-sollos-good" : tone === "navy" ? "bg-sollos-navy" : "bg-sollos-orange";
  return (
    <div className="h-2 w-full overflow-hidden border-2 border-sollos-navy/12 bg-sollos-navy/8">
      <div className={`h-full ${fill}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/**
 * The brand sunburst, blocked out on a 32-unit grid.
 *
 * The same drawing as the favicon, so the mark reads identically in a browser
 * tab and at watermark size on an empty state. Kept as rectangles rather than
 * the original bezier starburst: a curve softened at any size would be the one
 * thing on screen not made of pixels.
 */
export function SunMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} shapeRendering="crispEdges" aria-hidden="true">
    <g fill="#FFD100">
      <rect x="14" y="0" width="4" height="8"/><rect x="14" y="24" width="4" height="8"/>
      <rect x="0" y="14" width="8" height="4"/><rect x="24" y="14" width="8" height="4"/>
      <rect x="6" y="6" width="4" height="4"/><rect x="22" y="6" width="4" height="4"/>
      <rect x="6" y="22" width="4" height="4"/><rect x="22" y="22" width="4" height="4"/>
      <rect x="11" y="3" width="2" height="5"/><rect x="19" y="3" width="2" height="5"/>
      <rect x="11" y="24" width="2" height="5"/><rect x="19" y="24" width="2" height="5"/>
      <rect x="3" y="11" width="5" height="2"/><rect x="3" y="19" width="5" height="2"/>
      <rect x="24" y="11" width="5" height="2"/><rect x="24" y="19" width="5" height="2"/>
      <rect x="10" y="8" width="12" height="16"/><rect x="8" y="10" width="16" height="12"/>
    </g>
    <g fill="#FF6B00">
      <rect x="12" y="11" width="8" height="10"/><rect x="11" y="12" width="10" height="8"/>
      <rect x="15" y="7" width="2" height="4"/><rect x="15" y="21" width="2" height="4"/>
      <rect x="7" y="15" width="4" height="2"/><rect x="21" y="15" width="4" height="2"/>
    </g>
    </svg>
  );
}
