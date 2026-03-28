import { useState, useEffect } from "react";
import { ArrowLeft, Languages, Sun, Moon, FileText, TrendingUp, Building2, Activity, HeartPulse, ClipboardList, Settings, Trash2, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import ProjectSetup from "@/components/studio/ProjectSetup";
import TemplateBrowser from "@/components/studio/TemplateBrowser";
import EditorView from "@/components/studio/EditorView";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getStoredTheme, setStoredTheme, type Theme } from "@/lib/theme";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import zebraLogoLight from "@/assets/zebra-logo-light.png";

type StudioView = "home" | "setup" | "templates" | "editor" | "intro";
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

const DOC_TOOLS: { type: DocumentType; icon: any; label: string; labelAm: string; desc: string; descAm: string }[] = [
  { type: "feasibility", icon: FileText, label: "Feasibility Study", labelAm: "የተግባራዊነት ጥናት", desc: "Market viability, financial projections, and operational feasibility.", descAm: "የገበያ ተገቢነት፣ የፋይናንስ ትንበያ እና ተግባራዊነት።" },
  { type: "business-plan", icon: ClipboardList, label: "Business Plan", labelAm: "የንግድ ዕቅድ", desc: "Company description, strategy, financial plan, and growth roadmap.", descAm: "የድርጅት መግለጫ፣ ስትራቴጂ፣ ፋይናንስ እና ዕድገት።" },
  { type: "strategic-business", icon: TrendingUp, label: "Strategic Business Development", labelAm: "ስትራቴጂካዊ የንግድ ልማት", desc: "Growth engine, B2B partnerships, CAC targets, market entry.", descAm: "የእድገት ሞተር፣ B2B አጋርነት፣ CAC ዒላማዎች።" },
  { type: "org-structure", icon: Building2, label: "Organizational Structure", labelAm: "ድርጅታዊ አወቃቀር", desc: "Hierarchy, reporting lines, key roles, recruitment timeline.", descAm: "ተዋረድ፣ ሪፖርት መስመሮች፣ ቁልፍ ሚናዎች።" },
  { type: "performance-tracking", icon: Activity, label: "Performance Tracking", labelAm: "የአፈጻጸም ክትትል", desc: "KPIs, delivery timelines, client retention, pipeline velocity.", descAm: "KPIዎች፣ ጊዜ ሰሌዳ፣ ደንበኛ ማቆየት።" },
  { type: "business-health", icon: HeartPulse, label: "Business Health Analysis", labelAm: "የንግድ ጤና ትንተና", desc: "Cash flow, profit margins, risk matrix, health dashboard.", descAm: "ገንዘብ ፍሰት፣ ትርፍ ህዳግ፣ ስጋት ማትሪክስ።" },
];

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
  const [introChoice, setIntroChoice] = useState<"outline" | "list" | null>(null);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setStoredTheme(next);
  };

  const t = (en: string, am: string) => (language === "en" ? en : am);

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

  const handleScratchSetupComplete = async (name: string, sec: string, serviceDesc: string, loc?: string, scale?: string) => {
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

  const handleDeleteProject = async (projectId: string) => {
    const { error } = await supabase.from("projects").delete().eq("id", projectId);
    if (error) {
      toast({ title: "Error", description: "Failed to delete project", variant: "destructive" });
    } else {
      setSavedProjects((prev) => prev.filter((p) => p.id !== projectId));
      toast({ title: t("Deleted", "ተሰርዟል"), description: t("Project removed.", "ፕሮጀክት ተወግዷል።") });
    }
  };

  const handleFromFeasibility = (project: SavedProject) => {
    setProjectName(`${project.name} — Business Plan`);
    setSector(project.sector);
    setDocumentType("business-plan");
    setInitialContents({ cover: project.contents?.cover || "", "1": project.contents?.["1"] || "" });
    setInitialCustomTitles({});
    setShowFromFeasibility(false);
    setView("setup");
  };

  const completedFeasibilities = savedProjects.filter(
    (p) => p.document_type === "feasibility" && Object.keys(p.contents || {}).length > 5
  );

  const handleToolSelect = (type: DocumentType) => {
    setDocumentType(type);
    setIntroChoice(null);
    setView("intro");
  };

  const handleIntroContinue = () => {
    setView("setup");
  };

  const docTypeLabel = (dt: string) => DOC_TOOLS.find((d) => d.type === dt)?.[language === "am" ? "labelAm" : "label"] || dt;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border h-14 flex items-center px-4 sm:px-6 justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
            if (view === "home") navigate("/");
            else setView("home");
          }}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <img src={zebraLogoLight} alt="Zebra" className="h-6 object-contain hidden sm:block" />
          <span className="font-display text-base sm:text-lg font-bold tracking-tighter truncate max-w-[150px] sm:max-w-none">
            {displayName || "Studio"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
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
            <Button size="sm" className="hidden sm:inline-flex" onClick={() => { setDocumentType("feasibility"); setView("intro"); }}>
              {t("New Project", "አዲስ ፕሮጀክት")}
            </Button>
          )}
        </div>
      </header>

      {/* HOME VIEW */}
      {view === "home" && (
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="w-full max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <h2 className="text-2xl sm:text-3xl font-display font-bold tracking-tight mb-2">
                {t("Start a New Project", "አዲስ ፕሮጀክት ይጀምሩ")}
              </h2>
              <p className="text-sm text-muted-foreground">{t("Choose a document tool to begin", "ለመጀመር የሰነድ መሣሪያ ይምረጡ")}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {DOC_TOOLS.map((tool) => {
                const Icon = tool.icon;
                return (
                  <button key={tool.type} onClick={() => handleToolSelect(tool.type)}
                    className="border border-border rounded-lg p-4 sm:p-5 hover:bg-secondary transition-colors group text-left flex gap-3">
                    <Icon className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="font-display font-bold text-sm mb-0.5 group-hover:text-primary transition-colors">
                        {language === "am" ? tool.labelAm : tool.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        {language === "am" ? tool.descAm : tool.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-3 justify-center mb-6">
              <Button variant="outline" size="sm" onClick={() => { setDocumentType("feasibility"); setView("templates"); }}>
                {t("Browse Templates", "ቅድመ-ቅርጾችን ያስሱ")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowFromFeasibility(true)}>
                {t("From Feasibility Study", "ከተግባራዊነት ጥናት")}
              </Button>
            </div>

            {/* From Feasibility Study */}
            {showFromFeasibility && (
              <div className="mb-8 border border-primary/30 bg-primary/5 p-4 sm:p-6 rounded-lg">
                <h3 className="text-base font-display font-bold mb-2">{t("Select Completed Feasibility Study", "የተጠናቀቀ ጥናት ይምረጡ")}</h3>
                <p className="text-xs text-muted-foreground mb-4">{t("Create a business plan based on your completed feasibility study.", "ከተጠናቀቀ ጥናት ላይ የንግድ ዕቅድ ይፍጠሩ።")}</p>
                {completedFeasibilities.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("No completed feasibility studies found.", "የተጠናቀቀ ጥናት አልተገኘም።")}</p>
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

            {/* Resume Projects */}
            {!loadingProjects && savedProjects.length > 0 && (
              <div className="mt-6">
                <div className="border-t border-border mb-4" />
                <h3 className="text-base font-display font-bold mb-3">
                  {t("Resume a Project", "ፕሮጀክት ይቀጥሉ")}
                </h3>
                <div className="space-y-2">
                  {savedProjects.map((p) => (
                    <div key={p.id} className="w-full border border-border rounded-sm p-3 sm:p-4 hover:bg-secondary transition-colors flex items-center justify-between gap-2">
                      <button onClick={() => handleResumeProject(p)} className="flex-1 text-left min-w-0">
                        <p className="font-display font-bold text-sm truncate">{p.name}</p>
                        <p className="text-[10px] font-mono text-muted-foreground">{p.sector} · {docTypeLabel(p.document_type || "feasibility")}</p>
                      </button>
                      <div className="flex items-center gap-1 shrink-0">
                        <p className="text-[10px] text-muted-foreground font-mono hidden sm:block">
                          {new Date(p.updated_at).toLocaleDateString()}
                        </p>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleResumeProject(p)} title={t("Settings", "ቅንብሮች")}>
                          <Settings className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" title={t("Delete", "ሰርዝ")}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t("Delete Project?", "ፕሮጀክት ይሰረዝ?")}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t(`Are you sure you want to delete "${p.name}"? This cannot be undone.`, `"${p.name}" ን ለመሰረዝ እርግጠኛ ነዎት? ይህ ሊቀለበስ አይችልም።`)}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t("Cancel", "ይቅር")}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteProject(p.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                {t("Delete", "ሰርዝ")}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      )}

      {/* INTRO VIEW - Document structure choice */}
      {view === "intro" && (
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-md space-y-6 text-center">
            <div>
              <p className="font-mono text-xs tracking-[0.3em] uppercase text-muted-foreground mb-2">
                {docTypeLabel(documentType)}
              </p>
              <h2 className="text-2xl sm:text-3xl font-display font-bold tracking-tight mb-2">
                {t("How would you like to structure your document?", "ሰነድዎን እንዴት ማዋቀር ይፈልጋሉ?")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("Choose a starting structure for your new project.", "ለአዲሱ ፕሮጀክትዎ የመነሻ አወቃቀር ይምረጡ።")}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => { setIntroChoice("outline"); }}
                className={`border rounded-lg p-6 text-left transition-all ${
                  introChoice === "outline" ? "border-primary bg-primary/5 ring-2 ring-primary" : "border-border hover:bg-secondary"
                }`}
              >
                <ClipboardList className="h-8 w-8 text-primary mb-3" />
                <p className="font-display font-bold text-base mb-1">{t("Outline View", "ንድፍ እይታ")}</p>
                <p className="text-xs text-muted-foreground">{t("Follow a structured outline with numbered sections and subsections.", "በቁጥር የተደረደሩ ክፍሎች እና ንዑስ ክፍሎች ይከተሉ።")}</p>
              </button>
              <button
                onClick={() => { setIntroChoice("list"); }}
                className={`border rounded-lg p-6 text-left transition-all ${
                  introChoice === "list" ? "border-primary bg-primary/5 ring-2 ring-primary" : "border-border hover:bg-secondary"
                }`}
              >
                <FileText className="h-8 w-8 text-primary mb-3" />
                <p className="font-display font-bold text-base mb-1">{t("Free Writing", "ነፃ ጽሑፍ")}</p>
                <p className="text-xs text-muted-foreground">{t("Write freely with a simple list of sections. Add, remove, or reorder as needed.", "በቀላል ዝርዝር ክፍሎች በነፃ ይጻፉ።")}</p>
              </button>
            </div>

            <Button className="w-full h-11" disabled={!introChoice} onClick={handleIntroContinue}>
              {t("Continue", "ይቀጥሉ")}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setView("home")}>
              {t("← Back", "← ተመለስ")}
            </Button>
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
