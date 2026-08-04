import type { ShipmentEntry } from "@/lib/shipments";
import { daysOfCover, type VelocityEntry } from "@/lib/velocity";

/** How many days of cover is close enough to empty to act on today. */
export const REORDER_URGENT_DAYS = 7;
/** How many days of cover is worth a heads-up, even if not urgent yet. */
export const REORDER_SOON_DAYS = 14;

export type RestockTone = "urgent" | "soon" | "ok" | "unknown";

export type RestockSignal = {
  tone: RestockTone;
  label: string;
  onHandUnits: number;
  daysOfCover: number | null;
};

/**
 * A running balance, not a count: every can ever shipped minus every can
 * logged sold. There is no starting inventory to net against, so this only
 * holds up once both logs go back to day one for a store — an unlogged
 * shipment undercounts what's on the shelf, an unlogged sale overcounts it.
 * Clamped at zero rather than letting an under-logged sale run negative.
 */
export function estimateUnitsOnHand(
  shipments: ShipmentEntry[],
  velocityEntries: VelocityEntry[],
  caseSize: number
): number {
  const shipped = shipments.reduce((sum, e) => sum + e.cases * caseSize, 0);
  const sold = velocityEntries.reduce((sum, e) => sum + e.unitsSold, 0);
  return Math.max(0, shipped - sold);
}

/**
 * The question Shipments and Velocity couldn't answer on their own: not just
 * that a door sells, and not just what landed, but how much longer what's on
 * the shelf now will last at the current rate.
 */
export function restockSignal(onHandUnits: number, unitsPerDay: number): RestockSignal {
  if (unitsPerDay <= 0) {
    return {
      tone: "unknown",
      label: "Not enough recent sell-through to project a restock date",
      onHandUnits,
      daysOfCover: null,
    };
  }

  const cover = daysOfCover(onHandUnits, unitsPerDay) ?? 0;

  if (cover <= REORDER_URGENT_DAYS) {
    return {
      tone: "urgent",
      label:
        cover <= 0
          ? "Likely out of stock — reorder now"
          : `Reorder now — about ${cover} day${cover === 1 ? "" : "s"} of cover left`,
      onHandUnits,
      daysOfCover: cover,
    };
  }
  if (cover <= REORDER_SOON_DAYS) {
    return {
      tone: "soon",
      label: `Reorder soon — about ${cover} days of cover left`,
      onHandUnits,
      daysOfCover: cover,
    };
  }
  return {
    tone: "ok",
    label: `Stocked — about ${cover} days of cover left`,
    onHandUnits,
    daysOfCover: cover,
  };
}

/**
 * Cases needed to bring a door back up to a working level of cover.
 *
 * Targets REORDER_SOON_DAYS rather than some round number of cases, so the
 * figure means the same thing as the signal that raised it: enough that the
 * door stops being a reorder. Rounds up, since a part case is not shippable.
 */
export function casesToTopUp(
  unitsPerDay: number,
  onHandUnits: number,
  caseSize: number,
  targetDays: number = REORDER_SOON_DAYS
): number {
  if (unitsPerDay <= 0 || caseSize <= 0) return 0;
  const shortfall = unitsPerDay * targetDays - onHandUnits;
  return shortfall <= 0 ? 0 : Math.ceil(shortfall / caseSize);
}

export const restockToneStyle: Record<RestockTone, string> = {
  urgent: "bg-sollos-orange/16 text-sollos-orange",
  soon: "bg-sollos-orange/8 text-sollos-orange/80",
  ok: "bg-sollos-good/12 text-sollos-good",
  unknown: "bg-sollos-navy/8 text-sollos-navy/55",
};
