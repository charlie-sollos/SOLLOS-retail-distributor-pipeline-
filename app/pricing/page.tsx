"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_PRICING,
  derivePricing,
  loadPricing,
  savePricing,
  sanitizePricing,
  type Pricing,
} from "@/lib/pricing";
import { Page, PageTitle, PrimaryButton, GhostButton, Field } from "@/components/ui";

export default function PricingPage() {
  const [pricing, setPricing] = useState<Pricing>(DEFAULT_PRICING);
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    setPricing(loadPricing());
  }, []);

  // Derive off sanitized values so a mid-edit empty field never shows NaN.
  const derived = derivePricing(sanitizePricing(pricing));
  const marginPct = derived.srp > 0 ? (derived.gpPerCan / derived.srp) * 100 : 0;

  function set(field: keyof Pricing, value: string) {
    const n = Number(value);
    setPricing((p) => ({ ...p, [field]: value === "" ? NaN : n }));
    setSaved(false);
  }

  return (
    <Page>
      <PageTitle
        title="Pricing"
        subtitle="Sets the price new periods are booked at. Existing periods keep the price they were entered with."
      />

      <div className="card max-w-2xl p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field
            label="Cans per case"
            type="number"
            min="1"
            value={Number.isFinite(pricing.caseSize) ? pricing.caseSize : ""}
            onChange={(v) => set("caseSize", v)}
          />
          <Field
            label="Case cost ($)"
            type="number"
            min="0"
            step="0.01"
            value={Number.isFinite(pricing.caseCost) ? pricing.caseCost : ""}
            onChange={(v) => set("caseCost", v)}
          />
          <Field
            label="Retail per can, SRP ($)"
            type="number"
            min="0"
            step="0.01"
            value={Number.isFinite(pricing.srp) ? pricing.srp : ""}
            onChange={(v) => set("srp", v)}
          />
        </div>

        <div className="panel mt-5 grid grid-cols-2 gap-4 p-4 sm:grid-cols-3">
          <Derived label="SOLLOS per can" value={`$${derived.costPerCan.toFixed(2)}`} note="What we bill" />
          <Derived label="Retailer margin" value={`$${derived.gpPerCan.toFixed(2)}`} note="Per can at SRP" />
          <Derived label="Retailer margin %" value={`${marginPct.toFixed(0)}%`} note="Of shelf price" />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          <PrimaryButton
            onClick={() => {
              const clean = sanitizePricing(pricing);
              setPricing(clean);
              savePricing(clean);
              setSaved(true);
            }}
            disabled={saved}
          >
            {saved ? "Saved" : "Save pricing"}
          </PrimaryButton>
          <GhostButton
            onClick={() => {
              setPricing(DEFAULT_PRICING);
              savePricing(DEFAULT_PRICING);
              setSaved(true);
            }}
          >
            Reset to sell sheet
          </GhostButton>
          <span aria-live="polite" className="text-xs text-sollos-navy/45">
            {saved ? "Saved to this browser" : "Unsaved changes"}
          </span>
        </div>
      </div>

      <p className="mt-4 max-w-2xl text-xs text-sollos-navy/50">
        One price applies to every door today. Real wholesale usually differs by channel and
        distributor, so this is the next thing to model once team login and a database land.
      </p>
    </Page>
  );
}

function Derived({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-sollos-navy/50">
        {label}
      </p>
      <p className="num mt-1 text-xl font-semibold text-sollos-navy">{value}</p>
      <p className="mt-0.5 text-[11px] text-sollos-navy/45">{note}</p>
    </div>
  );
}
