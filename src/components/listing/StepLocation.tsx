import { useEffect, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";
import type { ListingFormData } from "./ListingFormTypes";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Props {
  form: ListingFormData;
  update: (key: string, value: any) => void;
}

export default function StepLocation({ form, update }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current).setView(
      [form.lat ?? 45.5017, form.lng ?? -73.5673],
      form.lat ? 16 : 5
    );

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    }).addTo(map);

    const icon = L.icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
    });

    if (form.lat && form.lng) {
      markerRef.current = L.marker([form.lat, form.lng], { draggable: true, icon }).addTo(map);
      markerRef.current.on("dragend", () => {
        const pos = markerRef.current!.getLatLng();
        update("lat", pos.lat);
        update("lng", pos.lng);
      });
    }

    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      update("lat", lat);
      update("lng", lng);
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], { draggable: true, icon }).addTo(map);
        markerRef.current.on("dragend", () => {
          const pos = markerRef.current!.getLatLng();
          update("lat", pos.lat);
          update("lng", pos.lng);
        });
      }
    });

    mapInstance.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapInstance.current = null;
      markerRef.current = null;
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-primary mb-2">
        <MapPin className="w-5 h-5" />
        <span className="font-semibold text-foreground">Location & Address</span>
      </div>

      <div>
        <Label>Listing Title</Label>
        <Input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="e.g. Downtown Heated Garage" />
      </div>

      <div>
        <Label>Street Address</Label>
        <Input value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="123 Rue Example" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Unit / Suite (optional)</Label>
          <Input value={form.unit} onChange={(e) => update("unit", e.target.value)} placeholder="Apt 4B" />
        </div>
        <div>
          <Label>Postal / Zip Code</Label>
          <Input value={form.postalCode} onChange={(e) => update("postalCode", e.target.value)} placeholder="H2X 1Y4" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>City</Label>
          <Input value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Montreal" />
        </div>
        <div>
          <Label>Region / Neighbourhood</Label>
          <Input value={form.region} onChange={(e) => update("region", e.target.value)} placeholder="Downtown" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Province / State</Label>
          <Input value={form.province} onChange={(e) => update("province", e.target.value)} placeholder="Quebec" />
        </div>
        <div>
          <Label>Country</Label>
          <Input value={form.country} onChange={(e) => update("country", e.target.value)} placeholder="Canada" />
        </div>
      </div>

      {/* Map */}
      <div>
        <Label className="mb-1 block">Pin Your Exact Location</Label>
        <p className="text-xs text-muted-foreground mb-2">Click on the map or drag the pin to set the exact spot.</p>
        <div ref={mapRef} className="h-64 rounded-lg border border-border overflow-hidden" />
        {form.lat && form.lng && (
          <p className="text-xs text-muted-foreground mt-1">
            📍 {form.lat.toFixed(5)}, {form.lng.toFixed(5)}
          </p>
        )}
      </div>
    </div>
  );
}
