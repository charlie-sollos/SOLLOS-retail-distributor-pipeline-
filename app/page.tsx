"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useStoreRows } from "@/lib/useStoreRows";
import { aggregateByWeek, toneStyle } from "@/lib/velocity";
import { SalesChart } from "@/components/SalesChart";

export default function Home() {
  const rows = useStoreRows();

  const withData = rows.filter((r) => r.entries.length > 0);
  const needsData = rows.filter((r) => r.entries.length === 0);
  const declining = rows.filter((r) => r.signal.tone === "declining");
  const growing = rows.filter((r) => r.signal.tone === "growing");
  const totalUnits = withData.reduce((sum, r) => sum + r.summary.totalUnits, 0);
  const totalRevenue = withData.reduce((sum, r) => sum + r.summary.totalRevenue, 0);

  const weeklySales = useMemo(() => aggregateByWeek(rows.flatMap((r) => r.entries)), [rows]);

  const topMovers = [...withData]
    .sort((a, b) => b.summary.avgUnitsPerDay - a.summary.avgUnitsPerDay)
    .slice(0, 5);

  const hasAlerts = needsData.length > 0 || declining.length > 0 || growing.length > 0;

  return (
    <div className="flex flex-1 flex-col bg-sollos-cream dark:bg-black">
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 sm:px-10">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-sollos-navy dark:text-zinc-50">
            SOLLOS
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Retail and distributor overview
          </p>
        </header>

        <section className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Live Stores" value={rows.length} />
          <Stat label="With Velocity Data" value={withData.length} />
          <Stat label="Total Units Sold" value={totalUnits} />
          <Stat label="Total Revenue" value={`$${totalRevenue.toFixed(2)}`} />
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold text-black dark:text-zinc-50">Alerts</h2>
          {!hasAlerts ? (
            <p className="rounded-lg border border-zinc-200 bg-white px-4 py-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
              Nothing needs attention right now.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {needsData.length > 0 && (
                <AlertCard tone="no-data" title="Need Data">
                  <p className="mb-2">
                    {needsData.length} {needsData.length === 1 ? "store has" : "stores have"} no
                    velocity data yet.
                  </p>
                  <Link
                    href="/pipeline?data=Needs%20Data"
                    className="text-sollos-navy underline dark:text-sollos-yellow"
                  >
                    View in Pipeline
                  </Link>
                </AlertCard>
              )}
              {declining.length > 0 && (
                <AlertCard tone="declining" title="Declining">
                  <ul className="space-y-1">
                    {declining.map((r) => (
                      <li key={r.loc.id}>
                        <Link
                          href={`/stores/${r.loc.id}`}
                          className="text-sollos-navy underline dark:text-sollos-yellow"
                        >
                          {r.loc.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </AlertCard>
              )}
              {growing.length > 0 && (
                <AlertCard tone="growing" title="Growing, Amp Up">
                  <ul className="space-y-1">
                    {growing.map((r) => (
                      <li key={r.loc.id}>
                        <Link
                          href={`/stores/${r.loc.id}`}
                          className="text-sollos-navy underline dark:text-sollos-yellow"
                        >
                          {r.loc.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </AlertCard>
              )}
            </div>
          )}
        </section>

        {weeklySales.length >= 2 && (
          <section className="mb-10">
            <h2 className="mb-3 text-lg font-semibold text-black dark:text-zinc-50">Sales</h2>
            <SalesChart weeklySales={weeklySales} />
          </section>
        )}

        <section className="mb-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Top Movers</h2>
            <Link
              href="/pipeline"
              className="text-sm text-sollos-navy underline dark:text-sollos-yellow"
            >
              View full pipeline
            </Link>
          </div>
          {topMovers.length === 0 ? (
            <p className="rounded-lg border border-zinc-200 bg-white px-4 py-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
              No velocity data yet. Add data on a store page to see it ranked here.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-sollos-navy text-xs uppercase tracking-wide text-white">
                  <tr>
                    <th className="px-4 py-3 font-medium">Rank</th>
                    <th className="px-4 py-3 font-medium">Store</th>
                    <th className="px-4 py-3 font-medium text-right">Units / Day</th>
                    <th className="px-4 py-3 font-medium text-right">Est. Cases / Week</th>
                    <th className="px-4 py-3 font-medium">Signal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {topMovers.map((row, i) => (
                    <tr key={row.loc.id} className="bg-white dark:bg-black">
                      <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-black dark:text-zinc-50">
                        <Link href={`/stores/${row.loc.id}`} className="hover:text-sollos-navy hover:underline dark:hover:text-sollos-yellow">
                          {row.loc.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400">
                        {row.summary.avgUnitsPerDay}
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400">
                        {row.casesPerWeek}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${toneStyle[row.signal.tone]}`}
                        >
                          {row.signal.label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 border-t-2 border-t-sollos-navy dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-black dark:text-zinc-50">{value}</p>
    </div>
  );
}

const alertToneStyle: Record<string, string> = {
  "no-data": "border-t-zinc-400 dark:border-t-zinc-600",
  declining: "border-t-amber-500",
  growing: "border-t-green-500",
};

function AlertCard({
  tone,
  title,
  children,
}: {
  tone: "no-data" | "declining" | "growing";
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-lg border border-zinc-200 border-t-2 bg-white p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 ${alertToneStyle[tone]}`}
    >
      <p className="mb-2 font-semibold text-black dark:text-zinc-50">{title}</p>
      {children}
    </div>
  );
}
