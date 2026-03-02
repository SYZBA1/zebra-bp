import { useState, useEffect } from "react";
import { ArrowLeft, Languages, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import ProjectSetup from "@/components/studio/ProjectSetup";
import TemplateBrowser from "@/components/studio/TemplateBrowser";
import EditorView from "@/components/studio/EditorView";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getStoredTheme, setStoredTheme, type Theme } from "@/lib/theme";
import zebraLogoLight from "@/assets/zebra-logo-light.png";

type StudioView = "home" | "setup" | "templates" | "editor";
type DocumentType = "feasibility" | "business-plan";

interface SavedProject {
  id: string;
  name: string;
  sector: string;
  type: string;
  document_type: string;
  contents: Record<string, string>;
  custom_titles: Record<string, string>;
  language: string;
  updated_at: string;
}

const Studio = () => {
  const navigate = useNavigate();
  const { displayName, userId } = useProfile();
  const { toast } = useToast();
  const [view, setView] = useState<StudioView>("home");
  const [projectName, setProjectName] = useState("");
  const [sector, setSector] = useState("");
  const [documentType, setDocumentType] = useState<DocumentType>("feasibility");
  const [language, setLanguage] = useState<"en" | "am">("en");
  const [theme, setTheme] = useState<Theme>(getStoredTheme());
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [initialContents, setInitialContents] = useState<Record<string, string>>({});
  const [initialCustomTitles, setInitialCustomTitles] = useState<Record<string, string>>({});
  const [initialLanguage, setInitialLanguage] = useState<"en" | "am">("en");

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setStoredTheme(next);
  };

  // Load existing projects
  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      setLoadingProjects(true);
      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });
      if (data) setSavedProjects(data as any);
      setLoadingProjects(false);
    };
    load();
  }, [userId]);

  const handleScratchSetupComplete = async (name: string, sec: string) => {
    setProjectName(name);
    setSector(sec);
    setInitialContents({});
    setInitialCustomTitles({});

    if (userId) {
      const { data, error } = await supabase.from("projects").insert({
        user_id: userId, name, sector: sec, type: "scratch",
        document_type: documentType, language, contents: {} as any, custom_titles: {} as any,
      }).select("id").single();
      if (data) setCurrentProjectId(data.id);
      if (error) toast({ title: "Error", description: "Failed to create project", variant: "destructive" });
    }
    setView("editor");
  };

  const handleTemplateSelect = (templateId: string, sec: string) => {
    setProjectName(`${sec} — New Project`);
    setSector(sec);
    setView("setup");
  };

  const handleResumeProject = (project: SavedProject) => {
    setProjectName(project.name);
    setSector(project.sector);
    setDocumentType((project.document_type || "feasibility") as DocumentType);
    setCurrentProjectId(project.id);
    setInitialContents(project.contents || {});
    setInitialCustomTitles(project.custom_titles || {});
    setInitialLanguage((project.language || "en") as "en" | "am");
    setView("editor");
  };

  const t = (en: string, am: string) => (language === "en" ? en : am);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border h-14 flex items-center px-6 justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => {
            if (view === "home") navigate("/");
            else setView("home");
          }}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <img src={zebraLogoLight} alt="Zebra" className="h-7 object-contain" />
          <span className="font-display text-lg font-bold tracking-tighter">
            {displayName || "Studio"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="p-1.5 rounded hover:bg-secondary transition-colors">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
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
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-2xl">
            {/* Saved projects */}
            {!loadingProjects && savedProjects.length > 0 && (
              <div className="mb-10">
                <h3 className="text-lg font-display font-bold mb-4">
                  {t("Resume a Project", "ፕሮጀክት ይቀጥሉ")}
                </h3>
                <div className="space-y-2">
                  {savedProjects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleResumeProject(p)}
                      className="w-full text-left border border-border rounded-sm p-4 hover:bg-secondary transition-colors flex items-center justify-between"
                    >
                      <div>
                        <p className="font-display font-bold">{p.name}</p>
                        <p className="text-xs font-mono text-muted-foreground">{p.sector} · {p.document_type || "feasibility"}</p>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">
                        {new Date(p.updated_at).toLocaleDateString()}
                      </p>
                    </button>
                  ))}
                </div>
                <div className="border-t border-border my-6" />
              </div>
            )}

            <div className="text-center">
              <h2 className="text-3xl font-display font-bold tracking-tight mb-4">
                {t("Start a New Project", "አዲስ ፕሮጀክት ይጀምሩ")}
              </h2>

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
                  <Button variant="outline" disabled title={t("Complete a feasibility study first", "በመጀመሪያ የተግባራዊነት ጥናት ያጠናቅቁ")}>
                    {t("From Feasibility Study", "ከተግባራዊነት ጥናት")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {view === "setup" && (
        <ProjectSetup onComplete={handleScratchSetupComplete} language={language} />
      )}

      {view === "templates" && (
        <TemplateBrowser onSelect={handleTemplateSelect} onBack={() => setView("home")} />
      )}

      {view === "editor" && (
        <EditorView
          projectName={projectName}
          sector={sector}
          documentType={documentType}
          onBack={() => setView("home")}
          projectId={currentProjectId || undefined}
          initialContents={initialContents}
          initialCustomTitles={initialCustomTitles}
          initialLanguage={initialLanguage}
        />
      )}
    </div>
  );
};

export default Studio;
