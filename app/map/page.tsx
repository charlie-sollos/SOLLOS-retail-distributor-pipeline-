import { locations } from "@/lib/locations";
import { MapLoader } from "./MapLoader";

export default function MapPage() {
  const approximateCount = locations.filter((l) => l.approximate).length;

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 sm:px-10">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Store Locations
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {locations.length} stockist locations
            {approximateCount > 0 &&
              ` (${approximateCount} approximate, city-level pins where a precise address match wasn't found)`}
          </p>
        </header>
        <MapLoader locations={locations} />
      </main>
    </div>
  );
}
