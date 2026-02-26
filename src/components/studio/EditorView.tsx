import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FEASIBILITY_OUTLINE, type OutlineNode } from "@/lib/feasibility-outline";
import {
  ChevronRight,
  ChevronDown,
  Sparkles,
  FileText,
  ArrowLeft,
} from "lucide-react";

interface EditorViewProps {
  projectName: string;
  sector: string;
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
}: {
  node: OutlineNode;
  depth: number;
  activeId: string;
  onSelect: (id: string) => void;
}) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const isActive = activeId === node.id;

  return (
    <div>
      <button
        onClick={() => {
          onSelect(node.id);
          if (hasChildren) setExpanded(!expanded);
        }}
        className={`w-full text-left flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${
          isActive
            ? "bg-foreground text-background font-medium"
            : "hover:bg-secondary text-foreground"
        }`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          )
        ) : (
          <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="font-mono text-[10px] text-muted-foreground w-8 shrink-0">
          {node.id}
        </span>
        <span className="truncate">{node.title}</span>
      </button>
      {hasChildren && expanded && (
        <div>
          {node.children!.map((child) => (
            <NodeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              activeId={activeId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const EditorView = ({ projectName, sector, onBack }: EditorViewProps) => {
  const [activeNodeId, setActiveNodeId] = useState("cover");
  const [contents, setContents] = useState<Record<string, string>>({});

  const allNodes = flattenNodes(FEASIBILITY_OUTLINE);
  const activeNode = allNodes.find((n) => n.id === activeNodeId);

  const currentContent = contents[activeNodeId] || "";

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Sidebar - Node Navigation */}
      <div className="w-72 border-r border-border flex flex-col bg-sidebar">
        <div className="px-4 py-3 border-b border-sidebar-border">
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
            {sector}
          </p>
          <p className="font-display font-bold text-sm truncate mt-0.5">
            {projectName}
          </p>
        </div>
        <ScrollArea className="flex-1">
          <div className="py-1">
            {FEASIBILITY_OUTLINE.map((node) => (
              <NodeItem
                key={node.id}
                node={node}
                depth={0}
                activeId={activeNodeId}
                onSelect={setActiveNodeId}
              />
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Editor Area */}
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
                {activeNode?.title || "Select a section"}
              </h3>
            </div>
          </div>
          <Button size="sm" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Z AI — Draft
          </Button>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          <Textarea
            placeholder={`Start writing content for "${activeNode?.title}"...\n\nOr click "Z AI — Draft" to generate professional content using AI.`}
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
