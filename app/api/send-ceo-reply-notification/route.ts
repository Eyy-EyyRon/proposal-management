import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

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
      proposalTitle,
      clientName,
      clientEmail,
      comment,
      quote,
      ceoName,
    } = body as {
      proposalId: string;
      proposalTitle: string;
      clientName: string;
      clientEmail: string;
      comment: string;
      quote?: string | null;
      ceoName: string;
    };

    if (!proposalId || !clientEmail) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const proposalUrl = `${appUrl}/p/${proposalId}`;
    const fromAddress = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

    // Send email to client
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
            <td style="background:linear-gradient(135deg,#800020 0%,#a00030 100%);padding:32px 40px;text-align:center;">
              <div style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">ProposalMS</div>
            </td>
          </tr>

          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">
                💬 New Message from ${ceoName}
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6;">
                Hi ${clientName}, you have a new message regarding your proposal <strong>${proposalTitle}</strong>.
              </p>

              ${quote ? `
              <div style="background-color:#fef3f2;border-left:4px solid #800020;border-radius:0 8px 8px 0;padding:12px 16px;margin-bottom:16px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#800020;text-transform:uppercase;letter-spacing:0.05em;">Replied To</p>
                <p style="margin:0;font-size:13px;font-style:italic;color:#991b1b;">"${quote}"</p>
              </div>
              ` : ""}

              <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px;">
                <p style="margin:0 0 8px;font-size:14px;color:#334155;line-height:1.5;">
                  <strong>Message:</strong>
                </p>
                <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">"${comment}"</p>
              </div>

              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="border-radius:12px;background:linear-gradient(135deg,#800020 0%,#a00030 100%);">
                    <a href="${proposalUrl}" target="_blank" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:-0.01em;">
                      View & Reply →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:32px 0 0;font-size:13px;color:#94a3b8;line-height:1.6;">
                Proposal: <strong>${proposalTitle}</strong><br/>
                From: ${ceoName}
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #f1f5f9;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                Sent via <strong style="color:#64748b;">ProposalMS</strong>
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
      from: `ProposalMS <${fromAddress}>`,
      to: [clientEmail],
      subject: `💬 New message from ${ceoName} on ${proposalTitle}`,
      html: emailHtml,
    });

    return NextResponse.json({ 
      success: true,
      message: "Notification sent to client"
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("CEO reply notification error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
