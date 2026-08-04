"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  addEntry,
  deleteEntry,
  getMergedEntries,
  updateEntry,
} from "@/lib/storeStorage";
import {
  computeEntry,
  daysOfCover,
  sortByWeek,
  summarize,
  toneStyle,
  trendSignal,
  validateEntry,
  weeklyCasesEstimate,
  type EntryProblem,
  type VelocityEntry,
} from "@/lib/velocity";
import { derivePricing, loadPricing } from "@/lib/pricing";
import {
  resolvePricing,
  resolvePricingStatic,
  saveAccountCaseCost,
  type PricingResolution,
} from "@/lib/accountPricing";
import { AccountPricing } from "./AccountPricing";
import { VelocityChart } from "./VelocityChart";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/Table";
import {
  SectionHeading,
  Stat,
  PrimaryButton,
  GhostButton,
  EmptyState,
  inputClass,
} from "@/components/ui";

const todayIso = () => new Date().toISOString().slice(0, 10);

export function StoreVelocity({ storeId }: { storeId: string }) {
  const [entries, setEntries] = useState<VelocityEntry[]>([]);
  const [resolution, setResolution] = useState<PricingResolution>(() =>
    resolvePricingStatic(storeId)
  );
  const [weekStart, setWeekStart] = useState("");
  const [weekEnd, setWeekEnd] = useState("");
  const [unitsSold, setUnitsSold] = useState("");
  const [problems, setProblems] = useState<EntryProblem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    setEntries(getMergedEntries(storeId));
    setResolution(resolvePricing(storeId, loadPricing()));
  }, [storeId]);

  const pricing = resolution.pricing;
  const sorted = useMemo(() => sortByWeek(entries), [entries]);
  const summary = summarize(sorted);
  const signal = trendSignal(sorted);
  const casesPerWeek = weeklyCasesEstimate(summary.avgUnitsPerDay, pricing.caseSize);

  // A restock guess is only meaningful once there is a rate to project from.
  const coverDays =
    summary.avgUnitsPerDay > 0
      ? daysOfCover(Math.round(casesPerWeek * pricing.caseSize), summary.avgUnitsPerDay)
      : null;

  function resetForm() {
    setWeekStart("");
    setWeekEnd("");
    setUnitsSold("");
    setEditingId(null);
    setProblems([]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // When editing, the row being replaced must not block itself as an overlap.
    const others = editingId ? sorted.filter((x) => x.id !== editingId) : sorted;
    const found = validateEntry(weekStart, weekEnd, unitsSold, others, todayIso());
    setProblems(found);
    if (found.length) return;

    const entry = computeEntry(
      weekStart,
      weekEnd,
      Number(unitsSold),
      derivePricing(pricing),
      editingId ?? undefined
    );
    const ok = editingId ? updateEntry(storeId, entry) : addEntry(storeId, entry);
    if (!ok) {
      setProblems([
        { field: "unitsSold", message: "Could not save. Browser storage may be full." },
      ]);
      return;
    }
    setEntries(getMergedEntries(storeId));
    setStatus(editingId ? "Period updated." : "Period added.");
    resetForm();
  }

  function handleEdit(entry: VelocityEntry) {
    setEditingId(entry.id ?? null);
    setWeekStart(entry.weekStart);
    setWeekEnd(entry.weekEnd);
    setUnitsSold(String(entry.unitsSold));
    setProblems([]);
    setStatus("");
  }

  function handleDelete(entry: VelocityEntry) {
    if (!entry.id) return;
    const label = `${entry.weekStart} to ${entry.weekEnd}`;
    if (!window.confirm(`Delete the period ${label}? This cannot be undone.`)) return;
    deleteEntry(storeId, entry.id);
    setEntries(getMergedEntries(storeId));
    setStatus("Period deleted.");
    if (editingId === entry.id) resetForm();
  }

  const problemFor = (field: EntryProblem["field"]) =>
    problems.find((p) => p.field === field)?.message;

  return (
    <section className="mb-10">
      <SectionHeading
        action={
          <span
            className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${toneStyle[signal.tone]}`}
          >
            {signal.label}
          </span>
        }
      >
        Velocity
      </SectionHeading>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Stat label="Cans / day" value={summary.avgUnitsPerDay} hint="Current rate" />
        <Stat label="Cases / wk" value={casesPerWeek} hint="At that rate" />
        <Stat label="Cans sold" value={summary.totalUnits} hint={`Over ${summary.totalDays} days`} />
        <Stat
          label={resolution.conflict ? "SOLLOS revenue (est.)" : "SOLLOS revenue"}
          value={`$${summary.totalSollosRevenue.toFixed(2)}`}
          hint={
            resolution.conflict
              ? "Case cost unconfirmed, see below"
              : `Retail $${summary.totalRevenue.toFixed(2)}`
          }
        />
      </div>

      {sorted.length === 0 ? (
        <EmptyState title="No periods recorded yet">
          Add the first week of units below. Two periods is enough for the app to start
          calling the trend and estimating restocks.
        </EmptyState>
      ) : (
        <>
          {sorted.length >= 2 && (
            <div className="mb-5">
              <VelocityChart entries={sorted} />
            </div>
          )}

          {coverDays !== null && (
            <p className="mb-5 text-sm text-sollos-navy/60">
              At <span className="num font-medium text-sollos-navy">{summary.avgUnitsPerDay}</span>{" "}
              cans a day, one case of {pricing.caseSize} lasts about{" "}
              <span className="num font-medium text-sollos-navy">
                {daysOfCover(pricing.caseSize, summary.avgUnitsPerDay)}
              </span>{" "}
              days on this shelf.
            </p>
          )}

          <div className="mb-5">
            <Table caption="Recorded reporting periods">
              <Thead>
                <Th>Period</Th>
                <Th align="right">Days</Th>
                <Th align="right">Cans</Th>
                <Th align="right">Cans / day</Th>
                <Th align="right">SOLLOS rev</Th>
                <Th align="right">Retail</Th>
                <Th align="right">
                  <span className="sr-only">Actions</span>
                </Th>
              </Thead>
              <Tbody>
                {sorted.map((e) => (
                  <Tr key={e.id ?? e.weekStart}>
                    <Td strong>
                      {e.weekStart} <span className="text-sollos-navy/35">to</span> {e.weekEnd}
                      {e.pricing && e.pricing.srp !== pricing.srp && (
                        <span className="ml-1.5 text-xs text-sollos-navy/40">
                          @ ${e.pricing.srp.toFixed(2)}
                        </span>
                      )}
                    </Td>
                    <Td numeric muted>
                      {e.days}
                    </Td>
                    <Td numeric strong>
                      {e.unitsSold}
                    </Td>
                    <Td numeric>{e.unitsPerDay}</Td>
                    <Td numeric>
                      ${(e.sollosRevenue ?? 0).toFixed(2)}
                    </Td>
                    <Td numeric muted>
                      ${e.revenue.toFixed(2)}
                    </Td>
                    <Td className="whitespace-nowrap text-right">
                      <button
                        onClick={() => handleEdit(e)}
                        className="text-xs font-medium text-sollos-navy/60 underline underline-offset-4 transition-colors hover:text-sollos-navy"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(e)}
                        className="ml-3 text-xs font-medium text-sollos-navy/40 underline underline-offset-4 transition-colors hover:text-sollos-orange"
                      >
                        Delete
                      </button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>
        </>
      )}

      <form onSubmit={handleSubmit} className="card p-5">
        <h3 className="mb-3.5 text-sm font-semibold text-sollos-navy">
          {editingId ? "Edit period" : "Add a period"}
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <FormField label="From" error={problemFor("weekStart")}>
            <input
              type="date"
              max={todayIso()}
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
              className={inputClass}
            />
          </FormField>
          <FormField label="To" error={problemFor("weekEnd")}>
            <input
              type="date"
              max={todayIso()}
              value={weekEnd}
              onChange={(e) => setWeekEnd(e.target.value)}
              className={inputClass}
            />
          </FormField>
          <FormField label="Cans sold" error={problemFor("unitsSold")}>
            <input
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={unitsSold}
              onChange={(e) => setUnitsSold(e.target.value)}
              className={inputClass}
            />
          </FormField>
          <div className="flex items-end gap-2">
            <PrimaryButton type="submit" className="flex-1">
              {editingId ? "Save" : "Add"}
            </PrimaryButton>
            {editingId && <GhostButton onClick={resetForm}>Cancel</GhostButton>}
          </div>
        </div>

        <p aria-live="polite" className="mt-3 min-h-4 text-xs">
          {problems.length > 0 ? (
            <span className="font-medium text-sollos-orange">{problems[0].message}</span>
          ) : status ? (
            <span className="font-medium text-sollos-good">{status}</span>
          ) : null}
        </p>

        <p className="mt-1 text-xs text-sollos-navy/45">
          Booked at ${pricing.srp.toFixed(2)} SRP and ${pricing.caseCost.toFixed(2)} a case
          {resolution.source === "account" ? " for this account" : ", the "}
          {resolution.source === "global" && (
            <Link href="/pricing" className="underline underline-offset-4 hover:text-sollos-navy">
              network default
            </Link>
          )}
          . Each period keeps the price it was entered at. Saved to this browser until team
          login ships.
        </p>
      </form>

      <AccountPricing
        resolution={resolution}
        onSave={(caseCost) => {
          saveAccountCaseCost(storeId, caseCost);
          setResolution(resolvePricing(storeId, loadPricing()));
        }}
      />
    </section>
  );
}

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-xs font-medium text-sollos-navy/60">
      <span className={error ? "text-sollos-orange" : undefined}>{label}</span>
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}
