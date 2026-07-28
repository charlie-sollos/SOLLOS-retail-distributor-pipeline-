"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { locations, normalizeState } from "@/lib/locations";
import { getMergedEntries } from "@/lib/storeStorage";
import { summarize, trendSignal, weeklyCasesEstimate, aggregateByWeek, toneStyle } from "@/lib/velocity";
import { SalesChart } from "@/components/SalesChart";

const DATA_FILTERS = ["All", "Has Data", "Needs Data"] as const;
type DataFilter = (typeof DATA_FILTERS)[number];

type StoreRow = ReturnType<typeof buildRow>;

function buildRow(loc: (typeof locations)[number]) {
  const entries = getMergedEntries(loc.id);
  const summary = summarize(entries);
  const signal = trendSignal(entries);
  const casesPerWeek = weeklyCasesEstimate(summary.avgUnitsPerDay);
  return { loc, entries, summary, signal, casesPerWeek };
}

export default function Home() {
  const [rows, setRows] = useState<StoreRow[]>(() => locations.map(buildRow));
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("All");
  const [dataFilter, setDataFilter] = useState<DataFilter>("All");

  useEffect(() => {
    setRows(locations.map(buildRow));
  }, []);

  const states = useMemo(() => {
    const unique = new Set(rows.map((r) => normalizeState(r.loc.state)));
    return ["All", ...Array.from(unique).sort()];
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !r.loc.name.toLowerCase().includes(q) && !r.loc.city.toLowerCase().includes(q)) {
        return false;
      }
      if (stateFilter !== "All" && normalizeState(r.loc.state) !== stateFilter) return false;
      if (dataFilter === "Has Data" && r.entries.length === 0) return false;
      if (dataFilter === "Needs Data" && r.entries.length > 0) return false;
      return true;
    });
  }, [rows, search, stateFilter, dataFilter]);

  const withData = rows.filter((r) => r.entries.length > 0);
  const needData = rows.length - withData.length;
  const totalUnits = withData.reduce((sum, r) => sum + r.summary.totalUnits, 0);
  const weeklySales = useMemo(() => aggregateByWeek(rows.flatMap((r) => r.entries)), [rows]);
  const leaderboard = [...filteredRows]
    .filter((r) => r.entries.length > 0)
    .sort((a, b) => b.summary.avgUnitsPerDay - a.summary.avgUnitsPerDay);

  const filtersActive = search !== "" || stateFilter !== "All" || dataFilter !== "All";

  return (
    <div className="flex flex-1 flex-col bg-sollos-cream dark:bg-black">
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 sm:px-10">
        <div className="mb-10 rounded-2xl bg-gradient-to-b from-sollos-sky to-transparent px-6 py-8 dark:from-sollos-navy/30 dark:to-transparent sm:px-8">
          <header className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-sollos-navy dark:text-zinc-50">
              SOLLOS Pipeline
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Live stockist locations and product velocity
            </p>
          </header>

          <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Live Stores" value={rows.length} />
            <Stat label="With Velocity Data" value={withData.length} />
            <Stat label="Need Data" value={needData} />
            <Stat label="Total Units Sold" value={totalUnits} />
          </section>
        </div>

        {weeklySales.length >= 2 && (
          <section className="mb-10">
            <h2 className="mb-3 text-lg font-semibold text-black dark:text-zinc-50">Sales</h2>
            <SalesChart weeklySales={weeklySales} />
          </section>
        )}

        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold text-black dark:text-zinc-50">Leaderboard</h2>
          {leaderboard.length === 0 ? (
            <p className="rounded-lg border border-zinc-200 bg-white px-4 py-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
              {filtersActive
                ? "No stores with velocity data match the current filters."
                : "No velocity data yet. Add data on a store page to see it ranked here."}
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
                  {leaderboard.map((row, i) => (
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

        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-black dark:text-zinc-50">All Stores</h2>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {filteredRows.length} of {rows.length}
            </span>
          </div>

          <div className="mb-4 flex flex-wrap gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by store or city"
              className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-black placeholder:text-zinc-400 focus:border-sollos-navy focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            />
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-black focus:border-sollos-navy focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            >
              {states.map((s) => (
                <option key={s} value={s}>
                  {s === "All" ? "All States" : s}
                </option>
              ))}
            </select>
            <select
              value={dataFilter}
              onChange={(e) => setDataFilter(e.target.value as DataFilter)}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-black focus:border-sollos-navy focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            >
              {DATA_FILTERS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            {filtersActive && (
              <button
                onClick={() => {
                  setSearch("");
                  setStateFilter("All");
                  setDataFilter("All");
                }}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:border-sollos-navy hover:text-sollos-navy dark:border-zinc-700 dark:text-zinc-400"
              >
                Clear
              </button>
            )}
          </div>

          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-100 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Store</th>
                  <th className="px-4 py-3 font-medium">City</th>
                  <th className="px-4 py-3 font-medium">State</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-zinc-500 dark:text-zinc-400">
                      No stores match the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr
                      key={row.loc.id}
                      className="bg-white hover:bg-sollos-sky dark:bg-black dark:hover:bg-zinc-950"
                    >
                      <td className="px-4 py-3 font-medium text-black dark:text-zinc-50">
                        <Link href={`/stores/${row.loc.id}`} className="hover:text-sollos-navy hover:underline dark:hover:text-sollos-yellow">
                          {row.loc.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{row.loc.city}</td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {normalizeState(row.loc.state)}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {row.loc.phone || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
                          Live
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {row.entries.length > 0 ? (
                          <span className="text-zinc-600 dark:text-zinc-400">
                            {row.entries.length} {row.entries.length === 1 ? "entry" : "entries"}
                          </span>
                        ) : (
                          <span className="text-zinc-400 dark:text-zinc-600">No data</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 border-t-2 border-t-sollos-navy dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-black dark:text-zinc-50">{value}</p>
    </div>
  );
}
