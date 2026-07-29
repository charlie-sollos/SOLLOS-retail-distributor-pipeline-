"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { locations, normalizeState, type StoreLocation } from "@/lib/locations";
import { getEffectiveLocation, loadCustomStores } from "@/lib/storeStorage";
import { MapLoader } from "./MapLoader";
import { Page, PageTitle, GhostButton, inputClass } from "@/components/ui";

function hasCoords(loc: StoreLocation): loc is StoreLocation & { lat: number; lng: number } {
  return loc.lat !== undefined && loc.lng !== undefined;
}

export function MapPageClient() {
  const searchParams = useSearchParams();
  const focusId = searchParams.get("store") ?? undefined;

  const [allStores, setAllStores] = useState<StoreLocation[]>(locations);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("All");

  useEffect(() => {
    setAllStores([...locations, ...loadCustomStores()].map(getEffectiveLocation));
  }, []);

  useEffect(() => {
    if (focusId) {
      setSearch("");
      setStateFilter("All");
    }
  }, [focusId]);

  const states = useMemo(() => {
    const unique = new Set(allStores.map((l) => normalizeState(l.state)));
    return ["All", ...Array.from(unique).sort()];
  }, [allStores]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allStores.filter((l) => {
      if (q && !l.name.toLowerCase().includes(q) && !l.city.toLowerCase().includes(q)) return false;
      if (stateFilter !== "All" && normalizeState(l.state) !== stateFilter) return false;
      return true;
    });
  }, [allStores, search, stateFilter]);

  const mappable = filtered.filter(hasCoords);
  const unmapped = filtered.length - mappable.length;
  const filtersActive = search !== "" || stateFilter !== "All";

  // Doors per state, so the map header says something about the footprint.
  const byState = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of filtered) {
      const s = normalizeState(l.state);
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  return (
    <Page>
      <PageTitle
        title="Map"
        subtitle={`${filtered.length} of ${allStores.length} doors${
          unmapped > 0 ? `, ${unmapped} not yet placed` : ""
        }`}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by store or city"
          aria-label="Search stores"
          className={`${inputClass} sm:max-w-xs`}
        />
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          aria-label="Filter by state"
          className="rounded-xl border border-sollos-navy/15 bg-white px-2.5 py-2 text-sm text-sollos-navy focus:border-sollos-navy/40 focus:outline-none"
        >
          {states.map((s) => (
            <option key={s} value={s}>
              {s === "All" ? "All states" : s}
            </option>
          ))}
        </select>
        {filtersActive && (
          <GhostButton
            onClick={() => {
              setSearch("");
              setStateFilter("All");
            }}
          >
            Clear
          </GhostButton>
        )}
        <div className="ml-auto flex gap-1.5">
          {byState.map(([s, n]) => (
            <span
              key={s}
              className="num rounded-full bg-sollos-sky/60 px-2.5 py-1 text-xs font-medium text-sollos-navy"
            >
              {s} {n}
            </span>
          ))}
        </div>
      </div>

      {mappable.length === 0 ? (
        <div className="card px-6 py-10 text-center text-sm text-sollos-navy/55">
          No doors match these filters.
        </div>
      ) : (
        <MapLoader locations={mappable} focusId={focusId} />
      )}

      {/* The map alone is unreadable to a screen reader and unusable by keyboard,
          so the same set is always available as a plain list. */}
      {filtered.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-sollos-navy/60 transition-colors hover:text-sollos-navy">
            List all {filtered.length} doors
          </summary>
          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((l) => (
              <li key={l.id}>
                <Link href={`/stores/${l.id}`} className="card block px-3.5 py-2.5">
                  <p className="truncate text-sm font-medium text-sollos-navy">{l.name}</p>
                  <p className="truncate text-xs text-sollos-navy/50">
                    {[l.address1, l.city, normalizeState(l.state)].filter(Boolean).join(", ")}
                    {!hasCoords(l) && " (not on map)"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </Page>
  );
}
