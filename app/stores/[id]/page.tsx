import type { Metadata } from "next";
import { locations } from "@/lib/locations";
import { StoreDetailContent } from "./StoreDetailContent";
import { CustomStorePage } from "./CustomStorePage";

export function generateStaticParams() {
  return locations.map((loc) => ({ id: loc.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const store = locations.find((loc) => loc.id === id);
  return { title: store ? store.name : "Store" };
}

export default async function StorePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = locations.find((loc) => loc.id === id);

  if (store) return <StoreDetailContent store={store} />;
  return <CustomStorePage id={id} />;
}
