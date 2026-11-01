import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Check, X, Star, Briefcase, Loader2, Search, Mail, CalendarClock, Users } from "lucide-react";

type Expert = {
  id: string;
  user_id: string | null;
  name: string;
  title: string;
  industry: string;
  bio: string;
  price_etb: number;
  rating: number;
  appointments: number;
  verified: boolean;
  online: boolean;
  initials: string;
  tags: string[];
  applicant_email: string | null;
  created_at: string;
};

const appliedOn = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

export default function AdminConsultants() {
  const [experts, setExperts] = useState<Expert[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("experts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const list = (data || []) as Expert[];
    setExperts(list);
    const userIds = list.map(e => e.user_id).filter(Boolean) as string[];
    if (userIds.length) {
      const { data: profs } = await supabase
        .from("profiles").select("user_id, display_name").in("user_id", userIds);
      const map: Record<string, string> = {};
      (profs || []).forEach((p: any) => { map[p.user_id] = p.display_name || ""; });
      setNames(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const matches = (e: Expert) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return e.name.toLowerCase().includes(s)
      || e.industry.toLowerCase().includes(s)
      || e.title.toLowerCase().includes(s)
      || (e.applicant_email || "").toLowerCase().includes(s);
  };

  // An application is a real submission from the Expert Portal: it carries the applicant's email.
  const applications = experts.filter(e => !e.verified && !!e.applicant_email && matches(e));
  const verifiedExperts = experts.filter(e => e.verified && matches(e));
  const samples = experts.filter(e => !e.verified && !e.applicant_email && matches(e));

  const approve = async (e: Expert) => {
    if (!e.user_id) {
      toast.error(`${e.name} has not signed in yet — ask them to sign in at /expert/login, then approve.`);
      return;
    }
    setBusy(e.id);
    const { error: rErr } = await supabase
      .from("user_roles").insert({ user_id: e.user_id, role: "expert" as any });
    if (rErr && !rErr.message.includes("duplicate")) {
      toast.error(rErr.message); setBusy(null); return;
    }
    const { error: uErr } = await supabase
      .from("experts").update({ verified: true }).eq("id", e.id);
    if (uErr) { toast.error(uErr.message); setBusy(null); return; }
    toast.success(`${e.name} approved — portal access granted.`);
    setBusy(null);
    load();
  };

  const remove = async (e: Expert, verb: string) => {
    if (!confirm(`${verb} ${e.name}'s application? This removes the listing.`)) return;
    setBusy(e.id);
    if (e.user_id) {
      await supabase.from("user_roles").delete()
        .eq("user_id", e.user_id).eq("role", "expert" as any);
    }
    const { error } = await supabase.from("experts").delete().eq("id", e.id);
    if (error) { toast.error(error.message); setBusy(null); return; }
    toast.success(`Application ${verb.toLowerCase()}.`);
    setBusy(null);
    load();
  };

  const revoke = async (e: Expert) => {
    if (!confirm(`Revoke ${e.name}'s portal access? They can re-apply later.`)) return;
    setBusy(e.id);
    if (e.user_id) {
      await supabase.from("user_roles").delete()
        .eq("user_id", e.user_id).eq("role", "expert" as any);
    }
    await supabase.from("experts").update({ verified: false, online: false }).eq("id", e.id);
    toast.success("Access revoked.");
    setBusy(null);
    load();
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>;
  }

  const ApplicationCard = ({ e }: { e: Expert }) => (
    <Card className="border-border/60 hover:border-primary/40 transition-colors">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold shrink-0">
            {e.initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold truncate">{e.name}</h3>
              <Badge variant="outline" className="text-[10px]">Pending</Badge>
              {!e.user_id && <Badge variant="secondary" className="text-[10px]">Not signed in</Badge>}
            </div>
            <p className="text-xs text-muted-foreground truncate">{e.title} · {e.industry}</p>
            {e.applicant_email && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 truncate">
                <Mail className="h-3 w-3 shrink-0" /> {e.applicant_email}
              </p>
            )}
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <CalendarClock className="h-3 w-3" /> Applied {appliedOn(e.created_at)}
            </p>
            <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{e.bio}</p>
          </div>
        </div>

        <div className="flex gap-2 mt-4 pt-4 border-t border-border">
          <Button size="sm" onClick={() => approve(e)} disabled={busy === e.id} className="flex-1">
            <Check className="h-4 w-4 mr-1" /> Approve
          </Button>
          <Button size="sm" variant="outline" onClick={() => remove(e, "Deny")}
            disabled={busy === e.id} className="flex-1">
            <X className="h-4 w-4 mr-1" /> Deny
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const PortfolioCard = ({ e }: { e: Expert }) => (
    <Card className="border-border/60 hover:border-primary/40 transition-colors">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold shrink-0">
            {e.initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold truncate">{e.name}</h3>
              <Badge variant="default" className="text-[10px]">Verified</Badge>
              {e.online && <Badge variant="secondary" className="text-[10px]">Online</Badge>}
            </div>
            <p className="text-xs text-muted-foreground truncate">{e.title} · {e.industry}</p>
            {e.user_id && names[e.user_id] && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <Mail className="h-3 w-3" /> {names[e.user_id]}
              </p>
            )}
            <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{e.bio}</p>
            <div className="flex items-center gap-4 mt-3 text-xs font-mono text-muted-foreground">
              <span className="flex items-center gap-1"><Star className="h-3 w-3 text-primary" /> {e.rating}</span>
              <span>{e.appointments} sessions</span>
              <span>ETB {e.price_etb}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4 pt-4 border-t border-border">
          <Button size="sm" variant="outline" onClick={() => revoke(e)} disabled={busy === e.id} className="ml-auto">
            Revoke access
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const SampleCard = ({ e }: { e: Expert }) => (
    <Card className="border-border/60">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-muted text-muted-foreground flex items-center justify-center font-bold shrink-0">
            {e.initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold truncate">{e.name}</h3>
              <Badge variant="outline" className="text-[10px]">Sample listing</Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">{e.title} · {e.industry}</p>
            <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{e.bio}</p>
          </div>
        </div>
        <div className="flex gap-2 mt-4 pt-4 border-t border-border">
          <Button size="sm" variant="outline" onClick={() => remove(e, "Remove")}
            disabled={busy === e.id} className="ml-auto">
            <X className="h-4 w-4 mr-1" /> Remove
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const Empty = ({ icon: Icon, text }: { icon: any; text: string }) => (
    <div className="text-center py-16 text-muted-foreground">
      <Icon className="h-10 w-10 mx-auto mb-3 opacity-40" />
      <p className="text-sm">{text}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="relative max-w-md">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by name, industry or email…" value={search}
          onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending applications
            <Badge variant="secondary" className="ml-2">{applications.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="verified">
            Verified portfolio
            <Badge variant="secondary" className="ml-2">{verifiedExperts.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="samples">
            Sample listings
            <Badge variant="secondary" className="ml-2">{samples.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {applications.length === 0 ? (
            <Empty icon={Briefcase} text="No expert applications waiting. New submissions from the Expert Portal appear here." />
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {applications.map(e => <ApplicationCard key={e.id} e={e} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="verified" className="mt-6">
          {verifiedExperts.length === 0 ? (
            <Empty icon={Star} text="No verified experts yet." />
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {verifiedExperts.map(e => <PortfolioCard key={e.id} e={e} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="samples" className="mt-6">
          {samples.length === 0 ? (
            <Empty icon={Users} text="No sample listings." />
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-4">
                Built-in listings with no account behind them. They stay hidden from the site until
                someone applies with the matching email and you approve it.
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                {samples.map(e => <SampleCard key={e.id} e={e} />)}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
