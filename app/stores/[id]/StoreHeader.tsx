"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { StoreLocation } from "@/lib/locations";
import { loadStoreOverride, saveStoreOverride, type StoreOverride } from "@/lib/storeStorage";

type EditableFields = Required<StoreOverride>;

function pickEditable(store: StoreLocation): EditableFields {
  return {
    name: store.name,
    address1: store.address1,
    city: store.city,
    state: store.state,
    zip: store.zip,
    phone: store.phone,
    website: store.website,
  };
}

export function StoreHeader({ store }: { store: StoreLocation }) {
  const base = pickEditable(store);
  const [fields, setFields] = useState<EditableFields>(base);
  const [form, setForm] = useState<EditableFields>(base);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const override = loadStoreOverride(store.id);
    const merged = { ...pickEditable(store), ...override };
    setFields(merged);
    setForm(merged);
  }, [store]);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    saveStoreOverride(store.id, form);
    setFields(form);
    setEditing(false);
  }

  function handleCancel() {
    setForm(fields);
    setEditing(false);
  }

  if (editing) {
    return (
      <form
        onSubmit={handleSave}
        className="mb-8 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <h1 className="mb-3 text-lg font-semibold text-sollos-navy dark:text-zinc-50">
          Edit Store Info
        </h1>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <EditField label="Store Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <EditField label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <EditField
            label="Address"
            value={form.address1}
            onChange={(v) => setForm({ ...form, address1: v })}
          />
          <EditField label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
          <EditField label="State" value={form.state} onChange={(v) => setForm({ ...form, state: v })} />
          <EditField label="Zip" value={form.zip} onChange={(v) => setForm({ ...form, zip: v })} />
          <EditField
            label="Website"
            value={form.website}
            onChange={(v) => setForm({ ...form, website: v })}
          />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="submit"
            className="rounded-md bg-sollos-navy px-3 py-1.5 text-sm font-medium text-white hover:bg-sollos-navy-dark"
          >
            Save
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:border-sollos-navy hover:text-sollos-navy dark:border-zinc-700 dark:text-zinc-400"
          >
            Cancel
          </button>
        </div>
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-500">
          Saved to this browser. Editing the address does not move this store's pin on the map,
          that stays at its original geocoded location.
        </p>
      </form>
    );
  }

  return (
    <header className="mb-8 flex items-start justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-sollos-navy dark:text-zinc-50">
          {fields.name}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {fields.address1 && `${fields.address1}, `}
          {fields.city}, {fields.state} {fields.zip}
        </p>
        <div className="mt-2 flex flex-wrap gap-3 text-sm text-zinc-600 dark:text-zinc-400">
          {fields.phone && <span>{fields.phone}</span>}
          {fields.website && (
            <a
              href={fields.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sollos-navy underline dark:text-sollos-yellow"
            >
              Website
            </a>
          )}
          <Link href={`/map?store=${store.id}`} className="text-sollos-navy underline dark:text-sollos-yellow">
            View on map
          </Link>
          <button
            onClick={() => setEditing(true)}
            className="text-sollos-navy underline dark:text-sollos-yellow"
          >
            Edit
          </button>
        </div>
      </div>
      <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
        Live
      </span>
    </header>
  );
}

function EditField({
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
