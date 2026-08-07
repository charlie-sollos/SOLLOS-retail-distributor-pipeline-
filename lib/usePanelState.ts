"use client";

import { useSyncExternalStore } from "react";

export const PANEL_STORAGE_KEY = "sollos:panels";
export const PANEL_CHANGED_EVENT = "sollos:panel-changed";

/**
 * Whether a collapsible panel is open, remembered per browser.
 *
 * Read as an external store for the same reason warehouse overrides are: it
 * keeps the server render and the first client render in agreement, so a panel
 * does not flash open before storage has been consulted.
 */
const EMPTY: Record<string, boolean> = {};

let cachedRaw: string | null = null;
let cachedValue: Record<string, boolean> = EMPTY;

export function parsePanels(raw: string | null): Record<string, boolean> {
  if (!raw) return EMPTY;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return EMPTY;
    const out: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === "boolean") out[key] = value;
    }
    return out;
  } catch {
    // A hand-edited or half-written value should collapse to the defaults, not
    // take the page down.
    return EMPTY;
  }
}

function getSnapshot(): Record<string, boolean> {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(PANEL_STORAGE_KEY);
  } catch {
    return EMPTY;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedValue = parsePanels(raw);
  }
  return cachedValue;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(PANEL_CHANGED_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(PANEL_CHANGED_EVENT, onChange);
  };
}

export function setPanelOpen(id: string, open: boolean): void {
  try {
    const next = { ...getSnapshot(), [id]: open };
    window.localStorage.setItem(PANEL_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(PANEL_CHANGED_EVENT));
  } catch {
    // Private browsing and a full quota both land here. The panel still opens
    // for this render, it just will not be remembered.
  }
}

export function usePanelOpen(id: string, defaultOpen: boolean): boolean {
  const panels = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  return panels[id] ?? defaultOpen;
}
