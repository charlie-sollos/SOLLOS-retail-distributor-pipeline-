import raw from "@/data/locations.json";

export type StoreLocation = {
  id: string;
  name: string;
  address1: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
  website: string;
  lat: number;
  lng: number;
  approximate?: boolean;
};

export const locations = raw as StoreLocation[];
