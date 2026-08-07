"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  effectiveWarehouses,
  inventory,
  reorderCoverage,
  saveWarehouseCases,
  totalStock,
  type Warehouse,
} from "@/lib/inventory";
import { useWarehouseOverrides } from "@/lib/useWarehouseOverrides";
import { loadPricing, DEFAULT_PRICING, type Pricing } from "@/lib/pricing";
import { useStoreRows } from "@/lib/useStoreRows";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/Table";
import { Page, PageTitle, SectionHeading, Stat, PrimaryButton, inputClass } from "@/components/ui";

const coverageTone: Record<string, string> = {
  short: "border-t-sollos-orange",
  tight: "border-t-sollos-orange/60",
  ok: "border-t-sollos-good",
};

export default function InventoryPage() {
  const { rows } = useStoreRows();
  const overrides = useWarehouseOverrides();
  const [pricing, setPricing] = useState<Pricing>(DEFAULT_PRICING);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setPricing(loadPricing());
  }, []);

  const warehouses = effectiveWarehouses(overrides);
  const stock = totalStock(warehouses, pricing.caseSize);

  // Only doors can be in a reorder queue, and only urgent ones are asking now.
  const queue = rows.filter((r) => r.channel === "dsd" && r.restock?.tone === "urgent");
  const casesNeeded = queue.reduce((sum, r) => sum + r.casesNeeded, 0);
  const coverage = reorderCoverage(casesNeeded, stock);

  function commit(id: string) {
    const n = Number(draft);
    if (!Number.isFinite(n) || n < 0) return;
    saveWarehouseCases(id, n);
    setEditing(null);
    setDraft("");
  }

  return (
    <Page>
      <PageTitle
        title="Inventory"
        subtitle={`Stock SOLLOS owns that has not reached a door yet. As of ${inventory.asOf}.`}
      />

      <section className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Stat label="Cases on hand" value={stock.cases.toLocaleString()} hint="12-packs" />
        <Stat label="Cans" value={stock.units.toLocaleString()} hint={`At ${pricing.caseSize} a case`} />
        <Stat
          label="Unconfirmed"
          value={stock.unconfirmedCases.toLocaleString()}
          unit="cases"
          hint={
            stock.unconfirmedCases > 0
              ? `${Math.round((stock.unconfirmedCases / stock.cases) * 100)}% of the total`
              : "All counts confirmed"
          }
        />
        <Stat
          label="Doors need"
          value={casesNeeded.toLocaleString()}
          unit="cases"
          hint={`${queue.length} ${queue.length === 1 ? "door" : "doors"} reordering now`}
        />
      </section>

      <section className="mb-10">
        <div className={`card border-t-2 p-5 ${coverageTone[coverage.tone]}`}>
          <p className="eyebrow mb-2">Against the reorder queue</p>
          <p className="text-lg font-semibold text-sollos-navy">{coverage.label}</p>
          <p className="mt-1.5 max-w-2xl text-sm text-sollos-navy/60">
            The per-door reorder signal says which shelves are running dry. This says whether
            there is stock to fill them. Doors with no shipment or no sell-through logged are
            not in the queue at all, so this reads low while coverage is thin.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <SectionHeading>Warehouses</SectionHeading>
        <Table caption="Cases on hand by location">
          <Thead>
            <Th>Location</Th>
            <Th>Region</Th>
            <Th align="right">Cases</Th>
            <Th>Count</Th>
            <Th align="right">
              <span className="sr-only">Actions</span>
            </Th>
          </Thead>
          <Tbody>
            {warehouses.map((w) => (
              <Tr key={w.id}>
                <Td strong>{w.name}</Td>
                <Td muted>{w.region}</Td>
                <Td numeric strong>
                  {editing === w.id ? (
                    <input
                      type="number"
                      min="0"
                      value={draft}
                      autoFocus
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commit(w.id);
                        if (e.key === "Escape") setEditing(null);
                      }}
                      className={`w-28 ${inputClass}`}
                      aria-label={`Cases at ${w.name}`}
                    />
                  ) : (
                    w.cases.toLocaleString()
                  )}
                </Td>
                <Td>
                  {w.confirmed ? (
                    <span className=" bg-sollos-good/12 badge text-sollos-good">
                      Confirmed
                    </span>
                  ) : (
                    <span
                      className=" bg-sollos-orange/12 badge text-sollos-orange"
                      title={w.note}
                    >
                      Estimate
                    </span>
                  )}
                </Td>
                <Td numeric>
                  {editing === w.id ? (
                    <PrimaryButton onClick={() => commit(w.id)}>Save</PrimaryButton>
                  ) : (
                    <button
                      onClick={() => {
                        setEditing(w.id);
                        setDraft(String(w.cases));
                      }}
                      className="text-sm font-medium text-sollos-navy/60 underline decoration-sollos-navy/20 underline-offset-4 transition-colors hover:text-sollos-navy"
                    >
                      {w.confirmed ? "Update" : "Confirm"}
                    </button>
                  )}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
        <UnconfirmedNotes warehouses={warehouses} />
      </section>

      <section>
        <SectionHeading>Produced at 1820</SectionHeading>
        <Table caption="Production runs">
          <Thead>
            <Th>Month</Th>
            <Th align="right">Units</Th>
            <Th>Unit</Th>
          </Thead>
          <Tbody>
            {inventory.production.map((run) => (
              <Tr key={run.id}>
                <Td strong>{run.month}</Td>
                <Td numeric strong>
                  {run.units.toLocaleString()}
                </Td>
                <Td muted>
                  {run.unitsAreCans === null
                    ? "Cans or 12-packs, unconfirmed"
                    : run.unitsAreCans
                      ? "Cans"
                      : "12-packs"}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
        <p className="mt-2.5 text-xs text-sollos-navy/45">
          Held out of every total above. The source gave these as &ldquo;units&rdquo; without
          saying whether that means cans or 12-packs, and at a {pricing.caseSize}x difference a
          guess would swamp the warehouse figures rather than add to them. No inventory sits at
          1820, so this is a production record, not stock.
        </p>
      </section>

      <p className="mt-8 text-xs text-sollos-navy/45">
        Counts you enter are saved to this browser until team login ships. See{" "}
        <Link href="/pricing" className="underline underline-offset-4 hover:text-sollos-navy">
          pricing
        </Link>{" "}
        for the case size these totals use.
      </p>
    </Page>
  );
}

function UnconfirmedNotes({ warehouses }: { warehouses: Warehouse[] }) {
  const pending = warehouses.filter((w) => !w.confirmed && w.note);
  if (pending.length === 0) return null;
  return (
    <ul className="mt-2.5 space-y-1 text-xs text-sollos-navy/45">
      {pending.map((w) => (
        <li key={w.id}>
          <span className="font-medium text-sollos-navy/60">{w.name}:</span> {w.note}
        </li>
      ))}
    </ul>
  );
}
