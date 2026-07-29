"use client";

import { useEffect, useState } from "react";
import { loadNotes, saveNotes } from "@/lib/storeStorage";
import { SectionHeading, PrimaryButton, inputClass } from "@/components/ui";

export function StoreNotes({ storeId }: { storeId: string }) {
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    setNotes(loadNotes(storeId));
    setSaved(true);
  }, [storeId]);

  // Warn before a tab close would drop an unsaved note.
  useEffect(() => {
    if (saved) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saved]);

  return (
    <section>
      <SectionHeading>Ops notes</SectionHeading>
      <div className="card p-5">
        <label htmlFor="ops-notes" className="sr-only">
          Ops notes for this store
        </label>
        <textarea
          id="ops-notes"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setSaved(false);
          }}
          rows={4}
          placeholder="Restock cadence, who to ask for, shelf placement, anything the next visit should know."
          className={inputClass}
        />
        <div className="mt-3 flex items-center gap-3">
          <PrimaryButton
            onClick={() => {
              saveNotes(storeId, notes);
              setSaved(true);
            }}
            disabled={saved}
          >
            {saved ? "Saved" : "Save notes"}
          </PrimaryButton>
          <span aria-live="polite" className="text-xs text-sollos-navy/45">
            {saved ? "Saved to this browser" : "Unsaved changes"}
          </span>
        </div>
      </div>
    </section>
  );
}
