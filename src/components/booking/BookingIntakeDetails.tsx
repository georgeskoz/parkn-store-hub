import { useTranslation } from "react-i18next";
import { STORAGE_CATEGORIES, STORAGE_SIZES } from "@/lib/bookingIntakeOptions";

type BookingLike = {
  category?: string | null;
  vehicle_plate?: string | null;
  vehicle_type?: string | null;
  vehicle_make?: string | null;
  vehicle_colour?: string | null;
  drivers_license?: string | null;
  license_province_state?: string | null;
  storage_items?: Record<string, number> | null;
  storage_notes?: string | null;
  storage_size?: string | null;
  dropoff_date?: string | null;
  dropoff_time?: string | null;
};

const labelFor = (t: (key: string, opts?: Record<string, unknown>) => string, k: string) =>
  t(`bookingIntake.storageCategory.${k}`, { defaultValue: STORAGE_CATEGORIES.find((c) => c.key === k)?.label || k });

const sizeLabel = (t: (key: string, opts?: Record<string, unknown>) => string, v?: string | null) =>
  v ? t(`bookingIntake.storageSize.${v}`, { defaultValue: STORAGE_SIZES.find((s) => s.value === v)?.label || v }) : "—";

export function hasBookingIntake(b: BookingLike): boolean {
  if (!b) return false;
  return Boolean(
    b.vehicle_plate ||
      b.drivers_license ||
      b.storage_size ||
      (b.storage_items && Object.keys(b.storage_items).length > 0) ||
      b.dropoff_date,
  );
}

export default function BookingIntakeDetails({
  booking,
  className,
}: {
  booking: BookingLike;
  className?: string;
}) {
  const { t } = useTranslation();
  if (!hasBookingIntake(booking)) return null;
  const isParking = booking.category === "parking" || !!booking.vehicle_plate;

  return (
    <div className={`rounded-md border bg-muted/40 p-3 text-sm space-y-2 ${className || ""}`}>
      {isParking ? (
        <>
          <p className="font-semibold text-foreground">{t("bookingIntakeDetails.vehicleAndDriver")}</p>
          <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div><span className="text-muted-foreground">{t("bookingIntakeDetails.plate")}:</span> {booking.vehicle_plate || "—"}</div>
            <div><span className="text-muted-foreground">{t("bookingIntakeDetails.type")}:</span> {booking.vehicle_type || "—"}</div>
            <div><span className="text-muted-foreground">{t("bookingIntakeDetails.make")}:</span> {booking.vehicle_make || "—"}</div>
            <div><span className="text-muted-foreground">{t("bookingIntakeDetails.colour")}:</span> {booking.vehicle_colour || "—"}</div>
            <div><span className="text-muted-foreground">{t("bookingIntakeDetails.driversLicence")}:</span> {booking.drivers_license || "—"}</div>
            <div><span className="text-muted-foreground">{t("bookingIntakeDetails.issuedBy")}:</span> {booking.license_province_state || "—"}</div>
          </div>
        </>
      ) : (
        <>
          <p className="font-semibold text-foreground">{t("bookingIntakeDetails.storageManifest")}</p>
          {booking.storage_items && (
            <ul className="text-xs space-y-0.5">
              {Object.entries(booking.storage_items).map(([k, n]) => (
                <li key={k}>
                  <span className="text-muted-foreground">{labelFor(t, k)}:</span> {n}
                </li>
              ))}
            </ul>
          )}
          <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-xs pt-1">
            <div><span className="text-muted-foreground">{t("bookingIntakeDetails.size")}:</span> {sizeLabel(t, booking.storage_size)}</div>
            <div>
              <span className="text-muted-foreground">{t("bookingIntakeDetails.dropoff")}:</span>{" "}
              {booking.dropoff_date || "—"} {booking.dropoff_time || ""}
            </div>
          </div>
          {booking.storage_notes && (
            <p className="text-xs pt-1"><span className="text-muted-foreground">{t("bookingIntakeDetails.notes")}:</span> {booking.storage_notes}</p>
          )}
        </>
      )}
    </div>
  );
}
