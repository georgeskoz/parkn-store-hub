import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Same Leaflet/OpenStreetMap stack as ListingsMap.tsx (the /parking and
// /find results map) — this is the homepage's equivalent, but it never
// hands off to a Leaflet-native popup like that one does. Every marker
// click here reports back to HeroSection.tsx (onMarkerClick) so the
// preview lives in React state as an overlay card, matching the mobile
// app's bottom-sheet-over-the-map pattern instead of navigating or
// opening a native map popup.

export interface HeroMapListing {
  id: string;
  lat: number;
  lng: number;
  price: number | null;
  priceLabel: string;
  category: "parking" | "storage";
  eventPricing?: boolean;
}

const NAVY = "#1B4F72";
const NAVY_DEEP = "#123449";
const PURPLE = "#8B5CF6";
const PURPLE_DEEP = "#5B21B6";

// A fixed-size dot, not a dynamic-width price tag -- the price itself is a
// permanent Leaflet tooltip (bound below), which Leaflet positions and
// centers on its own regardless of the text's rendered width. A divIcon
// whose anchor has to match dynamically-sized HTML content (a price
// string of varying length) is a real, easy-to-get-wrong footgun --
// Leaflet's default iconSize/iconAnchor math assumes a fixed box, so a
// percentage-based CSS transform inside it ends up centered against that
// fixed box, not the actual visible content. Keeping the icon itself
// fixed-size sidesteps that entirely.
const DOT_SIZE = 16;

function dotIcon(listing: HeroMapListing, selected: boolean) {
  const colors = listing.category === "storage" ? { pin: PURPLE, ring: PURPLE_DEEP } : { pin: NAVY, ring: NAVY_DEEP };
  const size = selected ? DOT_SIZE + 6 : DOT_SIZE;
  return L.divIcon({
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${colors.pin};
      border:2px solid ${selected ? "#fff" : colors.ring};
      border-radius:50%;
      box-shadow:0 1px 4px rgba(0,0,0,0.4);
      cursor:pointer;
    "></div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function tooltipLabel(listing: HeroMapListing) {
  const price = listing.price != null ? `$${listing.price}${listing.priceLabel}` : "—";
  return `${price}${listing.eventPricing ? " ⚡" : ""}`;
}

interface Props {
  center: { lat: number; lng: number };
  zoom?: number;
  radiusKm?: number | null;
  listings: HeroMapListing[];
  selectedId?: string | null;
  onMarkerClick?: (id: string) => void;
  onBackgroundClick?: () => void;
  className?: string;
}

export default function HeroLiveMap({
  center,
  zoom = 12,
  radiusKm,
  listings,
  selectedId,
  onMarkerClick,
  onBackgroundClick,
  className,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const circleRef = useRef<L.Circle | null>(null);

  // Init once.
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const map = L.map(mapRef.current, { zoomControl: true }).setView([center.lat, center.lng], zoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    map.on("click", () => onBackgroundClick?.());
    mapInstance.current = map;
    return () => {
      map.remove();
      mapInstance.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recenter when the searched place changes.
  useEffect(() => {
    mapInstance.current?.flyTo([center.lat, center.lng], zoom, { duration: 0.6 });
  }, [center.lat, center.lng, zoom]);

  // Radius circle.
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    if (circleRef.current) {
      map.removeLayer(circleRef.current);
      circleRef.current = null;
    }
    if (radiusKm && radiusKm > 0) {
      circleRef.current = L.circle([center.lat, center.lng], {
        radius: radiusKm * 1000,
        color: NAVY,
        weight: 1,
        fillColor: NAVY,
        fillOpacity: 0.05,
      }).addTo(map);
    }
  }, [center.lat, center.lng, radiusKm]);

  // Markers.
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    const seen = new Set<string>();
    listings.forEach((l) => {
      if (!isFinite(l.lat) || !isFinite(l.lng)) return;
      seen.add(l.id);
      const selected = l.id === selectedId;
      const existing = markersRef.current.get(l.id);
      if (existing) {
        existing.setLatLng([l.lat, l.lng]);
        existing.setIcon(dotIcon(l, selected));
        existing.setZIndexOffset(selected ? 1000 : 0);
        existing.setTooltipContent(tooltipLabel(l));
      } else {
        const marker = L.marker([l.lat, l.lng], { icon: dotIcon(l, selected) })
          .addTo(map)
          .bindTooltip(tooltipLabel(l), {
            permanent: true,
            direction: "top",
            offset: [0, -DOT_SIZE / 2 - 2],
            className: "hero-map-price-tooltip",
          });
        marker.on("click", (e) => {
          L.DomEvent.stopPropagation(e as unknown as Event);
          onMarkerClick?.(l.id);
        });
        markersRef.current.set(l.id, marker);
      }
    });

    // Remove markers for listings no longer in range.
    for (const [id, marker] of markersRef.current) {
      if (!seen.has(id)) {
        map.removeLayer(marker);
        markersRef.current.delete(id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listings, selectedId]);

  return <div ref={mapRef} className={className ?? "w-full h-full"} />;
}
