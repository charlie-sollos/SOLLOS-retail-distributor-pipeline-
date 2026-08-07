"use client";

import type { ReactNode } from "react";
import { setPanelOpen, usePanelOpen } from "@/lib/usePanelState";

/**
 * A section that folds away, remembering its state per browser.
 *
 * Used where a section is worth having but not worth carrying the whole page
 * every time it loads. The summary stays visible while it is shut, so folding
 * something away never hides the fact that there is something to see.
 */
export function Disclosure({
  id,
  title,
  summary,
  count,
  defaultOpen = false,
  tone = "navy",
  children,
}: {
  /** Storage key for the remembered open state. Stable across renames. */
  id: string;
  title: string;
  /** Shown next to the title while the panel is shut. */
  summary?: string;
  count?: number;
  defaultOpen?: boolean;
  tone?: "navy" | "orange";
  children: ReactNode;
}) {
  const open = usePanelOpen(id, defaultOpen);
  const panelId = `panel-${id}`;

  return (
    <section className="mb-10">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setPanelOpen(id, !open)}
        className={`pixel-edge flex w-full items-center gap-3 bg-white px-4 py-3 text-left transition-colors hover:bg-sollos-sky/35 ${
          tone === "orange" ? "border-sollos-orange" : ""
        }`}
      >
        {/* A caret that turns in steps, to match everything else that moves here. */}
        <span
          aria-hidden="true"
          className={`pixel-face text-xs leading-none ${
            tone === "orange" ? "text-sollos-orange" : "text-sollos-navy/60"
          }`}
          style={{ transform: open ? "rotate(90deg)" : "none" }}
        >
          &gt;
        </span>
        <span className="pixel-face text-xs text-sollos-navy sm:text-sm">{title}</span>
        {count !== undefined && count > 0 && (
          <span
            className={`pixel-face inline-block border-2 px-1.5 py-0.5 text-[10px] leading-none ${
              tone === "orange"
                ? "border-sollos-orange bg-sollos-orange text-white"
                : "border-sollos-navy bg-sollos-navy text-white"
            }`}
          >
            {count}
          </span>
        )}
        {summary && !open && (
          <span className="ml-auto hidden truncate text-xs text-sollos-navy/50 sm:block">
            {summary}
          </span>
        )}
        <span className="pixel-face ml-auto shrink-0 text-[10px] text-sollos-navy/45 sm:ml-3">
          {open ? "HIDE" : "SHOW"}
        </span>
      </button>

      {open && (
        <div id={panelId} className="mt-4">
          {children}
        </div>
      )}
    </section>
  );
}
