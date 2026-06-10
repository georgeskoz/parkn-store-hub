import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type SurgeRule = {
  id: string;
  label: string | null;
  city: string;
  category: string;
  surge_multiplier: number;
  is_active: boolean;
  start_at: string | null;
  end_at: string | null;
  created_at: string;
};

const emptyForm = {
  label: "",
  city: "",
  category: "all",
  multiplier: "1.5",
  start_at: "",
  end_at: "",
};

const AdminSurge = () => {
  const [rules, setRules] = useState<SurgeRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const { toast } = useToast();

  const fetchRules = async () => {
    setLoading(true);
    const { data } = await supabase.from("surge_pricing").select("*").order("start_at", { ascending: false });
    setRules((data || []) as SurgeRule[]);
    setLoading(false);
  };

  useEffect(() => { fetchRules(); }, []);

  const now = new Date();
  const { active, scheduled, expired } = useMemo(() => {
    const a: SurgeRule[] = [], s: SurgeRule[] = [], e: SurgeRule[] = [];
    for (const r of rules) {
      const start = r.start_at ? new Date(r.start_at) : null;
      const end = r.end_at ? new Date(r.end_at) : null;
      if (end && end < now) e.push(r);
      else if (start && start > now) s.push(r);
      else a.push(r);
    }
    return { active: a, scheduled: s, expired: e };
  }, [rules]);

  const createRule = async () => {
    if (!form.city || !form.label || !form.start_at || !form.end_at) {
      toast({ title: "Label, city, start and end are required", variant: "destructive" }); return;
    }
    if (new Date(form.end_at) <= new Date(form.start_at)) {
      toast({ title: "End must be after start", variant: "destructive" }); return;
    }
    const { error } = await supabase.from("surge_pricing").insert({
      label: form.label,
      city: form.city,
      category: form.category,
      surge_multiplier: parseFloat(form.multiplier),
      start_at: new Date(form.start_at).toISOString(),
      end_at: new Date(form.end_at).toISOString(),
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Surge rule created" });
      setDialogOpen(false);
      setForm(emptyForm);
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

  const renderTable = (list: SurgeRule[], status: "active" | "scheduled" | "expired") => (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Label</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Multiplier</TableHead>
              <TableHead>Window</TableHead>
              <TableHead>Active</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.label || "—"}</TableCell>
                <TableCell>{r.city}</TableCell>
                <TableCell className="capitalize">{r.category}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="gap-1"><Zap className="w-3 h-3" />{r.surge_multiplier}x</Badge>
                </TableCell>
                <TableCell className="text-xs">
                  {r.start_at ? format(new Date(r.start_at), "MMM d, HH:mm") : "—"}
                  {" → "}
                  {r.end_at ? format(new Date(r.end_at), "MMM d, HH:mm") : "—"}
                </TableCell>
                <TableCell><Switch checked={r.is_active} onCheckedChange={() => toggleActive(r.id, r.is_active)} /></TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteRule(r.id)}><Trash2 className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {list.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No {status} rules</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

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
              <div><Label>Label</Label><Input placeholder="Bell Centre — Playoffs" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} /></div>
              <div><Label>City</Label><Input placeholder="Montreal" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
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
                <div><Label>Start</Label><Input type="datetime-local" value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} /></div>
                <div><Label>End</Label><Input type="datetime-local" value={form.end_at} onChange={(e) => setForm({ ...form, end_at: e.target.value })} /></div>
              </div>
              <Button onClick={createRule} className="w-full">Create Rule</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled ({scheduled.length})</TabsTrigger>
            <TabsTrigger value="expired">Expired ({expired.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="active" className="mt-4">{renderTable(active, "active")}</TabsContent>
          <TabsContent value="scheduled" className="mt-4">{renderTable(scheduled, "scheduled")}</TabsContent>
          <TabsContent value="expired" className="mt-4">{renderTable(expired, "expired")}</TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default AdminSurge;
