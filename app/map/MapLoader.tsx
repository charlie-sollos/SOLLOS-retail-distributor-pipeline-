"use client";

import dynamic from "next/dynamic";
import type { StoreLocation } from "@/lib/locations";

const MapView = dynamic(() => import("./MapView").then((m) => m.MapView), {
  ssr: false,
  loading: () => (
    <div className="flex h-[70vh] w-full items-center justify-center rounded-lg border border-zinc-200 text-sm text-zinc-500 dark:border-zinc-800">
      Loading map...
    </div>
  ),
});

export function MapLoader({ locations }: { locations: StoreLocation[] }) {
  return <MapView locations={locations} />;
}
