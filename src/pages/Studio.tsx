import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import ProjectSetup from "@/components/studio/ProjectSetup";
import TemplateBrowser from "@/components/studio/TemplateBrowser";
import EditorView from "@/components/studio/EditorView";

type StudioView = "home" | "setup" | "templates" | "editor";

const Studio = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<StudioView>("home");
  const [projectName, setProjectName] = useState("");
  const [sector, setSector] = useState("");

  const handleScratchSetupComplete = (name: string, sec: string) => {
    setProjectName(name);
    setSector(sec);
    setView("editor");
  };

  const handleTemplateSelect = (templateId: string, sec: string) => {
    setProjectName(`${sec} — New Project`);
    setSector(sec);
    setView("setup");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border h-14 flex items-center px-6 justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => {
            if (view === "home") navigate("/");
            else if (view === "editor") setView("home");
            else setView("home");
          }}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <span className="font-display text-lg font-bold tracking-tighter">ZEBRA STUDIO</span>
        </div>
        {view === "home" && (
          <Button size="sm" onClick={() => setView("setup")}>
            New Project
          </Button>
        )}
      </header>

      {view === "home" && (
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <h2 className="text-3xl font-display font-bold tracking-tight mb-4">
              Welcome to the Studio
            </h2>
            <p className="text-muted-foreground mb-8">
              Start architecting your feasibility study or business plan. Select a template or begin from scratch.
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => setView("setup")}>Start from Scratch</Button>
              <Button variant="outline" onClick={() => setView("templates")}>
                Browse Templates
              </Button>
            </div>
          </div>
        </main>
      )}

      {view === "setup" && (
        <ProjectSetup onComplete={handleScratchSetupComplete} />
      )}

      {view === "templates" && (
        <TemplateBrowser
          onSelect={handleTemplateSelect}
          onBack={() => setView("home")}
        />
      )}

      {view === "editor" && (
        <EditorView
          projectName={projectName}
          sector={sector}
          onBack={() => setView("home")}
        />
      )}
    </div>
  );
};

export default Studio;
