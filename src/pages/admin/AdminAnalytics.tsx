import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { Badge } from "@/components/ui/badge";

const COLORS = ["hsl(174, 62%, 32%)", "hsl(38, 92%, 55%)", "hsl(210, 40%, 50%)", "hsl(0, 84%, 60%)", "hsl(280, 60%, 50%)", "hsl(120, 50%, 40%)"];

const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => `${i}:00`);

const AdminAnalytics = () => {
  const [cityActivity, setCityActivity] = useState<{ city: string; bookings: number; listings: number }[]>([]);
  const [hourlyDemand, setHourlyDemand] = useState<{ hour: string; count: number }[]>([]);
  const [categoryStats, setCategoryStats] = useState<{ name: string; value: number }[]>([]);
  const [provinceStats, setProvinceStats] = useState<{ province: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [listingsRes, bookingsRes] = await Promise.all([
        supabase.from("listings").select("*"),
        supabase.from("bookings").select("*"),
      ]);

      const listings = listingsRes.data || [];
      const bookings = bookingsRes.data || [];

      // City activity
      const cityMap: Record<string, { bookings: number; listings: number }> = {};
      listings.forEach((l) => {
        if (!cityMap[l.city]) cityMap[l.city] = { bookings: 0, listings: 0 };
        cityMap[l.city].listings++;
      });
      bookings.forEach((b: any) => {
        if (b.city && cityMap[b.city]) cityMap[b.city].bookings++;
      });
      setCityActivity(
        Object.entries(cityMap)
          .sort((a, b) => (b[1].bookings + b[1].listings) - (a[1].bookings + a[1].listings))
          .slice(0, 8)
          .map(([city, d]) => ({ city, ...d }))
      );

      // Hourly demand (from booking creation times)
      const hourMap: Record<number, number> = {};
      bookings.forEach((b: any) => {
        const h = new Date(b.created_at).getHours();
        hourMap[h] = (hourMap[h] || 0) + 1;
      });
      setHourlyDemand(HOUR_LABELS.map((hour, i) => ({ hour, count: hourMap[i] || 0 })));

      // Category breakdown
      const catMap: Record<string, number> = {};
      listings.forEach((l) => { catMap[l.category] = (catMap[l.category] || 0) + 1; });
      setCategoryStats(Object.entries(catMap).map(([name, value]) => ({ name, value })));

      // Province stats
      const provMap: Record<string, number> = {};
      listings.forEach((l) => { provMap[l.province] = (provMap[l.province] || 0) + 1; });
      setProvinceStats(
        Object.entries(provMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([province, count]) => ({ province, count }))
      );

      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Analytics & Demand</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* City Activity */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Busiest Cities</CardTitle></CardHeader>
          <CardContent>
            {cityActivity.length > 0 ? (
              <ChartContainer config={{ bookings: { label: "Bookings", color: "hsl(174, 62%, 32%)" }, listings: { label: "Listings", color: "hsl(38, 92%, 55%)" } }} className="h-[300px]">
                <BarChart data={cityActivity}>
                  <XAxis dataKey="city" angle={-30} textAnchor="end" height={60} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="listings" fill="var(--color-listings)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="bookings" fill="var(--color-bookings)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="text-muted-foreground text-center py-8">No data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Hourly Demand */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Hourly Demand Pattern</CardTitle>
            <p className="text-sm text-muted-foreground">Peak hours for booking activity</p>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ count: { label: "Bookings", color: "hsl(174, 62%, 32%)" } }} className="h-[300px]">
              <BarChart data={hourlyDemand}>
                <XAxis dataKey="hour" interval={2} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Category Split */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Category Distribution</CardTitle></CardHeader>
          <CardContent>
            {categoryStats.length > 0 ? (
              <div className="h-[280px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryStats} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={50} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {categoryStats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <ChartTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No data</p>
            )}
          </CardContent>
        </Card>

        {/* Province Breakdown */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Top Provinces/States</CardTitle></CardHeader>
          <CardContent>
            {provinceStats.length > 0 ? (
              <ChartContainer config={{ count: { label: "Listings", color: "hsl(210, 40%, 50%)" } }} className="h-[280px]">
                <BarChart data={provinceStats} layout="vertical">
                  <XAxis type="number" />
                  <YAxis dataKey="province" type="category" width={100} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="text-muted-foreground text-center py-8">No data</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminAnalytics;
