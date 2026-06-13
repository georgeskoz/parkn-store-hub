import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase
        .from("bookings")
        .select(
          "id,start_date,end_date,total_amount,refund_amount,refund_status,cancelled_at,category,city",
        )
        .eq("provider_id", userId)
        .eq("status", "cancelled")
        .order("cancelled_at", { ascending: false });
      setRows((data || []) as Row[]);
    })();
  }, [userId]);

  if (rows.length === 0) return null;

  return (
    <Card className="card-shadow">
      <CardHeader>
        <CardTitle className="text-lg">Cancelled Bookings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map((r) => (
          <div
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border text-sm"
          >
            <div>
              <p className="font-medium capitalize">
                {r.category} • {r.city}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(r.start_date).toLocaleDateString()} →{" "}
                {new Date(r.end_date).toLocaleDateString()}
                {r.cancelled_at && (
                  <> • cancelled {new Date(r.cancelled_at).toLocaleDateString()}</>
                )}
              </p>
            </div>
            <div className="text-right">
              <p>Total: ${Number(r.total_amount).toFixed(2)}</p>
              <p className="text-xs">
                Refund:{" "}
                <span className="font-medium">
                  ${Number(r.refund_amount || 0).toFixed(2)}
                </span>{" "}
                <Badge variant="secondary" className="ml-1">
                  {r.refund_status || "n/a"}
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
