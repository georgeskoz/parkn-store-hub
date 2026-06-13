import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
// @ts-ignore - MarkerClusterGroup is added to L namespace
import "leaflet.markercluster";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface DbListing {
  id: string;
  title: string;
  city: string;
  region: string | null;
  category: string;
  lat: number | string;
  lng: number | string;
  hourly: number | null;
  daily: number | null;
  monthly: number | null;
}

export default function ListingsMap({ listings }: { listings: DbListing[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const clusterRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    mapInstance.current = L.map(mapRef.current).setView([46.0, -73.0], 6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapInstance.current);
    clusterRef.current = (L as any).markerClusterGroup();
    mapInstance.current.addLayer(clusterRef.current);

    return () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, []);

  useEffect(() => {
    if (!clusterRef.current) return;
    clusterRef.current.clearLayers();
    listings.forEach((l) => {
      const lat = Number(l.lat);
      const lng = Number(l.lng);
      if (!isFinite(lat) || !isFinite(lng)) return;
      const price = l.monthly || l.daily || l.hourly;
      const label = l.monthly ? "/mo" : l.daily ? "/day" : l.hourly ? "/hr" : "";
      const marker = L.marker([lat, lng]).bindPopup(
        `<strong>${l.title}</strong><br/>${price ? `$${price}${label}` : "Contact for pricing"}<br/><a href="/listing/${l.id}" style="font-size:12px;color:#0d9488">View listing →</a>`
      );
      clusterRef.current!.addLayer(marker);
    });
    const valid = listings.filter((l) => isFinite(Number(l.lat)) && isFinite(Number(l.lng)));
    if (valid.length > 0 && mapInstance.current) {
      const bounds = L.latLngBounds(valid.map((l) => [Number(l.lat), Number(l.lng)] as [number, number]));
      mapInstance.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [listings]);

  return <div ref={mapRef} className="w-full h-full" />;
}
