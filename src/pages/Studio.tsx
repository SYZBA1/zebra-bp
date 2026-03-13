import { useState, useEffect } from "react";
import { ArrowLeft, Languages, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import ProjectSetup from "@/components/studio/ProjectSetup";
import TemplateBrowser from "@/components/studio/TemplateBrowser";
import EditorView from "@/components/studio/EditorView";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getStoredTheme, setStoredTheme, type Theme } from "@/lib/theme";
import zebraLogoLight from "@/assets/zebra-logo-light.png";

type StudioView = "home" | "setup" | "templates" | "editor";
type DocumentType = "feasibility" | "business-plan" | "strategic-business" | "org-structure" | "performance-tracking" | "business-health";

interface SavedProject {
  id: string;
  name: string;
  sector: string;
  type: string;
  document_type: string;
  contents: Record<string, string>;
  custom_titles: Record<string, string>;
  language: string;
  service_description: string;
  updated_at: string;
}

const Studio = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
  const [showFromFeasibility, setShowFromFeasibility] = useState(false);

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

  // Handle navigation from marketplace with template
  useEffect(() => {
    const state = location.state as any;
    if (state?.resumeProjectId && savedProjects.length > 0) {
      const project = savedProjects.find((p) => p.id === state.resumeProjectId);
      if (project) {
        handleResumeProject(project);
        window.history.replaceState({}, document.title);
      }
    }
  }, [savedProjects, location.state]);

  const handleScratchSetupComplete = async (name: string, sec: string, serviceDesc: string) => {
    setProjectName(name);
    setSector(sec);
    setInitialContents({});
    setInitialCustomTitles({});

    if (userId) {
      const { data, error } = await supabase.from("projects").insert({
        user_id: userId, name, sector: sec, type: "scratch",
        document_type: documentType, language, contents: {} as any, custom_titles: {} as any,
        service_description: serviceDesc,
      } as any).select("id").single();
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

  const handleFromFeasibility = (project: SavedProject) => {
    // Create a business plan based on completed feasibility study
    setProjectName(`${project.name} — Business Plan`);
    setSector(project.sector);
    setDocumentType("business-plan");
    setInitialContents({
      cover: project.contents?.cover || "",
      "1": project.contents?.["1"] || "",
    });
    setInitialCustomTitles({});
    setShowFromFeasibility(false);
    setView("setup");
  };

  // Get completed feasibility studies (more than 5 sections filled)
  const completedFeasibilities = savedProjects.filter(
    (p) => p.document_type === "feasibility" && Object.keys(p.contents || {}).length > 5
  );

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
            <div className="text-center mb-8">
              <h2 className="text-3xl font-display font-bold tracking-tight mb-4">
                {t("Start a New Project", "አዲስ ፕሮጀክት ይጀምሩ")}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                <button onClick={() => { setDocumentType("feasibility"); setView("setup"); }}
                  className="border border-border rounded-lg p-5 hover:bg-secondary transition-colors group text-left">
                  <p className="font-display font-bold text-base mb-1 group-hover:text-primary transition-colors">
                    {t("Feasibility Study", "የተግባራዊነት ጥናት")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("Analyze market viability, financial projections, and operational feasibility.", "የገበያ ተገቢነት፣ የፋይናንስ ትንበያ እና ተግባራዊነት ይተንትኑ።")}
                  </p>
                </button>

                <button onClick={() => { setDocumentType("business-plan"); setView("setup"); }}
                  className="border border-border rounded-lg p-5 hover:bg-secondary transition-colors group text-left">
                  <p className="font-display font-bold text-base mb-1 group-hover:text-primary transition-colors">
                    {t("Business Plan", "የንግድ ዕቅድ")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("Company description, market strategy, financial plan, and growth roadmap.", "የድርጅት መግለጫ፣ የገበያ ስትራቴጂ፣ የፋይናንስ ዕቅድ እና ዕድገት።")}
                  </p>
                </button>

                <button onClick={() => { setDocumentType("strategic-business"); setView("setup"); }}
                  className="border border-border rounded-lg p-5 hover:bg-secondary transition-colors group text-left">
                  <p className="font-display font-bold text-base mb-1 group-hover:text-primary transition-colors">
                    {t("Strategic Business Development", "ስትራቴጂካዊ የንግድ ልማት")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("Growth engine, B2B partnerships, CAC targets, and phased market entry.", "የእድገት ሞተር፣ B2B አጋርነት፣ CAC ዒላማዎች እና ደረጃ በደረጃ የገበያ ግቢ።")}
                  </p>
                </button>

                <button onClick={() => { setDocumentType("org-structure"); setView("setup"); }}
                  className="border border-border rounded-lg p-5 hover:bg-secondary transition-colors group text-left">
                  <p className="font-display font-bold text-base mb-1 group-hover:text-primary transition-colors">
                    {t("Organizational Structure", "ድርጅታዊ አወቃቀር")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("Hierarchy, reporting lines, key roles, and recruitment timeline.", "ተዋረድ፣ የሪፖርት መስመሮች፣ ቁልፍ ሚናዎች እና የቅጥር ሰሌዳ።")}
                  </p>
                </button>

                <button onClick={() => { setDocumentType("performance-tracking"); setView("setup"); }}
                  className="border border-border rounded-lg p-5 hover:bg-secondary transition-colors group text-left">
                  <p className="font-display font-bold text-base mb-1 group-hover:text-primary transition-colors">
                    {t("Performance Tracking", "የአፈጻጸም ክትትል")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("KPIs, project delivery timelines, client retention, and pipeline velocity.", "KPIዎች፣ የፕሮጀክት ጊዜ ሰሌዳ፣ ደንበኛ ማቆየት እና የቧንቧ ፍጥነት።")}
                  </p>
                </button>

                <button onClick={() => { setDocumentType("business-health"); setView("setup"); }}
                  className="border border-border rounded-lg p-5 hover:bg-secondary transition-colors group text-left">
                  <p className="font-display font-bold text-base mb-1 group-hover:text-primary transition-colors">
                    {t("Business Health Analysis", "የንግድ ጤና ትንተና")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("Cash flow, profit margins, risk matrix, and health dashboard alerts.", "የገንዘብ ፍሰት፣ የትርፍ ህዳግ፣ ስጋት ማትሪክስ እና ማንቂያዎች።")}
                  </p>
                </button>
              </div>

              <div className="flex gap-4 justify-center mt-6">
                <Button variant="outline" onClick={() => { setDocumentType("feasibility"); setView("templates"); }}>
                  {t("Browse Templates", "ቅድመ-ቅርጾችን ያስሱ")}
                </Button>
                <Button variant="outline" onClick={() => setShowFromFeasibility(true)}>
                  {t("From Feasibility Study", "ከተግባራዊነት ጥናት")}
                </Button>
              </div>
            </div>

            {/* From Feasibility Study Modal */}
            {showFromFeasibility && (
              <div className="mb-10 border border-primary/30 bg-primary/5 p-6 rounded-sm">
                <h3 className="text-lg font-display font-bold mb-2">{t("Select Completed Feasibility Study", "የተጠናቀቀ ጥናት ይምረጡ")}</h3>
                <p className="text-sm text-muted-foreground mb-4">{t("Create a business plan based on your completed feasibility study.", "ከተጠናቀቀ ጥናት ላይ የንግድ ዕቅድ ይፍጠሩ።")}</p>
                {completedFeasibilities.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("No completed feasibility studies found. Complete a feasibility study first.", "የተጠናቀቀ ጥናት አልተገኘም።")}</p>
                ) : (
                  <div className="space-y-2">
                    {completedFeasibilities.map((p) => (
                      <button key={p.id} onClick={() => handleFromFeasibility(p)}
                        className="w-full text-left border border-border rounded-sm p-3 hover:bg-secondary transition-colors">
                        <p className="font-display font-bold text-sm">{p.name}</p>
                        <p className="text-[10px] font-mono text-muted-foreground">{p.sector} · {Object.keys(p.contents || {}).length} sections</p>
                      </button>
                    ))}
                  </div>
                )}
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowFromFeasibility(false)}>Cancel</Button>
              </div>
            )}

            {/* Resume a Project - below all tools */}
            {!loadingProjects && savedProjects.length > 0 && (
              <div className="mt-8">
                <div className="border-t border-border mb-6" />
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
              </div>
            )}
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
