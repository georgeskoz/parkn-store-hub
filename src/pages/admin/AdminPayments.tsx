import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, DollarSign, TrendingUp, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis } from "recharts";

type Booking = {
  id: string;
  listing_id: string;
  seeker_id: string;
  provider_id: string;
  total_price: number;
  commission_amount: number;
  commission_rate: number;
  status: string;
  city: string | null;
  category: string | null;
  created_at: string;
  refund_amount: number | null;
  refund_status: string | null;
  cancelled_at: string | null;
  payment_intent_id: string | null;
};

const AdminPayments = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("bookings").select("*").order("created_at", { ascending: false });
    setBookings((data || []) as Booking[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleAdminFullRefund = async (id: string) => {
    if (!confirm("Issue a full refund and cancel this booking?")) return;
    const { data, error } = await supabase.functions.invoke("cancel-booking", {
      body: { bookingId: id, adminOverrideFullRefund: true, reason: "Admin manual refund" },
    });
    if (error || data?.error) {
      toast({ title: "Refund failed", description: error?.message || data?.error, variant: "destructive" });
      return;
    }
    toast({ title: "Refund issued", description: `$${data.refundAmount?.toFixed(2)} (${data.refundStatus})` });
    await load();
  };

  const totalRevenue = bookings.reduce((s, b) => s + Number(b.total_price), 0);
  const totalCommission = bookings.reduce((s, b) => s + Number(b.commission_amount), 0);
  const avgCommissionRate = bookings.length ? (bookings.reduce((s, b) => s + Number(b.commission_rate), 0) / bookings.length) : 10;

  // Daily revenue chart
  const dailyMap: Record<string, { revenue: number; commission: number }> = {};
  bookings.forEach((b) => {
    const day = new Date(b.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (!dailyMap[day]) dailyMap[day] = { revenue: 0, commission: 0 };
    dailyMap[day].revenue += Number(b.total_price);
    dailyMap[day].commission += Number(b.commission_amount);
  });
  const dailyData = Object.entries(dailyMap).map(([day, d]) => ({ day, ...d }));

  const filtered = bookings.filter((b) =>
    b.id.toLowerCase().includes(search.toLowerCase()) ||
    (b.city || "").toLowerCase().includes(search.toLowerCase()) ||
    b.status.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Bookings & Payments</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center"><DollarSign className="w-6 h-6 text-primary" /></div>
            <div><p className="text-sm text-muted-foreground">Total Revenue</p><p className="text-2xl font-bold">${totalRevenue.toLocaleString()}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center"><TrendingUp className="w-6 h-6 text-accent-foreground" /></div>
            <div><p className="text-sm text-muted-foreground">Platform Commissions</p><p className="text-2xl font-bold">${totalCommission.toLocaleString()}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center"><CreditCard className="w-6 h-6 text-primary" /></div>
            <div><p className="text-sm text-muted-foreground">Avg Commission Rate</p><p className="text-2xl font-bold">{avgCommissionRate.toFixed(1)}%</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Revenue Over Time</CardTitle></CardHeader>
        <CardContent>
          {dailyData.length > 0 ? (
            <ChartContainer config={{ revenue: { label: "Revenue", color: "hsl(174, 62%, 32%)" }, commission: { label: "Commission", color: "hsl(38, 92%, 55%)" } }} className="h-[260px]">
              <AreaChart data={dailyData}>
                <XAxis dataKey="day" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="revenue" stroke="var(--color-revenue)" fill="var(--color-revenue)" fillOpacity={0.2} />
                <Area type="monotone" dataKey="commission" stroke="var(--color-commission)" fill="var(--color-commission)" fillOpacity={0.2} />
              </AreaChart>
            </ChartContainer>
          ) : (
            <p className="text-muted-foreground text-center py-8">No payment data yet</p>
          )}
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Transaction History</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search transactions..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Refund</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((b) => {
                  const refundable = !["cancelled", "completed", "refunded"].includes(b.status) && !!b.payment_intent_id;
                  return (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-xs">{b.id.slice(0, 8)}…</TableCell>
                      <TableCell>{b.city || "—"}</TableCell>
                      <TableCell className="capitalize">{b.category || "—"}</TableCell>
                      <TableCell className="font-medium">${Number(b.total_price).toFixed(2)}</TableCell>
                      <TableCell className="text-accent-foreground">${Number(b.commission_amount).toFixed(2)}</TableCell>
                      <TableCell className="text-sm">
                        {Number(b.refund_amount || 0) > 0 ? (
                          <span>${Number(b.refund_amount).toFixed(2)} <span className="text-muted-foreground">({b.refund_status})</span></span>
                        ) : "—"}
                      </TableCell>
                      <TableCell><Badge variant={b.status === "completed" ? "default" : b.status === "pending" ? "secondary" : "destructive"} className="capitalize">{b.status}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(b.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {refundable && (
                          <Button size="sm" variant="outline" onClick={() => handleAdminFullRefund(b.id)}>
                            Refund
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No transactions found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPayments;
