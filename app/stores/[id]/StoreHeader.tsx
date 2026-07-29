"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { StoreLocation } from "@/lib/locations";
import {
  deleteCustomStore,
  loadStoreOverride,
  saveStoreOverride,
  type StoreOverride,
} from "@/lib/storeStorage";
import { Field, PrimaryButton, GhostButton } from "@/components/ui";

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

/** Strips formatting so a tel: link works from a phone. */
const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

export function StoreHeader({ store }: { store: StoreLocation }) {
  const router = useRouter();
  const base = pickEditable(store);
  const [fields, setFields] = useState<EditableFields>(base);
  const [form, setForm] = useState<EditableFields>(base);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const merged = { ...pickEditable(store), ...loadStoreOverride(store.id) };
    setFields(merged);
    setForm(merged);
  }, [store]);

  const isCustom = store.id.startsWith("custom_");
  const mapped = store.lat !== undefined && store.lng !== undefined;
  const addressLine = [fields.address1, fields.city, fields.state, fields.zip]
    .filter(Boolean)
    .join(", ");

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    saveStoreOverride(store.id, form);
    setFields(form);
    setEditing(false);
  }

  function handleDeleteStore() {
    if (!window.confirm(`Remove ${fields.name} from the pipeline? This cannot be undone.`)) return;
    deleteCustomStore(store.id);
    router.push("/pipeline");
  }

  if (editing) {
    return (
      <form onSubmit={handleSave} className="card mb-8 p-5">
        <h1 className="mb-3.5 text-lg font-semibold text-sollos-navy">Edit store</h1>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Store name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <Field label="Address" value={form.address1} onChange={(v) => setForm({ ...form, address1: v })} />
          <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
          <Field label="State" value={form.state} onChange={(v) => setForm({ ...form, state: v })} />
          <Field label="Zip" value={form.zip} onChange={(v) => setForm({ ...form, zip: v })} />
          <Field label="Website" value={form.website} onChange={(v) => setForm({ ...form, website: v })} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <PrimaryButton type="submit">Save</PrimaryButton>
          <GhostButton onClick={() => { setForm(fields); setEditing(false); }}>Cancel</GhostButton>
          {isCustom && (
            <button
              type="button"
              onClick={handleDeleteStore}
              className="ml-auto text-sm font-medium text-sollos-navy/45 underline underline-offset-4 transition-colors hover:text-sollos-orange"
            >
              Remove store
            </button>
          )}
        </div>
        <p className="mt-3 text-xs text-sollos-navy/45">
          Saved to this browser. Editing the address does not move the map pin, which stays at
          the original geocoded point.
        </p>
      </form>
    );
  }

  return (
    <header className="mb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.025em] text-sollos-navy sm:text-4xl">
            {fields.name}
          </h1>
          {addressLine && <p className="mt-1.5 text-sm text-sollos-navy/60">{addressLine}</p>}
        </div>
        <span className="rounded-full bg-sollos-good/12 px-2.5 py-1 text-xs font-medium text-sollos-good">
          Live
        </span>
      </div>

      {/* Field actions. A rep standing in the store wants to call or navigate, not read. */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {fields.phone && (
          <a href={telHref(fields.phone)} className="chip">
            Call {fields.phone}
          </a>
        )}
        {addressLine && (
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(addressLine)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="chip"
          >
            Directions
          </a>
        )}
        {fields.website && (
          <a href={fields.website} target="_blank" rel="noopener noreferrer" className="chip">
            Website
          </a>
        )}
        {mapped && (
          <Link href={`/map?store=${store.id}`} className="chip">
            On map
          </Link>
        )}
        <button onClick={() => setEditing(true)} className="chip">
          Edit
        </button>
      </div>
    </header>
  );
}
