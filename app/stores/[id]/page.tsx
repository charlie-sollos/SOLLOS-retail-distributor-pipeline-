import { locations } from "@/lib/locations";
import { getSeedEntries } from "@/lib/storeStorage";
import { StoreDetailContent } from "./StoreDetailContent";
import { CustomStorePage } from "./CustomStorePage";

export function generateStaticParams() {
  return locations.map((loc) => ({ id: loc.id }));
}

export default async function StorePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = locations.find((loc) => loc.id === id);

  if (store) {
    const seedEntries = getSeedEntries(store.id);
    return <StoreDetailContent store={store} seedEntries={seedEntries} />;
  }

  return <CustomStorePage id={id} />;
}
