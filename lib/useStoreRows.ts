"use client";

import { useCallback, useEffect, useState } from "react";
import { locations, type StoreLocation } from "@/lib/locations";
import {
  getMergedEntries,
  getMergedShipments,
  getEffectiveLocation,
  loadCustomStores,
} from "@/lib/storeStorage";
import {
  summarize,
  trendSignal,
  weeklyCasesEstimate,
  type VelocityEntry,
} from "@/lib/velocity";
import { mostRecentShipment, shipmentStalenessSignal } from "@/lib/shipments";
import { loadPricing } from "@/lib/pricing";

function buildRow(loc: StoreLocation, caseSize: number) {
  const entries: VelocityEntry[] = getMergedEntries(loc.id);
  const shipments = getMergedShipments(loc.id);
  const summary = summarize(entries);
  const signal = trendSignal(entries);
  const casesPerWeek = weeklyCasesEstimate(summary.avgUnitsPerDay, caseSize);
  return {
    loc: getEffectiveLocation(loc),
    entries,
    summary,
    signal,
    casesPerWeek,
    /** Last period end on record, or null. Drives staleness. */
    lastReported: entries.length
      ? entries.reduce((a, e) => (e.weekEnd > a ? e.weekEnd : a), entries[0].weekEnd)
      : null,
    lastShipment: mostRecentShipment(shipments),
    shipmentSignal: shipmentStalenessSignal(shipments, entries),
  };
}

export type StoreRow = ReturnType<typeof buildRow>;

/** How many days since a store last reported, or null if it never has. */
export function daysStale(row: StoreRow, today: Date = new Date()): number | null {
  if (!row.lastReported) return null;
  const last = new Date(row.lastReported + "T00:00:00Z").getTime();
  const now = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.max(0, Math.round((now - last) / 86_400_000));
}

/**
 * Reads pricing once rather than per store, which previously meant one
 * localStorage hit per row on every render pass.
 */
function buildAll(): StoreRow[] {
  const caseSize = loadPricing().caseSize;
  return [...locations, ...loadCustomStores()].map((loc) => buildRow(loc, caseSize));
}

export function useStoreRows(): { rows: StoreRow[]; refresh: () => void; ready: boolean } {
  // Start from the static roster so the server and first client render agree,
  // then fold in anything held locally once mounted.
  const [rows, setRows] = useState<StoreRow[]>(() =>
    locations.map((loc) => buildRow(loc, 12))
  );
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => setRows(buildAll()), []);

  useEffect(() => {
    refresh();
    setReady(true);
  }, [refresh]);

  return { rows, refresh, ready };
}
