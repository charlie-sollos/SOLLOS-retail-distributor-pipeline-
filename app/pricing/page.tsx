"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_PRICING,
  derivePricing,
  loadPricing,
  savePricing,
  type Pricing,
} from "@/lib/pricing";

export default function PricingPage() {
  const [pricing, setPricing] = useState<Pricing>(DEFAULT_PRICING);
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    setPricing(loadPricing());
  }, []);

  const derived = derivePricing(pricing);

  function handleChange(field: keyof Pricing, value: string) {
    const num = Number(value);
    setPricing((p) => ({ ...p, [field]: Number.isFinite(num) ? num : p[field] }));
    setSaved(false);
  }

  function handleSave() {
    savePricing(pricing);
    setSaved(true);
  }

  function handleReset() {
    setPricing(DEFAULT_PRICING);
    savePricing(DEFAULT_PRICING);
    setSaved(true);
  }

  return (
    <div className="flex flex-1 flex-col bg-sollos-cream dark:bg-black">
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 sm:px-10">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-sollos-navy dark:text-zinc-50">
            Pricing
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Sets the price used when new velocity data is added. Changing this does not
            change revenue or gross profit already recorded on existing entries, those keep
            the pricing that was active when they were added.
          </p>
        </header>

        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="text-sm text-zinc-600 dark:text-zinc-400">
              Case Size (cans/case)
              <input
                type="number"
                min="1"
                value={pricing.caseSize}
                onChange={(e) => handleChange("caseSize", e.target.value)}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-black focus:border-sollos-navy focus:outline-none dark:border-zinc-700 dark:bg-black dark:text-zinc-50"
              />
            </label>
            <label className="text-sm text-zinc-600 dark:text-zinc-400">
              Case Cost ($)
              <input
                type="number"
                min="0"
                step="0.01"
                value={pricing.caseCost}
                onChange={(e) => handleChange("caseCost", e.target.value)}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-black focus:border-sollos-navy focus:outline-none dark:border-zinc-700 dark:bg-black dark:text-zinc-50"
              />
            </label>
            <label className="text-sm text-zinc-600 dark:text-zinc-400">
              Retail Price per Can, SRP ($)
              <input
                type="number"
                min="0"
                step="0.01"
                value={pricing.srp}
                onChange={(e) => handleChange("srp", e.target.value)}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-black focus:border-sollos-navy focus:outline-none dark:border-zinc-700 dark:bg-black dark:text-zinc-50"
              />
            </label>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Cost per Can (calculated)
              </p>
              <p className="mt-1 text-xl font-semibold text-black dark:text-zinc-50">
                ${derived.costPerCan.toFixed(2)}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Gross Profit per Can (calculated)
              </p>
              <p className="mt-1 text-xl font-semibold text-black dark:text-zinc-50">
                ${derived.gpPerCan.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={handleSave}
              className="rounded-md bg-sollos-navy px-3 py-1.5 text-sm font-medium text-white hover:bg-sollos-navy-dark"
            >
              Save Pricing
            </button>
            <button
              onClick={handleReset}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:border-sollos-navy hover:text-sollos-navy dark:border-zinc-700 dark:text-zinc-400"
            >
              Reset to Default
            </button>
            <span className="text-xs text-zinc-500 dark:text-zinc-500">
              {saved ? "Saved to this browser" : "Unsaved changes"}
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
