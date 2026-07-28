import Link from "next/link";
import { notFound } from "next/navigation";
import { locations } from "@/lib/locations";
import { getSeedEntries } from "@/lib/storeStorage";
import { StoreHeader } from "./StoreHeader";
import { StoreVelocity } from "./StoreVelocity";
import { StoreNotes } from "./StoreNotes";

export function generateStaticParams() {
  return locations.map((loc) => ({ id: loc.id }));
}

export default async function StorePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = locations.find((loc) => loc.id === id);
  if (!store) notFound();

  const seedEntries = getSeedEntries(store.id);

  return (
    <div className="flex flex-1 flex-col bg-sollos-cream dark:bg-black">
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 sm:px-10">
        <Link
          href="/"
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
