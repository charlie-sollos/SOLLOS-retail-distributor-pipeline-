import Link from "next/link";
import { notFound } from "next/navigation";
import { locations } from "@/lib/locations";
import { getSeedEntries } from "@/lib/storeStorage";
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

        <header className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-sollos-navy dark:text-zinc-50">
              {store.name}
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {store.address1 && `${store.address1}, `}
              {store.city}, {store.state} {store.zip}
            </p>
            <div className="mt-2 flex flex-wrap gap-3 text-sm text-zinc-600 dark:text-zinc-400">
              {store.phone && <span>{store.phone}</span>}
              {store.website && (
                <a
                  href={store.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sollos-navy underline dark:text-sollos-yellow"
                >
                  Website
                </a>
              )}
              <Link href="/map" className="text-sollos-navy underline dark:text-sollos-yellow">
                View on map
              </Link>
            </div>
          </div>
          <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
            Live
          </span>
        </header>

        <StoreVelocity storeId={store.id} seedEntries={seedEntries} />
        <StoreNotes storeId={store.id} />
      </main>
    </div>
  );
}
