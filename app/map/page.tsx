import { Suspense } from "react";
import { MapPageClient } from "./MapPageClient";

export default function MapPage() {
  return (
    <Suspense fallback={null}>
      <MapPageClient />
    </Suspense>
  );
}
