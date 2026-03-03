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

/**
 * For Amharic PDF: uses browser's print API which properly handles Ge'ez script.
 * For English PDF: uses jsPDF for direct generation.
 */
export function exportPDF(
  projectName: string,
  outline: OutlineNode[],
  contents: Record<string, string>,
  customTitles: Record<string, string>,
  language: "en" | "am"
) {
  if (language === "am") {
    exportPDFViaPrint(projectName, outline, contents, customTitles, language);
    return;
  }

  const doc = new jsPDF();
  const nodes = flattenNodes(outline);
  let y = 20;

  doc.setFontSize(22);
  doc.text(projectName, 20, y);
  y += 15;

  for (const node of nodes) {
    const title = customTitles[node.id] || node.title;
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

/**
 * Amharic PDF export via browser print - properly renders Ge'ez script
 */
function exportPDFViaPrint(
  projectName: string,
  outline: OutlineNode[],
  contents: Record<string, string>,
  customTitles: Record<string, string>,
  language: "en" | "am"
) {
  const nodes = flattenNodes(outline);
  const today = new Date().toLocaleDateString("am-ET");

  let html = `<!DOCTYPE html><html><head>
    <meta charset="utf-8">
    <title>${projectName}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Ethiopic:wght@400;600;700&family=Space+Grotesk:wght@400;600;700&display=swap');
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Noto Sans Ethiopic', 'Space Grotesk', sans-serif; color: #333; line-height: 1.8; padding: 40px; }
      .cover { text-align: center; page-break-after: always; padding: 80px 40px; border: 2px solid #364954; margin-bottom: 40px; }
      .cover h1 { font-size: 28px; color: #364954; margin-bottom: 8px; }
      .cover .sector { font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: #FF7A1A; margin-bottom: 30px; }
      .cover .date { font-size: 13px; color: #888; }
      .cover .cover-content { font-size: 14px; color: #666; white-space: pre-wrap; margin-top: 20px; }
      .toc { page-break-after: always; margin-bottom: 40px; }
      .toc h2 { font-size: 22px; color: #364954; margin-bottom: 16px; border-bottom: 2px solid #FF7A1A; padding-bottom: 8px; }
      .toc-item { padding: 4px 0; border-bottom: 1px dotted #ddd; font-size: 14px; }
      .toc-item .num { color: #999; font-size: 11px; margin-right: 8px; }
      .section { margin-bottom: 30px; page-break-inside: avoid; }
      .section h2 { font-size: 18px; color: #364954; border-bottom: 2px solid #FF7A1A; padding-bottom: 6px; margin-bottom: 12px; }
      .section .num { color: #999; font-size: 11px; margin-right: 6px; }
      .section p { font-size: 14px; white-space: pre-wrap; margin-bottom: 10px; }
      @media print { body { padding: 20px; } .cover { margin-bottom: 0; } }
    </style>
  </head><body>`;

  // Cover page
  html += `<div class="cover"><h1>${projectName}</h1>`;
  html += `<div class="sector">${language === "am" ? "የተግባራዊነት ጥናት" : "Feasibility Study"}</div>`;
  if (contents["cover"]) html += `<div class="cover-content">${stripMarkdown(contents["cover"])}</div>`;
  html += `<div class="date">${today}</div></div>`;

  // TOC
  html += `<div class="toc"><h2>${language === "am" ? "ማውጫ" : "Table of Contents"}</h2>`;
  for (const node of nodes) {
    if (!contents[node.id] && node.id !== "cover") continue;
    const title = customTitles[node.id] || (language === "am" && node.titleAm ? node.titleAm : node.title);
    html += `<div class="toc-item"><span class="num">${node.id}</span>${title}</div>`;
  }
  html += `</div>`;

  // Sections
  for (const node of nodes) {
    const content = stripMarkdown(contents[node.id] || "");
    if (!content && node.id !== "cover") continue;
    const title = customTitles[node.id] || (language === "am" && node.titleAm ? node.titleAm : node.title);
    html += `<div class="section"><h2><span class="num">${node.id}.</span> ${title}</h2>`;
    if (content) html += `<p>${content}</p>`;
    html += `</div>`;
  }

  html += `</body></html>`;

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  setTimeout(() => { printWindow.print(); }, 800);
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
