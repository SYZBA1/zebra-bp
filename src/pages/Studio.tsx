import { useState } from "react";
import { ArrowLeft, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import ProjectSetup from "@/components/studio/ProjectSetup";
import TemplateBrowser from "@/components/studio/TemplateBrowser";
import EditorView from "@/components/studio/EditorView";

type StudioView = "home" | "setup" | "templates" | "editor";
type DocumentType = "feasibility" | "business-plan";

const Studio = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<StudioView>("home");
  const [projectName, setProjectName] = useState("");
  const [sector, setSector] = useState("");
  const [documentType, setDocumentType] = useState<DocumentType>("feasibility");
  const [language, setLanguage] = useState<"en" | "am">("en");

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

  const t = (en: string, am: string) => (language === "en" ? en : am);

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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLanguage(language === "en" ? "am" : "en")}
            className="flex items-center gap-1 text-xs font-mono px-2 py-1 rounded bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
          >
            <Languages className="h-3.5 w-3.5" />
            {language === "en" ? "EN" : "አማ"}
          </button>
          {view === "home" && (
            <Button size="sm" onClick={() => setView("setup")}>
              {t("New Project", "አዲስ ፕሮጀክት")}
            </Button>
          )}
        </div>
      </header>

      {view === "home" && (
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-lg">
            <h2 className="text-3xl font-display font-bold tracking-tight mb-4">
              {t("Welcome to the Studio", "ወደ ስቱዲዮ እንኳን በደህና መጡ")}
            </h2>
            <p className="text-muted-foreground mb-8">
              {t(
                "Start architecting your feasibility study or business plan. Select a template or begin from scratch.",
                "የተግባራዊነት ጥናት ወይም የንግድ ዕቅድ ይጀምሩ። ቅድመ-ቅርጽ ይምረጡ ወይም ከባዶ ይጀምሩ።"
              )}
            </p>

            <div className="space-y-4">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                {t("Feasibility Study", "የተግባራዊነት ጥናት")}
              </p>
              <div className="flex gap-4 justify-center">
                <Button onClick={() => { setDocumentType("feasibility"); setView("setup"); }}>
                  {t("Start from Scratch", "ከባዶ ይጀምሩ")}
                </Button>
                <Button variant="outline" onClick={() => { setDocumentType("feasibility"); setView("templates"); }}>
                  {t("Browse Templates", "ቅድመ-ቅርጾችን ያስሱ")}
                </Button>
              </div>

              <div className="border-t border-border my-6" />

              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                {t("Business Plan", "የንግድ ዕቅድ")}
              </p>
              <div className="flex gap-4 justify-center">
                <Button onClick={() => { setDocumentType("business-plan"); setView("setup"); }}>
                  {t("Start Business Plan", "የንግድ ዕቅድ ይጀምሩ")}
                </Button>
                <Button variant="outline" disabled title={t("Complete a feasibility study first to use this", "ይህን ለመጠቀም በመጀመሪያ የተግባራዊነት ጥናት ያጠናቅቁ")}>
                  {t("From Feasibility Study", "ከተግባራዊነት ጥናት")}
                </Button>
              </div>
            </div>
          </div>
        </main>
      )}

      {view === "setup" && (
        <ProjectSetup onComplete={handleScratchSetupComplete} language={language} />
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
          documentType={documentType}
          onBack={() => setView("home")}
        />
      )}
    </div>
  );
};

export default Studio;
