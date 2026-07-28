"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { StoreLocation } from "@/lib/locations";
import { getCustomStore } from "@/lib/storeStorage";
import { StoreDetailContent } from "./StoreDetailContent";

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

  if (status === "loading") {
    return <div className="flex flex-1 flex-col bg-sollos-cream dark:bg-black" />;
  }

  if (status === "not-found") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-sollos-cream px-6 py-12 text-center dark:bg-black">
        <p className="text-lg font-semibold text-black dark:text-zinc-50">Store not found</p>
        <Link href="/pipeline" className="text-sollos-navy underline dark:text-sollos-yellow">
          Back to Pipeline
        </Link>
      </div>
    );
  }

  return <StoreDetailContent store={store!} seedEntries={[]} />;
}
