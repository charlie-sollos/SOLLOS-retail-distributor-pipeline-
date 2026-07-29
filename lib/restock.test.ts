import { describe, expect, it } from "vitest";
import { estimateUnitsOnHand, restockSignal, REORDER_URGENT_DAYS, REORDER_SOON_DAYS } from "@/lib/restock";
import { computeEntry } from "@/lib/velocity";
import { DEFAULT_PRICING, derivePricing } from "@/lib/pricing";

const P = derivePricing(DEFAULT_PRICING);

describe("estimateUnitsOnHand", () => {
  it("nets cases shipped against cans sold, in cans", () => {
    const shipments = [{ id: "s1", date: "2026-07-01", cases: 2 }]; // 24 cans at case size 12
    const velocity = [computeEntry("2026-07-01", "2026-07-07", 10, P)];
    expect(estimateUnitsOnHand(shipments, velocity, 12)).toBe(14);
  });

  it("clamps at zero rather than going negative when sales outrun logged shipments", () => {
    const shipments = [{ id: "s1", date: "2026-07-01", cases: 1 }]; // 12 cans
    const velocity = [computeEntry("2026-07-01", "2026-07-07", 20, P)];
    expect(estimateUnitsOnHand(shipments, velocity, 12)).toBe(0);
  });

  it("is zero with nothing shipped or sold", () => {
    expect(estimateUnitsOnHand([], [], 12)).toBe(0);
  });
});

describe("restockSignal", () => {
  it("reports unknown when there is no rate to project from", () => {
    const s = restockSignal(50, 0);
    expect(s.tone).toBe("unknown");
    expect(s.daysOfCover).toBeNull();
  });

  it("flags urgent at or under the urgent threshold", () => {
    const s = restockSignal(REORDER_URGENT_DAYS * 2, 2);
    expect(s.tone).toBe("urgent");
    expect(s.daysOfCover).toBe(REORDER_URGENT_DAYS);
  });

  it("calls out likely-out-of-stock at zero cover", () => {
    const s = restockSignal(0, 2);
    expect(s.tone).toBe("urgent");
    expect(s.label).toContain("out of stock");
  });

  it("flags soon between the urgent and soon thresholds", () => {
    const s = restockSignal(REORDER_SOON_DAYS * 2, 2);
    expect(s.tone).toBe("soon");
    expect(s.daysOfCover).toBe(REORDER_SOON_DAYS);
  });

  it("reports ok comfortably past the soon threshold", () => {
    const s = restockSignal((REORDER_SOON_DAYS + 10) * 2, 2);
    expect(s.tone).toBe("ok");
  });
});
