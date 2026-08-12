import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import heroBg from "@/assets/hero-bg.jpg";
import { buildStaticMapUrl, projectToPixel } from "@/lib/staticMap";

// Same default as the mobile app's map view (DEFAULT_REGION in
// spotsVault-VC/mobile/src/app/(tabs)/index.tsx) — Montreal, matching this
// app's Quebec market, kept consistent across the whole product.
const CENTER = { latitude: 45.5017, longitude: -73.5673 };
const ZOOM = 15;

// Purely decorative pins — small real-world offsets around downtown
// Montreal, not tied to live listing data. Styled like the mobile app's
// own PricePin marker (rounded navy/white pill), not Google's default pin.
const DECORATIVE_PINS = [
  { latitude: 45.5017, longitude: -73.5673, price: "$8" },
  { latitude: 45.5049, longitude: -73.5731, price: "$12" },
  { latitude: 45.4985, longitude: -73.5613, price: "$6" },
  { latitude: 45.5072, longitude: -73.5589, price: "$15" },
  { latitude: 45.4958, longitude: -73.5748, price: "$9" },
];

const GOOGLE_MAPS_STATIC_KEY = import.meta.env.VITE_GOOGLE_MAPS_STATIC_KEY as string | undefined;

function PricePin({ price }: { price: string }) {
  return (
    <div className="rounded-full bg-card text-foreground border border-primary px-2.5 py-1 text-xs font-semibold shadow-md">
      {price}
    </div>
  );
}

export default function HeroMap() {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [mapFailed, setMapFailed] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let lastWidth = 0;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      // Only react to meaningful width changes — avoids re-requesting a new
      // static map image (a billed API call) on every pixel of a drag-resize.
      if (Math.abs(rect.width - lastWidth) < 150 && lastWidth !== 0) return;
      lastWidth = rect.width;
      setSize({ width: rect.width, height: rect.height });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const showMap = Boolean(GOOGLE_MAPS_STATIC_KEY) && !mapFailed && size;

  return (
    <div ref={containerRef} className="absolute inset-0">
      {showMap ? (
        <>
          <img
            src={buildStaticMapUrl({
              latitude: CENTER.latitude,
              longitude: CENTER.longitude,
              zoom: ZOOM,
              width: size.width,
              height: size.height,
              apiKey: GOOGLE_MAPS_STATIC_KEY!,
            })}
            alt={t("home.hero.imageAlt")}
            className="w-full h-full object-cover"
            onError={() => setMapFailed(true)}
          />
          {DECORATIVE_PINS.map((pin, i) => {
            const { x, y } = projectToPixel(pin, CENTER, ZOOM, size.width, size.height);
            // Skip pins that would land outside the visible frame (narrow
            // viewports show less of the map at a fixed zoom) rather than
            // letting them float in the text/gradient area.
            if (x < 24 || x > size.width - 24 || y < 24 || y > size.height - 24) return null;
            return (
              <div
                key={i}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: x, top: y }}
              >
                <PricePin price={pin.price} />
              </div>
            );
          })}
        </>
      ) : (
        <img
          src={heroBg}
          alt={t("home.hero.imageAlt")}
          className="w-full h-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 via-foreground/60 to-foreground/30" />
    </div>
  );
}
