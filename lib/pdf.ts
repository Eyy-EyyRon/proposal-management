// PDF generation utility for proposals
// Uses the template + dynamic field values to produce a shareable PDF

interface ProposalPdfData {
  templateName: string;
  fieldValues: Record<string, string>;
  createdAt: string;
  proposalId: string;
}

export async function generateProposalPdf(data: ProposalPdfData): Promise<Blob> {
  // TODO: In production, use one of these approaches:
  //
  // Option A: Client-side with jsPDF
  //   import jsPDF from "jspdf";
  //   const doc = new jsPDF();
  //   doc.setFontSize(24);
  //   doc.text(data.templateName, 20, 30);
  //   // ... add field values, formatting
  //   return doc.output("blob");
  //
  // Option B: Server-side with a Cloud Function
  //   const response = await fetch("/api/generate-pdf", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify(data),
  //   });
  //   return response.blob();
  //
  // Option C: Use docx-pdf to convert uploaded DOCX with fields replaced
  //   - Fetch DOCX from Firebase Storage
  //   - Replace placeholder fields with actual values
  //   - Convert to PDF using docx-pdf or a serverless function

  // Mock implementation: generate a simple HTML-to-PDF
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #1e293b; }
        h1 { font-size: 28px; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; }
        .field { margin: 16px 0; }
        .field-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
        .field-value { font-size: 16px; color: #1e293b; margin-top: 4px; }
        .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 12px; color: #94a3b8; }
        .signature-line { margin-top: 60px; border-top: 1px solid #1e293b; width: 300px; padding-top: 8px; font-size: 14px; }
      </style>
    </head>
    <body>
      <h1>${data.templateName}</h1>
      ${Object.entries(data.fieldValues)
        .map(
          ([key, value]) => `
        <div class="field">
          <div class="field-label">${key}</div>
          <div class="field-value">${value}</div>
        </div>
      `
        )
        .join("")}
      <div class="signature-line">
        Signature: ________________________
      </div>
      <div class="footer">
        Proposal ID: ${data.proposalId} | Generated on ${data.createdAt}
      </div>
    </body>
    </html>
  `;

  // Return as a Blob (in production, this would be a proper PDF)
  return new Blob([htmlContent], { type: "text/html" });
}

export function getProposalPdfUrl(proposalId: string): string {
  // TODO: Return the actual Firebase Storage URL for the generated PDF
  // return `https://firebasestorage.googleapis.com/v0/b/YOUR_BUCKET/o/proposals%2F${proposalId}%2Fproposal.pdf?alt=media`;
  return `/api/proposals/${proposalId}/pdf`;
}
