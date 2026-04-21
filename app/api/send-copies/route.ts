import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    
    if (!apiKey) {
      console.error("RESEND_API_KEY is missing.");
      return NextResponse.json({ error: "Email service not configured" }, { status: 500 });
    }

    const resend = new Resend(apiKey);
    const body = await req.json();
    
    const {
      proposalId,
      clientEmail,
      clientName,
      staffId,
    } = body as {
      proposalId: string;
      clientEmail: string;
      clientName: string;
      staffId: string;
    };

    if (!proposalId || !staffId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Fetch staff details from Firestore
    const staffSnap = await getDoc(doc(db, "users", staffId));
    let staffEmail: string | null = null;
    let staffName = "Team Member";
    
    if (staffSnap.exists()) {
      const staffData = staffSnap.data();
      staffEmail = staffData.email || null;
      staffName = `${staffData.firstName || ""} ${staffData.lastName || ""}`.trim() || staffData.email || "Team Member";
    }

    // Fetch proposal details
    const proposalSnap = await getDoc(doc(db, "proposals", proposalId));
    let proposalTitle = "Proposal";
    let templateName = "";
    
    if (proposalSnap.exists()) {
      const proposalData = proposalSnap.data();
      proposalTitle = proposalData.templateName || "Proposal";
      templateName = proposalData.templateName || "";
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const staffDashboardUrl = `${appUrl}/dashboard/proposals/${proposalId}`;
    const clientPortalUrl = `${appUrl}/p/${proposalId}`;

    const fromAddress = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    const fromName = "Hyacinth Proposal System";

    // 1. Send email to STAFF (notification that document was signed)
    if (staffEmail) {
      const staffEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,0.06);overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:32px 40px;text-align:center;">
              <div style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">Hyacinth Proposal System</div>
            </td>
          </tr>

          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">
                Document Signed ✓
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6;">
                Good news! <strong>${clientName}</strong> has signed the proposal${templateName ? `: <strong>${templateName}</strong>` : ""}.
              </p>

              <div style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:24px;">
                <p style="margin:0;font-size:14px;color:#166534;line-height:1.5;">
                  <strong>Status:</strong> Legally Signed<br/>
                  <strong>Client:</strong> ${clientName}<br/>
                  <strong>Email:</strong> ${clientEmail}
                </p>
              </div>

              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="border-radius:12px;background:linear-gradient(135deg,#0f172a 0%,#334155 100%);">
                    <a href="${staffDashboardUrl}" target="_blank" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:-0.01em;">
                      View in Dashboard →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:32px 0 0;font-size:13px;color:#94a3b8;line-height:1.6;">
                Or copy and paste this link:<br/>
                <a href="${staffDashboardUrl}" style="color:#6366f1;word-break:break-all;">${staffDashboardUrl}</a>
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #f1f5f9;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                Sent via <strong style="color:#64748b;">Hyacinth Proposal System</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

      await resend.emails.send({
        from: `${fromName} <${fromAddress}>`,
        to: [staffEmail],
        subject: `✓ Signed: ${clientName} has signed the proposal`,
        html: staffEmailHtml,
      });
    }

    // 2. Send email to CLIENT (confirmation with download link)
    if (clientEmail && clientEmail !== "client@example.com") {
      const clientEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,0.06);overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#059669 0%,#10b981 100%);padding:32px 40px;text-align:center;">
              <div style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">Hyacinth Proposal System</div>
            </td>
          </tr>

          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">
                Thank You for Signing! ✓
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6;">
                Hi ${clientName}, your signature has been recorded and the document is now legally binding.
              </p>

              <div style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:24px;">
                <p style="margin:0 0 12px;font-size:14px;color:#166534;line-height:1.5;">
                  <strong>Your document has been successfully signed!</strong>
                </p>
                <p style="margin:0;font-size:13px;color:#15803d;line-height:1.5;">
                  You can download your signed copy anytime by visiting the portal link below.
                </p>
              </div>

              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="border-radius:12px;background:linear-gradient(135deg,#059669 0%,#10b981 100%);">
                    <a href="${clientPortalUrl}" target="_blank" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:-0.01em;">
                      View & Download Signed Document →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;font-size:13px;color:#64748b;line-height:1.6;">
                Once on the portal, click the <strong>"Download Signed PDF"</strong> button to save your copy.
              </p>

              <p style="margin:32px 0 0;font-size:13px;color:#94a3b8;line-height:1.6;">
                Or copy and paste this link into your browser:<br/>
                <a href="${clientPortalUrl}" style="color:#6366f1;word-break:break-all;">${clientPortalUrl}</a>
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #f1f5f9;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                Sent via <strong style="color:#64748b;">Hyacinth Proposal System</strong> on behalf of ${staffName}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

      await resend.emails.send({
        from: `${fromName} <${fromAddress}>`,
        to: [clientEmail],
        subject: `Your Signed Document - ${proposalTitle}`,
        html: clientEmailHtml,
      });
    }

    return NextResponse.json({ success: true, staffNotified: !!staffEmail, clientNotified: !!clientEmail });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Send copies error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
