"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { normalizeState } from "@/lib/locations";
import { useStoreRows } from "@/lib/useStoreRows";

const DATA_FILTERS = ["All", "Has Data", "Needs Data"] as const;
type DataFilter = (typeof DATA_FILTERS)[number];

function isDataFilter(value: string | null): value is DataFilter {
  return (DATA_FILTERS as readonly string[]).includes(value ?? "");
}

export function PipelinePageClient() {
  const searchParams = useSearchParams();
  const initialDataFilter = searchParams.get("data");

  const rows = useStoreRows();
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("All");
  const [dataFilter, setDataFilter] = useState<DataFilter>(
    isDataFilter(initialDataFilter) ? initialDataFilter : "All"
  );

  useEffect(() => {
    if (isDataFilter(initialDataFilter)) setDataFilter(initialDataFilter);
  }, [initialDataFilter]);

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

  const filtersActive = search !== "" || stateFilter !== "All" || dataFilter !== "All";

  return (
    <div className="flex flex-1 flex-col bg-sollos-cream dark:bg-black">
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 sm:px-10">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-sollos-navy dark:text-zinc-50">
              Pipeline
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              All live stockist locations
            </p>
          </div>
          <Link
            href="/stores/new"
            className="shrink-0 rounded-md bg-sollos-navy px-3 py-1.5 text-sm font-medium text-white hover:bg-sollos-navy-dark"
          >
            + Add Store
          </Link>
        </header>

        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
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
      </main>
    </div>
  );
}
