/**
 * What needs looking at right now, across the whole tool.
 *
 * The overview already lists doors needing attention. This is the layer above:
 * one ranked list that also reaches into inventory and the weekly reports, so
 * somebody signing in on a Monday sees the real problems without visiting four
 * pages to find them.
 *
 * Kept as a pure function so the ranking can be tested without rendering.
 */

export type Severity = "high" | "medium" | "low";

export type Issue = {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  href: string;
};

export type AttentionInput = {
  doorsTotal: number;
  doorsReporting: number;
  reorderNowCount: number;
  casesNeeded: number;
  casesOnHand: number;
  /** From lib/inventory reorderCoverage. "short" means the warehouse cannot fill the queue. */
  coverageTone: "short" | "tight" | "ok";
  unconfirmedWarehouseCases: number;
  pricingUnconfirmedCount: number;
  shippedNotSellingCount: number;
  productionNotRunning: number;
  productionUnderPlanCount: number;
  productionPlaceholder: boolean;
  awaitingReportsCount: number;
};

const RANK: Record<Severity, number> = { high: 0, medium: 1, low: 2 };

export function pressingIssues(input: AttentionInput): Issue[] {
  const issues: Issue[] = [];
  const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

  // Cannot supply the doors that are asking. Nothing else here outranks it.
  if (input.coverageTone === "short" && input.reorderNowCount > 0) {
    issues.push({
      id: "stock-short",
      severity: "high",
      title: "Not enough stock for the reorder queue",
      detail: `${input.reorderNowCount} ${plural(input.reorderNowCount, "door needs", "doors need")} ${input.casesNeeded} cases and only ${input.casesOnHand} are on hand.`,
      href: "/inventory",
    });
  } else if (input.reorderNowCount > 0) {
    issues.push({
      id: "reorder-now",
      severity: "high",
      title: `${input.reorderNowCount} ${plural(input.reorderNowCount, "door is", "doors are")} out or nearly out`,
      detail: `A week or less of cover left. ${input.casesNeeded} cases would clear it.`,
      href: "/pipeline",
    });
  }

  // A stopped line is the thing that turns into a stockout in two weeks.
  if (input.productionNotRunning > 0) {
    issues.push({
      id: "line-stopped",
      severity: "high",
      title: `Production reported not running on ${input.productionNotRunning} ${plural(input.productionNotRunning, "submission", "submissions")}`,
      detail: "Worth confirming before it shows up as a supply gap.",
      href: "/reports/production",
    });
  }

  if (input.productionUnderPlanCount > 0) {
    issues.push({
      id: "under-plan",
      severity: "medium",
      title: `${input.productionUnderPlanCount} production ${plural(input.productionUnderPlanCount, "run", "runs")} came in under plan`,
      detail: "Planned cases were not met.",
      href: "/reports/production",
    });
  }

  if (input.shippedNotSellingCount > 0) {
    issues.push({
      id: "shipped-not-selling",
      severity: "medium",
      title: `${input.shippedNotSellingCount} ${plural(input.shippedNotSellingCount, "door has", "doors have")} taken cases but logged no sales`,
      detail: "Either the sell-through is not being reported, or it is not selling.",
      href: "/pipeline",
    });
  }

  if (input.pricingUnconfirmedCount > 0) {
    issues.push({
      id: "pricing-unconfirmed",
      severity: "medium",
      title: `${input.pricingUnconfirmedCount} ${plural(input.pricingUnconfirmedCount, "account bills", "accounts bill")} at an unconfirmed case cost`,
      detail: "Revenue and margin for those doors are estimates until the real price is set.",
      href: "/pipeline",
    });
  }

  // A tool nobody feeds cannot answer anything, so low coverage is itself an issue.
  if (input.doorsTotal > 0 && input.doorsReporting / input.doorsTotal < 0.25) {
    issues.push({
      id: "low-coverage",
      severity: "medium",
      title: `Only ${input.doorsReporting} of ${input.doorsTotal} doors are reporting`,
      detail: "Velocity drives every restock and amp-up call. The rest are invisible.",
      href: "/pipeline?data=Needs%20Data",
    });
  }

  if (input.unconfirmedWarehouseCases > 0) {
    issues.push({
      id: "stock-unconfirmed",
      severity: "low",
      title: `${input.unconfirmedWarehouseCases} cases sit in counts nobody has confirmed`,
      detail: "Estimates entered as placeholders, still waiting on a real count.",
      href: "/inventory",
    });
  }

  if (input.productionPlaceholder) {
    issues.push({
      id: "production-placeholder",
      severity: "low",
      title: "The production report is still sample data",
      detail: "Its figures are placeholders and should not be quoted.",
      href: "/reports/production",
    });
  }

  if (input.awaitingReportsCount > 0) {
    issues.push({
      id: "reports-awaiting",
      severity: "low",
      title: `${input.awaitingReportsCount} weekly ${plural(input.awaitingReportsCount, "report has", "reports have")} not been shared yet`,
      detail: "Nothing to read in until the spreadsheets arrive.",
      href: "/reports",
    });
  }

  // Stable sort: severity first, insertion order within a severity, which is
  // the order they are written above and reads as most to least urgent.
  return issues.sort((a, b) => RANK[a.severity] - RANK[b.severity]);
}

export const severityStyle: Record<Severity, string> = {
  high: "border-t-sollos-orange",
  medium: "border-t-sollos-orange/50",
  low: "border-t-sollos-navy/25",
};

export const severityLabel: Record<Severity, string> = {
  high: "Now",
  medium: "This week",
  low: "When you can",
};
