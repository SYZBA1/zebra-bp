import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const blueprints = [
  { title: "Hotel & Hospitality", description: "Complete feasibility study template for hotel and resort projects in Ethiopia.", sectors: ["Tourism", "Real Estate"] },
  { title: "Manufacturing Plant", description: "Industrial feasibility framework covering machinery, labor, and market analysis.", sectors: ["Industry", "Export"] },
  { title: "Agriculture & Agro-processing", description: "Farm-to-market business plan templates with financial projections.", sectors: ["Agriculture", "Food"] },
  { title: "Healthcare Facility", description: "Clinic and hospital feasibility studies with regulatory compliance.", sectors: ["Health", "Services"] },
  { title: "Education Center", description: "School and training center business plans with enrollment forecasts.", sectors: ["Education", "Social"] },
  { title: "Real Estate Development", description: "Residential and commercial property development feasibility templates.", sectors: ["Construction", "Real Estate"] },
];

const Marketplace = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container">
          <motion.div
            className="max-w-2xl mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="font-mono text-sm tracking-[0.3em] uppercase text-muted-foreground mb-4">
              Marketplace
            </p>
            <h1 className="text-4xl md:text-6xl font-display font-bold tracking-tight mb-6">
              Sector Blueprints
            </h1>
            <p className="text-muted-foreground text-lg">
              Pre-built feasibility study and business plan templates tailored for the Ethiopian market.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blueprints.map((bp, i) => (
              <motion.div
                key={bp.title}
                className="border border-border p-6 flex flex-col justify-between hover:bg-secondary transition-colors"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <div>
                  <div className="flex gap-2 mb-4">
                    {bp.sectors.map((s) => (
                      <span key={s} className="font-mono text-xs tracking-widest uppercase text-muted-foreground border border-border px-2 py-1">
                        {s}
                      </span>
                    ))}
                  </div>
                  <h3 className="font-display text-xl font-bold tracking-tight mb-2">{bp.title}</h3>
                  <p className="text-sm text-muted-foreground mb-6">{bp.description}</p>
                </div>
                <Button variant="outline" size="sm" className="w-full group" onClick={() => navigate("/auth")}>
                  Use Template
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Marketplace;
