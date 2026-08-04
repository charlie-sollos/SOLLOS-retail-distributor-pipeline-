import type { VelocityEntry } from "@/lib/velocity";
import type { ShipmentEntry } from "@/lib/shipments";
import type { StoreLocation } from "@/lib/locations";
import velocitySeed from "@/data/velocity-seed.json";
import shipmentsSeed from "@/data/shipments-seed.json";

const ENTRIES_PREFIX = "sollos:velocity:";
const SHIPMENTS_PREFIX = "sollos:shipments:";
const NOTES_PREFIX = "sollos:notes:";
const STORE_OVERRIDE_PREFIX = "sollos:store-override:";
const CUSTOM_STORES_KEY = "sollos:custom-stores";
const HIDDEN_SEED_PREFIX = "sollos:hidden-seed:";
const HIDDEN_SEED_SHIPMENT_PREFIX = "sollos:hidden-seed-shipment:";

/**
 * Ships empty for the same reason as the billing seed: the repo and the Vercel
 * deployment are public, and this holds a named customer's weekly volume and
 * SOLLOS's margin on it. Real figures live in data/velocity-seed.local.json,
 * which is gitignored. Copy it over data/velocity-seed.json to work with them
 * locally; the committed file is marked skip-worktree so that copy cannot be
 * committed by accident.
 */
const seed = velocitySeed as Record<string, VelocityEntry[]>;
const shipmentSeed = shipmentsSeed as Record<string, ShipmentEntry[]>;

/**
 * Every read is defensive and every write is guarded. This is browser storage:
 * it can be disabled, full, or holding JSON written by an older build, and none
 * of those should take a page down.
 */
function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function seedEntryId(storeId: string, e: VelocityEntry): string {
  return e.id ?? `seed_${storeId}_${e.weekStart}`;
}

/** Seed rows ship in the bundle, so "deleting" one records a tombstone instead. */
function hiddenSeedIds(storeId: string): string[] {
  return readJson<string[]>(HIDDEN_SEED_PREFIX + storeId, []);
}

export function getSeedEntries(storeId: string): VelocityEntry[] {
  const hidden = new Set(hiddenSeedIds(storeId));
  return (seed[storeId] ?? [])
    .map((e) => ({ ...e, id: seedEntryId(storeId, e) }))
    .filter((e) => !hidden.has(e.id));
}

export function getMergedEntries(storeId: string): VelocityEntry[] {
  return [...getSeedEntries(storeId), ...loadLocalEntries(storeId)];
}

export function loadLocalEntries(storeId: string): VelocityEntry[] {
  const rows = readJson<VelocityEntry[]>(ENTRIES_PREFIX + storeId, []);
  return Array.isArray(rows)
    ? rows.filter((e) => e && typeof e.weekStart === "string" && typeof e.unitsSold === "number")
    : [];
}

export function saveLocalEntries(storeId: string, entries: VelocityEntry[]): boolean {
  return writeJson(ENTRIES_PREFIX + storeId, entries);
}

export function addEntry(storeId: string, entry: VelocityEntry): boolean {
  return saveLocalEntries(storeId, [...loadLocalEntries(storeId), entry]);
}

export function updateEntry(storeId: string, entry: VelocityEntry): boolean {
  const local = loadLocalEntries(storeId);
  const i = local.findIndex((e) => e.id === entry.id);
  if (i === -1) {
    // Editing a seed row: hide the original and keep the edit locally.
    hideSeedEntry(storeId, entry.id!);
    return addEntry(storeId, entry);
  }
  const next = [...local];
  next[i] = entry;
  return saveLocalEntries(storeId, next);
}

export function deleteEntry(storeId: string, entryId: string): boolean {
  const local = loadLocalEntries(storeId);
  if (local.some((e) => e.id === entryId)) {
    return saveLocalEntries(
      storeId,
      local.filter((e) => e.id !== entryId)
    );
  }
  return hideSeedEntry(storeId, entryId);
}

function hideSeedEntry(storeId: string, entryId: string): boolean {
  const hidden = hiddenSeedIds(storeId);
  if (hidden.includes(entryId)) return true;
  return writeJson(HIDDEN_SEED_PREFIX + storeId, [...hidden, entryId]);
}

function hiddenSeedShipmentIds(storeId: string): string[] {
  return readJson<string[]>(HIDDEN_SEED_SHIPMENT_PREFIX + storeId, []);
}

export function getSeedShipments(storeId: string): ShipmentEntry[] {
  const hidden = new Set(hiddenSeedShipmentIds(storeId));
  return (shipmentSeed[storeId] ?? []).filter((e) => !hidden.has(e.id!));
}

export function getMergedShipments(storeId: string): ShipmentEntry[] {
  return [...getSeedShipments(storeId), ...loadLocalShipments(storeId)];
}

export function loadLocalShipments(storeId: string): ShipmentEntry[] {
  const rows = readJson<ShipmentEntry[]>(SHIPMENTS_PREFIX + storeId, []);
  return Array.isArray(rows)
    ? rows.filter((e) => e && typeof e.date === "string" && typeof e.cases === "number")
    : [];
}

export function saveLocalShipments(storeId: string, entries: ShipmentEntry[]): boolean {
  return writeJson(SHIPMENTS_PREFIX + storeId, entries);
}

export function addShipment(storeId: string, entry: ShipmentEntry): boolean {
  return saveLocalShipments(storeId, [...loadLocalShipments(storeId), entry]);
}

export function updateShipment(storeId: string, entry: ShipmentEntry): boolean {
  const local = loadLocalShipments(storeId);
  const i = local.findIndex((e) => e.id === entry.id);
  if (i === -1) {
    // Editing a seed row: hide the original and keep the edit locally.
    hideSeedShipment(storeId, entry.id!);
    return addShipment(storeId, entry);
  }
  const next = [...local];
  next[i] = entry;
  return saveLocalShipments(storeId, next);
}

export function deleteShipment(storeId: string, entryId: string): boolean {
  const local = loadLocalShipments(storeId);
  if (local.some((e) => e.id === entryId)) {
    return saveLocalShipments(
      storeId,
      local.filter((e) => e.id !== entryId)
    );
  }
  return hideSeedShipment(storeId, entryId);
}

function hideSeedShipment(storeId: string, entryId: string): boolean {
  const hidden = hiddenSeedShipmentIds(storeId);
  if (hidden.includes(entryId)) return true;
  return writeJson(HIDDEN_SEED_SHIPMENT_PREFIX + storeId, [...hidden, entryId]);
}

export function loadNotes(storeId: string): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(NOTES_PREFIX + storeId) ?? "";
  } catch {
    return "";
  }
}

export function saveNotes(storeId: string, notes: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(NOTES_PREFIX + storeId, notes);
    return true;
  } catch {
    return false;
  }
}

export type StoreOverride = Partial<
  Pick<StoreLocation, "name" | "address1" | "city" | "state" | "zip" | "phone" | "website">
>;

export function loadStoreOverride(storeId: string): StoreOverride {
  return readJson<StoreOverride>(STORE_OVERRIDE_PREFIX + storeId, {});
}

export function saveStoreOverride(storeId: string, override: StoreOverride): boolean {
  return writeJson(STORE_OVERRIDE_PREFIX + storeId, override);
}

export function getEffectiveLocation(loc: StoreLocation): StoreLocation {
  return { ...loc, ...loadStoreOverride(loc.id) };
}

export function loadCustomStores(): StoreLocation[] {
  const rows = readJson<StoreLocation[]>(CUSTOM_STORES_KEY, []);
  return Array.isArray(rows) ? rows.filter((s) => s && typeof s.id === "string") : [];
}

export function saveCustomStores(stores: StoreLocation[]): boolean {
  return writeJson(CUSTOM_STORES_KEY, stores);
}

export function addCustomStore(store: StoreLocation): boolean {
  return saveCustomStores([...loadCustomStores(), store]);
}

export function deleteCustomStore(id: string): boolean {
  return saveCustomStores(loadCustomStores().filter((s) => s.id !== id));
}

export function getCustomStore(id: string): StoreLocation | undefined {
  return loadCustomStores().find((s) => s.id === id);
}
