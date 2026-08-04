import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  billedStoreIds,
  breakdown,
  explainsBilling,
  getBilling,
  loadAccountCaseCost,
  resolvePricing,
  resolvePricingStatic,
  saveAccountCaseCost,
  type Invoice,
} from "@/lib/accountPricing";
import { DEFAULT_PRICING } from "@/lib/pricing";

const inv = (amount: number): Invoice => ({
  date: "2026-06-01",
  number: "x",
  amount,
  status: "paid",
});

const at = (caseCost: number) => ({ ...DEFAULT_PRICING, caseCost });

describe("breakdown", () => {
  it("splits a whole number of cases with nothing left over", () => {
    expect(breakdown(68.4, at(34.2))).toEqual({ cans: 24, cases: 2, samples: 0 });
    expect(breakdown(264, at(33))).toEqual({ cans: 96, cases: 8, samples: 0 });
  });

  it("books the remainder above a full case as samples", () => {
    // $37.05 at $2.85 a can is 13 cans: one full case plus one sample.
    expect(breakdown(37.05, at(34.2))).toEqual({ cans: 13, cases: 1, samples: 1 });
    // Under a full case the whole invoice is samples.
    expect(breakdown(14.25, at(34.2))).toEqual({ cans: 5, cases: 0, samples: 5 });
  });

  it("refuses an amount that is not a whole number of cans", () => {
    // This is the check that keeps samples from explaining away everything.
    expect(breakdown(673.2, at(34.2))).toBeNull();
    expect(breakdown(178.8, at(27.6))).toBeNull();
  });

  // 673.2 / 34.2 is 19.6842... but in floating point the naive remainder test
  // drifts, so the integer cents comparison is doing real work here.
  it("does not let float drift pass a part can", () => {
    expect(breakdown(102.6, at(34.2))).not.toBeNull();
    expect(breakdown(102.61, at(34.2))).toBeNull();
  });

  it("treats a zero or negative case cost as explaining nothing", () => {
    expect(breakdown(100, at(0))).toBeNull();
    expect(breakdown(100, at(-12))).toBeNull();
    expect(breakdown(100, { ...DEFAULT_PRICING, caseSize: 0 })).toBeNull();
  });

  it("rejects a zero amount, which no can count produces", () => {
    expect(breakdown(0, at(34.2))).toBeNull();
  });
});

describe("explainsBilling", () => {
  it("needs every invoice to resolve, not just one", () => {
    expect(explainsBilling(at(34.2), [inv(34.2), inv(68.4)])).toBe(true);
    expect(explainsBilling(at(34.2), [inv(102.6), inv(673.2)])).toBe(false);
  });

  it("explains nothing when there is nothing on record", () => {
    expect(explainsBilling(at(34.2), [])).toBe(false);
  });

  it("still rejects every real invoice amount at the network default", () => {
    // Samples widened what counts as reconciled. This asserts it did not widen
    // it far enough to quietly clear the warning. These are the amounts from the
    // QuickBooks export, unattributed: not one is a whole number of cans at
    // $27.60, which is why every billed door flags.
    const REAL_AMOUNTS = [
      132.0, 178.8, 223.2, 357.6, 264.0, 102.6, 673.2, 139.2, 34.2, 68.4, 57.6, 28.8, 111.6,
      165.0, 1702.8, 1754.4, 17820.0,
    ];
    for (const amount of REAL_AMOUNTS) {
      expect(explainsBilling(DEFAULT_PRICING, [inv(amount)])).toBe(false);
    }
  });
});

describe("resolvePricingStatic", () => {
  it("falls back to the network default for a door with no account price", () => {
    const r = resolvePricingStatic("loc_qz27r9ny");
    expect(r.source).toBe("global");
    expect(r.pricing.caseCost).toBe(DEFAULT_PRICING.caseCost);
  });

  it("flags nothing when the committed billing file is empty", () => {
    // The seed ships empty because the deployment is public. Real billing lives
    // in a gitignored local file, so on a clean checkout no door has invoices
    // and no door should claim a conflict.
    for (const id of ["loc_qz27r9ny", "loc_rke8xmvq", "loc_g287pvq7"]) {
      const r = resolvePricingStatic(id);
      expect(r.billing).toBeNull();
      expect(r.conflict).toBeNull();
      expect(r.totals).toBeNull();
    }
  });

  it("finds no billing for any door until the local file is copied in", () => {
    expect(billedStoreIds()).toEqual([]);
    expect(getBilling("loc_rke8xmvq")).toBeNull();
  });
});

/** The test environment is node, so the browser storage these functions read has to be stood up. */
function stubStorage() {
  const store = new Map<string, string>();
  (globalThis as { window?: unknown }).window = {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
  };
  return store;
}

describe("the account case cost", () => {
  beforeEach(() => stubStorage());
  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  it("round-trips and takes over from the network default", () => {
    expect(loadAccountCaseCost("loc_vmzy5v5m")).toBeNull();
    saveAccountCaseCost("loc_vmzy5v5m", 33);

    const r = resolvePricing("loc_vmzy5v5m", DEFAULT_PRICING);
    expect(r.source).toBe("account");
    expect(r.pricing.caseCost).toBe(33);
    expect(r.conflict).toBeNull();
  });

  it("clears back to the network default", () => {
    saveAccountCaseCost("loc_vmzy5v5m", 33);
    saveAccountCaseCost("loc_vmzy5v5m", null);

    const r = resolvePricing("loc_vmzy5v5m", DEFAULT_PRICING);
    expect(r.source).toBe("global");
    expect(r.pricing.caseCost).toBe(DEFAULT_PRICING.caseCost);
  });

  it("refuses a nonsense cost rather than dividing by it", () => {
    saveAccountCaseCost("loc_vmzy5v5m", 0);
    expect(loadAccountCaseCost("loc_vmzy5v5m")).toBeNull();
    saveAccountCaseCost("loc_vmzy5v5m", Number.NaN);
    expect(loadAccountCaseCost("loc_vmzy5v5m")).toBeNull();
  });

  it("leaves one door's price alone when another is set", () => {
    saveAccountCaseCost("loc_vmzy5v5m", 33);
    expect(resolvePricing("loc_sfsxwnzd", DEFAULT_PRICING).pricing.caseCost).toBe(
      DEFAULT_PRICING.caseCost
    );
  });
});

