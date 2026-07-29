"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useStoreRows, daysStale, type StoreRow } from "@/lib/useStoreRows";
import { aggregateByWeek, toneStyle } from "@/lib/velocity";
import { SalesChart } from "@/components/SalesChart";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/Table";
import {
  Page,
  PageTitle,
  SectionHeading,
  Stat,
  Meter,
  SunMark,
  EmptyState,
} from "@/components/ui";

const STALE_AFTER_DAYS = 14;

export default function Home() {
  const { rows } = useStoreRows();

  const withData = rows.filter((r) => r.entries.length > 0);
  const needsData = rows.filter((r) => r.entries.length === 0);
  const declining = withData.filter((r) => r.signal.tone === "declining");
  const growing = withData.filter((r) => r.signal.tone === "growing");
  const stale = withData.filter((r) => {
    const d = daysStale(r);
    return d !== null && d > STALE_AFTER_DAYS;
  });

  const totalUnits = withData.reduce((s, r) => s + r.summary.totalUnits, 0);
  const sollosRevenue = withData.reduce((s, r) => s + r.summary.totalSollosRevenue, 0);
  const casesPerWeek = withData.reduce((s, r) => s + r.casesPerWeek, 0);

  const weeklySales = useMemo(
    () => aggregateByWeek(rows.flatMap((r) => r.entries)),
    [rows]
  );

  const topMovers = [...withData]
    .sort((a, b) => b.summary.avgUnitsPerDay - a.summary.avgUnitsPerDay)
    .slice(0, 5);

  const coverage = rows.length ? withData.length / rows.length : 0;

  return (
    <Page>
      <PageTitle title="Overview" subtitle="Retail and distributor footprint at a glance" />

      <section className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Stat label="Live doors" value={rows.length} />
        <Stat
          label="Reporting"
          value={withData.length}
          unit={`of ${rows.length}`}
          hint={`${Math.round(coverage * 100)}% coverage`}
        />
        <Stat label="Cans sold" value={totalUnits.toLocaleString()} />
        <Stat
          label="SOLLOS revenue"
          value={`$${sollosRevenue.toFixed(0)}`}
          hint="Billed at case cost"
        />
      </section>

      {/* Getting data in is the single most valuable action, so lead with it. */}
      {needsData.length > 0 && (
        <section className="mb-10">
          <div className="card relative overflow-hidden p-5 sm:p-6">
            <SunMark className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 opacity-[0.07]" />
            <div className="relative">
              <p className="eyebrow mb-2">Biggest gap</p>
              <p className="text-2xl font-semibold tracking-[-0.02em] text-sollos-navy">
                {withData.length} of {rows.length} doors are reporting
              </p>
              <p className="mt-1.5 max-w-xl text-sm text-sollos-navy/60">
                Velocity is what drives every restock and every amp-up call. Until a door
                reports, it is invisible to the leaderboard and the alerts below.
              </p>
              <div className="mt-4 max-w-sm">
                <Meter value={withData.length} max={rows.length} />
              </div>
              <Link
                href="/pipeline?data=Needs%20Data"
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-sollos-orange px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sollos-orange/85"
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
        {declining.length === 0 && growing.length === 0 && stale.length === 0 ? (
          <EmptyState title="Nothing needs attention">
            Once a few doors have two or more periods on record, slowdowns and breakouts
            show up here.
          </EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <AlertCard tone="declining" title="Slowing down" rows={declining} />
            <AlertCard tone="growing" title="Room to amp up" rows={growing} />
            <AlertCard tone="stale" title="Gone quiet" rows={stale} note="No report in 2 weeks" />
          </div>
        )}
      </section>

      {weeklySales.length >= 2 && (
        <section className="mb-10">
          <SectionHeading>Sell-through</SectionHeading>
          <SalesChart weeklySales={weeklySales} />
        </section>
      )}

      <section>
        <SectionHeading
          action={
            <Link
              href="/pipeline"
              className="text-sm font-medium text-sollos-navy/70 underline decoration-sollos-navy/25 underline-offset-4 transition-colors hover:text-sollos-navy"
            >
              All {rows.length} doors
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
                      className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${toneStyle[row.signal.tone]}`}
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
};

function AlertCard({
  tone,
  title,
  rows,
  note,
}: {
  tone: "declining" | "growing" | "stale";
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
