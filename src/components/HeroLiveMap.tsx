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
//
// priceText/distanceText arrive already translated from HeroSection.tsx
// (which has the i18n `t` function; this component doesn't). They used to
// be a raw `price`/`priceLabel` pair with `priceLabel` being an untranslated
// i18n KEY like "listingCard.perHour" -- concatenated straight into the
// tooltip as literal text ("$10listingCard.perHour"), never passed through
// t(). Pre-formatting the full display string in the one place that
// already has `t` fixes that at the source instead of teaching this
// component its own i18n dependency.
//
// NOTE: this deliberately does NOT use leaflet.markercluster (unlike
// ListingsMap.tsx). The agreed scope for the homepage map is that every
// listing's price/distance is always visible directly on its pin, with no
// click or hover needed -- clustering collapses close-together pins into a
// numbered bubble and hides their individual price tags behind it, which
// directly defeats that. A prior version of this file added clustering to
// solve pin overlap, but that traded "always-visible prices" for "fewer
// overlapping pins," which isn't the tradeoff that was agreed. If overlap
// at low zoom becomes a real problem again, revisit with a design that
// doesn't hide price tags (e.g. only clustering pins that are within a
// couple of pixels of each other), not full spiderfy-style clustering.

export interface HeroMapListing {
  id: string;
  lat: number;
  lng: number;
  priceText: string;
  // Only set when a search is active -- distance from the fixed Montreal
  // default center isn't meaningful to a visitor who hasn't searched
  // anything yet, so HeroSection.tsx passes null until they have.
  distanceText?: string | null;
  category: "parking" | "storage";
  eventPricing?: boolean;
}

// Matches mobile's NAVY/NAVY_DEEP and PURPLE/PURPLE_DEEP exactly (mobile/src/
// app/(tabs)/index.tsx's PricePin, and the now-unused HeroMap.tsx's own port
// of it) -- hardcoded rather than referencing a CSS variable since the pin
// has to match the real app icon pixel-for-pixel, not just "look navy-ish".
const NAVY = "#1B4F72";
const NAVY_DEEP = "#123449";
const PURPLE = "#8B5CF6";
const PURPLE_DEEP = "#5B21B6";

// Vault-icon teardrop pin -- ported from the mobile app's PricePin
// (mobile/src/app/(tabs)/index.tsx) and HeroMap.tsx's own dead-code port of
// it (that file rendered a static Google Maps image with pins positioned in
// plain CSS; it's no longer imported anywhere, superseded by this live
// Leaflet map, but its PricePin/VaultGlyph markup is what's ported below).
// This is the actual brand mark (same ring + vault glyph as assets/spotsvault
// app icone.png), not a generic colored dot -- and, being a real pin shape
// rather than a 16px dot, it's also simply bigger and easier to see.
//
// This is still a FIXED-size icon per selected/unselected state (same as the
// dot it replaces) -- the price/distance text lives in the separately-bound
// permanent tooltip below, never inside this icon's own HTML, so the
// divIcon anchor footgun this file used to warn about (a dynamically-sized
// icon fighting Leaflet's fixed iconSize/iconAnchor math) still doesn't
// apply here.
const PIN_HEAD_SIZE = 32;
const PIN_HEAD_SIZE_SELECTED = 38;
const PIN_RING_INSET = 4;

// A rotated square (border-radius on 3 corners, square 4th corner, then
// rotated 45deg) doesn't change the element's own layout box -- only its
// visual pixels. A square rotated 45deg around its center puts its lowest
// visual corner HEAD/sqrt(2) below center, i.e. HEAD*(sqrt(2)-1)/2 below the
// *unrotated* box's own bottom edge. This computes that overshoot so the
// icon's real height (and therefore its Leaflet iconAnchor) reaches all the
// way to the visual tip, matching mobile's PricePin/PIN_TOTAL_HEIGHT math
// exactly -- otherwise the marker's coordinate lands ~7px above where the
// pin actually points.
function pinTotalHeight(headSize: number): number {
  return headSize + Math.round((headSize * (Math.SQRT2 - 1)) / 2);
}

// Simplified vault/safe glyph -- hinge bar, door panel, dial with connecting
// stub, and two corner crop-marks from the real app icon, redrawn thin
// enough to survive at this marker size. Identical path data to mobile's
// VaultGlyph and HeroMap.tsx's own port of it -- plain SVG markup (not JSX),
// since this whole icon has to be a string for Leaflet's L.divIcon.
const VAULT_GLYPH_SVG = `
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <line x1="5.5" y1="5" x2="5.5" y2="19" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round"/>
    <rect x="8" y="5" width="11" height="14" rx="1.5" stroke="#FFFFFF" stroke-width="1.8"/>
    <line x1="5.5" y1="12" x2="9.5" y2="12" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round"/>
    <circle cx="12.5" cy="12" r="2.2" stroke="#FFFFFF" stroke-width="1.8"/>
    <path d="M15.5 7h2v2" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M17.5 15v2h-2" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`;

function dotIcon(listing: HeroMapListing, selected: boolean) {
  const colors = listing.category === "storage" ? { pin: PURPLE, ring: PURPLE_DEEP } : { pin: NAVY, ring: NAVY_DEEP };
  const headSize = selected ? PIN_HEAD_SIZE_SELECTED : PIN_HEAD_SIZE;
  const totalHeight = pinTotalHeight(headSize);
  const ringSize = headSize - PIN_RING_INSET * 2;
  const html = `
    <div style="width:${headSize}px;height:${totalHeight}px;">
      <div style="
        width:${headSize}px;height:${headSize}px;
        border-top-left-radius:${headSize / 2}px;
        border-top-right-radius:${headSize / 2}px;
        border-bottom-left-radius:${headSize / 2}px;
        border-bottom-right-radius:0;
        background:${colors.pin};
        border:2px solid #FFFFFF;
        transform:rotate(45deg);
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 1px 4px rgba(0,0,0,0.4)${selected ? ", 0 0 0 3px rgba(0,0,0,0.12)" : ""};
        cursor:pointer;
      ">
        <div style="
          width:${ringSize}px;height:${ringSize}px;
          border-radius:50%;
          background:${colors.ring};
          display:flex;align-items:center;justify-content:center;
          transform:rotate(-45deg);
        ">
          ${VAULT_GLYPH_SVG}
        </div>
      </div>
    </div>
  `;
  return L.divIcon({
    html,
    className: "",
    iconSize: [headSize, totalHeight],
    // Bottom-center, not center -- the visual tip (see pinTotalHeight above)
    // has to land exactly on the marker's coordinate, matching mobile's
    // Marker anchor={x:0.5,y:1} for the same teardrop shape.
    iconAnchor: [headSize / 2, totalHeight],
  });
}

// Distance from the icon's anchor (now the pin's tip, at the bottom) up to
// where the price tooltip should float -- past the whole pin body plus a
// small gap, using the *unselected* height so the tooltip doesn't jump up
// and down as a pin is selected/deselected.
const TOOLTIP_OFFSET_Y = -(pinTotalHeight(PIN_HEAD_SIZE) + 4);

function tooltipLabel(listing: HeroMapListing) {
  const parts = [listing.priceText];
  if (listing.distanceText) parts.push(listing.distanceText);
  return `${parts.join(" · ")}${listing.eventPricing ? " ⚡" : ""}`;
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

  // Recenter AND re-zoom whenever the searched place or radius changes.
  //
  // Previously this only called flyTo(center, zoom) with `zoom` pinned at
  // the fixed default (12) forever -- picking a 1km vs a 50km radius never
  // changed what the camera actually showed, only the (barely visible)
  // circle outline underneath it. That's what made "zooming in" feel
  // impossible: the radius control was disconnected from the actual view.
  // ListingsMap.tsx (the /find results map) already does this right via
  // fitBounds() -- this mirrors that, using Leaflet's LatLng.toBounds()
  // (a box of the given diameter in meters, centered on the point) so the
  // camera always fits the exact circle the radius control is showing.
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    if (radiusKm && radiusKm > 0) {
      const bounds = L.latLng(center.lat, center.lng).toBounds(radiusKm * 2 * 1000);
      map.flyToBounds(bounds, { duration: 0.6, padding: [24, 24] });
    } else {
      map.flyTo([center.lat, center.lng], zoom, { duration: 0.6 });
    }
  }, [center.lat, center.lng, radiusKm, zoom]);

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

  // Markers -- added straight to the map (no clustering, see the note at
  // the top of this file), so every pin's permanent price tooltip is
  // always visible, exactly as agreed.
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
        const marker = L.marker([l.lat, l.lng], { icon: dotIcon(l, selected) }).bindTooltip(tooltipLabel(l), {
          permanent: true,
          direction: "top",
          offset: [0, TOOLTIP_OFFSET_Y],
          className: "hero-map-price-tooltip",
        });
        marker.on("click", (e) => {
          L.DomEvent.stopPropagation(e as unknown as Event);
          onMarkerClick?.(l.id);
        });
        marker.addTo(map);
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
