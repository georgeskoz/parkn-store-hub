import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { getIntlLocale } from "@/lib/dateLocale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Row = {
  id: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  refund_amount: number | null;
  refund_status: string | null;
  cancelled_at: string | null;
  category: string | null;
  city: string | null;
};

const ProviderCancelledBookings = ({ userId }: { userId: string }) => {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase
        .from("bookings")
        .select(
          "id,start_date,end_date,total_amount,refund_amount,refund_status,cancelled_at,category,city",
        )
        // provider_id doesn't exist on this table in production -- host_id
        // is the real column (verified directly).
        .eq("host_id", userId)
        .eq("status", "cancelled")
        .order("cancelled_at", { ascending: false });
      setRows((data || []) as Row[]);
    })();
  }, [userId]);

  if (rows.length === 0) return null;

  return (
    <Card className="card-shadow">
      <CardHeader>
        <CardTitle className="text-lg">{t("providerBookings.cancelledBookings")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map((r) => (
          <div
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border text-sm"
          >
            <div>
              <p className="font-medium capitalize">
                {r.category === "parking" ? t("search.parking") : r.category === "storage" ? t("search.storage") : r.category} • {r.city}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(r.start_date).toLocaleDateString(getIntlLocale())} →{" "}
                {new Date(r.end_date).toLocaleDateString(getIntlLocale())}
                {r.cancelled_at && (
                  <> • {t("providerBookings.cancelledOn", { date: new Date(r.cancelled_at).toLocaleDateString(getIntlLocale()) })}</>
                )}
              </p>
            </div>
            <div className="text-right">
              <p>{t("providerBookings.total", { amount: Number(r.total_amount).toFixed(2) })}</p>
              <p className="text-xs">
                {t("providerBookings.refundLabel")}{" "}
                <span className="font-medium">
                  ${Number(r.refund_amount || 0).toFixed(2)}
                </span>{" "}
                <Badge variant="secondary" className="ml-1">
                  {r.refund_status || t("booking.na")}
                </Badge>
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default ProviderCancelledBookings;
