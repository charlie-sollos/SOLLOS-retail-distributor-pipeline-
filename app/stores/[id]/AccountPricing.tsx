"use client";

import { useState } from "react";
import { breakdown, type PricingResolution } from "@/lib/accountPricing";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/Table";
import { GhostButton, PrimaryButton, inputClass } from "@/components/ui";

/**
 * The case cost this door is billed at, and the invoices that either back it up
 * or contradict it.
 *
 * This exists because the network bills at more than one price and the app used
 * to assume one. Rather than guess a per-account price from invoice totals, which
 * cannot be done reliably without line items, it shows the operator exactly what
 * was billed and lets them set the real number once they know it.
 */
export function AccountPricing({
  resolution,
  onSave,
}: {
  resolution: PricingResolution;
  onSave: (caseCost: number | null) => void;
}) {
  const { billing, conflict, totals, source, pricing } = resolution;
  // The field starts empty and shows the cost in force as its placeholder, so it
  // always reads as "type a new one" rather than as a value waiting to be resaved.
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("");

  if (!billing && source === "global") return null;

  const parsed = Number(draft);
  const valid = draft.trim() !== "" && Number.isFinite(parsed) && parsed > 0;

  return (
    <div className="card mt-5 px-5 py-4">
      <h3 className="eyebrow mb-2">Account pricing</h3>

      {conflict ? (
        <p className="mb-3 text-sm text-sollos-orange">
          {conflict.invoiceCount === 1 ? "The invoice" : `All ${conflict.invoiceCount} invoices`} on
          record for this account
          {conflict.invoiceCount === 1 ? " does not resolve" : " do not resolve"} into whole cans at
          ${pricing.caseCost.toFixed(2)} a case, as cases or as samples. Every SOLLOS revenue and
          margin figure on this page is
          computed from that number, so treat them as estimates until someone confirms the real
          case price from the invoice line items.
        </p>
      ) : totals ? (
        <p className="mb-3 text-sm text-sollos-navy/60">
          Billed at ${pricing.caseCost.toFixed(2)} a case, which accounts for every invoice on
          record: <span className="font-medium text-sollos-navy">{totals.cases} cases</span>
          {totals.samples > 0 && (
            <>
              {" "}
              plus{" "}
              <span className="font-medium text-sollos-navy">
                {totals.samples} {totals.samples === 1 ? "can" : "cans"}
              </span>{" "}
              booked as samples
            </>
          )}
          .
        </p>
      ) : null}

      {billing && (
        <div className="mb-4">
          <p className="mb-2 text-xs text-sollos-navy/45">
            Invoiced to{" "}
            <span className="font-medium text-sollos-navy/70">{billing.customer}</span> in
            QuickBooks, 5/26/26 to 7/28/26. No line items in that export, so no case counts.
          </p>
          <Table caption="Invoices on record">
            <Thead>
              <Th>Date</Th>
              <Th>Invoice</Th>
              <Th align="right">Amount</Th>
              <Th align="right">Cases at ${pricing.caseCost.toFixed(2)}</Th>
              <Th align="right">Samples</Th>
              <Th>Status</Th>
            </Thead>
            <Tbody>
              {billing.invoices.map((inv) => {
                const split = breakdown(inv.amount, pricing);
                return (
                  <Tr key={inv.number + inv.date}>
                    <Td>{inv.date}</Td>
                    <Td muted>{inv.number}</Td>
                    <Td numeric strong>
                      ${inv.amount.toFixed(2)}
                    </Td>
                    <Td numeric>
                      {split ? (
                        split.cases
                      ) : (
                        <span className="text-sollos-orange">
                          {(inv.amount / pricing.caseCost).toFixed(2)}
                        </span>
                      )}
                    </Td>
                    <Td numeric muted={!split || split.samples === 0}>
                      {split ? (split.samples > 0 ? `${split.samples} cans` : "-") : "-"}
                    </Td>
                    <Td muted>{inv.status}</Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <label className="block text-xs font-medium text-sollos-navy/60">
          Case cost for this account
          <input
            type="number"
            min="0"
            step="0.01"
            value={draft}
            placeholder={pricing.caseCost.toFixed(2)}
            onChange={(e) => setDraft(e.target.value)}
            className={`mt-1.5 w-40 ${inputClass}`}
          />
        </label>
        <PrimaryButton
          disabled={!valid}
          onClick={() => {
            onSave(parsed);
            setDraft("");
            setStatus(`Saved. This account bills at $${parsed.toFixed(2)} a case.`);
          }}
        >
          Save
        </PrimaryButton>
        {source === "account" && (
          <GhostButton
            onClick={() => {
              onSave(null);
              setDraft("");
              setStatus("Cleared. Back on the network default.");
            }}
          >
            Use network default
          </GhostButton>
        )}
      </div>

      <p aria-live="polite" className="mt-2 min-h-4 text-xs font-medium text-sollos-good">
        {status}
      </p>
      <p className="mt-1 text-xs text-sollos-navy/45">
        Applies to periods entered from now on. Periods already recorded keep the price they
        were booked at. Cans beyond a full case are counted as samples, which is an assumption:
        the line items would confirm it.
      </p>
    </div>
  );
}
