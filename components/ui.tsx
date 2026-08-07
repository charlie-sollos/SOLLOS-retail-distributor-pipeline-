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
      <SunMark className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 opacity-[0.06]" />
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

/** The brand sunburst, the one distinctive asset. Used for empty states and accents. */
export function SunMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 486 458" className={className} aria-hidden="true">
      <path
        d="M484.7 201.6L348 193.6l95.8-92.7c.4-.5.5-1.1.1-1.7-.4-.5-1.1-.7-1.7-.5L317.2 151.8 356.5 27.6c.2-.6-.1-1.2-.7-1.5-.6-.3-1.3-.1-1.7.4l-84.6 102L243.3 1.1c-.1-.6-.7-1.1-1.4-1.1-.7 0-1.3.5-1.4 1.1l-24.8 127.5L130.1 27.4c-.4-.5-1.2-.6-1.8-.3-.6.3-.9 1-.7 1.6l40.6 123.8L42.7 100.6c-.6-.3-1.3-.1-1.7.5-.4.5-.3 1.2.2 1.7l96.7 91.8L1.3 203.8c-.7 0-1.2.5-1.3 1.2-.1.6.3 1.2 1 1.4l130.7 38.7L15.3 313.4c-.6.3-.8 1-.6 1.6.2.6.9.9 1.5.8l134.8-23.2-69.5 111.7c-.3.6-.2 1.3.3 1.7.5.4 1.2.4 1.8 0l107.9-79.9-6.7 129.5c0 .6.4 1.2 1.1 1.4h.3c.5 0 1-.3 1.3-.8l56.4-118.2 57.6 117.7c.3.6.9.9 1.6.7.7-.2 1.1-.7 1-1.3l-8.1-129.4 108.7 78.8c.5.4 1.3.4 1.8 0 .5-.4.6-1.1.3-1.7l-70.7-111 135 21.9c.7.1 1.3-.2 1.5-.8.2-.6 0-1.3-.6-1.6L354.7 244.1l130.3-40c.6-.2 1.1-.8 1-1.4-.1-.6-.6-1.1-1.3-1.2z"
        fill="#FFD100"
      />
      <path
        d="M463.8 249.9L339.8 214.5l111.6-62.2c.6-.3.9-1 .6-1.6-.2-.6-.9-1-1.5-.8l-127.2 23.3 68.3-104.2c.3-.6.2-1.3-.3-1.7-.5-.4-1.3-.4-1.8 0L288.4 143.9 297.8 21.6c0-.6-.4-1.2-1-1.4-.7-.2-1.3.1-1.6.7l-52 112.3L191.4 20.8c-.3-.6-.9-.9-1.6-.7-.7.2-1.1.7-1 1.4l9.1 122.3L96.8 67c-.5-.4-1.3-.4-1.8 0-.5.4-.6 1.1-.2 1.7l68.1 104.3L35.8 149.5c-.7-.1-1.3.2-1.6.8-.2.6 0 1.3.6 1.6l111.5 62.5L22.2 249.5c-.7.2-1.1.8-1 1.4.1.6.7 1.1 1.4 1.1l129.4 6.2-92.7 85.7c-.5.5-.6 1.2-.2 1.7.4.5 1.1.7 1.7.5L178.4 294.6l-40 116.7c-.2.6.1 1.3.7 1.6.6.3 1.3.1 1.7-.4l78.9-97.3 21.8 120.9c.1.6.7 1.1 1.4 1.1.7 0 1.3-.5 1.4-1.1l22.1-120.8 78.7 97.4c.4.5 1.1.7 1.7.4.6-.3.9-1 .7-1.6l-39.8-116.7 117.5 51.7c.6.3 1.3.1 1.7-.5.4-.5.3-1.2-.2-1.6l-92.5-85.9 129.4-6c.7 0 1.2-.5 1.3-1.2.1-.6-.3-1.2-.9-1.4z"
        fill="#FF6B00"
      />
    </svg>
  );
}
