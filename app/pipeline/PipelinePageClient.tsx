"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CHANNEL_LABELS, normalizeState, type Channel } from "@/lib/locations";
import { useStoreRows, type StoreRow } from "@/lib/useStoreRows";
import { toneStyle } from "@/lib/velocity";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/Table";
import { Page, PageTitle, PrimaryLink, GhostButton, inputClass } from "@/components/ui";

const DATA_FILTERS = ["All", "Has Data", "Needs Data"] as const;
type DataFilter = (typeof DATA_FILTERS)[number];

const CHANNEL_FILTERS = ["All", "dsd", "distributor", "dtc"] as const;
type ChannelFilter = (typeof CHANNEL_FILTERS)[number];

function isChannelFilter(value: string | null): value is ChannelFilter {
  return (CHANNEL_FILTERS as readonly string[]).includes(value ?? "");
}

const SORTS = {
  name: { label: "Name", fn: (a: StoreRow, b: StoreRow) => a.loc.name.localeCompare(b.loc.name) },
  rate: {
    label: "Cans / day",
    fn: (a: StoreRow, b: StoreRow) => b.summary.avgUnitsPerDay - a.summary.avgUnitsPerDay,
  },
  units: {
    label: "Cans sold",
    fn: (a: StoreRow, b: StoreRow) => b.summary.totalUnits - a.summary.totalUnits,
  },
  state: {
    label: "State",
    fn: (a: StoreRow, b: StoreRow) =>
      normalizeState(a.loc.state).localeCompare(normalizeState(b.loc.state)) ||
      a.loc.city.localeCompare(b.loc.city),
  },
} as const;
type SortKey = keyof typeof SORTS;

function isDataFilter(value: string | null): value is DataFilter {
  return (DATA_FILTERS as readonly string[]).includes(value ?? "");
}

export function PipelinePageClient() {
  const searchParams = useSearchParams();
  const initialDataFilter = searchParams.get("data");
  const initialChannel = searchParams.get("channel");

  const { rows } = useStoreRows();
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("All");
  const [dataFilter, setDataFilter] = useState<DataFilter>(
    isDataFilter(initialDataFilter) ? initialDataFilter : "All"
  );
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>(
    isChannelFilter(initialChannel) ? initialChannel : "All"
  );
  const [sort, setSort] = useState<SortKey>("name");

  useEffect(() => {
    if (isDataFilter(initialDataFilter)) setDataFilter(initialDataFilter);
    if (isChannelFilter(initialChannel)) setChannelFilter(initialChannel);
  }, [initialDataFilter, initialChannel]);

  const states = useMemo(() => {
    const unique = new Set(rows.map((r) => normalizeState(r.loc.state)));
    return ["All", ...Array.from(unique).sort()];
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const out = rows.filter((r) => {
      if (
        q &&
        !r.loc.name.toLowerCase().includes(q) &&
        !r.loc.city.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (stateFilter !== "All" && normalizeState(r.loc.state) !== stateFilter) return false;
      if (dataFilter === "Has Data" && r.entries.length === 0) return false;
      if (dataFilter === "Needs Data" && r.entries.length > 0) return false;
      if (channelFilter !== "All" && r.channel !== channelFilter) return false;
      return true;
    });
    return out.sort(SORTS[sort].fn);
  }, [rows, search, stateFilter, dataFilter, channelFilter, sort]);

  // A distributor is not a door, so it is counted alongside rather than within.
  const doorCount = rows.filter((r) => r.channel === "dsd").length;
  const otherCount = rows.length - doorCount;
  const subtitle =
    `${doorCount} live ${doorCount === 1 ? "door" : "doors"} across ${states.length - 1} states` +
    (otherCount > 0
      ? `, plus ${otherCount} non-door ${otherCount === 1 ? "account" : "accounts"}`
      : "");

  const filtersActive =
    search !== "" || stateFilter !== "All" || dataFilter !== "All" || channelFilter !== "All";

  function clearFilters() {
    setSearch("");
    setStateFilter("All");
    setDataFilter("All");
    setChannelFilter("All");
  }

  return (
    <Page>
      <PageTitle
        title="Pipeline"
        subtitle={subtitle}
        action={<PrimaryLink href="/stores/new">Add store</PrimaryLink>}
      />

      <div className="mb-4 space-y-2.5">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by store or city"
          aria-label="Search stores"
          className={inputClass}
        />
        <div className="flex flex-wrap items-center gap-2.5">
          <Select
            label="State"
            value={stateFilter}
            onChange={setStateFilter}
            options={states.map((s) => ({ value: s, label: s === "All" ? "All states" : s }))}
          />
          <Select
            label="Data"
            value={dataFilter}
            onChange={(v) => setDataFilter(v as DataFilter)}
            options={DATA_FILTERS.map((f) => ({ value: f, label: f }))}
          />
          <Select
            label="Channel"
            value={channelFilter}
            onChange={(v) => setChannelFilter(v as ChannelFilter)}
            options={CHANNEL_FILTERS.map((c) => ({
              value: c,
              label: c === "All" ? "All channels" : CHANNEL_LABELS[c as Channel],
            }))}
          />
          <Select
            label="Sort by"
            value={sort}
            onChange={(v) => setSort(v as SortKey)}
            options={Object.entries(SORTS).map(([k, v]) => ({ value: k, label: v.label }))}
          />
          {filtersActive && <GhostButton onClick={clearFilters}>Clear</GhostButton>}
          <span className="num ml-auto text-sm text-sollos-navy/45">
            {filteredRows.length} of {rows.length}
          </span>
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <div className="card px-6 py-10 text-center text-sm text-sollos-navy/55">
          No doors match these filters.
        </div>
      ) : (
        <>
          {/* Phones get cards. A six column table behind a horizontal scrollbar is
              unusable when you are standing in a store aisle. */}
          <ul className="space-y-2.5 sm:hidden">
            {filteredRows.map((row) => (
              <li key={row.loc.id}>
                <Link href={`/stores/${row.loc.id}`} className="card block p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-sollos-navy">{row.loc.name}</p>
                      <p className="mt-0.5 text-xs text-sollos-navy/50">
                        {row.loc.city}, {normalizeState(row.loc.state)}
                        {row.channel !== "dsd" && ` · ${CHANNEL_LABELS[row.channel]}`}
                      </p>
                    </div>
                    {row.entries.length > 0 ? (
                      <p className="shrink-0 text-right">
                        <span className="num block text-lg font-semibold leading-none text-sollos-navy">
                          {row.summary.avgUnitsPerDay}
                        </span>
                        <span className="text-[10px] text-sollos-navy/45">cans/day</span>
                      </p>
                    ) : (
                      <span className="shrink-0 rounded-full border border-dashed border-sollos-orange/50 px-2.5 py-1 text-xs font-medium text-sollos-orange">
                        Add data
                      </span>
                    )}
                  </div>
                  {row.entries.length > 0 && (
                    <span
                      className={`mt-2.5 inline-block rounded-full px-2.5 py-1 text-xs font-medium ${toneStyle[row.signal.tone]}`}
                    >
                      {row.signal.label}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden sm:block">
            <Table caption="All live stockist doors">
              <Thead>
                <Th>Store</Th>
                <Th>City</Th>
                <Th>State</Th>
                <Th align="right">Cans / day</Th>
                <Th align="right">Cases / wk</Th>
                <Th>Signal</Th>
              </Thead>
              <Tbody>
                {filteredRows.map((row) => (
                  <Tr key={row.loc.id}>
                    <Td strong>
                      <Link
                        href={`/stores/${row.loc.id}`}
                        className="underline decoration-transparent underline-offset-4 transition-colors hover:decoration-sollos-navy/30"
                      >
                        {row.loc.name}
                      </Link>
                      {row.channel !== "dsd" && (
                        <span className="ml-2 rounded-full bg-sollos-navy/8 px-2 py-0.5 text-[11px] font-medium text-sollos-navy/60">
                          {CHANNEL_LABELS[row.channel]}
                        </span>
                      )}
                    </Td>
                    <Td>{row.loc.city}</Td>
                    <Td muted>{normalizeState(row.loc.state)}</Td>
                    <Td numeric strong>
                      {row.entries.length ? row.summary.avgUnitsPerDay : "-"}
                    </Td>
                    <Td numeric>{row.entries.length ? row.casesPerWeek : "-"}</Td>
                    <Td>
                      {row.entries.length === 0 ? (
                        <Link
                          href={`/stores/${row.loc.id}`}
                          className="inline-block rounded-full border border-dashed border-sollos-navy/25 px-2.5 py-1 text-xs font-medium text-sollos-navy/60 transition-colors hover:border-sollos-orange hover:bg-sollos-orange/8 hover:text-sollos-orange"
                        >
                          Add data
                        </Link>
                      ) : (
                        <span
                          className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${toneStyle[row.signal.tone]}`}
                        >
                          {row.signal.label}
                        </span>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>
        </>
      )}
    </Page>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="inline-flex items-center gap-1.5 text-xs font-medium text-sollos-navy/55">
      <span className="sr-only sm:not-sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="rounded-xl border border-sollos-navy/15 bg-white px-2.5 py-1.5 text-sm font-normal text-sollos-navy focus:border-sollos-navy/40 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
