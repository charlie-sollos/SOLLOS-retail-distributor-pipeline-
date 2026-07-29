"use client";

import dynamic from "next/dynamic";
import type { MappedLocation } from "./MapView";

const MapView = dynamic(() => import("./MapView").then((m) => m.MapView), {
  ssr: false,
  loading: () => (
    <div className="flex h-[70vh] w-full items-center justify-center rounded-2xl border border-sollos-navy/10 bg-white text-sm text-sollos-navy/50">
      Loading map...
    </div>
  ),
});

export function MapLoader({
  locations,
  focusId,
}: {
  locations: MappedLocation[];
  focusId?: string;
}) {
  return <MapView locations={locations} focusId={focusId} />;
}
