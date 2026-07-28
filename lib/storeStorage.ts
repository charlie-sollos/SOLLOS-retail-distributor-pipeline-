import type { VelocityEntry } from "@/lib/velocity";
import type { StoreLocation } from "@/lib/locations";
import velocitySeed from "@/data/velocity-seed.json";

const ENTRIES_PREFIX = "sollos:velocity:";
const NOTES_PREFIX = "sollos:notes:";
const STORE_OVERRIDE_PREFIX = "sollos:store-override:";

const seed = velocitySeed as Record<string, VelocityEntry[]>;

export function getSeedEntries(storeId: string): VelocityEntry[] {
  return seed[storeId] ?? [];
}

export function getMergedEntries(storeId: string): VelocityEntry[] {
  return [...getSeedEntries(storeId), ...loadLocalEntries(storeId)];
}

export function loadLocalEntries(storeId: string): VelocityEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ENTRIES_PREFIX + storeId);
    return raw ? (JSON.parse(raw) as VelocityEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveLocalEntries(storeId: string, entries: VelocityEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ENTRIES_PREFIX + storeId, JSON.stringify(entries));
}

export function loadNotes(storeId: string): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(NOTES_PREFIX + storeId) ?? "";
}

export function saveNotes(storeId: string, notes: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NOTES_PREFIX + storeId, notes);
}

export type StoreOverride = Partial<
  Pick<StoreLocation, "name" | "address1" | "city" | "state" | "zip" | "phone" | "website">
>;

export function loadStoreOverride(storeId: string): StoreOverride {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORE_OVERRIDE_PREFIX + storeId);
    return raw ? (JSON.parse(raw) as StoreOverride) : {};
  } catch {
    return {};
  }
}

export function saveStoreOverride(storeId: string, override: StoreOverride) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORE_OVERRIDE_PREFIX + storeId, JSON.stringify(override));
}

export function getEffectiveLocation(loc: StoreLocation): StoreLocation {
  return { ...loc, ...loadStoreOverride(loc.id) };
}
