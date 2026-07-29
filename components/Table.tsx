import type { ReactNode } from "react";

/** One table treatment for the whole app. Wraps in a tier-1 card. */
export function Table({ children, caption }: { children: ReactNode; caption?: string }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          {children}
        </table>
      </div>
    </div>
  );
}

export function Thead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-sollos-navy/12 bg-sollos-sky/55">
      <tr>{children}</tr>
    </thead>
  );
}

export function Th({
  children,
  align = "left",
  className = "",
}: {
  children: ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-sollos-navy/70 ${
        align === "right" ? "text-right" : "text-left"
      } ${className}`}
    >
      {children}
    </th>
  );
}

export function Tbody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-sollos-navy/8">{children}</tbody>;
}

export function Tr({ children }: { children: ReactNode }) {
  return <tr className="transition-colors hover:bg-sollos-cream/70">{children}</tr>;
}

/** Numeric cells get tabular figures and navy weight so the data reads as the data. */
export function Td({
  children,
  numeric,
  strong,
  muted,
  className = "",
}: {
  children: ReactNode;
  numeric?: boolean;
  strong?: boolean;
  muted?: boolean;
  className?: string;
}) {
  const tone = muted ? "text-sollos-navy/45" : strong ? "text-sollos-navy" : "text-sollos-navy/70";
  return (
    <td
      className={`px-4 py-3 ${numeric ? "num text-right font-medium" : ""} ${
        strong ? "font-medium" : ""
      } ${tone} ${className}`}
    >
      {children}
    </td>
  );
}
