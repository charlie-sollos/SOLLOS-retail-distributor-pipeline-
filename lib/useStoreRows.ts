"use client";

import { useCallback, useEffect, useState } from "react";
import { channelOf, locations, type StoreLocation } from "@/lib/locations";
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
import { casesToTopUp, estimateUnitsOnHand, restockSignal } from "@/lib/restock";
import { loadPricing, type Pricing } from "@/lib/pricing";
import { resolvePricing, resolvePricingStatic, type PricingResolution } from "@/lib/accountPricing";

function buildRow(loc: StoreLocation, pricingFor: (storeId: string) => PricingResolution) {
  const resolved = pricingFor(loc.id);
  const caseSize = resolved.pricing.caseSize;
  const entries: VelocityEntry[] = getMergedEntries(loc.id);
  const shipments = getMergedShipments(loc.id);
  const summary = summarize(entries);
  const signal = trendSignal(entries);
  const casesPerWeek = weeklyCasesEstimate(summary.avgUnitsPerDay, caseSize);
  const onHandUnits =
    shipments.length > 0 && entries.length > 0
      ? estimateUnitsOnHand(shipments, entries, caseSize)
      : null;
  return {
    loc: getEffectiveLocation(loc),
    /** Door, distributor or DTC. Only doors belong in the sell-through signals. */
    channel: channelOf(loc),
    entries,
    summary,
    signal,
    casesPerWeek,
    /** What this door is billed at, and whether its invoices back that up. */
    pricing: resolved,
    /** Last period end on record, or null. Drives staleness. */
    lastReported: entries.length
      ? entries.reduce((a, e) => (e.weekEnd > a ? e.weekEnd : a), entries[0].weekEnd)
      : null,
    lastShipment: mostRecentShipment(shipments),
    shipmentSignal: shipmentStalenessSignal(shipments, entries),
    /** Null unless both shipments and velocity are on record — see lib/restock.ts. */
    restock:
      onHandUnits !== null ? restockSignal(onHandUnits, summary.avgUnitsPerDay) : null,
    /** Cases this door would need to stop being a reorder. Zero when it is fine. */
    casesNeeded:
      onHandUnits !== null
        ? casesToTopUp(summary.avgUnitsPerDay, onHandUnits, caseSize)
        : 0,
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
 * Reads the global pricing once rather than per store, which previously meant one
 * localStorage hit per row on every render pass. The per-account case cost still
 * has to be read per door, since that is the whole point of it.
 */
function buildAll(): StoreRow[] {
  const global: Pricing = loadPricing();
  return [...locations, ...loadCustomStores()].map((loc) =>
    buildRow(loc, (id) => resolvePricing(id, global))
  );
}

export function useStoreRows(): { rows: StoreRow[]; refresh: () => void; ready: boolean } {
  // Start from the static roster so the server and first client render agree,
  // then fold in anything held locally once mounted.
  const [rows, setRows] = useState<StoreRow[]>(() =>
    locations.map((loc) => buildRow(loc, resolvePricingStatic))
  );
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => setRows(buildAll()), []);

  useEffect(() => {
    refresh();
    setReady(true);
  }, [refresh]);

  return { rows, refresh, ready };
}
