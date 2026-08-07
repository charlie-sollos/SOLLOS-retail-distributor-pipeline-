"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useStoreRows, daysStale, type StoreRow } from "@/lib/useStoreRows";
import { aggregateByWeek, toneStyle } from "@/lib/velocity";
import { effectiveWarehouses, inventory, reorderCoverage, totalStock } from "@/lib/inventory";
import {
  productionReport,
  summarizeProduction,
  REPORTS,
} from "@/lib/reports";
import { pressingIssues, severityLabel, severityStyle } from "@/lib/attention";
import { useWarehouseOverrides } from "@/lib/useWarehouseOverrides";
import { DEFAULT_PRICING } from "@/lib/pricing";
import { SalesChart } from "@/components/SalesChart";
import { BarChart, type Bar } from "@/components/BarChart";
import { Disclosure } from "@/components/Disclosure";
import { PixelBeach } from "@/components/PixelBeach";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/Table";
import { normalizeState } from "@/lib/locations";
import {
  Page,
  SectionHeading,
  Stat,
  Meter,
  SunMark,
  EmptyState,
} from "@/components/ui";

const STALE_AFTER_DAYS = 14;

export function OverviewClient({ firstName }: { firstName: string }) {
  const { rows } = useStoreRows();
  const warehouseOverrides = useWarehouseOverrides();

  // Every signal below describes a door's sell-through. A distributor moves a
  // pallet at a time and a DTC order has no shelf at all, so neither belongs in
  // a coverage percentage, a leaderboard, or a restock call.
  const doors = rows.filter((r) => r.channel === "dsd");
  const otherChannels = rows.filter((r) => r.channel !== "dsd");

  const withData = doors.filter((r) => r.entries.length > 0);
  const needsData = doors.filter((r) => r.entries.length === 0);
  const declining = withData.filter((r) => r.signal.tone === "declining");
  const growing = withData.filter((r) => r.signal.tone === "growing");
  const stale = withData.filter((r) => {
    const d = daysStale(r);
    return d !== null && d > STALE_AFTER_DAYS;
  });
  const shippedNotSelling = doors.filter((r) => r.shipmentSignal.stale);
  const reorderNow = doors.filter((r) => r.restock?.tone === "urgent");
  // Doors whose invoices contradict the case cost their figures are computed from.
  const pricingUnconfirmed = rows.filter((r) => r.pricing.conflict !== null);

  const totalUnits = withData.reduce((s, r) => s + r.summary.totalUnits, 0);
  const sollosRevenue = withData.reduce((s, r) => s + r.summary.totalSollosRevenue, 0);
  const casesPerWeek = withData.reduce((s, r) => s + r.casesPerWeek, 0);

  const weeklySales = useMemo(
    () => aggregateByWeek(rows.filter((r) => r.channel === "dsd").flatMap((r) => r.entries)),
    [rows]
  );

  const topMovers = [...withData]
    .sort((a, b) => b.summary.avgUnitsPerDay - a.summary.avgUnitsPerDay)
    .slice(0, 5);

  const dataCoverage = doors.length ? withData.length / doors.length : 0;

  // Whether the warehouse can actually fill what the reorder queue is asking for.
  const casesNeeded = reorderNow.reduce((sum, r) => sum + r.casesNeeded, 0);
  const stock = totalStock(effectiveWarehouses(warehouseOverrides), DEFAULT_PRICING.caseSize);
  const coverage = reorderCoverage(casesNeeded, stock);

  // Two charts that read off figures already confirmed, rather than off the
  // placeholder rows in the weekly reports. Footprint and warehouse stock are
  // both real; production and distributor holdings are still sample data, so
  // charting them here would put invented numbers on the first page anyone sees.
  const doorsByState = useMemo<Bar[]>(() => {
    const counts = new Map<string, number>();
    for (const r of rows) {
      if (r.channel !== "dsd") continue;
      const state = normalizeState(r.loc.state) || "Unknown";
      counts.set(state, (counts.get(state) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([state, n]) => ({
        key: state,
        label: state,
        value: n,
        display: `${n} ${n === 1 ? "door" : "doors"}`,
      }));
  }, [rows]);

  const warehouseBars = useMemo<Bar[]>(
    () =>
      effectiveWarehouses(warehouseOverrides)
        .slice()
        .sort((a, b) => b.cases - a.cases)
        .map((w) => ({
          key: w.id,
          label: w.name,
          value: w.cases,
          display: w.confirmed
            ? w.cases.toLocaleString()
            : `${w.cases.toLocaleString()} est.`,
          provisional: !w.confirmed,
        })),
    [warehouseOverrides]
  );

  const production = summarizeProduction(productionReport.entries);
  const awaitingReports = REPORTS.filter((r) => r.status === "awaiting").length;

  const issues = pressingIssues({
    doorsTotal: doors.length,
    doorsReporting: withData.length,
    reorderNowCount: reorderNow.length,
    casesNeeded,
    casesOnHand: stock.cases,
    coverageTone: coverage.tone,
    unconfirmedWarehouseCases: stock.unconfirmedCases,
    pricingUnconfirmedCount: pricingUnconfirmed.length,
    shippedNotSellingCount: shippedNotSelling.length,
    productionNotRunning: production.notRunning,
    productionUnderPlanCount: production.underPlan.length,
    productionPlaceholder: productionReport.placeholder,
    awaitingReportsCount: awaitingReports,
  });
  const topIssues = issues.slice(0, 4);

  return (
    <Page>
      <PixelBeach>
        <h1
          className="pixel-face text-2xl text-white sm:text-4xl"
          style={{ textShadow: "3px 3px 0 #002a53" }}
        >
          {firstName ? `Hi ${firstName}` : "Overview"}
        </h1>
        <p
          className="pixel-face mt-3 max-w-md text-[10px] leading-relaxed text-white sm:text-xs"
          style={{ textShadow: "2px 2px 0 #002a53" }}
        >
          Retail and distributor footprint at a glance
        </p>
      </PixelBeach>

      {/* The tiles sit on the sand rather than below the picture, so the header
          reads as one object instead of a banner with a grid under it. */}
      <section className="relative z-10 -mt-14 mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Stat label="Live doors" value={doors.length} />
        <Stat
          label="Reporting"
          value={withData.length}
          unit={`of ${doors.length}`}
          hint={`${Math.round(dataCoverage * 100)}% coverage`}
        />
        <Stat label="Cans sold" value={totalUnits.toLocaleString()} />
        <Stat
          label="SOLLOS revenue"
          value={`$${sollosRevenue.toFixed(0)}`}
          hint={
            pricingUnconfirmed.length > 0
              ? `Est. ${pricingUnconfirmed.length} doors unpriced`
              : "Billed at case cost"
          }
        />
      </section>

      {/* Folded away by default. It stays the first thing on the page and keeps
          its count on the button, so shutting it hides the detail, not the fact
          that there is something waiting. */}
      {topIssues.length > 0 && (
        <Disclosure
          id="needs-you-now"
          title="NEEDS YOU NOW"
          count={issues.length}
          tone={topIssues.some((i) => i.severity === "high") ? "orange" : "navy"}
          summary={topIssues[0].title}
        >
          <ul className="space-y-2.5">
            {topIssues.map((issue) => (
              <li key={issue.id}>
                <Link
                  href={issue.href}
                  className={`card block border-t-2 p-4 transition-colors hover:bg-white ${severityStyle[issue.severity]}`}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold text-sollos-navy">{issue.title}</p>
                    <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-sollos-navy/45">
                      {severityLabel[issue.severity]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-sollos-navy/60">{issue.detail}</p>
                </Link>
              </li>
            ))}
          </ul>
        </Disclosure>
      )}

      {/* Named rather than folded in, so nobody reads a distributor pallet as shelf movement. */}
      {otherChannels.length > 0 && (
        <p className="-mt-6 mb-10 text-sm text-sollos-navy/55">
          Plus{" "}
          <Link
            href="/pipeline?channel=distributor"
            className="font-medium underline decoration-sollos-navy/25 underline-offset-4 hover:text-sollos-navy"
          >
            {otherChannels.length} non-door {otherChannels.length === 1 ? "account" : "accounts"}
          </Link>
          , held out of every figure above. Distributor and DTC volume says nothing about
          sell-through at a shelf.
        </p>
      )}

      {/* Getting data in is the single most valuable action, so lead with it. */}
      {needsData.length > 0 && (
        <section className="mb-10">
          <div className="card relative overflow-hidden p-5 sm:p-6">
            <SunMark className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 opacity-[0.07]" />
            <div className="relative">
              <p className="eyebrow mb-2">Biggest gap</p>
              <p className="text-2xl font-semibold tracking-[-0.02em] text-sollos-navy">
                {withData.length} of {doors.length} doors are reporting
              </p>
              <p className="mt-1.5 max-w-xl text-sm text-sollos-navy/60">
                Velocity is what drives every restock and every amp-up call. Until a door
                reports, it is invisible to the leaderboard and the alerts below.
              </p>
              <div className="mt-4 max-w-sm">
                <Meter value={withData.length} max={doors.length} />
              </div>
              <Link
                href="/pipeline?data=Needs%20Data"
                className="pixel-btn mt-4 bg-sollos-orange text-white transition-colors hover:bg-sollos-orange/85"
              >
                Log data for {needsData.length} {needsData.length === 1 ? "door" : "doors"}
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </section>
      )}

      <section className="mb-10">
        <SectionHeading>Needs attention</SectionHeading>
        {declining.length === 0 &&
        growing.length === 0 &&
        stale.length === 0 &&
        shippedNotSelling.length === 0 &&
        reorderNow.length === 0 &&
        pricingUnconfirmed.length === 0 ? (
          <EmptyState title="Nothing needs attention">
            Once a few doors have two or more periods on record, slowdowns and breakouts
            show up here.
          </EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AlertCard
              tone="urgent"
              title="Reorder now"
              rows={reorderNow}
              note={
                reorderNow.length > 0
                  ? `${casesNeeded} cases to fill. ${coverage.label}`
                  : "A week or less of cover left, at the current rate"
              }
            />
            <AlertCard tone="declining" title="Slowing down" rows={declining} />
            <AlertCard tone="growing" title="Room to amp up" rows={growing} />
            <AlertCard tone="stale" title="Gone quiet" rows={stale} note="No report in 2 weeks" />
            <AlertCard
              tone="shipped"
              title="Shipped, not selling"
              rows={shippedNotSelling}
              note="No sell-through since the last case landed"
            />
            <AlertCard
              tone="pricing"
              title="Pricing unconfirmed"
              rows={pricingUnconfirmed}
              note="Invoiced amounts do not match the case cost in use"
            />
          </div>
        )}
      </section>

      {weeklySales.length >= 2 && (
        <section className="mb-10">
          <SectionHeading>Sell-through</SectionHeading>
          <SalesChart weeklySales={weeklySales} />
        </section>
      )}

      <section className="mb-10 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <SectionHeading>Where the doors are</SectionHeading>
          <BarChart bars={doorsByState} tone="navy" />
          <p className="mt-3 text-xs text-sollos-navy/45">
            All {doors.length} live doors by state. Counts the shelf, not the sales: a state
            with more doors is not necessarily selling more.
          </p>
        </div>

        <div className="card p-5">
          <SectionHeading>Cases on hand by warehouse</SectionHeading>
          <BarChart bars={warehouseBars} tone="sea" />
          <p className="mt-3 text-xs text-sollos-navy/45">
            {stock.unconfirmedCases > 0
              ? `Faded bars are estimates, ${stock.unconfirmedCases.toLocaleString()} cases of the ${stock.cases.toLocaleString()} total.`
              : `All ${stock.cases.toLocaleString()} cases confirmed.`}{" "}
            The reorder queue is asking for {casesNeeded}.
          </p>
        </div>
      </section>

      <section className="mb-10 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Link href="/inventory" className="card block p-5 transition-colors hover:bg-white">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <p className="eyebrow">Inventory</p>
            <span className="text-sm font-medium text-sollos-orange">Open &rarr;</span>
          </div>
          <p className="num text-3xl font-semibold leading-none tracking-[-0.02em] text-sollos-navy">
            {stock.cases.toLocaleString()}
            <span className="ml-1.5 text-xs font-medium text-sollos-navy/45">cases on hand</span>
          </p>
          <p className="mt-2 text-sm text-sollos-navy/60">{coverage.label}</p>
          <p className="mt-1 text-xs text-sollos-navy/45">
            Across {inventory.warehouses.length} locations
            {stock.unconfirmedCases > 0
              ? `, ${stock.unconfirmedCases.toLocaleString()} of them unconfirmed`
              : ", all counts confirmed"}
            .
          </p>
        </Link>

        <Link href="/reports/production" className="card block p-5 transition-colors hover:bg-white">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <p className="eyebrow">Latest production report</p>
            <span className="text-sm font-medium text-sollos-orange">Open &rarr;</span>
          </div>
          <p className="num text-3xl font-semibold leading-none tracking-[-0.02em] text-sollos-navy">
            {production.actualCases}
            <span className="ml-1.5 text-xs font-medium text-sollos-navy/45">
              of {production.plannedCases} cases planned
            </span>
          </p>
          <p className="mt-2 text-sm text-sollos-navy/60">
            {production.attainmentPct !== null
              ? `${production.attainmentPct}% of plan`
              : "Nothing planned"}
            {production.finishedGoodsCases !== null &&
              `, ${production.finishedGoodsCases} cases finished goods`}
            .
          </p>
          <p className="mt-1 text-xs text-sollos-navy/45">
            {productionReport.placeholder
              ? "Sample data, not real production."
              : `From ${productionReport.sourceFile}.`}
            {awaitingReports > 0 &&
              ` ${awaitingReports} other ${awaitingReports === 1 ? "report" : "reports"} not shared yet.`}
          </p>
        </Link>
      </section>

      <section>
        <SectionHeading
          action={
            <Link
              href="/pipeline"
              className="text-sm font-medium text-sollos-navy/70 underline decoration-sollos-navy/25 underline-offset-4 transition-colors hover:text-sollos-navy"
            >
              All {doors.length} doors
            </Link>
          }
        >
          Top movers
        </SectionHeading>
        {topMovers.length === 0 ? (
          <EmptyState title="No velocity data yet">
            Add a week of units on any store page and it will rank here.
          </EmptyState>
        ) : (
          <Table caption="Stores ranked by current daily sell-through">
            <Thead>
              <Th className="w-10">#</Th>
              <Th>Store</Th>
              <Th align="right">Cans / day</Th>
              <Th align="right">Cases / wk</Th>
              <Th>Signal</Th>
            </Thead>
            <Tbody>
              {topMovers.map((row, i) => (
                <Tr key={row.loc.id}>
                  <Td muted>{i + 1}</Td>
                  <Td strong>
                    <Link
                      href={`/stores/${row.loc.id}`}
                      className="underline decoration-transparent underline-offset-4 transition-colors hover:decoration-sollos-navy/30"
                    >
                      {row.loc.name}
                    </Link>
                  </Td>
                  <Td numeric strong>
                    {row.summary.avgUnitsPerDay}
                  </Td>
                  <Td numeric>{row.casesPerWeek}</Td>
                  <Td>
                    <span
                      className={`badge ${toneStyle[row.signal.tone]}`}
                    >
                      {row.signal.label}
                    </span>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
        {casesPerWeek > 0 && (
          <p className="mt-3 text-xs text-sollos-navy/50">
            Reporting doors are consuming about{" "}
            <span className="num font-medium text-sollos-navy">{casesPerWeek.toFixed(1)}</span>{" "}
            cases a week at their current rate.
          </p>
        )}
      </section>
    </Page>
  );
}

const alertRail: Record<string, string> = {
  declining: "border-t-sollos-orange",
  growing: "border-t-sollos-good",
  stale: "border-t-sollos-navy/35",
  shipped: "border-t-sollos-orange",
  urgent: "border-t-sollos-orange",
  pricing: "border-t-sollos-navy/35",
};

function AlertCard({
  tone,
  title,
  rows,
  note,
}: {
  tone: "declining" | "growing" | "stale" | "shipped" | "urgent" | "pricing";
  title: string;
  rows: StoreRow[];
  note?: string;
}) {
  return (
    <div className={`card border-t-2 p-4 ${alertRail[tone]}`}>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-sollos-navy">{title}</p>
        <span className="num text-sm font-semibold text-sollos-navy/45">{rows.length}</span>
      </div>
      {note && <p className="mb-2 text-xs text-sollos-navy/45">{note}</p>}
      {rows.length === 0 ? (
        <p className="text-sm text-sollos-navy/40">Nothing here.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {rows.slice(0, 5).map((r) => (
            <li key={r.loc.id}>
              <Link
                href={`/stores/${r.loc.id}`}
                className="text-sollos-navy/75 underline decoration-sollos-navy/20 underline-offset-4 transition-colors hover:text-sollos-navy"
              >
                {r.loc.name}
              </Link>
            </li>
          ))}
          {rows.length > 5 && (
            <li className="text-xs text-sollos-navy/45">and {rows.length - 5} more</li>
          )}
        </ul>
      )}
    </div>
  );
}
