import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, ShieldAlert } from "lucide-react";

type Appointment = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  topic: string;
  description: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  language: string;
  status: string;
  created_at: string;
};

const STATUSES = ["pending", "confirmed", "completed", "cancelled"] as const;

const statusVariant = (s: string): "default" | "secondary" | "outline" | "destructive" => {
  switch (s) {
    case "confirmed": return "default";
    case "completed": return "secondary";
    case "cancelled": return "destructive";
    default: return "outline";
  }
};

export default function AdminAppointments() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [items, setItems] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setAuthed(false);
        setLoading(false);
        return;
      }
      setAuthed(true);
      const { data: roleData } = await supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();
      const admin = !!roleData;
      setIsAdmin(admin);
      if (admin) await load();
      setLoading(false);
    };
    init();
  }, []);

  const load = async () => {
    const { data, error } = await supabase
      .from("consultant_appointments")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Error loading appointments", description: error.message, variant: "destructive" });
      return;
    }
    setItems((data || []) as Appointment[]);
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("consultant_appointments")
      .update({ status })
      .eq("id", id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i));
    toast({ title: "Status updated", description: `Appointment marked ${status}.` });
  };

  if (authed === false) return <Navigate to="/auth" replace />;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              <CardTitle>Access denied</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You don't have admin access. Contact a system administrator to be granted the admin role.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filtered = filter === "all" ? items : items.filter(i => i.status === filter);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Consultant Appointments</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage incoming appointment requests from the live chat.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ({items.length})</SelectItem>
                {STATUSES.map(s => (
                  <SelectItem key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)} ({items.filter(i => i.status === s).length})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={load}>Refresh</Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requester</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>Preferred</TableHead>
                  <TableHead>Lang</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                      No appointments found.
                    </TableCell>
                  </TableRow>
                ) : filtered.map(a => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="font-medium">{a.full_name}</div>
                      <div className="text-xs text-muted-foreground">{a.email}</div>
                      {a.phone && <div className="text-xs text-muted-foreground">{a.phone}</div>}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="font-medium truncate">{a.topic}</div>
                      {a.description && (
                        <div className="text-xs text-muted-foreground line-clamp-2">{a.description}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {a.preferred_date || "—"}
                      {a.preferred_time && <div className="text-xs text-muted-foreground">{a.preferred_time}</div>}
                    </TableCell>
                    <TableCell className="uppercase text-xs">{a.language}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(a.status)}>{a.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Select value={a.status} onValueChange={(v) => updateStatus(a.id, v)}>
                        <SelectTrigger className="w-36 ml-auto">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
