"use client";

import { useEffect, useState } from "react";
import { locations } from "@/lib/locations";
import { getMergedEntries, getEffectiveLocation } from "@/lib/storeStorage";
import { summarize, trendSignal, weeklyCasesEstimate } from "@/lib/velocity";
import { loadPricing } from "@/lib/pricing";

function buildRow(loc: (typeof locations)[number], caseSize: number) {
  const effectiveLoc = getEffectiveLocation(loc);
  const entries = getMergedEntries(loc.id);
  const summary = summarize(entries);
  const signal = trendSignal(entries);
  const casesPerWeek = weeklyCasesEstimate(summary.avgUnitsPerDay, caseSize);
  return { loc: effectiveLoc, entries, summary, signal, casesPerWeek };
}

export type StoreRow = ReturnType<typeof buildRow>;

export function useStoreRows(): StoreRow[] {
  const [rows, setRows] = useState<StoreRow[]>(() =>
    locations.map((loc) => buildRow(loc, loadPricing().caseSize))
  );

  useEffect(() => {
    setRows(locations.map((loc) => buildRow(loc, loadPricing().caseSize)));
  }, []);

  return rows;
}
