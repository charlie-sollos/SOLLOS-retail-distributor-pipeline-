"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { StoreLocation } from "@/lib/locations";

const pinIcon = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#002a53;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -8],
});

export function MapView({ locations }: { locations: StoreLocation[] }) {
  const bounds = L.latLngBounds(locations.map((loc) => [loc.lat, loc.lng] as [number, number]));

  return (
    <MapContainer
      bounds={bounds}
      boundsOptions={{ padding: [30, 30] }}
      scrollWheelZoom
      className="h-[70vh] w-full rounded-lg border border-zinc-200 dark:border-zinc-800"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {locations.map((loc) => (
        <Marker key={loc.id} position={[loc.lat, loc.lng]} icon={pinIcon}>
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">{loc.name}</p>
              {loc.address1 && <p>{loc.address1}</p>}
              <p>
                {loc.city}, {loc.state} {loc.zip}
              </p>
              {loc.phone && <p className="mt-1">{loc.phone}</p>}
              {loc.website && (
                <a
                  href={loc.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sollos-navy underline"
                >
                  Website
                </a>
              )}
              {loc.approximate && (
                <p className="mt-1 text-xs text-zinc-500">Approximate location</p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
