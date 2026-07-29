export type Pricing = {
  caseSize: number;
  caseCost: number;
  srp: number;
};

export type DerivedPricing = Pricing & {
  costPerCan: number;
  gpPerCan: number;
};

export const DEFAULT_PRICING: Pricing = {
  caseSize: 12,
  caseCost: 27.6,
  srp: 3.99,
};

const STORAGE_KEY = "sollos:pricing";

/**
 * Keeps pricing arithmetic safe. A cleared number input yields NaN, and a zero
 * case size divides to Infinity, either of which would poison every derived
 * figure in the app, so fall back to the default per field.
 */
export function sanitizePricing(input: Partial<Pricing> | null | undefined): Pricing {
  const pick = (value: unknown, fallback: number, { positive = false } = {}) => {
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n)) return fallback;
    if (positive && n <= 0) return fallback;
    if (n < 0) return fallback;
    return n;
  };
  return {
    caseSize: pick(input?.caseSize, DEFAULT_PRICING.caseSize, { positive: true }),
    caseCost: pick(input?.caseCost, DEFAULT_PRICING.caseCost),
    srp: pick(input?.srp, DEFAULT_PRICING.srp),
  };
}

export function loadPricing(): Pricing {
  if (typeof window === "undefined") return DEFAULT_PRICING;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? sanitizePricing(JSON.parse(raw)) : DEFAULT_PRICING;
  } catch {
    return DEFAULT_PRICING;
  }
}

export function savePricing(pricing: Pricing) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizePricing(pricing)));
  } catch {
    // Storage can be full or disabled. Losing a pricing edit is better than a crash.
  }
}

export function derivePricing(pricing: Pricing): DerivedPricing {
  const safe = sanitizePricing(pricing);
  const costPerCan = safe.caseCost / safe.caseSize;
  return { ...safe, costPerCan, gpPerCan: safe.srp - costPerCan };
}
