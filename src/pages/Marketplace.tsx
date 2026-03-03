import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Lock, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface Template {
  id: string;
  title: string;
  description: string;
  sector: string;
  category: string;
  is_premium: boolean;
  price_cents: number;
  contents: Record<string, string>;
}

const Marketplace = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "free" | "premium">("all");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("marketplace_templates").select("*").order("created_at", { ascending: true });
      if (data) setTemplates(data as any);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = templates.filter((t) =>
    filter === "all" ? true : filter === "free" ? !t.is_premium : t.is_premium
  );

  const handleUseTemplate = async (template: Template) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }

    if (template.is_premium) {
      // For now, show a message for premium templates
      alert("Premium templates coming soon! This template requires a purchase.");
      return;
    }

    // Create project from template and navigate to studio
    const { data, error } = await supabase.from("projects").insert({
      user_id: session.user.id,
      name: `${template.title} — New Project`,
      sector: template.sector,
      type: "template",
      template_id: template.id,
      document_type: "feasibility",
      contents: template.contents as any,
      custom_titles: {} as any,
      language: "en",
    }).select("id").single();

    if (data) {
      navigate("/studio", { state: { resumeProjectId: data.id } });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container">
          <motion.div className="max-w-2xl mb-10" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <p className="font-mono text-sm tracking-[0.3em] uppercase text-muted-foreground mb-4">
              <Sparkles className="inline h-3.5 w-3.5 mr-1" /> Marketplace
            </p>
            <h1 className="text-4xl md:text-6xl font-display font-bold tracking-tight mb-6">
              Sector Blueprints
            </h1>
            <p className="text-muted-foreground text-lg">
              AI-generated feasibility study templates tailored for the Ethiopian market. Use them as-is or customize in the Studio.
            </p>
          </motion.div>

          <div className="flex gap-2 mb-8">
            {(["all", "free", "premium"] as const).map((f) => (
              <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)} className="capitalize">
                {f === "all" ? "All Templates" : f === "free" ? "Free" : "Premium"}
              </Button>
            ))}
          </div>

          {loading ? (
            <p className="text-muted-foreground font-mono text-sm">Loading templates...</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((t, i) => (
                <motion.div
                  key={t.id}
                  className="border border-border p-6 flex flex-col justify-between hover:bg-secondary/50 transition-colors"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground border border-border px-2 py-0.5">
                        {t.category}
                      </span>
                      <span className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground border border-border px-2 py-0.5">
                        {t.sector}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-display text-xl font-bold tracking-tight">{t.title}</h3>
                      {t.is_premium && <Badge variant="secondary" className="gap-1 text-[10px]"><Lock className="h-2.5 w-2.5" /> Premium</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">{t.description}</p>
                    {t.is_premium && (
                      <p className="text-lg font-display font-bold text-primary mb-4">
                        ETB {(t.price_cents / 100).toFixed(0)}
                      </p>
                    )}
                  </div>
                  <Button
                    variant={t.is_premium ? "outline" : "default"}
                    size="sm"
                    className="w-full group"
                    onClick={() => handleUseTemplate(t)}
                  >
                    {t.is_premium ? "Purchase Template" : "Use Template — Free"}
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Marketplace;
