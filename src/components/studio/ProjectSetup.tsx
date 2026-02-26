import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SECTORS } from "@/lib/feasibility-outline";
import { ArrowRight, Search } from "lucide-react";

interface ProjectSetupProps {
  onComplete: (name: string, sector: string) => void;
}

const ProjectSetup = ({ onComplete }: ProjectSetupProps) => {
  const [name, setName] = useState("");
  const [sector, setSector] = useState("");
  const [search, setSearch] = useState("");

  const filtered = SECTORS.filter((s) =>
    s.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-8">
        <div>
          <p className="font-mono text-xs tracking-[0.3em] uppercase text-muted-foreground mb-2">
            Phase 1
          </p>
          <h2 className="text-3xl font-display font-bold tracking-tight mb-2">
            Project Setup
          </h2>
          <p className="text-muted-foreground">
            Define your project name and select the sector domain.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Project Name</label>
            <Input
              placeholder="e.g. Addis Grand Hotel Feasibility Study"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Sector Domain</label>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sectors..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-[280px] overflow-y-auto pr-1">
              {filtered.map((s) => (
                <button
                  key={s}
                  onClick={() => setSector(s)}
                  className={`text-left text-sm px-3 py-2.5 border transition-colors ${
                    sector === s
                      ? "border-foreground bg-foreground text-background"
                      : "border-border hover:bg-secondary text-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Button
          className="w-full h-12 group"
          disabled={!name.trim() || !sector}
          onClick={() => onComplete(name.trim(), sector)}
        >
          Continue to Editor
          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </div>
    </div>
  );
};

export default ProjectSetup;
