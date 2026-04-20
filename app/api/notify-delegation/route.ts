import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { doc, getDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
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
      ceoId,
      staffName,
      clientName,
      templateName,
    } = body as {
      proposalId: string;
      ceoId: string;
      staffName: string;
      clientName: string;
      templateName: string;
    };

    if (!proposalId || !ceoId || !staffName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Fetch CEO details
    const ceoSnap = await getDoc(doc(db, "users", ceoId));
    if (!ceoSnap.exists()) {
      return NextResponse.json({ error: "CEO not found" }, { status: 404 });
    }
    
    const ceoData = ceoSnap.data();
    const ceoEmail = ceoData.email;
    const ceoName = `${ceoData.firstName || ""} ${ceoData.lastName || ""}`.trim() || "CEO";

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const proposalUrl = `${appUrl}/dashboard/proposals/${proposalId}`;
    const fromAddress = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

    // 1. Send email notification to CEO
    const emailHtml = `
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
            <td style="background:linear-gradient(135deg,#7c3aed 0%,#8b5cf6 100%);padding:32px 40px;text-align:center;">
              <div style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">Hyacinth Proposal System</div>
            </td>
          </tr>

          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">
                Delegated Proposal Sent
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6;">
                Hi ${ceoName}, <strong>${staffName}</strong> has sent a proposal on your behalf.
              </p>

              <div style="background-color:#f5f3ff;border:1px solid #ddd6fe;border-radius:12px;padding:20px;margin-bottom:24px;">
                <p style="margin:0 0 8px;font-size:14px;color:#5b21b6;line-height:1.5;">
                  <strong>Proposal Details:</strong>
                </p>
                <p style="margin:0;font-size:13px;color:#7c3aed;line-height:1.6;">
                  Client: ${clientName}<br/>
                  Template: ${templateName}<br/>
                  Sent by: ${staffName} (on your behalf)
                </p>
              </div>

              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="border-radius:12px;background:linear-gradient(135deg,#7c3aed 0%,#8b5cf6 100%);">
                    <a href="${proposalUrl}" target="_blank" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:-0.01em;">
                      View Proposal →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:32px 0 0;font-size:13px;color:#94a3b8;line-height:1.6;">
                You can monitor and manage this proposal from your dashboard. The client sees your name and company branding.
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #f1f5f9;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                Sent via <strong style="color:#64748b;">Hyacinth Proposal System</strong> Delegated Authority
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
      from: `Hyacinth Proposal System <${fromAddress}>`,
      to: [ceoEmail],
      subject: `Staff ${staffName} sent a proposal on your behalf`,
      html: emailHtml,
    });

    // 2. Create in-app notification — top-level collection keyed by userId
    await addDoc(collection(db, "notifications"), {
      userId: ceoId,
      type: "delegated_proposal",
      message: `${staffName} sent "${templateName}" to ${clientName} on your behalf`,
      proposalId,
      actorRole: "staff",
      actorName: staffName,
      read: false,
      createdAt: serverTimestamp(),
    });

    return NextResponse.json({ success: true, ceoNotified: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Delegation notification error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
