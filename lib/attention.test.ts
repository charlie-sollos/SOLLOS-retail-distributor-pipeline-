import { describe, expect, it } from "vitest";
import { pressingIssues, type AttentionInput } from "@/lib/attention";
import { firstNameFromEmail } from "@/lib/session";

/** A quiet business: nothing wrong anywhere. */
const CALM: AttentionInput = {
  doorsTotal: 61,
  doorsReporting: 61,
  reorderNowCount: 0,
  casesNeeded: 0,
  casesOnHand: 6361,
  coverageTone: "ok",
  unconfirmedWarehouseCases: 0,
  pricingUnconfirmedCount: 0,
  shippedNotSellingCount: 0,
  productionNotRunning: 0,
  productionUnderPlanCount: 0,
  productionPlaceholder: false,
  awaitingReportsCount: 0,
};

const ids = (input: Partial<AttentionInput>) =>
  pressingIssues({ ...CALM, ...input }).map((i) => i.id);

describe("pressingIssues", () => {
  it("says nothing when nothing is wrong", () => {
    expect(pressingIssues(CALM)).toEqual([]);
  });

  it("leads with a shortfall the warehouse cannot fill", () => {
    const out = ids({
      reorderNowCount: 3,
      casesNeeded: 400,
      casesOnHand: 100,
      coverageTone: "short",
      productionNotRunning: 1,
      pricingUnconfirmedCount: 8,
    });
    expect(out[0]).toBe("stock-short");
  });

  it("reports the reorder queue on its own when stock can cover it", () => {
    const out = ids({ reorderNowCount: 2, casesNeeded: 10, coverageTone: "ok" });
    expect(out).toContain("reorder-now");
    expect(out).not.toContain("stock-short");
  });

  it("does not raise a shortfall when no door is asking", () => {
    // Short coverage with an empty queue is not a problem, it is an idle warehouse.
    expect(ids({ coverageTone: "short", reorderNowCount: 0 })).toEqual([]);
  });

  it("puts a stopped line above things that can wait", () => {
    const out = pressingIssues({
      ...CALM,
      productionNotRunning: 1,
      pricingUnconfirmedCount: 8,
      awaitingReportsCount: 2,
    });
    expect(out[0].id).toBe("line-stopped");
    expect(out[0].severity).toBe("high");
    expect(out[out.length - 1].severity).toBe("low");
  });

  it("flags thin reporting coverage, since the tool cannot answer anything without it", () => {
    expect(ids({ doorsReporting: 1, doorsTotal: 61 })).toContain("low-coverage");
    expect(ids({ doorsReporting: 40, doorsTotal: 61 })).not.toContain("low-coverage");
  });

  it("does not divide by zero doors", () => {
    expect(() => pressingIssues({ ...CALM, doorsTotal: 0, doorsReporting: 0 })).not.toThrow();
    expect(ids({ doorsTotal: 0, doorsReporting: 0 })).not.toContain("low-coverage");
  });

  it("orders every issue high, then medium, then low", () => {
    const out = pressingIssues({
      ...CALM,
      reorderNowCount: 1,
      casesNeeded: 5,
      productionNotRunning: 1,
      productionUnderPlanCount: 2,
      shippedNotSellingCount: 37,
      pricingUnconfirmedCount: 8,
      doorsReporting: 1,
      unconfirmedWarehouseCases: 350,
      productionPlaceholder: true,
      awaitingReportsCount: 2,
    });
    const rank = { high: 0, medium: 1, low: 2 };
    const severities = out.map((i) => rank[i.severity]);
    expect(severities).toEqual([...severities].sort((a, b) => a - b));
  });

  it("counts in singular and plural correctly", () => {
    const one = pressingIssues({ ...CALM, reorderNowCount: 1, casesNeeded: 5 })[0];
    expect(one.title).toContain("1 door is");
    const many = pressingIssues({ ...CALM, reorderNowCount: 3, casesNeeded: 5 })[0];
    expect(many.title).toContain("3 doors are");
  });

  it("points every issue at a page that can act on it", () => {
    const out = pressingIssues({
      ...CALM,
      reorderNowCount: 1,
      productionNotRunning: 1,
      awaitingReportsCount: 2,
    });
    for (const issue of out) expect(issue.href.startsWith("/")).toBe(true);
  });
});

describe("firstNameFromEmail", () => {
  it("greets each of the team by name", () => {
    expect(firstNameFromEmail("charlie@drinksollos.com")).toBe("Charlie");
    expect(firstNameFromEmail("rodolfo@drinksollos.com")).toBe("Rodolfo");
    expect(firstNameFromEmail("dillon@drinksollos.com")).toBe("Dillon");
  });

  it("takes the first part of a dotted address", () => {
    expect(firstNameFromEmail("jane.doe@drinksollos.com")).toBe("Jane");
  });

  it("returns nothing rather than something odd for a missing address", () => {
    expect(firstNameFromEmail(undefined)).toBe("");
    expect(firstNameFromEmail("")).toBe("");
    expect(firstNameFromEmail("@drinksollos.com")).toBe("");
  });
});
