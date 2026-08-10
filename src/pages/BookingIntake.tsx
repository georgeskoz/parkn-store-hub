import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ArrowRight, SearchX } from "lucide-react";
import {
  VEHICLE_TYPES,
  VEHICLE_MAKES,
  VEHICLE_COLOURS,
  STORAGE_CATEGORIES,
  STORAGE_SIZES,
  buildTimeSlots,
  getVehicleTypeLabel,
  getVehicleColourLabel,
  getProvinceStateGroups,
} from "@/lib/bookingIntakeOptions";
import { getIntlLocale } from "@/lib/dateLocale";
import {
  validatePlate,
  validateDriversLicense,
  requireSelect,
} from "@/lib/validators";

type IncomingState = {
  listingType: string;
  listingId: string;
  title: string;
  address: string;
  startDate: string;
  endDate: string;
  rate: string;
  unitPrice: number;
  units: number;
  subtotal: number;
  gst: number;
  qst: number;
  total: number;
};

const TIMES = buildTimeSlots(30);

export default function BookingIntake() {
  const { t } = useTranslation();
  const { state } = useLocation() as { state: IncomingState | null };
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const provinceStateGroups = useMemo(() => getProvinceStateGroups(t), [t]);

  const isParking = state?.listingType === "parking";
  const isStorage = state?.listingType === "storage";

  // Parking form
  const [plate, setPlate] = useState("");
  const [vType, setVType] = useState("");
  const [vMake, setVMake] = useState("");
  const [vMakeOther, setVMakeOther] = useState("");
  const [vColour, setVColour] = useState("");
  const [dl, setDl] = useState("");
  const [licProv, setLicProv] = useState("");

  // Storage form
  const initialCounts: Record<string, number> = useMemo(
    () => Object.fromEntries(STORAGE_CATEGORIES.map((c) => [c.key, 0])),
    [],
  );
  const [counts, setCounts] = useState<Record<string, number>>(initialCounts);
  const [notes, setNotes] = useState("");
  const [size, setSize] = useState("");
  const [dropoffDate, setDropoffDate] = useState("");
  const [dropoffTime, setDropoffTime] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (loading) return;
    if (!user) {
      if (state) {
        try {
          sessionStorage.setItem(
            "pendingBookingState",
            JSON.stringify({ target: "/booking/intake", state }),
          );
        } catch {}
      }
      navigate(`/auth?redirect=${encodeURIComponent("/booking/intake")}`, { replace: true });
    }
  }, [user, loading, state, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }


  if (!state) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16 container mx-auto px-4 max-w-xl text-center">
          <SearchX className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold">{t("bookingIntake.noBookingInProgress")}</h1>
          <p className="text-muted-foreground mt-2">{t("bookingIntake.pickASpotFirst")}</p>
          <Button asChild className="mt-6"><Link to="/find">{t("search.findASpotTitle")}</Link></Button>
        </main>
        <Footer />
      </div>
    );
  }

  const bookingStart = state.startDate.slice(0, 10);
  const bookingEnd = state.endDate.slice(0, 10);

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (isParking) {
      const ep = validatePlate(plate); if (ep) e.plate = ep;
      const et = requireSelect(vType, t("bookingIntake.field.vehicleType")); if (et) e.vType = et;
      const em = requireSelect(vMake, t("bookingIntake.field.vehicleMake")); if (em) e.vMake = em;
      if (vMake === "Other" && !vMakeOther.trim()) e.vMakeOther = t("bookingIntake.specifyTheMake");
      const ec = requireSelect(vColour, t("bookingIntake.field.vehicleColour")); if (ec) e.vColour = ec;
      const ed = validateDriversLicense(dl); if (ed) e.dl = ed;
      const el = requireSelect(licProv, t("bookingIntake.field.issuingProvinceState")); if (el) e.licProv = el;
    } else if (isStorage) {
      const totalItems = Object.values(counts).reduce((a, b) => a + (Number(b) || 0), 0);
      if (totalItems <= 0) e.counts = t("bookingIntake.addAtLeastOneItem");
      const es = requireSelect(size, t("bookingIntake.field.estimatedTotalSize")); if (es) e.size = es;
      if (!dropoffDate) e.dropoffDate = t("bookingIntake.dropoffDateRequired");
      else if (dropoffDate < bookingStart || dropoffDate > bookingEnd)
        e.dropoffDate = t("bookingIntake.dropoffDateRange", { start: bookingStart, end: bookingEnd });
      if (!dropoffTime) e.dropoffTime = t("bookingIntake.dropoffTimeRequired");
      if (notes.length > 500) e.notes = t("bookingIntake.max500Characters");
    }
    return e;
  };

  const liveErrors = validate();
  const isValid = Object.keys(liveErrors).length === 0;

  const showError = (key: string) => (touched[key] || errors[key]) && liveErrors[key];
  const markTouched = (key: string) => setTouched((p) => ({ ...p, [key]: true }));

  const handleContinue = () => {
    const e = validate();
    setErrors(e);
    setTouched(Object.fromEntries(Object.keys(e).map((k) => [k, true])));
    if (Object.keys(e).length > 0) return;

    const intake = isParking
      ? {
          kind: "parking" as const,
          vehicle_plate: plate.trim().toUpperCase(),
          vehicle_type: vType,
          vehicle_make: vMake === "Other" ? `Other: ${vMakeOther.trim()}` : vMake,
          vehicle_colour: vColour,
          drivers_license: dl.trim(),
          license_province_state: licProv,
        }
      : isStorage
      ? {
          kind: "storage" as const,
          storage_items: Object.fromEntries(
            Object.entries(counts).filter(([, n]) => Number(n) > 0),
          ),
          storage_notes: notes.trim(),
          storage_size: size,
          dropoff_date: dropoffDate,
          dropoff_time: dropoffTime,
        }
      : { kind: "none" as const };

    navigate("/booking/confirm", { state: { ...state, intake } });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16 container mx-auto px-4 max-w-2xl">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-1" /> {t("common.back")}
        </Button>

        <h1 className="text-2xl font-bold mb-1">
          {isParking ? t("bookingIntake.vehicleAndDriverDetails") : t("bookingIntake.whatAreYouStoring")}
        </h1>
        <p className="text-muted-foreground mb-6">
          {isParking
            ? t("bookingIntake.parkingIntakeSubtitle")
            : t("bookingIntake.storageIntakeSubtitle")}
        </p>

        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-lg">{state.title}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {new Date(state.startDate).toLocaleString(getIntlLocale())} → {new Date(state.endDate).toLocaleString(getIntlLocale())}
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            {isParking && (
              <>
                <div>
                  <Label htmlFor="plate">{t("bookingIntake.licensePlateNumber")}</Label>
                  <Input
                    id="plate"
                    value={plate}
                    onChange={(e) => setPlate(e.target.value.toUpperCase().slice(0, 8))}
                    onBlur={() => markTouched("plate")}
                    className={showError("plate") ? "border-destructive" : ""}
                    placeholder="ABC1234"
                    maxLength={8}
                  />
                  {showError("plate") && <p className="text-xs text-destructive mt-1">{liveErrors.plate}</p>}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label>{t("bookingIntake.field.vehicleType")} *</Label>
                    <Select value={vType} onValueChange={(v) => { setVType(v); markTouched("vType"); }}>
                      <SelectTrigger className={showError("vType") ? "border-destructive" : ""}>
                        <SelectValue placeholder={t("bookingIntake.selectPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {VEHICLE_TYPES.map((vt) => <SelectItem key={vt} value={vt}>{getVehicleTypeLabel(t, vt)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {showError("vType") && <p className="text-xs text-destructive mt-1">{liveErrors.vType}</p>}
                  </div>

                  <div>
                    <Label>{t("bookingIntake.field.vehicleColour")} *</Label>
                    <Select value={vColour} onValueChange={(v) => { setVColour(v); markTouched("vColour"); }}>
                      <SelectTrigger className={showError("vColour") ? "border-destructive" : ""}>
                        <SelectValue placeholder={t("bookingIntake.selectPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {VEHICLE_COLOURS.map((vc) => <SelectItem key={vc} value={vc}>{getVehicleColourLabel(t, vc)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {showError("vColour") && <p className="text-xs text-destructive mt-1">{liveErrors.vColour}</p>}
                  </div>
                </div>

                <div>
                  <Label>{t("bookingIntake.vehicleMakeBrand")} *</Label>
                  <Select value={vMake} onValueChange={(v) => { setVMake(v); markTouched("vMake"); }}>
                    <SelectTrigger className={showError("vMake") ? "border-destructive" : ""}>
                      <SelectValue placeholder={t("bookingIntake.selectPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {VEHICLE_MAKES.map((mk) => <SelectItem key={mk} value={mk}>{mk === "Other" ? t("common.other") : mk}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {showError("vMake") && <p className="text-xs text-destructive mt-1">{liveErrors.vMake}</p>}
                  {vMake === "Other" && (
                    <>
                      <Input
                        className={`mt-2 ${showError("vMakeOther") ? "border-destructive" : ""}`}
                        placeholder={t("bookingIntake.specifyMake")}
                        value={vMakeOther}
                        onChange={(e) => setVMakeOther(e.target.value)}
                        onBlur={() => markTouched("vMakeOther")}
                      />
                      {showError("vMakeOther") && (
                        <p className="text-xs text-destructive mt-1">{liveErrors.vMakeOther}</p>
                      )}
                    </>
                  )}
                </div>

                <div className="border-t pt-5">
                  <h2 className="font-semibold mb-3">{t("bookingIntake.driverInformation")}</h2>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="dl">{t("bookingIntake.driversLicenseNumber")}</Label>
                      <Input
                        id="dl"
                        value={dl}
                        onChange={(e) => setDl(e.target.value.slice(0, 20))}
                        onBlur={() => markTouched("dl")}
                        className={showError("dl") ? "border-destructive" : ""}
                        placeholder="ABCD1234567"
                      />
                      {showError("dl") && <p className="text-xs text-destructive mt-1">{liveErrors.dl}</p>}
                    </div>
                    <div>
                      <Label>{t("bookingIntake.field.issuingProvinceState")} *</Label>
                      <Select value={licProv} onValueChange={(v) => { setLicProv(v); markTouched("licProv"); }}>
                        <SelectTrigger className={showError("licProv") ? "border-destructive" : ""}>
                          <SelectValue placeholder={t("bookingIntake.selectPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          {provinceStateGroups.map((g) => (
                            <SelectGroup key={g.label}>
                              <SelectLabel>{g.label}</SelectLabel>
                              {g.options.map((o) => (
                                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                              ))}
                            </SelectGroup>
                          ))}
                        </SelectContent>
                      </Select>
                      {showError("licProv") && <p className="text-xs text-destructive mt-1">{liveErrors.licProv}</p>}
                    </div>
                  </div>
                </div>
              </>
            )}

            {isStorage && (
              <>
                <div>
                  <Label className="mb-2 block">{t("bookingIntake.itemCategoriesAndQuantities")} *</Label>
                  <div className="space-y-2">
                    {STORAGE_CATEGORIES.map((c) => (
                      <div key={c.key} className="flex items-center justify-between gap-3">
                        <span className="text-sm flex-1">{t(`bookingIntake.storageCategory.${c.key}`, { defaultValue: c.label })}</span>
                        <Input
                          type="number"
                          min={0}
                          max={999}
                          className="w-24"
                          value={counts[c.key] || 0}
                          onChange={(e) =>
                            setCounts((p) => ({
                              ...p,
                              [c.key]: Math.max(0, parseInt(e.target.value) || 0),
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                  {showError("counts") && <p className="text-xs text-destructive mt-1">{liveErrors.counts}</p>}
                </div>

                <div>
                  <Label htmlFor="notes">{t("bookingIntake.notesOptional")}</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value.slice(0, 500))}
                    placeholder={t("bookingIntake.notesPlaceholder")}
                    rows={4}
                    className={showError("notes") ? "border-destructive" : ""}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{notes.length}/500</p>
                  {showError("notes") && <p className="text-xs text-destructive mt-1">{liveErrors.notes}</p>}
                </div>

                <div>
                  <Label>{t("bookingIntake.field.estimatedTotalSize")} *</Label>
                  <Select value={size} onValueChange={(v) => { setSize(v); markTouched("size"); }}>
                    <SelectTrigger className={showError("size") ? "border-destructive" : ""}>
                      <SelectValue placeholder={t("bookingIntake.selectPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {STORAGE_SIZES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{t(`bookingIntake.storageSize.${s.value}`, { defaultValue: s.label })}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {showError("size") && <p className="text-xs text-destructive mt-1">{liveErrors.size}</p>}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dropoffDate">{t("bookingIntake.preferredDropoffDate")} *</Label>
                    <Input
                      id="dropoffDate"
                      type="date"
                      value={dropoffDate}
                      min={bookingStart}
                      max={bookingEnd}
                      onChange={(e) => setDropoffDate(e.target.value)}
                      onBlur={() => markTouched("dropoffDate")}
                      className={showError("dropoffDate") ? "border-destructive" : ""}
                    />
                    {showError("dropoffDate") && (
                      <p className="text-xs text-destructive mt-1">{liveErrors.dropoffDate}</p>
                    )}
                  </div>
                  <div>
                    <Label>{t("bookingIntake.preferredDropoffTime")} *</Label>
                    <Select
                      value={dropoffTime}
                      onValueChange={(v) => { setDropoffTime(v); markTouched("dropoffTime"); }}
                    >
                      <SelectTrigger className={showError("dropoffTime") ? "border-destructive" : ""}>
                        <SelectValue placeholder={t("bookingIntake.selectPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {TIMES.map((time) => <SelectItem key={time} value={time}>{time}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {showError("dropoffTime") && (
                      <p className="text-xs text-destructive mt-1">{liveErrors.dropoffTime}</p>
                    )}
                  </div>
                </div>
              </>
            )}

            {!isParking && !isStorage && (
              <p className="text-sm text-muted-foreground">
                {t("bookingIntake.noAdditionalInfoRequired")}
              </p>
            )}

            <Button
              className="w-full"
              size="lg"
              onClick={handleContinue}
              disabled={(isParking || isStorage) && !isValid}
            >
              {t("bookingIntake.continueToPayment")} <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
