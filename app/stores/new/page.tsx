"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { locations } from "@/lib/locations";
import { addCustomStore, loadCustomStores } from "@/lib/storeStorage";
import { Page, PageTitle, PrimaryButton, Field } from "@/components/ui";

type FormState = {
  name: string;
  address1: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  website: string;
};

const EMPTY: FormState = {
  name: "",
  address1: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  website: "",
};

const GEOCODE_TIMEOUT_MS = 8000;

/** Best effort placement. A miss is fine, the store still enters the pipeline. */
async function geocode(form: FormState): Promise<{ lat: number; lng: number } | null> {
  const query = [form.address1, form.city, form.state, form.zip, "USA"].filter(Boolean).join(", ");
  if (!form.address1.trim()) return null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=${encodeURIComponent(query)}`,
      { signal: AbortSignal.timeout(GEOCODE_TIMEOUT_MS) }
    );
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const lat = Number(data[0]?.lat);
    const lng = Number(data[0]?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat < 18 || lat > 72 || lng < -180 || lng > -66) return null; // sanity bounds
    return { lat, lng };
  } catch {
    return null;
  }
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export default function NewStorePage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const field = (key: keyof FormState) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Warn on a likely duplicate rather than silently creating a second door.
  const possibleDuplicate = useMemo(() => {
    if (!form.name.trim() && !form.address1.trim()) return null;
    const all = [...locations, ...loadCustomStores()];
    return (
      all.find(
        (s) =>
          (norm(s.name) === norm(form.name) && norm(s.city) === norm(form.city)) ||
          (form.address1.trim() !== "" &&
            norm(s.address1) === norm(form.address1) &&
            norm(s.city) === norm(form.city))
      ) ?? null
    );
  }, [form.name, form.address1, form.city]);

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
    const ok = addCustomStore({
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
      approximate: !coords,
    });
    if (!ok) {
      setSubmitting(false);
      setError("Could not save. Browser storage may be full or disabled.");
      return;
    }
    router.push(`/stores/${id}`);
  }

  return (
    <Page>
      <Link
        href="/pipeline"
        className="mb-5 inline-block text-sm text-sollos-navy/55 transition-colors hover:text-sollos-navy"
      >
        &larr; Pipeline
      </Link>

      <PageTitle
        title="Add a store"
        subtitle="Adds a live door to the pipeline. Saved to this browser until team login ships."
      />

      <form onSubmit={handleSubmit} className="card max-w-2xl p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Store name (required)" value={form.name} onChange={field("name")} />
          <Field label="Phone" value={form.phone} onChange={field("phone")} />
          <Field label="Address" value={form.address1} onChange={field("address1")} />
          <Field label="City (required)" value={form.city} onChange={field("city")} />
          <Field label="State (required)" value={form.state} onChange={field("state")} placeholder="FL" />
          <Field label="Zip" value={form.zip} onChange={field("zip")} />
          <Field label="Website" value={form.website} onChange={field("website")} />
        </div>

        {possibleDuplicate && (
          <p className="mt-4 rounded-xl border border-sollos-orange/30 bg-sollos-orange/8 px-3.5 py-2.5 text-sm text-sollos-navy">
            <span className="font-medium">Possible duplicate.</span>{" "}
            <Link
              href={`/stores/${possibleDuplicate.id}`}
              className="underline underline-offset-4"
            >
              {possibleDuplicate.name}
            </Link>{" "}
            in {possibleDuplicate.city} already looks like this. You can still add it.
          </p>
        )}

        <p aria-live="polite" className="mt-3 min-h-4 text-sm">
          {error && <span className="font-medium text-sollos-orange">{error}</span>}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? "Placing on map..." : "Add store"}
          </PrimaryButton>
          <Link
            href="/pipeline"
            className="text-sm font-medium text-sollos-navy/55 transition-colors hover:text-sollos-navy"
          >
            Cancel
          </Link>
        </div>

        <p className="mt-3.5 text-xs text-sollos-navy/45">
          With an address we try to place the door on the map automatically. Without one, or if
          the lookup misses, it still appears in the pipeline and can be mapped later.
        </p>
      </form>
    </Page>
  );
}
