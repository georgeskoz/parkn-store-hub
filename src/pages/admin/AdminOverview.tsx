import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Tags, CreditCard, TrendingUp, MapPin, DollarSign } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const COLORS = ["hsl(174, 62%, 32%)", "hsl(38, 92%, 55%)", "hsl(210, 40%, 50%)", "hsl(0, 84%, 60%)"];

const AdminOverview = () => {
  const [stats, setStats] = useState({ users: 0, listings: 0, bookings: 0, revenue: 0, commission: 0 });
  const [categoryData, setCategoryData] = useState<{ name: string; value: number }[]>([]);
  const [cityData, setCityData] = useState<{ city: string; count: number }[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ month: string; revenue: number; commission: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [profilesRes, listingsRes, bookingsRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("listings").select("*"),
        // commission_amount doesn't exist on this table in production --
        // platform_fee is the real column (verified directly).
        supabase.from("bookings").select("id,listing_id,total_amount,platform_fee,status,city,category,created_at"),
      ]);

      const listings = listingsRes.data || [];
      const bookings = bookingsRes.data || [];

      const totalRevenue = bookings.reduce((sum, b) => sum + Number(b.total_amount || 0), 0);
      const totalCommission = bookings.reduce((sum, b) => sum + Number(b.platform_fee || 0), 0);

      setStats({
        users: profilesRes.count || 0,
        listings: listings.length,
        bookings: bookings.length,
        revenue: totalRevenue,
        commission: totalCommission,
      });

      // Category breakdown
      const catMap: Record<string, number> = {};
      listings.forEach((l) => { catMap[l.category] = (catMap[l.category] || 0) + 1; });
      setCategoryData(Object.entries(catMap).map(([name, value]) => ({ name, value })));

      // City breakdown (top 6)
      const cityMap: Record<string, number> = {};
      listings.forEach((l) => { cityMap[l.city] = (cityMap[l.city] || 0) + 1; });
      setCityData(
        Object.entries(cityMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([city, count]) => ({ city, count }))
      );

      // Monthly revenue (mock from bookings created_at)
      const monthMap: Record<string, { revenue: number; commission: number }> = {};
      bookings.forEach((b) => {
        const month = new Date(b.created_at).toLocaleString("default", { month: "short", year: "2-digit" });
        if (!monthMap[month]) monthMap[month] = { revenue: 0, commission: 0 };
        monthMap[month].revenue += Number(b.total_amount || 0);
        monthMap[month].commission += Number(b.platform_fee || 0);
      });
      setMonthlyData(Object.entries(monthMap).map(([month, d]) => ({ month, ...d })));

      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  const statCards = [
    { label: "Total Users", value: stats.users, icon: Users, color: "text-primary" },
    { label: "Total Listings", value: stats.listings, icon: Tags, color: "text-accent-foreground" },
    { label: "Total Bookings", value: stats.bookings, icon: CreditCard, color: "text-primary" },
    { label: "Total Revenue", value: `$${stats.revenue.toLocaleString()}`, icon: DollarSign, color: "text-primary" },
    { label: "Commissions Earned", value: `$${stats.commission.toLocaleString()}`, icon: TrendingUp, color: "text-accent-foreground" },
    { label: "Active Cities", value: cityData.length, icon: MapPin, color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Dashboard Overview</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                <s.icon className={`w-6 h-6 ${s.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Revenue & Commissions</CardTitle></CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <ChartContainer config={{ revenue: { label: "Revenue", color: "hsl(174, 62%, 32%)" }, commission: { label: "Commission", color: "hsl(38, 92%, 55%)" } }} className="h-[260px]">
                <BarChart data={monthlyData}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="commission" fill="var(--color-commission)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="text-muted-foreground text-center py-8">No booking data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Category Pie */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Listings by Category</CardTitle></CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <div className="h-[260px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <ChartTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No listings yet</p>
            )}
          </CardContent>
        </Card>

        {/* City Activity */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-lg">Top Cities by Listings</CardTitle></CardHeader>
          <CardContent>
            {cityData.length > 0 ? (
              <ChartContainer config={{ count: { label: "Listings", color: "hsl(174, 62%, 32%)" } }} className="h-[260px]">
                <BarChart data={cityData} layout="vertical">
                  <XAxis type="number" />
                  <YAxis dataKey="city" type="category" width={120} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="text-muted-foreground text-center py-8">No city data yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminOverview;
