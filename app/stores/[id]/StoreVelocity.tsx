"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadLocalEntries, saveLocalEntries } from "@/lib/storeStorage";
import {
  computeEntry,
  sortByWeek,
  summarize,
  trendSignal,
  weeklyCasesEstimate,
  toneStyle,
  type VelocityEntry,
} from "@/lib/velocity";
import { DEFAULT_PRICING, derivePricing, loadPricing, type Pricing } from "@/lib/pricing";
import { VelocityChart } from "./VelocityChart";

export function StoreVelocity({
  storeId,
  seedEntries,
}: {
  storeId: string;
  seedEntries: VelocityEntry[];
}) {
  const [localEntries, setLocalEntries] = useState<VelocityEntry[]>([]);
  const [pricing, setPricing] = useState<Pricing>(DEFAULT_PRICING);
  const [weekStart, setWeekStart] = useState("");
  const [weekEnd, setWeekEnd] = useState("");
  const [unitsSold, setUnitsSold] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setLocalEntries(loadLocalEntries(storeId));
    setPricing(loadPricing());
  }, [storeId]);

  const entries = sortByWeek([...seedEntries, ...localEntries]);
  const summary = summarize(entries);
  const signal = trendSignal(entries);
  const casesPerWeek = weeklyCasesEstimate(summary.avgUnitsPerDay, pricing.caseSize);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!weekStart || !weekEnd || !unitsSold) {
      setError("Fill in week start, week end, and units sold.");
      return;
    }
    if (weekEnd < weekStart) {
      setError("Week end must be on or after week start.");
      return;
    }
    const units = Number(unitsSold);
    if (!Number.isFinite(units) || units < 0) {
      setError("Units sold must be a positive number.");
      return;
    }

    const entry = computeEntry(weekStart, weekEnd, units, derivePricing(pricing));
    const next = [...localEntries, entry];
    setLocalEntries(next);
    saveLocalEntries(storeId, next);
    setWeekStart("");
    setWeekEnd("");
    setUnitsSold("");
  }

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Product Velocity</h2>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${toneStyle[signal.tone]}`}>
          {signal.label}
        </span>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Total Units" value={summary.totalUnits} />
        <Stat label="Avg Units / Day" value={summary.avgUnitsPerDay} />
        <Stat label="Est. Cases / Week" value={casesPerWeek} />
        <Stat label="Total Gross Profit" value={`$${summary.totalGrossProfit.toFixed(2)}`} />
      </div>

      {entries.length >= 2 && (
        <div className="mb-6">
          <VelocityChart entries={entries} />
        </div>
      )}

      {entries.length > 0 && (
        <div className="mb-6 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-100 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">Week Start</th>
                <th className="px-4 py-3 font-medium">Week End</th>
                <th className="px-4 py-3 font-medium text-right">Days</th>
                <th className="px-4 py-3 font-medium text-right">Units Sold</th>
                <th className="px-4 py-3 font-medium text-right">Units / Day</th>
                <th className="px-4 py-3 font-medium text-right">Revenue</th>
                <th className="px-4 py-3 font-medium text-right">Gross Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {entries.map((e, i) => (
                <tr key={`${e.weekStart}-${i}`} className="bg-white dark:bg-black">
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{e.weekStart}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{e.weekEnd}</td>
                  <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400">
                    {e.days}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400">
                    {e.unitsSold}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400">
                    {e.unitsPerDay}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400">
                    ${e.revenue.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400">
                    ${e.grossProfit.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form
        onSubmit={handleAdd}
        className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <h3 className="mb-3 text-sm font-semibold text-black dark:text-zinc-50">
          Add a week of data
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <label className="text-sm text-zinc-600 dark:text-zinc-400">
            Week Start
            <input
              type="date"
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-black dark:border-zinc-700 dark:bg-black dark:text-zinc-50"
            />
          </label>
          <label className="text-sm text-zinc-600 dark:text-zinc-400">
            Week End
            <input
              type="date"
              value={weekEnd}
              onChange={(e) => setWeekEnd(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-black dark:border-zinc-700 dark:bg-black dark:text-zinc-50"
            />
          </label>
          <label className="text-sm text-zinc-600 dark:text-zinc-400">
            Units Sold
            <input
              type="number"
              min="0"
              value={unitsSold}
              onChange={(e) => setUnitsSold(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-black dark:border-zinc-700 dark:bg-black dark:text-zinc-50"
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-md bg-sollos-navy px-3 py-1.5 text-sm font-medium text-white hover:bg-sollos-navy-dark"
            >
              Add
            </button>
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-500">
          Revenue and gross profit use the current{" "}
          <Link href="/pricing" className="underline hover:text-sollos-navy dark:hover:text-sollos-yellow">
            pricing
          </Link>
          . Changing pricing later does not change entries already added here. Data added here
          is saved to this browser. Team-wide syncing will come with the SOLLOS team login.
        </p>
      </form>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-black dark:text-zinc-50">{value}</p>
    </div>
  );
}
