import jsPDF from "jspdf";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { saveAs } from "file-saver";
import type { OutlineNode } from "./feasibility-outline";

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*\*/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*+]\s+/gm, "• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const flattenNodes = (nodes: OutlineNode[]): OutlineNode[] => {
  const result: OutlineNode[] = [];
  for (const node of nodes) {
    result.push(node);
    if (node.children) result.push(...flattenNodes(node.children));
  }
  return result;
};

export function exportPDF(
  projectName: string,
  outline: OutlineNode[],
  contents: Record<string, string>,
  customTitles: Record<string, string>,
  language: "en" | "am"
) {
  const doc = new jsPDF();
  const nodes = flattenNodes(outline);
  let y = 20;

  doc.setFontSize(22);
  doc.text(projectName, 20, y);
  y += 15;

  for (const node of nodes) {
    const title = customTitles[node.id] || (language === "am" && node.titleAm ? node.titleAm : node.title);
    const content = stripMarkdown(contents[node.id] || "");
    if (!content && node.id !== "cover") continue;

    if (y > 260) { doc.addPage(); y = 20; }

    doc.setFontSize(14);
    doc.text(`${node.id}. ${title}`, 20, y);
    y += 8;

    if (content) {
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(content, 170);
      for (const line of lines) {
        if (y > 280) { doc.addPage(); y = 20; }
        doc.text(line, 20, y);
        y += 5;
      }
      y += 5;
    }
  }

  doc.save(`${projectName}.pdf`);
}

export async function exportDOCX(
  projectName: string,
  outline: OutlineNode[],
  contents: Record<string, string>,
  customTitles: Record<string, string>,
  language: "en" | "am"
) {
  const nodes = flattenNodes(outline);
  const children: Paragraph[] = [
    new Paragraph({ text: projectName, heading: HeadingLevel.TITLE }),
    new Paragraph({ text: "" }),
  ];

  for (const node of nodes) {
    const title = customTitles[node.id] || (language === "am" && node.titleAm ? node.titleAm : node.title);
    const content = stripMarkdown(contents[node.id] || "");
    if (!content && node.id !== "cover") continue;

    children.push(
      new Paragraph({ text: `${node.id}. ${title}`, heading: HeadingLevel.HEADING_2 })
    );

    if (content) {
      const paragraphs = content.split("\n\n");
      for (const p of paragraphs) {
        children.push(new Paragraph({ children: [new TextRun(p.replace(/\n/g, " "))] }));
      }
    }
  }

  const doc = new Document({ sections: [{ children }] });
  const buffer = await Packer.toBlob(doc);
  saveAs(buffer, `${projectName}.docx`);
}
