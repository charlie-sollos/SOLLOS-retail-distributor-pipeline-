import Link from "next/link";
import type { StoreLocation } from "@/lib/locations";
import { Page } from "@/components/ui";
import { StoreHeader } from "./StoreHeader";
import { StoreShipments } from "./StoreShipments";
import { StoreVelocity } from "./StoreVelocity";
import { StoreNotes } from "./StoreNotes";

export function StoreDetailContent({ store }: { store: StoreLocation }) {
  return (
    <Page>
      <Link
        href="/pipeline"
        className="mb-5 inline-block text-sm text-sollos-navy/55 transition-colors hover:text-sollos-navy"
      >
        &larr; Pipeline
      </Link>

      <StoreHeader store={store} />
      <StoreShipments storeId={store.id} />
      <StoreVelocity storeId={store.id} />
      <StoreNotes storeId={store.id} />
    </Page>
  );
}
