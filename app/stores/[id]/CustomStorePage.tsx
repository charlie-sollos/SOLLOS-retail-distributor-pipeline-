"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { StoreLocation } from "@/lib/locations";
import { getCustomStore } from "@/lib/storeStorage";
import { StoreDetailContent } from "./StoreDetailContent";

/**
 * Stores added in the browser are not known at build time, so this resolves them
 * on the client and only reports a miss once we know storage has been checked.
 */
export function CustomStorePage({ id }: { id: string }) {
  const [status, setStatus] = useState<"loading" | "found" | "not-found">("loading");
  const [store, setStore] = useState<StoreLocation | null>(null);

  useEffect(() => {
    const found = getCustomStore(id);
    if (found) {
      setStore(found);
      setStatus("found");
    } else {
      setStatus("not-found");
    }
  }, [id]);

  if (status === "loading") return <div className="flex-1" />;

  if (status === "not-found" || !store) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-20 text-center">
        <p className="text-lg font-semibold text-sollos-navy">Store not found</p>
        <p className="max-w-sm text-sm text-sollos-navy/55">
          Stores added in a browser only exist in that browser until team login ships.
        </p>
        <Link
          href="/pipeline"
          className="pixel-btn mt-2 bg-sollos-navy text-white transition-colors hover:bg-sollos-navy-dark"
        >
          Back to pipeline
        </Link>
      </div>
    );
  }

  return <StoreDetailContent store={store} />;
}
