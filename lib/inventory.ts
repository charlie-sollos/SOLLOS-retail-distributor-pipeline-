import inventorySeed from "@/data/inventory.json";

/**
 * Stock SOLLOS owns that has not reached a door yet.
 *
 * This is a different concept from a store's on-hand estimate in lib/restock.ts.
 * That one is inferred from shipments minus sell-through and is only ever an
 * estimate. These are counted balances at a warehouse, which is why they are
 * held as data rather than derived.
 */
export type Warehouse = {
  id: string;
  name: string;
  region: string;
  /** 12-packs, the unit every warehouse count in this business is quoted in. */
  cases: number;
  /** False where the number came in as "put this in for now" pending a check. */
  confirmed: boolean;
  note?: string;
};

/**
 * A production run at the co-packer. Deliberately not netted into anything:
 * the source said "units" without saying whether that means cans or 12-packs,
 * and at a 12x difference a wrong guess would swamp every other figure here.
 */
export type ProductionRun = {
  id: string;
  month: string;
  site: string;
  units: number;
  /** Null until somebody confirms what "units" meant. */
  unitsAreCans: boolean | null;
};

export type InventorySnapshot = {
  asOf: string;
  warehouses: Warehouse[];
  production: ProductionRun[];
};

export const WAREHOUSE_STORAGE_KEY = "sollos:warehouse-cases";
/** Fired on save so every mounted view re-reads, not just the one that wrote. */
export const WAREHOUSE_CHANGED_EVENT = "sollos:warehouse-changed";

export const inventory = inventorySeed as InventorySnapshot;

/** Tolerant of anything: this is browser storage, possibly written by an older build. */
export function parseOverrides(raw: string | null): Record<string, number> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, number> = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      const n = Number(value);
      if (Number.isFinite(n) && n >= 0) out[id] = n;
    }
    return out;
  } catch {
    return {};
  }
}

/** Per-warehouse case overrides, so a confirmed count can replace an estimate. */
export function loadWarehouseOverrides(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    return parseOverrides(window.localStorage.getItem(WAREHOUSE_STORAGE_KEY));
  } catch {
    return {};
  }
}

export function saveWarehouseCases(id: string, cases: number | null): boolean {
  if (typeof window === "undefined") return false;
  try {
    const current = loadWarehouseOverrides();
    if (cases === null || !Number.isFinite(cases) || cases < 0) {
      delete current[id];
    } else {
      current[id] = cases;
    }
    window.localStorage.setItem(WAREHOUSE_STORAGE_KEY, JSON.stringify(current));
    window.dispatchEvent(new Event(WAREHOUSE_CHANGED_EVENT));
    return true;
  } catch {
    return false;
  }
}

/**
 * A confirmed override counts as confirmed: somebody typed it after checking,
 * which is exactly what the unconfirmed flag was waiting for.
 */
export function effectiveWarehouses(overrides: Record<string, number> = {}): Warehouse[] {
  return inventory.warehouses.map((w) =>
    w.id in overrides ? { ...w, cases: overrides[w.id], confirmed: true } : w
  );
}

export type StockTotals = {
  cases: number;
  units: number;
  /** Cases sitting in counts nobody has verified yet. */
  unconfirmedCases: number;
};

export function totalStock(warehouses: Warehouse[], caseSize: number): StockTotals {
  const cases = warehouses.reduce((sum, w) => sum + w.cases, 0);
  return {
    cases,
    units: cases * caseSize,
    unconfirmedCases: warehouses.filter((w) => !w.confirmed).reduce((sum, w) => sum + w.cases, 0),
  };
}

export type CoverTone = "short" | "tight" | "ok";

export type ReorderCoverage = {
  tone: CoverTone;
  /** Cases the reorder queue is asking for right now. */
  casesNeeded: number;
  casesOnHand: number;
  label: string;
};

/**
 * The question the per-door reorder signal could not answer on its own: there is
 * a queue of doors that need cases, but is there stock to fill it?
 *
 * Compares against confirmed and unconfirmed stock together. Being precise about
 * a shortfall matters less than noticing one, and the unconfirmed share is
 * surfaced separately so nobody reads the total as counted.
 */
export function reorderCoverage(casesNeeded: number, stock: StockTotals): ReorderCoverage {
  const base = { casesNeeded, casesOnHand: stock.cases };
  if (casesNeeded <= 0) {
    return { ...base, tone: "ok", label: "Nothing in the reorder queue" };
  }
  if (stock.cases < casesNeeded) {
    return {
      ...base,
      tone: "short",
      label: `Short by ${casesNeeded - stock.cases} cases against what doors need now`,
    };
  }
  // Filling the queue would leave under a fifth of the warehouse behind.
  if (stock.cases < casesNeeded * 1.25) {
    return { ...base, tone: "tight", label: "Enough to fill the queue, with little spare" };
  }
  return { ...base, tone: "ok", label: `Covers the ${casesNeeded} cases doors need now` };
}
