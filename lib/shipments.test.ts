import { describe, expect, it } from "vitest";
import {
  computeShipment,
  daysSince,
  formatCases,
  formatShortDate,
  mostRecentShipment,
  shipmentStalenessSignal,
  sortByDate,
  validateShipment,
  type ShipmentEntry,
} from "@/lib/shipments";

const TODAY = new Date("2026-07-29T12:00:00Z");

describe("shipments", () => {
  it("sorts and picks the most recent shipment by date", () => {
    const entries: ShipmentEntry[] = [
      { id: "a", date: "2026-07-07", cases: 1 },
      { id: "b", date: "2026-07-21", cases: 2 },
      { id: "c", date: "2026-07-14", cases: 1 },
    ];
    expect(sortByDate(entries).map((e) => e.id)).toEqual(["a", "c", "b"]);
    expect(mostRecentShipment(entries)?.id).toBe("b");
    expect(mostRecentShipment([])).toBeNull();
  });

  it("formats short dates and case counts for display", () => {
    expect(formatShortDate("2026-07-21")).toBe("7/21");
    expect(formatCases(1)).toBe("1 case");
    expect(formatCases(2)).toBe("2 cases");
  });

  it("computes days since a date against a fixed clock", () => {
    expect(daysSince("2026-07-21", TODAY)).toBe(8);
    expect(daysSince("2026-07-29", TODAY)).toBe(0);
  });

  it("flags a shipment stale only once it's old enough and unmatched by later sell-through", () => {
    const recent = shipmentStalenessSignal(
      [{ id: "a", date: "2026-07-21", cases: 1 }],
      [],
      TODAY
    );
    expect(recent.stale).toBe(false);

    const oldNoSales = shipmentStalenessSignal(
      [{ id: "a", date: "2026-07-01", cases: 1 }],
      [],
      TODAY
    );
    expect(oldNoSales.stale).toBe(true);
    if (oldNoSales.stale) {
      expect(oldNoSales.label).toContain("no sell-through logged since");
    }

    const oldWithSales = shipmentStalenessSignal(
      [{ id: "a", date: "2026-07-01", cases: 1 }],
      [{ weekStart: "2026-07-10", weekEnd: "2026-07-16" }],
      TODAY
    );
    expect(oldWithSales.stale).toBe(false);

    expect(shipmentStalenessSignal([], [], TODAY)).toEqual({ stale: false });
  });

  it("computes a deterministic-enough id when none is supplied", () => {
    const entry = computeShipment("2026-07-21", 2);
    expect(entry.date).toBe("2026-07-21");
    expect(entry.cases).toBe(2);
    expect(entry.id).toBeTruthy();
  });

  it("validates a shipment form", () => {
    expect(validateShipment("", "1", "2026-07-29")).toContainEqual(
      expect.objectContaining({ field: "date" })
    );
    expect(validateShipment("2026-07-21", "", "2026-07-29")).toContainEqual(
      expect.objectContaining({ field: "cases" })
    );
    expect(validateShipment("2026-08-01", "1", "2026-07-29")).toContainEqual(
      expect.objectContaining({ field: "date" })
    );
    expect(validateShipment("2026-07-21", "0", "2026-07-29")).toContainEqual(
      expect.objectContaining({ field: "cases" })
    );
    expect(validateShipment("2026-07-21", "1.5", "2026-07-29")).toContainEqual(
      expect.objectContaining({ field: "cases" })
    );
    expect(validateShipment("2026-07-21", "2", "2026-07-29")).toEqual([]);
  });
});
