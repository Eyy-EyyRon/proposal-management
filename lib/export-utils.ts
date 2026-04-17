import type { Proposal } from "./firestore";

// ─── CSV Export ──────────────────────────────────────────────
export function exportProposalsCsv(proposals: Proposal[]): void {
  const headers = [
    "Client Name",
    "Client Email",
    "Template",
    "Status",
    "Created",
    "Viewed",
    "Signed",
  ];

  const rows = proposals.map((p) => [
    p.clientName,
    p.clientEmail,
    p.templateName,
    p.status,
    formatTs(p.createdAt),
    formatTs(p.viewedAt),
    formatTs(p.signedAt),
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");

  downloadBlob(csv, "proposals-export.csv", "text/csv;charset=utf-8;");
}

// ─── JSON Export ─────────────────────────────────────────────
export function exportProposalsJson(proposals: Proposal[]): void {
  const data = proposals.map((p) => ({
    id: p.id,
    clientName: p.clientName,
    clientEmail: p.clientEmail,
    templateName: p.templateName,
    status: p.status,
    createdAt: formatTs(p.createdAt),
    viewedAt: formatTs(p.viewedAt),
    signedAt: formatTs(p.signedAt),
    fieldValues: p.fieldValues,
  }));

  const json = JSON.stringify(data, null, 2);
  downloadBlob(json, "proposals-export.json", "application/json");
}

// ─── PDF Export (single proposal) ────────────────────────────
export async function exportProposalPdf(
  contentEl: HTMLElement,
  filename: string
): Promise<void> {
  const html2canvas = (await import("html2canvas-pro")).default;
  const { jsPDF } = await import("jspdf");

  const canvas = await html2canvas(contentEl, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
  });

  const imgData = canvas.toDataURL("image/png");
  const imgWidth = 210; // A4 mm
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  const pdf = new jsPDF("p", "mm", "a4");
  let position = 0;
  const pageHeight = 297;

  // Multi-page support
  let remaining = imgHeight;
  while (remaining > 0) {
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    remaining -= pageHeight;
    if (remaining > 0) {
      position -= pageHeight;
      pdf.addPage();
    }
  }

  pdf.save(filename);
}

// ─── Helpers ─────────────────────────────────────────────────
function formatTs(ts: unknown): string {
  if (!ts || typeof ts !== "object") return "";
  const secs = (ts as { seconds: number }).seconds;
  if (!secs) return "";
  return new Date(secs * 1000).toISOString();
}

function downloadBlob(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
