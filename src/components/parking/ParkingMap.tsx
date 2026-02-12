import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import type { ParkingListing } from "@/data/parkingListings";

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface ParkingMapProps {
  listings: ParkingListing[];
  pricingMode: "hourly" | "daily" | "monthly";
}

export default function ParkingMap({ listings, pricingMode }: ParkingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    mapInstance.current = L.map(mapRef.current).setView([46.0, -73.0], 7);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapInstance.current);
    clusterRef.current = L.markerClusterGroup();
    mapInstance.current.addLayer(clusterRef.current);

    return () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, []);

  useEffect(() => {
    if (!clusterRef.current) return;
    clusterRef.current.clearLayers();
    const label = pricingMode === "hourly" ? "/hr" : pricingMode === "daily" ? "/day" : "/mo";
    listings.forEach((l) => {
      const marker = L.marker([l.location.lat, l.location.lng]).bindPopup(
        `<strong>${l.title}</strong><br/>$${l.pricing[pricingMode]}${label}<br/><span style="font-size:11px">${l.location.region}, ${l.location.city}</span>`
      );
      clusterRef.current!.addLayer(marker);
    });
    if (listings.length > 0) {
      const bounds = L.latLngBounds(listings.map((l) => [l.location.lat, l.location.lng]));
      mapInstance.current?.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [listings, pricingMode]);

  return <div ref={mapRef} className="w-full h-full rounded-xl" />;
}
