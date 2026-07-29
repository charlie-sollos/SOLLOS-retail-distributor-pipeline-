import type { Metadata } from "next";
import { Suspense } from "react";
import { MapPageClient } from "./MapPageClient";

export const metadata: Metadata = { title: "Map" };

export default function MapPage() {
  return (
    <Suspense fallback={null}>
      <MapPageClient />
    </Suspense>
  );
}
