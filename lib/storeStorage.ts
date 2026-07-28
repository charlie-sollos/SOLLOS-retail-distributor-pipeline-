import type { VelocityEntry } from "@/lib/velocity";
import velocitySeed from "@/data/velocity-seed.json";

const ENTRIES_PREFIX = "sollos:velocity:";
const NOTES_PREFIX = "sollos:notes:";

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
