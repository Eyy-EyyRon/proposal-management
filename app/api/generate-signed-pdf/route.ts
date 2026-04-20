import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      proposalId,
      clientName,
      proposalTitle,
      documentHtml,
      auditSeal,
      auditLog,
      signatureUrl,
    } = body as {
      proposalId: string;
      clientName: string;
      proposalTitle: string;
      documentHtml: string;
      auditSeal: {
        transactionId: string;
        contentHash: string;
        signerIp: string;
        signedAtUtc: string;
        signerName: string;
      };
      auditLog: Array<{
        event: string;
        actor: string;
        timestamp: string;
        ip: string;
      }>;
      signatureUrl?: string;
    };

    if (!proposalId || !auditSeal) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // ── Build full HTML document for PDF rendering ────────────
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Georgia, 'Times New Roman', serif; font-size: 13px; line-height: 1.7; color: #1e293b; background: #fff; }
  .page { max-width: 750px; margin: 0 auto; padding: 48px; }
  h1, h2, h3 { font-family: system-ui, sans-serif; font-weight: 700; color: #0f172a; margin-bottom: 8px; margin-top: 24px; }
  h1 { font-size: 22px; } h2 { font-size: 17px; } h3 { font-size: 14px; }
  p { margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; }
  th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; }
  th { background: #f8fafc; font-weight: 600; font-family: system-ui, sans-serif; }
  /* Audit page */
  .audit-page { page-break-before: always; padding: 48px; max-width: 750px; margin: 0 auto; }
  .seal-box { border: 2px solid #22c55e; border-radius: 12px; padding: 24px; margin-bottom: 32px; background: #f0fdf4; }
  .seal-title { font-family: system-ui, sans-serif; font-size: 18px; font-weight: 800; color: #15803d; margin-bottom: 4px; display: flex; align-items: center; gap: 8px; }
  .seal-subtitle { font-family: system-ui, sans-serif; font-size: 12px; color: #166534; margin-bottom: 20px; }
  .seal-row { display: flex; gap: 12px; margin-bottom: 10px; align-items: flex-start; }
  .seal-label { font-family: system-ui, sans-serif; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; width: 120px; flex-shrink: 0; padding-top: 2px; }
  .seal-value { font-family: 'Courier New', monospace; font-size: 11px; color: #0f172a; word-break: break-all; }
  .sig-box { margin-bottom: 32px; }
  .sig-img { max-height: 80px; border-bottom: 1px solid #94a3b8; padding-bottom: 8px; }
  .sig-line { font-family: system-ui, sans-serif; font-size: 10px; color: #64748b; margin-top: 4px; }
  .audit-table th { background: #1e293b; color: #fff; font-family: system-ui, sans-serif; font-size: 11px; }
  .audit-table td { font-family: system-ui, sans-serif; font-size: 11px; }
  .footer-bar { border-top: 1px solid #e2e8f0; margin-top: 32px; padding-top: 12px; font-family: system-ui, sans-serif; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; }
</style>
</head>
<body>

<!-- ── PROPOSAL CONTENT ── -->
<div class="page">
  <div class="proposal-content">
    ${documentHtml || `<p><em>Document content not available in this copy.</em></p>`}
  </div>
</div>

<!-- ── CERTIFICATE OF COMPLETION ── -->
<div class="audit-page">
  <h2 style="font-family:system-ui,sans-serif;font-size:14px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:24px;">Certificate of Completion</h2>

  <!-- Certified Audit Seal -->
  <div class="seal-box">
    <div class="seal-title">✦ Certified Audit Seal</div>
    <div class="seal-subtitle">This document has been digitally sealed and is legally binding.</div>

    <div class="seal-row">
      <span class="seal-label">Transaction ID</span>
      <span class="seal-value">${auditSeal.transactionId}</span>
    </div>
    <div class="seal-row">
      <span class="seal-label">Document Hash</span>
      <span class="seal-value">${auditSeal.contentHash}</span>
    </div>
    <div class="seal-row">
      <span class="seal-label">Signer Name</span>
      <span class="seal-value">${auditSeal.signerName}</span>
    </div>
    <div class="seal-row">
      <span class="seal-label">Signed At (UTC)</span>
      <span class="seal-value">${auditSeal.signedAtUtc}</span>
    </div>
    <div class="seal-row">
      <span class="seal-label">Signer IP</span>
      <span class="seal-value">${auditSeal.signerIp}</span>
    </div>
  </div>

  ${signatureUrl ? `
  <!-- Signature -->
  <div class="sig-box">
    <p style="font-family:system-ui,sans-serif;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">Electronic Signature</p>
    <img class="sig-img" src="${signatureUrl}" alt="Signature" />
    <div class="sig-line">${auditSeal.signerName} — ${auditSeal.signedAtUtc}</div>
  </div>
  ` : ""}

  <!-- Audit Log Table -->
  <h3 style="font-family:system-ui,sans-serif;font-size:13px;font-weight:700;color:#0f172a;margin-bottom:12px;">Audit Log</h3>
  <table class="audit-table">
    <thead>
      <tr>
        <th>Event</th>
        <th>Actor / Role</th>
        <th>Timestamp</th>
        <th>IP / Device</th>
      </tr>
    </thead>
    <tbody>
      ${(auditLog || []).map(row => `
      <tr>
        <td>${row.event}</td>
        <td>${row.actor}</td>
        <td>${row.timestamp}</td>
        <td style="font-family:'Courier New',monospace;font-size:10px;">${row.ip}</td>
      </tr>`).join("")}
    </tbody>
  </table>

  <div class="footer-bar">
    <span>ProposalMS · Hyacinth Industries</span>
    <span>Proposal: ${proposalTitle} · Client: ${clientName}</span>
    <span>ID: ${proposalId}</span>
  </div>
</div>

</body>
</html>`;

    // Return the HTML as base64 — client uploads to Firebase Storage
    // and updates Firestore with the resulting URL.
    const htmlBase64 = Buffer.from(fullHtml, "utf-8").toString("base64");
    return NextResponse.json({ htmlBase64, filename: `Signed-${clientName.replace(/\s+/g, "-")}-${proposalId.slice(0, 8)}.html` });
  } catch (err) {
    console.error("[generate-signed-pdf]", err);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
