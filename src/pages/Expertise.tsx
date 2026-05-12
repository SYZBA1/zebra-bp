import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { experts } from "@/lib/experts-data";
import ExpertCard from "@/components/expertise/ExpertCard";
import { toast } from "sonner";

const industries = ["All", ...Array.from(new Set(experts.map((e) => e.industry)))];

const Expertise = () => {
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [industry, setIndustry] = useState("All");
  const [onlineOnly, setOnlineOnly] = useState(false);

  useEffect(() => {
    document.title = "Expertise · Verified Industry Experts | ZEBRA";
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return experts.filter((e) => {
      if (industry !== "All" && e.industry !== industry) return false;
      if (onlineOnly && !e.online) return false;
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) ||
        e.title.toLowerCase().includes(q) ||
        e.industry.toLowerCase().includes(q) ||
        e.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [query, industry, onlineOnly]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20">
        {/* Hero */}
        <section className="container py-16 sm:py-20">
          <p className="font-mono text-sm tracking-[0.3em] uppercase text-muted-foreground mb-4">
            Expertise
          </p>
          <h1 className="text-4xl md:text-6xl font-display font-bold tracking-tight text-foreground mb-6 max-w-3xl">
            Verified Industry Experts for the Ethiopian Market
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mb-8">
            Browse 20+ vetted consultants across 50 Ethiopian business sectors. Book a live appointment,
            request a feasibility study, or commission a bank-ready business plan.
          </p>

          {/* Filters */}
          <div className="flex flex-col lg:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, sector, or skill…"
                className="pl-10 h-12"
              />
            </div>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="h-12 px-4 rounded-md border border-input bg-background text-sm text-foreground"
            >
              {industries.map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
            <Button
              variant={onlineOnly ? "default" : "outline"}
              size="lg"
              className="h-12"
              onClick={() => setOnlineOnly((v) => !v)}
            >
              {onlineOnly ? "Online Only ✓" : "Online Only"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Showing <span className="text-foreground font-semibold">{filtered.length}</span> of {experts.length} experts
          </p>
        </section>

        {/* Grid */}
        <section className="container pb-24">
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
              No experts match your filters. Try widening your search.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((e) => (
                <ExpertCard
                  key={e.id}
                  expert={e}
                  onBook={(ex) => toast.success(`Appointment request sent to ${ex.name}`, { description: "We'll notify you once they confirm." })}
                  onPortfolio={(ex) => toast.message(`${ex.name}'s portfolio`, { description: "Portfolio viewer coming soon." })}
                />
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Expertise;
