import { describe, expect, it } from "vitest";
import {
  effectiveWarehouses,
  inventory,
  reorderCoverage,
  totalStock,
  type Warehouse,
} from "@/lib/inventory";
import { casesToTopUp, REORDER_SOON_DAYS } from "@/lib/restock";

const wh = (id: string, cases: number, confirmed: boolean): Warehouse => ({
  id,
  name: id,
  region: "test",
  cases,
  confirmed,
});

describe("the seeded snapshot", () => {
  it("carries the four locations at the counts given", () => {
    expect(totalStock(inventory.warehouses, 12).cases).toBe(6361);
  });

  it("marks the two counts nobody has checked as unconfirmed", () => {
    const unconfirmed = inventory.warehouses.filter((w) => !w.confirmed);
    expect(unconfirmed.map((w) => w.name)).toEqual(["West Palm Beach", "Long Island Warehouse"]);
    expect(totalStock(inventory.warehouses, 12).unconfirmedCases).toBe(350);
  });

  it("leaves both production runs ambiguous about their unit", () => {
    // A wrong guess here is a 12x error, so it stays null until someone says.
    expect(inventory.production.every((r) => r.unitsAreCans === null)).toBe(true);
  });
});

describe("totalStock", () => {
  it("converts cases to cans at the case size in force", () => {
    const stock = totalStock([wh("a", 10, true), wh("b", 5, true)], 12);
    expect(stock.cases).toBe(15);
    expect(stock.units).toBe(180);
    expect(stock.unconfirmedCases).toBe(0);
  });

  it("counts only the unconfirmed locations toward the unconfirmed total", () => {
    expect(totalStock([wh("a", 10, true), wh("b", 5, false)], 12).unconfirmedCases).toBe(5);
  });
});

describe("effectiveWarehouses", () => {
  it("treats a typed count as confirmed, since someone checked to type it", () => {
    const [w] = effectiveWarehouses({ wh_wpb: 275 }).filter((x) => x.id === "wh_wpb");
    expect(w.cases).toBe(275);
    expect(w.confirmed).toBe(true);
  });

  it("leaves the seeded count alone where there is no override", () => {
    const [w] = effectiveWarehouses({}).filter((x) => x.id === "wh_njw");
    expect(w.cases).toBe(1680);
  });
});

describe("reorderCoverage", () => {
  const stock = totalStock([wh("a", 100, true)], 12);

  it("calls a shortfall by the number of cases", () => {
    const c = reorderCoverage(150, stock);
    expect(c.tone).toBe("short");
    expect(c.label).toContain("50 cases");
  });

  it("flags a queue it can only just fill", () => {
    expect(reorderCoverage(90, stock).tone).toBe("tight");
  });

  it("is fine with room to spare", () => {
    expect(reorderCoverage(20, stock).tone).toBe("ok");
  });

  it("says so plainly when nothing is queued", () => {
    expect(reorderCoverage(0, stock).label).toBe("Nothing in the reorder queue");
  });
});

describe("casesToTopUp", () => {
  it("fills back up to the reorder-soon threshold", () => {
    // 5 cans a day for 14 days is 70 cans, less 10 on hand, over 12 a case.
    expect(casesToTopUp(5, 10, 12)).toBe(Math.ceil((5 * REORDER_SOON_DAYS - 10) / 12));
  });

  it("rounds up, since a part case is not shippable", () => {
    expect(casesToTopUp(1, 0, 12)).toBe(2);
  });

  it("asks for nothing when the door already has cover", () => {
    expect(casesToTopUp(1, 500, 12)).toBe(0);
  });

  it("asks for nothing when there is no rate to project from", () => {
    expect(casesToTopUp(0, 0, 12)).toBe(0);
  });
});
