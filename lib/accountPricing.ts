import billingSeed from "@/data/account-billing.json";
import { DEFAULT_PRICING, sanitizePricing, type Pricing } from "@/lib/pricing";

/**
 * One invoice SOLLOS raised against a door, straight from QuickBooks. Amounts
 * are the invoice total: no line items, so there is no case count in here.
 */
export type Invoice = {
  date: string;
  number: string;
  amount: number;
  status: string;
};

export type AccountBilling = {
  /** The customer name as it reads in QuickBooks, which is often not the door name. */
  customer: string;
  invoices: Invoice[];
};

/**
 * Ships empty on purpose. This repo and the Vercel deployment are both public
 * and unauthenticated, and real contents would be other businesses' invoice
 * amounts and payment status rendered on a page that names them.
 *
 * To work with real billing locally, copy data/account-billing.local.json over
 * data/account-billing.json. That local file is gitignored and the committed one
 * is marked skip-worktree, so the copy will not show up in git status. Once a
 * SOLLOS-team login exists, this can be seeded properly.
 *
 * Provenance of the local file: QuickBooks AR transaction export, 05/26/2026 to
 * 07/28/2026, matched to doors by name. Eight of the seventeen customers on that
 * export matched a door with confidence; the rest are person-name accounts or
 * names with no counterpart in locations.json, and are deliberately absent rather
 * than guessed at.
 */
const billing = billingSeed as Record<string, AccountBilling>;

const ACCOUNT_COST_PREFIX = "sollos:account-case-cost:";

export function getBilling(storeId: string): AccountBilling | null {
  return billing[storeId] ?? null;
}

/** Every door with invoices on record, whether or not its price is settled. */
export function billedStoreIds(): string[] {
  return Object.keys(billing);
}

const toCents = (n: number) => Math.round(n * 100);

/** What an invoice total buys, once it is split into full cases and loose cans. */
export type InvoiceBreakdown = {
  /** Whole cans the amount pays for at the per-can rate. */
  cans: number;
  cases: number;
  /**
   * Cans beyond the last full case. Recorded as samples on Charlie's read of the
   * business: a part case on an invoice is product going out as a taster rather
   * than a short-shipped case. Worth knowing that the remainder could also be
   * tax, a delivery fee, or a second SKU, none of which this can tell apart, so
   * it is labelled as an assumption everywhere it is shown.
   */
  samples: number;
};

/**
 * Splits an invoice total into cases and sample cans at a given case cost, or
 * returns null when the amount is not a whole number of cans and so cannot be
 * explained by this price at all.
 *
 * Runs in integer cents throughout. 673.2 / 34.2 is not exact in binary floating
 * point, and a tolerance test here would quietly accept part cans, which is the
 * one thing this function exists to catch.
 */
export function breakdown(amount: number, pricing: Pricing): InvoiceBreakdown | null {
  const costCents = toCents(pricing.caseCost);
  const size = Math.round(pricing.caseSize);
  if (costCents <= 0 || size <= 0) return null;

  const totalCents = toCents(amount);
  if (totalCents <= 0) return null;

  // cans = amount / (caseCost / caseSize), rearranged to stay in integers.
  const numerator = totalCents * size;
  if (numerator % costCents !== 0) return null;

  const cans = numerator / costCents;
  return { cans, cases: Math.floor(cans / size), samples: cans % size };
}

/**
 * A case cost only explains an account if every invoice on record resolves to a
 * whole number of cans at it. One that does not means the price is wrong, or the
 * invoice carries something other than product, or both.
 *
 * Note that allowing a part-case remainder to count as samples deliberately does
 * not make this check vacuous: the remainder still has to land on a whole can.
 * At the network default of $27.60 not one invoice in the QuickBooks export does.
 */
export function explainsBilling(pricing: Pricing, invoices: Invoice[]): boolean {
  return invoices.length > 0 && invoices.every((i) => breakdown(i.amount, pricing) !== null);
}

export function loadAccountCaseCost(storeId: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ACCOUNT_COST_PREFIX + storeId);
    if (raw === null) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

/** Passing null clears the account price and drops the door back to the global one. */
export function saveAccountCaseCost(storeId: string, caseCost: number | null): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (caseCost === null || !Number.isFinite(caseCost) || caseCost <= 0) {
      window.localStorage.removeItem(ACCOUNT_COST_PREFIX + storeId);
    } else {
      window.localStorage.setItem(ACCOUNT_COST_PREFIX + storeId, String(caseCost));
    }
    return true;
  } catch {
    return false;
  }
}

export type PricingResolution = {
  /** What every figure on this door should actually be computed from. */
  pricing: Pricing;
  /** Whether the case cost came from this door or from the global fallback. */
  source: "account" | "global";
  billing: AccountBilling | null;
  /**
   * Set when this door has invoices that the case cost in force cannot explain.
   * The figures are still shown, because a rough number beats a blank, but they
   * must be labelled rather than presented as settled.
   */
  conflict: { invoiceCount: number; billedTotal: number } | null;
  /** Cases and sample cans across every invoice, once the price reconciles. */
  totals: { cases: number; samples: number } | null;
};

/**
 * Resolves what a single door is actually billed at.
 *
 * The global case cost came from the Store Velocity Tracker's pricing tab and is
 * a real number, but it is one number for a network that demonstrably bills at
 * several. No invoice in the QuickBooks export divides by it. So it stays the
 * fallback rather than the truth, and any door whose billing contradicts it says
 * so on screen instead of quietly reporting margin that nobody earns.
 *
 * The per-account cost is not seeded. It cannot be: no single case price explains
 * more than half the invoices on record, so backing one out of invoice totals
 * would be inventing data. It has to be entered by someone with the line items.
 */
export function resolvePricing(storeId: string, global: Pricing): PricingResolution {
  const safeGlobal = sanitizePricing(global);
  const account = loadAccountCaseCost(storeId);
  const caseCost = account ?? safeGlobal.caseCost;
  const record = getBilling(storeId);

  const pricing = { ...safeGlobal, caseCost };
  return {
    pricing,
    source: account === null ? "global" : "account",
    billing: record,
    ...assess(pricing, record),
  };
}

/** Server-render safe: the static roster before any browser storage is readable. */
export function resolvePricingStatic(storeId: string): PricingResolution {
  const record = getBilling(storeId);
  return {
    pricing: DEFAULT_PRICING,
    source: "global",
    billing: record,
    ...assess(DEFAULT_PRICING, record),
  };
}

/** Either the billing reconciles and totals up, or it conflicts. Never both. */
function assess(
  pricing: Pricing,
  record: AccountBilling | null
): Pick<PricingResolution, "conflict" | "totals"> {
  if (!record) return { conflict: null, totals: null };

  if (!explainsBilling(pricing, record.invoices)) {
    return {
      conflict: {
        invoiceCount: record.invoices.length,
        billedTotal: Math.round(record.invoices.reduce((sum, i) => sum + i.amount, 0) * 100) / 100,
      },
      totals: null,
    };
  }

  const totals = record.invoices.reduce(
    (acc, i) => {
      const b = breakdown(i.amount, pricing)!;
      return { cases: acc.cases + b.cases, samples: acc.samples + b.samples };
    },
    { cases: 0, samples: 0 }
  );
  return { conflict: null, totals };
}
