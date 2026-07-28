"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { addCustomStore } from "@/lib/storeStorage";

type FormState = {
  name: string;
  address1: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  website: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  address1: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  website: "",
};

async function geocode(form: FormState): Promise<{ lat: number; lng: number } | null> {
  const query = [form.address1, form.city, form.state, form.zip, "USA"].filter(Boolean).join(", ");
  if (!query) return null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=${encodeURIComponent(query)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

export default function NewStorePage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function field(key: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.name.trim() || !form.city.trim() || !form.state.trim()) {
      setError("Store name, city, and state are required.");
      return;
    }

    setSubmitting(true);
    const coords = await geocode(form);

    const id = `custom_${crypto.randomUUID()}`;
    addCustomStore({
      id,
      name: form.name.trim(),
      address1: form.address1.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      zip: form.zip.trim(),
      country: "United States",
      phone: form.phone.trim(),
      website: form.website.trim(),
      lat: coords?.lat,
      lng: coords?.lng,
      approximate: !form.address1.trim(),
    });

    router.push(`/stores/${id}`);
  }

  return (
    <div className="flex flex-1 flex-col bg-sollos-cream dark:bg-black">
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 sm:px-10">
        <Link
          href="/pipeline"
          className="mb-6 inline-block text-sm text-zinc-500 hover:text-sollos-navy hover:underline dark:text-zinc-400 dark:hover:text-sollos-yellow"
        >
          ← Back to Pipeline
        </Link>

        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-sollos-navy dark:text-zinc-50">
            Add a Store
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Adds a new live store to the pipeline. Saved to this browser for now, team-wide
            syncing comes with the SOLLOS team login.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Store Name *" value={form.name} onChange={(v) => field("name", v)} />
            <Field label="Phone" value={form.phone} onChange={(v) => field("phone", v)} />
            <Field
              label="Address"
              value={form.address1}
              onChange={(v) => field("address1", v)}
            />
            <Field label="City *" value={form.city} onChange={(v) => field("city", v)} />
            <Field label="State *" value={form.state} onChange={(v) => field("state", v)} />
            <Field label="Zip" value={form.zip} onChange={(v) => field("zip", v)} />
            <Field label="Website" value={form.website} onChange={(v) => field("website", v)} />
          </div>

          {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="mt-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-sollos-navy px-4 py-2 text-sm font-medium text-white hover:bg-sollos-navy-dark disabled:opacity-50"
            >
              {submitting ? "Adding..." : "Add Store"}
            </button>
            <Link
              href="/pipeline"
              className="text-sm text-zinc-600 hover:text-sollos-navy dark:text-zinc-400 dark:hover:text-sollos-yellow"
            >
              Cancel
            </Link>
          </div>

          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-500">
            If an address is given, we try to place the store on the map automatically. Without
            one, the store still shows up in the pipeline but won't have a map pin yet.
          </p>
        </form>
      </main>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="text-sm text-zinc-600 dark:text-zinc-400">
      {label}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-black focus:border-sollos-navy focus:outline-none dark:border-zinc-700 dark:bg-black dark:text-zinc-50"
      />
    </label>
  );
}
