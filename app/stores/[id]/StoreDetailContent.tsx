import Link from "next/link";
import type { StoreLocation } from "@/lib/locations";
import type { VelocityEntry } from "@/lib/velocity";
import { StoreHeader } from "./StoreHeader";
import { StoreVelocity } from "./StoreVelocity";
import { StoreNotes } from "./StoreNotes";

export function StoreDetailContent({
  store,
  seedEntries,
}: {
  store: StoreLocation;
  seedEntries: VelocityEntry[];
}) {
  return (
    <div className="flex flex-1 flex-col bg-sollos-cream dark:bg-black">
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 sm:px-10">
        <Link
          href="/pipeline"
          className="mb-6 inline-block text-sm text-zinc-500 hover:text-sollos-navy hover:underline dark:text-zinc-400 dark:hover:text-sollos-yellow"
        >
          ← Back to Pipeline
        </Link>

        <StoreHeader store={store} />

        <StoreVelocity storeId={store.id} seedEntries={seedEntries} />
        <StoreNotes storeId={store.id} />
      </main>
    </div>
  );
}
