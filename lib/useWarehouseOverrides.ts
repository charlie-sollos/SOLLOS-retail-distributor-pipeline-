"use client";

import { useSyncExternalStore } from "react";
import { WAREHOUSE_STORAGE_KEY, WAREHOUSE_CHANGED_EVENT, parseOverrides } from "@/lib/inventory";

const EMPTY: Record<string, number> = {};

/**
 * Browser storage is an external store, so it is read as one rather than copied
 * into state inside an effect. That keeps the server and first client render in
 * agreement, and means a count saved on the inventory page updates the reorder
 * coverage on the dashboard without either component knowing about the other.
 */
let cachedRaw: string | null = null;
let cachedValue: Record<string, number> = EMPTY;

function getSnapshot(): Record<string, number> {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(WAREHOUSE_STORAGE_KEY);
  } catch {
    return EMPTY;
  }
  // useSyncExternalStore re-renders forever unless an unchanged store returns an
  // identical reference, so the parsed object is cached against its raw string.
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedValue = parseOverrides(raw);
  }
  return cachedValue;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(WAREHOUSE_CHANGED_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(WAREHOUSE_CHANGED_EVENT, onChange);
  };
}

export function useWarehouseOverrides(): Record<string, number> {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}
