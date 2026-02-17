import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type SurgeRule = {
  id: string;
  city: string;
  category: string;
  surge_multiplier: number;
  is_active: boolean;
  start_time: string | null;
  end_time: string | null;
  days_of_week: number[] | null;
  created_at: string;
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const AdminSurge = () => {
  const [rules, setRules] = useState<SurgeRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ city: "", category: "all", multiplier: "1.5", start_time: "", end_time: "", days: [0, 1, 2, 3, 4, 5, 6] as number[] });
  const { toast } = useToast();

  const fetchRules = async () => {
    setLoading(true);
    const { data } = await supabase.from("surge_pricing").select("*").order("created_at", { ascending: false });
    setRules((data || []) as SurgeRule[]);
    setLoading(false);
  };

  useEffect(() => { fetchRules(); }, []);

  const createRule = async () => {
    if (!form.city) { toast({ title: "City is required", variant: "destructive" }); return; }
    const { error } = await supabase.from("surge_pricing").insert({
      city: form.city,
      category: form.category,
      surge_multiplier: parseFloat(form.multiplier),
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      days_of_week: form.days,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Surge rule created" });
      setDialogOpen(false);
      setForm({ city: "", category: "all", multiplier: "1.5", start_time: "", end_time: "", days: [0, 1, 2, 3, 4, 5, 6] });
      fetchRules();
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("surge_pricing").update({ is_active: !current }).eq("id", id);
    fetchRules();
  };

  const deleteRule = async (id: string) => {
    await supabase.from("surge_pricing").delete().eq("id", id);
    toast({ title: "Rule deleted" });
    fetchRules();
  };

  const toggleDay = (day: number) => {
    setForm((f) => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter((d) => d !== day) : [...f.days, day],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Surge Pricing</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Add Rule</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Surge Pricing Rule</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>City</Label><Input placeholder="e.g. Montreal" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="parking">Parking</SelectItem>
                    <SelectItem value="storage">Storage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Surge Multiplier</Label><Input type="number" step="0.1" min="1" value={form.multiplier} onChange={(e) => setForm({ ...form, multiplier: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Start Time</Label><Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
                <div><Label>End Time</Label><Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></div>
              </div>
              <div>
                <Label>Active Days</Label>
                <div className="flex gap-2 mt-2">
                  {DAYS.map((d, i) => (
                    <Button key={d} type="button" size="sm" variant={form.days.includes(i) ? "default" : "outline"} onClick={() => toggleDay(i)}>{d}</Button>
                  ))}
                </div>
              </div>
              <Button onClick={createRule} className="w-full">Create Rule</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>City</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Multiplier</TableHead>
                  <TableHead>Time Window</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.city}</TableCell>
                    <TableCell className="capitalize">{r.category}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        <Zap className="w-3 h-3" />{r.surge_multiplier}x
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{r.start_time && r.end_time ? `${r.start_time} – ${r.end_time}` : "All day"}</TableCell>
                    <TableCell className="text-sm">{r.days_of_week?.map((d) => DAYS[d]).join(", ") || "All"}</TableCell>
                    <TableCell><Switch checked={r.is_active} onCheckedChange={() => toggleActive(r.id, r.is_active)} /></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteRule(r.id)}><Trash2 className="w-4 h-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {rules.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No surge rules configured</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSurge;
