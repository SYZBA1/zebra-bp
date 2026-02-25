import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Studio = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border h-16 flex items-center px-6 justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <span className="font-display text-xl font-bold tracking-tighter">ZEBRA STUDIO</span>
        </div>
        <Button size="sm">New Project</Button>
      </header>
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-3xl font-display font-bold tracking-tight mb-4">Welcome to the Studio</h2>
          <p className="text-muted-foreground mb-8">
            Start architecting your feasibility study or business plan. Select a template or begin from scratch.
          </p>
          <div className="flex gap-4 justify-center">
            <Button>Start from Scratch</Button>
            <Button variant="outline">Browse Templates</Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Studio;
