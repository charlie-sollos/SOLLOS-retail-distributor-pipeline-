"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { locations, normalizeState } from "@/lib/locations";
import { getEffectiveLocation } from "@/lib/storeStorage";
import { MapLoader } from "./MapLoader";

export function MapPageClient() {
  const searchParams = useSearchParams();
  const focusId = searchParams.get("store") ?? undefined;

  const [effectiveLocations, setEffectiveLocations] = useState(locations);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("All");

  useEffect(() => {
    setEffectiveLocations(locations.map(getEffectiveLocation));
  }, []);

  useEffect(() => {
    if (focusId) {
      setSearch("");
      setStateFilter("All");
    }
  }, [focusId]);

  const states = useMemo(() => {
    const unique = new Set(effectiveLocations.map((l) => normalizeState(l.state)));
    return ["All", ...Array.from(unique).sort()];
  }, [effectiveLocations]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return effectiveLocations.filter((l) => {
      if (q && !l.name.toLowerCase().includes(q) && !l.city.toLowerCase().includes(q)) return false;
      if (stateFilter !== "All" && normalizeState(l.state) !== stateFilter) return false;
      return true;
    });
  }, [effectiveLocations, search, stateFilter]);

  const approximateCount = filtered.filter((l) => l.approximate).length;
  const filtersActive = search !== "" || stateFilter !== "All";

  return (
    <div className="flex flex-1 flex-col bg-sollos-cream dark:bg-black">
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 sm:px-10">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-sollos-navy dark:text-zinc-50">
            Store Locations
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {filtered.length} of {effectiveLocations.length} stockist locations
            {approximateCount > 0 &&
              ` (${approximateCount} approximate, city-level pins where a precise address match wasn't found)`}
          </p>
        </header>

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
          {filtersActive && (
            <button
              onClick={() => {
                setSearch("");
                setStateFilter("All");
              }}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:border-sollos-navy hover:text-sollos-navy dark:border-zinc-700 dark:text-zinc-400"
            >
              Clear
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <p className="rounded-lg border border-zinc-200 bg-white px-4 py-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
            No stores match the current filters.
          </p>
        ) : (
          <MapLoader locations={filtered} focusId={focusId} />
        )}
      </main>
    </div>
  );
}
