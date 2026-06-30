import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
  PROVINCE_STATE_GROUPS,
  STORAGE_CATEGORIES,
  STORAGE_SIZES,
  buildTimeSlots,
} from "@/lib/bookingIntakeOptions";
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
  const { state } = useLocation() as { state: IncomingState | null };
  const navigate = useNavigate();

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

  if (!state) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16 container mx-auto px-4 max-w-xl text-center">
          <SearchX className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold">No booking in progress</h1>
          <p className="text-muted-foreground mt-2">Pick a spot first to continue.</p>
          <Button asChild className="mt-6"><Link to="/find">Find a Spot</Link></Button>
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
      const et = requireSelect(vType, "Vehicle type"); if (et) e.vType = et;
      const em = requireSelect(vMake, "Vehicle make"); if (em) e.vMake = em;
      if (vMake === "Other" && !vMakeOther.trim()) e.vMakeOther = "Specify the make";
      const ec = requireSelect(vColour, "Vehicle colour"); if (ec) e.vColour = ec;
      const ed = validateDriversLicense(dl); if (ed) e.dl = ed;
      const el = requireSelect(licProv, "Issuing province/state"); if (el) e.licProv = el;
    } else if (isStorage) {
      const totalItems = Object.values(counts).reduce((a, b) => a + (Number(b) || 0), 0);
      if (totalItems <= 0) e.counts = "Add at least one item";
      const es = requireSelect(size, "Estimated total size"); if (es) e.size = es;
      if (!dropoffDate) e.dropoffDate = "Drop-off date is required";
      else if (dropoffDate < bookingStart || dropoffDate > bookingEnd)
        e.dropoffDate = `Must be between ${bookingStart} and ${bookingEnd}`;
      if (!dropoffTime) e.dropoffTime = "Drop-off time is required";
      if (notes.length > 500) e.notes = "Max 500 characters";
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
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>

        <h1 className="text-2xl font-bold mb-1">
          {isParking ? "Vehicle & Driver Details" : "What are you storing?"}
        </h1>
        <p className="text-muted-foreground mb-6">
          {isParking
            ? "We share this with the host so they can identify your vehicle on arrival."
            : "Help the host prepare the right space and access for your drop-off."}
        </p>

        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-lg">{state.title}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {new Date(state.startDate).toLocaleString()} → {new Date(state.endDate).toLocaleString()}
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            {isParking && (
              <>
                <div>
                  <Label htmlFor="plate">License Plate Number *</Label>
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
                    <Label>Vehicle Type *</Label>
                    <Select value={vType} onValueChange={(v) => { setVType(v); markTouched("vType"); }}>
                      <SelectTrigger className={showError("vType") ? "border-destructive" : ""}>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {VEHICLE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {showError("vType") && <p className="text-xs text-destructive mt-1">{liveErrors.vType}</p>}
                  </div>

                  <div>
                    <Label>Vehicle Colour *</Label>
                    <Select value={vColour} onValueChange={(v) => { setVColour(v); markTouched("vColour"); }}>
                      <SelectTrigger className={showError("vColour") ? "border-destructive" : ""}>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {VEHICLE_COLOURS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {showError("vColour") && <p className="text-xs text-destructive mt-1">{liveErrors.vColour}</p>}
                  </div>
                </div>

                <div>
                  <Label>Vehicle Make / Brand *</Label>
                  <Select value={vMake} onValueChange={(v) => { setVMake(v); markTouched("vMake"); }}>
                    <SelectTrigger className={showError("vMake") ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {VEHICLE_MAKES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {showError("vMake") && <p className="text-xs text-destructive mt-1">{liveErrors.vMake}</p>}
                  {vMake === "Other" && (
                    <>
                      <Input
                        className={`mt-2 ${showError("vMakeOther") ? "border-destructive" : ""}`}
                        placeholder="Specify make"
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
                  <h2 className="font-semibold mb-3">Driver Information</h2>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="dl">Driver's License Number *</Label>
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
                      <Label>License Issuing Province / State *</Label>
                      <Select value={licProv} onValueChange={(v) => { setLicProv(v); markTouched("licProv"); }}>
                        <SelectTrigger className={showError("licProv") ? "border-destructive" : ""}>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          {PROVINCE_STATE_GROUPS.map((g) => (
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
                  <Label className="mb-2 block">Item categories &amp; quantities *</Label>
                  <div className="space-y-2">
                    {STORAGE_CATEGORIES.map((c) => (
                      <div key={c.key} className="flex items-center justify-between gap-3">
                        <span className="text-sm flex-1">{c.label}</span>
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
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value.slice(0, 500))}
                    placeholder="e.g. fragile items, special handling, access requirements, drop-off time preference"
                    rows={4}
                    className={showError("notes") ? "border-destructive" : ""}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{notes.length}/500</p>
                  {showError("notes") && <p className="text-xs text-destructive mt-1">{liveErrors.notes}</p>}
                </div>

                <div>
                  <Label>Estimated total size *</Label>
                  <Select value={size} onValueChange={(v) => { setSize(v); markTouched("size"); }}>
                    <SelectTrigger className={showError("size") ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {STORAGE_SIZES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {showError("size") && <p className="text-xs text-destructive mt-1">{liveErrors.size}</p>}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dropoffDate">Preferred drop-off date *</Label>
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
                    <Label>Preferred drop-off time *</Label>
                    <Select
                      value={dropoffTime}
                      onValueChange={(v) => { setDropoffTime(v); markTouched("dropoffTime"); }}
                    >
                      <SelectTrigger className={showError("dropoffTime") ? "border-destructive" : ""}>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {TIMES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
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
                No additional info required for this booking.
              </p>
            )}

            <Button
              className="w-full"
              size="lg"
              onClick={handleContinue}
              disabled={(isParking || isStorage) && !isValid}
            >
              Continue to Payment <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
