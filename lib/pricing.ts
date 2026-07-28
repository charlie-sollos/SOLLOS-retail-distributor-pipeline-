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

export function loadPricing(): Pricing {
  if (typeof window === "undefined") return DEFAULT_PRICING;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_PRICING, ...JSON.parse(raw) } : DEFAULT_PRICING;
  } catch {
    return DEFAULT_PRICING;
  }
}

export function savePricing(pricing: Pricing) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pricing));
}

export function derivePricing(pricing: Pricing): DerivedPricing {
  const costPerCan = pricing.caseCost / pricing.caseSize;
  const gpPerCan = pricing.srp - costPerCan;
  return { ...pricing, costPerCan, gpPerCan };
}
