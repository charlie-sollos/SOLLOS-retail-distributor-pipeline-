"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addShipment,
  deleteShipment,
  getMergedEntries,
  getMergedShipments,
  updateShipment,
} from "@/lib/storeStorage";
import {
  computeShipment,
  formatCases,
  formatShortDate,
  mostRecentShipment,
  shipmentStalenessSignal,
  sortByDate,
  validateShipment,
  type ShipmentEntry,
  type ShipmentProblem,
} from "@/lib/shipments";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/Table";
import {
  SectionHeading,
  PrimaryButton,
  GhostButton,
  EmptyState,
  inputClass,
} from "@/components/ui";

const todayIso = () => new Date().toISOString().slice(0, 10);

export function StoreShipments({ storeId }: { storeId: string }) {
  const [shipments, setShipments] = useState<ShipmentEntry[]>([]);
  const [velocityWeeks, setVelocityWeeks] = useState<{ weekStart: string; weekEnd: string }[]>([]);
  const [date, setDate] = useState("");
  const [cases, setCases] = useState("");
  const [problems, setProblems] = useState<ShipmentProblem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    setShipments(getMergedShipments(storeId));
    setVelocityWeeks(getMergedEntries(storeId));
  }, [storeId]);

  const sorted = useMemo(() => sortByDate(shipments), [shipments]);
  const last = mostRecentShipment(sorted);
  const signal = shipmentStalenessSignal(sorted, velocityWeeks);

  function resetForm() {
    setDate("");
    setCases("");
    setEditingId(null);
    setProblems([]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = validateShipment(date, cases, todayIso());
    setProblems(found);
    if (found.length) return;

    const entry = computeShipment(date, Number(cases), editingId ?? undefined);
    const ok = editingId ? updateShipment(storeId, entry) : addShipment(storeId, entry);
    if (!ok) {
      setProblems([{ field: "cases", message: "Could not save. Browser storage may be full." }]);
      return;
    }
    setShipments(getMergedShipments(storeId));
    setStatus(editingId ? "Shipment updated." : "Shipment logged.");
    resetForm();
  }

  function handleEdit(entry: ShipmentEntry) {
    setEditingId(entry.id ?? null);
    setDate(entry.date);
    setCases(String(entry.cases));
    setProblems([]);
    setStatus("");
  }

  function handleDelete(entry: ShipmentEntry) {
    if (!entry.id) return;
    if (!window.confirm(`Delete the shipment on ${entry.date}? This cannot be undone.`)) return;
    deleteShipment(storeId, entry.id);
    setShipments(getMergedShipments(storeId));
    setStatus("Shipment deleted.");
    if (editingId === entry.id) resetForm();
  }

  const problemFor = (field: ShipmentProblem["field"]) =>
    problems.find((p) => p.field === field)?.message;

  return (
    <section className="mb-10">
      <SectionHeading
        action={
          last ? (
            <span
              className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${
                signal.stale
                  ? "bg-sollos-orange/12 text-sollos-orange"
                  : "bg-sollos-sky text-sollos-navy"
              }`}
            >
              {signal.stale
                ? signal.label
                : `Last shipped ${formatShortDate(last.date)}, ${formatCases(last.cases)}`}
            </span>
          ) : undefined
        }
      >
        Shipments
      </SectionHeading>

      {sorted.length === 0 ? (
        <EmptyState title="No shipments recorded yet">
          Log the first case count below. Once shipments and sell-through are both on
          record, a door that took cases in but never reported a sale shows up automatically.
        </EmptyState>
      ) : (
        <div className="mb-5">
          <Table caption="Recorded shipments">
            <Thead>
              <Th>Date</Th>
              <Th align="right">Cases</Th>
              <Th align="right">
                <span className="sr-only">Actions</span>
              </Th>
            </Thead>
            <Tbody>
              {sorted.map((e) => (
                <Tr key={e.id ?? e.date}>
                  <Td strong>{e.date}</Td>
                  <Td numeric strong>
                    {e.cases}
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
      )}

      <form onSubmit={handleSubmit} className="card p-5">
        <h3 className="mb-3.5 text-sm font-semibold text-sollos-navy">
          {editingId ? "Edit shipment" : "Log a shipment"}
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FormField label="Date" error={problemFor("date")}>
            <input
              type="date"
              max={todayIso()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          </FormField>
          <FormField label="Cases" error={problemFor("cases")}>
            <input
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              value={cases}
              onChange={(e) => setCases(e.target.value)}
              className={inputClass}
            />
          </FormField>
          <div className="flex items-end gap-2">
            <PrimaryButton type="submit" className="flex-1">
              {editingId ? "Save" : "Log"}
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
          Saved to this browser until team login ships.
        </p>
      </form>
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
