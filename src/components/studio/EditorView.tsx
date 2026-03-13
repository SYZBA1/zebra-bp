import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FEASIBILITY_OUTLINE, type OutlineNode } from "@/lib/feasibility-outline";
import { BUSINESS_PLAN_OUTLINE } from "@/lib/business-plan-outline";
import { STRATEGIC_BUSINESS_OUTLINE } from "@/lib/strategic-business-outline";
import { ORG_STRUCTURE_OUTLINE } from "@/lib/org-structure-outline";
import { PERFORMANCE_TRACKING_OUTLINE } from "@/lib/performance-tracking-outline";
import { BUSINESS_HEALTH_OUTLINE } from "@/lib/business-health-outline";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { exportPDF, exportDOCX } from "@/lib/export-document";
import WritingProgress from "./WritingProgress";
import PrintPreview from "./PrintPreview";
import {
  ChevronRight, ChevronDown, Sparkles, FileText, ArrowLeft, Plus, Languages,
  Pencil, Paperclip, Image, FileUp, Loader2, Download, Eye,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Language = "en" | "am";
type DocumentType = "feasibility" | "business-plan" | "strategic-business" | "org-structure" | "performance-tracking" | "business-health";

interface EditorViewProps {
  projectName: string;
  sector: string;
  documentType: DocumentType;
  onBack: () => void;
  projectId?: string;
  initialContents?: Record<string, string>;
  initialCustomTitles?: Record<string, string>;
  initialLanguage?: Language;
}

const flattenNodes = (nodes: OutlineNode[]): OutlineNode[] => {
  const result: OutlineNode[] = [];
  for (const node of nodes) {
    result.push(node);
    if (node.children) result.push(...flattenNodes(node.children));
  }
  return result;
};

const NodeItem = ({
  node, depth, activeId, onSelect, language, customTitles, onEditTitle,
}: {
  node: OutlineNode; depth: number; activeId: string; onSelect: (id: string) => void;
  language: Language; customTitles: Record<string, string>; onEditTitle: (id: string, title: string) => void;
}) => {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const hasChildren = node.children && node.children.length > 0;
  const isActive = activeId === node.id;
  const displayTitle = customTitles[node.id] || (language === "am" && node.titleAm ? node.titleAm : node.title);

  const handleStartEdit = (e: React.MouseEvent) => { e.stopPropagation(); setEditValue(displayTitle); setEditing(true); };
  const handleSaveEdit = () => { if (editValue.trim()) onEditTitle(node.id, editValue.trim()); setEditing(false); };

  return (
    <div>
      <div
        className={`w-full flex items-center gap-1.5 px-3 py-2 text-sm transition-colors group ${
          isActive ? "bg-primary text-primary-foreground font-medium" : "hover:bg-secondary text-foreground"
        }`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        <button onClick={() => { onSelect(node.id); if (hasChildren) setExpanded(!expanded); }}
          className="flex items-center gap-1.5 flex-1 min-w-0 text-left">
          {hasChildren ? (expanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />) : <FileText className="h-3.5 w-3.5 shrink-0 opacity-50" />}
          <span className="font-mono text-[10px] opacity-50 w-8 shrink-0">{node.id}</span>
          {editing ? (
            <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={handleSaveEdit}
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(); if (e.key === "Escape") setEditing(false); }}
              className="h-6 text-xs px-1 py-0 bg-background text-foreground" autoFocus onClick={(e) => e.stopPropagation()} />
          ) : <span className="truncate">{displayTitle}</span>}
        </button>
        {!editing && (
          <button onClick={handleStartEdit} className={`opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`}>
            <Pencil className="h-3 w-3" />
          </button>
        )}
      </div>
      {hasChildren && expanded && (
        <div>{node.children!.map((child) => (
          <NodeItem key={child.id} node={child} depth={depth + 1} activeId={activeId} onSelect={onSelect} language={language} customTitles={customTitles} onEditTitle={onEditTitle} />
        ))}</div>
      )}
    </div>
  );
};

const EditorView = ({ projectName, sector, documentType, onBack, projectId, initialContents, initialCustomTitles, initialLanguage }: EditorViewProps) => {
  const [activeNodeId, setActiveNodeId] = useState("cover");
  const [contents, setContents] = useState<Record<string, string>>(initialContents || {});
  const [language, setLanguage] = useState<Language>(initialLanguage || "en");
  const [customTitles, setCustomTitles] = useState<Record<string, string>>(initialCustomTitles || {});
  const [isGenerating, setIsGenerating] = useState(false);
  const [attachments, setAttachments] = useState<Record<string, { file: File; url: string }[]>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const outlineMap: Record<DocumentType, OutlineNode[]> = {
    "feasibility": FEASIBILITY_OUTLINE,
    "business-plan": BUSINESS_PLAN_OUTLINE,
    "strategic-business": STRATEGIC_BUSINESS_OUTLINE,
    "org-structure": ORG_STRUCTURE_OUTLINE,
    "performance-tracking": PERFORMANCE_TRACKING_OUTLINE,
    "business-health": BUSINESS_HEALTH_OUTLINE,
  };
  const outline = outlineMap[documentType] || FEASIBILITY_OUTLINE;
  const allNodes = flattenNodes(outline);
  const activeNode = allNodes.find((n) => n.id === activeNodeId);
  const currentContent = contents[activeNodeId] || "";
  const currentAttachments = attachments[activeNodeId] || [];

  const activeTitle = customTitles[activeNodeId] || (language === "am" && activeNode?.titleAm ? activeNode.titleAm : activeNode?.title) || "Select a section";

  const handleEditTitle = (id: string, title: string) => setCustomTitles((prev) => ({ ...prev, [id]: title }));

  // Auto-save to DB
  const saveToDb = useCallback(async (c: Record<string, string>, ct: Record<string, string>) => {
    if (!projectId) return;
    await supabase.from("projects").update({
      contents: c as any,
      custom_titles: ct as any,
      language,
      updated_at: new Date().toISOString(),
    }).eq("id", projectId);
  }, [projectId, language]);

  useEffect(() => {
    if (!projectId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveToDb(contents, customTitles), 2000);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [contents, customTitles, saveToDb, projectId]);

  const handleAIDraft = async () => {
    if (!activeNode) return;
    setIsGenerating(true);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/draft-section`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ sectionId: activeNodeId, sectionTitle: activeTitle, projectName, sector, language, documentType, existingContent: currentContent || undefined }),
      });
      if (!resp.ok) { const err = await resp.json().catch(() => ({ error: "Generation failed" })); toast({ title: "Error", description: err.error, variant: "destructive" }); return; }
      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No response body");
      const decoder = new TextDecoder();
      let buffer = ""; let generated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx); buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try { const p = JSON.parse(jsonStr); const c = p.choices?.[0]?.delta?.content; if (c) { generated += c; setContents((prev) => ({ ...prev, [activeNodeId]: generated })); } }
          catch { buffer = line + "\n" + buffer; break; }
        }
      }
    } catch (e) { console.error(e); toast({ title: "Error", description: "AI generation failed.", variant: "destructive" }); }
    finally { setIsGenerating(false); }
  };

  const handleFileSelect = (accept: string) => { if (fileInputRef.current) { fileInputRef.current.accept = accept; fileInputRef.current.click(); } };
  const handleFilesChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const newAttachments = files.map((file) => ({ file, url: URL.createObjectURL(file) }));
      setAttachments((prev) => ({ ...prev, [activeNodeId]: [...(prev[activeNodeId] || []), ...newAttachments] }));
      toast({ title: `${files.length} file(s) attached` });
    }
    e.target.value = "";
  };
  const removeAttachment = (idx: number) => {
    const att = attachments[activeNodeId]?.[idx];
    if (att) URL.revokeObjectURL(att.url);
    setAttachments((prev) => ({ ...prev, [activeNodeId]: (prev[activeNodeId] || []).filter((_, i) => i !== idx) }));
  };

  const isImage = (name: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name);
  const isPDF = (name: string) => /\.pdf$/i.test(name);

  const docLabel = documentType === "business-plan" ? "Business Plan" : "Feasibility Study";

  return (
    <div className="flex-1 flex overflow-hidden">
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFilesChosen} />

      {/* Sidebar */}
      <div className="w-72 border-r border-border flex flex-col bg-sidebar">
        <div className="px-4 py-3 border-b border-sidebar-border">
          <div className="flex items-center justify-between mb-1">
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{sector}</p>
            <button onClick={() => setLanguage(language === "en" ? "am" : "en")}
              className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground hover:bg-accent transition-colors" title="Toggle language">
              <Languages className="h-3 w-3" />{language === "en" ? "EN" : "አማ"}
            </button>
          </div>
          <p className="font-display font-bold text-sm truncate">{projectName}</p>
          <p className="font-mono text-[9px] uppercase text-muted-foreground tracking-wider mt-0.5">{docLabel}</p>
        </div>

        <WritingProgress outline={outline} contents={contents} language={language} customTitles={customTitles} />

        <ScrollArea className="flex-1">
          <div className="py-1">
            {outline.map((node) => (
              <NodeItem key={node.id} node={node} depth={0} activeId={activeNodeId} onSelect={setActiveNodeId} language={language} customTitles={customTitles} onEditTitle={handleEditTitle} />
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Editor */}
      <div className="flex-1 flex flex-col">
        <div className="border-b border-border px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
            <div>
              <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-muted-foreground">Section {activeNodeId}</p>
              <h3 className="font-display font-bold text-lg tracking-tight leading-tight">{activeTitle}</h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Print Preview */}
            <PrintPreview
              projectName={projectName}
              sector={sector}
              documentType={documentType}
              outline={outline}
              contents={contents}
              customTitles={customTitles}
              language={language}
            >
              <Button variant="outline" size="icon" className="h-9 w-9" title="Print Preview">
                <Eye className="h-4 w-4" />
              </Button>
            </PrintPreview>

            {/* Export */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9"><Download className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportPDF(projectName, outline, contents, customTitles, language)}>
                  {language === "en" ? "Export as PDF" : "PDF አድርጎ ይላኩ"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportDOCX(projectName, outline, contents, customTitles, language)}>
                  {language === "en" ? "Export as DOCX" : "DOCX አድርጎ ይላኩ"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Attach */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9"><Plus className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleFileSelect(".pdf,.doc,.docx")}><FileUp className="h-4 w-4 mr-2" />{language === "en" ? "Add Document" : "ሰነድ ያክሉ"}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleFileSelect("image/*")}><Image className="h-4 w-4 mr-2" />{language === "en" ? "Add Image" : "ምስል ያክሉ"}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleFileSelect("*")}><Paperclip className="h-4 w-4 mr-2" />{language === "en" ? "Add Reference" : "ማጣቀሻ ያክሉ"}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button size="sm" className="gap-1.5 font-bold" onClick={handleAIDraft} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Z
            </Button>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          {/* Attachments Display */}
          {currentAttachments.length > 0 && (
            <div className="mb-4 space-y-3">
              <p className="text-xs font-mono uppercase text-muted-foreground tracking-wider">
                {language === "en" ? "Attachments" : "አባሪዎች"} ({currentAttachments.length})
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {currentAttachments.map((att, idx) => (
                  <div key={idx} className="border border-border rounded-sm overflow-hidden group relative">
                    {isImage(att.file.name) ? (
                      <img src={att.url} alt={att.file.name} className="w-full h-32 object-cover" />
                    ) : isPDF(att.file.name) ? (
                      <div className="h-32 flex items-center justify-center bg-secondary">
                        <div className="text-center">
                          <FileUp className="h-8 w-8 text-primary mx-auto mb-1" />
                          <p className="text-[10px] font-mono text-muted-foreground">PDF</p>
                        </div>
                      </div>
                    ) : (
                      <div className="h-32 flex items-center justify-center bg-secondary">
                        <div className="text-center">
                          <Paperclip className="h-8 w-8 text-muted-foreground mx-auto mb-1" />
                          <p className="text-[10px] font-mono text-muted-foreground">{att.file.name.split(".").pop()?.toUpperCase()}</p>
                        </div>
                      </div>
                    )}
                    <div className="p-2 flex items-center justify-between">
                      <p className="text-[10px] font-mono text-muted-foreground truncate flex-1">{att.file.name}</p>
                      <button onClick={() => removeAttachment(idx)} className="text-muted-foreground hover:text-destructive ml-1">
                        <span className="text-xs">×</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Textarea
            placeholder={language === "en" ? `Start writing content for "${activeTitle}"...\n\nOr click "Z" to generate professional content using AI.` : `ለ "${activeTitle}" ይዘት መጻፍ ይጀምሩ...\n\nወይም "Z" ን በመጫን AI ሙያዊ ይዘት ያመንጩ።`}
            value={currentContent}
            onChange={(e) => setContents((prev) => ({ ...prev, [activeNodeId]: e.target.value }))}
            className="min-h-[400px] resize-none border-none shadow-none text-base leading-relaxed focus-visible:ring-0 p-0"
          />
        </div>
      </div>
    </div>
  );
};

export default EditorView;
