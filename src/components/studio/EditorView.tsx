import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FEASIBILITY_OUTLINE, type OutlineNode } from "@/lib/feasibility-outline";
import { BUSINESS_PLAN_OUTLINE } from "@/lib/business-plan-outline";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronRight,
  ChevronDown,
  Sparkles,
  FileText,
  ArrowLeft,
  Plus,
  Languages,
  Pencil,
  Check,
  Paperclip,
  Image,
  FileUp,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Language = "en" | "am";
type DocumentType = "feasibility" | "business-plan";

interface EditorViewProps {
  projectName: string;
  sector: string;
  documentType: DocumentType;
  onBack: () => void;
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
  node,
  depth,
  activeId,
  onSelect,
  language,
  customTitles,
  onEditTitle,
}: {
  node: OutlineNode;
  depth: number;
  activeId: string;
  onSelect: (id: string) => void;
  language: Language;
  customTitles: Record<string, string>;
  onEditTitle: (id: string, title: string) => void;
}) => {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const hasChildren = node.children && node.children.length > 0;
  const isActive = activeId === node.id;

  const displayTitle = customTitles[node.id] || (language === "am" && node.titleAm ? node.titleAm : node.title);

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditValue(displayTitle);
    setEditing(true);
  };

  const handleSaveEdit = () => {
    if (editValue.trim()) {
      onEditTitle(node.id, editValue.trim());
    }
    setEditing(false);
  };

  return (
    <div>
      <div
        className={`w-full flex items-center gap-1.5 px-3 py-2 text-sm transition-colors group ${
          isActive
            ? "bg-primary text-primary-foreground font-medium"
            : "hover:bg-secondary text-foreground"
        }`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        <button
          onClick={() => {
            onSelect(node.id);
            if (hasChildren) setExpanded(!expanded);
          }}
          className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            )
          ) : (
            <FileText className="h-3.5 w-3.5 shrink-0 opacity-50" />
          )}
          <span className="font-mono text-[10px] opacity-50 w-8 shrink-0">
            {node.id}
          </span>
          {editing ? (
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveEdit();
                if (e.key === "Escape") setEditing(false);
              }}
              className="h-6 text-xs px-1 py-0 bg-background text-foreground"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="truncate">{displayTitle}</span>
          )}
        </button>
        {!editing && (
          <button
            onClick={handleStartEdit}
            className={`opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ${
              isActive ? "text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            <Pencil className="h-3 w-3" />
          </button>
        )}
      </div>
      {hasChildren && expanded && (
        <div>
          {node.children!.map((child) => (
            <NodeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              activeId={activeId}
              onSelect={onSelect}
              language={language}
              customTitles={customTitles}
              onEditTitle={onEditTitle}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const EditorView = ({ projectName, sector, documentType, onBack }: EditorViewProps) => {
  const [activeNodeId, setActiveNodeId] = useState("cover");
  const [contents, setContents] = useState<Record<string, string>>({});
  const [language, setLanguage] = useState<Language>("en");
  const [customTitles, setCustomTitles] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [attachments, setAttachments] = useState<Record<string, File[]>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const outline = documentType === "business-plan" ? BUSINESS_PLAN_OUTLINE : FEASIBILITY_OUTLINE;
  const allNodes = flattenNodes(outline);
  const activeNode = allNodes.find((n) => n.id === activeNodeId);
  const currentContent = contents[activeNodeId] || "";
  const currentAttachments = attachments[activeNodeId] || [];

  const activeTitle =
    customTitles[activeNodeId] ||
    (language === "am" && activeNode?.titleAm ? activeNode.titleAm : activeNode?.title) ||
    "Select a section";

  const handleEditTitle = (id: string, title: string) => {
    setCustomTitles((prev) => ({ ...prev, [id]: title }));
  };

  const handleAIDraft = async () => {
    if (!activeNode) return;
    setIsGenerating(true);

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/draft-section`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            sectionId: activeNodeId,
            sectionTitle: activeTitle,
            projectName,
            sector,
            language,
            documentType,
            existingContent: currentContent || undefined,
          }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Generation failed" }));
        toast({ title: "Error", description: err.error, variant: "destructive" });
        setIsGenerating(false);
        return;
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let generated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              generated += content;
              setContents((prev) => ({ ...prev, [activeNodeId]: generated }));
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "AI generation failed. Please try again.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileSelect = (accept: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      fileInputRef.current.click();
    }
  };

  const handleFilesChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setAttachments((prev) => ({
        ...prev,
        [activeNodeId]: [...(prev[activeNodeId] || []), ...files],
      }));
      toast({ title: `${files.length} file(s) attached to this section` });
    }
    e.target.value = "";
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => ({
      ...prev,
      [activeNodeId]: (prev[activeNodeId] || []).filter((_, i) => i !== idx),
    }));
  };

  const docLabel = documentType === "business-plan" ? "Business Plan" : "Feasibility Study";

  return (
    <div className="flex-1 flex overflow-hidden">
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFilesChosen} />

      {/* Sidebar */}
      <div className="w-72 border-r border-border flex flex-col bg-sidebar">
        <div className="px-4 py-3 border-b border-sidebar-border">
          <div className="flex items-center justify-between mb-1">
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
              {sector}
            </p>
            <button
              onClick={() => setLanguage(language === "en" ? "am" : "en")}
              className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
              title="Toggle language"
            >
              <Languages className="h-3 w-3" />
              {language === "en" ? "EN" : "አማ"}
            </button>
          </div>
          <p className="font-display font-bold text-sm truncate">{projectName}</p>
          <p className="font-mono text-[9px] uppercase text-muted-foreground tracking-wider mt-0.5">{docLabel}</p>
        </div>
        <ScrollArea className="flex-1">
          <div className="py-1">
            {outline.map((node) => (
              <NodeItem
                key={node.id}
                node={node}
                depth={0}
                activeId={activeNodeId}
                onSelect={setActiveNodeId}
                language={language}
                customTitles={customTitles}
                onEditTitle={handleEditTitle}
              />
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Editor */}
      <div className="flex-1 flex flex-col">
        <div className="border-b border-border px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-muted-foreground">
                Section {activeNodeId}
              </p>
              <h3 className="font-display font-bold text-lg tracking-tight leading-tight">
                {activeTitle}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Attach / Add media */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <Plus className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleFileSelect(".pdf,.doc,.docx")}>
                  <FileUp className="h-4 w-4 mr-2" />
                  {language === "en" ? "Add Document (PDF, DOC)" : "ሰነድ ያክሉ"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleFileSelect("image/*")}>
                  <Image className="h-4 w-4 mr-2" />
                  {language === "en" ? "Add Image" : "ምስል ያክሉ"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleFileSelect("*")}>
                  <Paperclip className="h-4 w-4 mr-2" />
                  {language === "en" ? "Add Reference File" : "ማጣቀሻ ፋይል ያክሉ"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Z AI button */}
            <Button size="sm" className="gap-1.5 font-bold" onClick={handleAIDraft} disabled={isGenerating}>
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Z
            </Button>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          {/* Attachments */}
          {currentAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {currentAttachments.map((file, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 bg-secondary text-secondary-foreground text-xs px-2.5 py-1 rounded-sm"
                >
                  <Paperclip className="h-3 w-3" />
                  {file.name}
                  <button onClick={() => removeAttachment(idx)} className="ml-1 hover:text-destructive">×</button>
                </span>
              ))}
            </div>
          )}

          <Textarea
            placeholder={
              language === "en"
                ? `Start writing content for "${activeTitle}"...\n\nOr click "Z" to generate professional content using AI.`
                : `ለ "${activeTitle}" ይዘት መጻፍ ይጀምሩ...\n\nወይም "Z" ን በመጫን AI ሙያዊ ይዘት ያመንጩ።`
            }
            value={currentContent}
            onChange={(e) =>
              setContents((prev) => ({ ...prev, [activeNodeId]: e.target.value }))
            }
            className="min-h-[500px] resize-none border-none shadow-none text-base leading-relaxed focus-visible:ring-0 p-0"
          />
        </div>
      </div>
    </div>
  );
};

export default EditorView;
