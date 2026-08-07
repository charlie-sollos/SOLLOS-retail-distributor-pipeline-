import { describe, expect, it } from "vitest";
import {
  TRAY_CANS,
  cansForLine,
  countLines,
  effectiveWarehouses,
  inventory,
  lineLabel,
  palletsForLine,
  reorderCoverage,
  summarizeStorage,
  totalStock,
  type StorageLine,
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

/* -------------------------------------------------------------------------- */
/*  Storage units                                                              */
/* -------------------------------------------------------------------------- */

const CASE_SIZE = 12;

const line = (over: Partial<StorageLine> = {}): StorageLine => ({
  quantity: 1,
  measure: "case",
  formulation: "new",
  ...over,
});

describe("cansForLine", () => {
  it("converts the measures that come with a conversion", () => {
    expect(cansForLine(line({ quantity: 9, measure: "can" }), CASE_SIZE)).toBe(9);
    expect(cansForLine(line({ quantity: 28, measure: "tray" }), CASE_SIZE)).toBe(28 * TRAY_CANS);
    expect(cansForLine(line({ quantity: 84, measure: "case" }), CASE_SIZE)).toBe(84 * CASE_SIZE);
  });

  /**
   * The one that matters. Nobody has said how many cases sit on a pallet, and a
   * plausible guess here would become the largest figure on the inventory page
   * and the only invented one.
   */
  it("refuses to put a number on a pallet", () => {
    expect(cansForLine(line({ quantity: 3, measure: "pallet" }), CASE_SIZE)).toBeNull();
  });

  it("follows the case size rather than assuming twelve", () => {
    expect(cansForLine(line({ quantity: 10, measure: "case" }), 24)).toBe(240);
  });
});

describe("palletsForLine", () => {
  it("counts a part pallet as its fraction", () => {
    expect(palletsForLine(line({ quantity: 1, measure: "pallet", fill: 0.7 }))).toBeCloseTo(0.7);
  });

  it("treats a pallet with no fill as a full one", () => {
    expect(palletsForLine(line({ quantity: 3, measure: "pallet" }))).toBe(3);
  });

  it("is zero for anything that is not a pallet", () => {
    expect(palletsForLine(line({ quantity: 84, measure: "case" }))).toBe(0);
  });
});

describe("countLines", () => {
  it("keeps cans and pallets apart instead of adding them", () => {
    expect(
      countLines(
        [
          line({ quantity: 3, measure: "pallet" }),
          line({ quantity: 28, measure: "tray" }),
          line({ quantity: 9, measure: "can" }),
        ],
        CASE_SIZE
      )
    ).toEqual({ cans: 28 * TRAY_CANS + 9, pallets: 3 });
  });

  it("counts nothing as nothing", () => {
    expect(countLines([], CASE_SIZE)).toEqual({ cans: 0, pallets: 0 });
  });
});

describe("lineLabel", () => {
  it("gets the plural right", () => {
    expect(lineLabel(line({ quantity: 1, measure: "pallet" }))).toBe("1 pallet");
    expect(lineLabel(line({ quantity: 3, measure: "pallet" }))).toBe("3 pallets");
    expect(lineLabel(line({ quantity: 9, measure: "can" }))).toBe("9 cans");
  });

  it("says how full a part pallet is", () => {
    expect(lineLabel(line({ quantity: 1, measure: "pallet", fill: 0.7 }))).toBe(
      "1 pallet, about 70% full"
    );
  });

  it("does not label a full pallet as full", () => {
    expect(lineLabel(line({ quantity: 2, measure: "pallet", fill: 1 }))).toBe("2 pallets");
  });
});

describe("the Florida Compass count", () => {
  const site = inventory.storage.find((s) => s.id === "site_fl_compass")!;

  it("is on record with all three units", () => {
    expect(site).toBeDefined();
    expect(site.units.map((u) => u.unit)).toEqual(["1216", "1205", "1164"]);
  });

  it("adds up to what was counted", () => {
    const totals = summarizeStorage(site.units, CASE_SIZE);
    // 3 + 0.7 + 3 + 4
    expect(totals.pallets).toBeCloseTo(10.7);
    // 28 trays at 24, 9 loose, 84 cases at 12
    expect(totals.cans).toBe(28 * TRAY_CANS + 9 + 84 * CASE_SIZE);
    expect(totals.cans).toBe(1689);
  });

  it("keeps the old formulation separate from the new", () => {
    const totals = summarizeStorage(site.units, CASE_SIZE);
    expect(totals.byFormulation.new).toEqual({ cans: 0, pallets: 10 });
    expect(totals.byFormulation.old.pallets).toBeCloseTo(0.7);
    expect(totals.byFormulation.old.cans).toBe(84 * CASE_SIZE);
  });

  /** The trays and loose cans in 1216 arrived without a recipe against them. */
  it("flags the lines that arrived without a formulation", () => {
    const totals = summarizeStorage(site.units, CASE_SIZE);
    expect(totals.hasUnlabelled).toBe(true);
    expect(totals.byFormulation.unknown.cans).toBe(28 * TRAY_CANS + 9);
  });

  /**
   * The site is deliberately not in the company stock figure: most of it is on
   * pallets, so a partial number would read as the whole site and drag the
   * reorder coverage signal down with it.
   */
  it("stays out of the warehouse totals", () => {
    const warehouseCases = totalStock(inventory.warehouses, CASE_SIZE).cases;
    expect(warehouseCases).toBe(1680 + 4331 + 300 + 50);
    expect(inventory.warehouses.some((w) => w.name.includes("Compass"))).toBe(false);
  });
});
