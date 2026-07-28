"use client";

import { useEffect, useState } from "react";
import { loadNotes, saveNotes } from "@/lib/storeStorage";

export function StoreNotes({ storeId }: { storeId: string }) {
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    setNotes(loadNotes(storeId));
  }, [storeId]);

  function handleChange(value: string) {
    setNotes(value);
    setSaved(false);
  }

  function handleSave() {
    saveNotes(storeId, notes);
    setSaved(true);
  }

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-black dark:text-zinc-50">Ops Notes</h2>
      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <textarea
          value={notes}
          onChange={(e) => handleChange(e.target.value)}
          rows={4}
          placeholder="Restock reminders, contact preferences, shelf placement, anything the team needs to know."
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-black dark:text-zinc-50"
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={handleSave}
            className="rounded-md bg-sollos-teal px-3 py-1.5 text-sm font-medium text-white hover:bg-sollos-teal-dark"
          >
            Save Notes
          </button>
          <span className="text-xs text-zinc-500 dark:text-zinc-500">
            {saved ? "Saved to this browser" : "Unsaved changes"}
          </span>
        </div>
      </div>
    </section>
  );
}
