"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { locations } from "@/lib/locations";
import { getMergedEntries } from "@/lib/storeStorage";
import { summarize, trendSignal, weeklyCasesEstimate, type SignalTone } from "@/lib/velocity";

const toneStyle: Record<SignalTone, string> = {
  growing: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  steady: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  declining: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  "no-data": "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

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

  useEffect(() => {
    setRows(locations.map(buildRow));
  }, []);

  const withData = rows.filter((r) => r.entries.length > 0);
  const needData = rows.length - withData.length;
  const totalUnits = withData.reduce((sum, r) => sum + r.summary.totalUnits, 0);
  const leaderboard = [...withData].sort((a, b) => b.summary.avgUnitsPerDay - a.summary.avgUnitsPerDay);

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 sm:px-10">
        <header className="mb-10">
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
            SOLLOS Pipeline
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Live stockist locations and product velocity
          </p>
        </header>

        <section className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Live Stores" value={rows.length} />
          <Stat label="With Velocity Data" value={withData.length} />
          <Stat label="Need Data" value={needData} />
          <Stat label="Total Units Sold" value={totalUnits} />
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold text-black dark:text-zinc-50">Leaderboard</h2>
          {leaderboard.length === 0 ? (
            <p className="rounded-lg border border-zinc-200 bg-white px-4 py-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
              No velocity data yet. Add data on a store page to see it ranked here.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-100 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
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
                        <Link href={`/stores/${row.loc.id}`} className="hover:underline">
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
          <h2 className="mb-3 text-lg font-semibold text-black dark:text-zinc-50">All Stores</h2>
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
                {rows.map((row) => (
                  <tr key={row.loc.id} className="bg-white hover:bg-zinc-50 dark:bg-black dark:hover:bg-zinc-950">
                    <td className="px-4 py-3 font-medium text-black dark:text-zinc-50">
                      <Link href={`/stores/${row.loc.id}`} className="hover:underline">
                        {row.loc.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{row.loc.city}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{row.loc.state}</td>
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
                ))}
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
    <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-black dark:text-zinc-50">{value}</p>
    </div>
  );
}
