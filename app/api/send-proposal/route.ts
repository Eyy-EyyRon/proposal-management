import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      to,
      clientName,
      proposalUrl,
      templateName,
      senderName,
      companyName,
      emailSignature,
      companyLogoUrl,
    } = body as {
      to: string;
      clientName: string;
      proposalUrl: string;
      templateName: string;
      senderName: string;
      companyName: string;
      emailSignature: string;
      companyLogoUrl: string | null;
    };

    if (!to || !proposalUrl) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const displayCompany = companyName || "Our Team";
    const displaySender = senderName || "The Team";
    const displayClient = clientName || "there";

    const htmlBody = `
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
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:32px 40px;text-align:center;">
              ${companyLogoUrl
                ? `<img src="${companyLogoUrl}" alt="${displayCompany}" style="max-height:40px;margin-bottom:12px;" />`
                : `<div style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">${displayCompany}</div>`
              }
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">
                You've received a proposal
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6;">
                Hi ${displayClient}, ${displaySender} from ${displayCompany} has sent you a proposal${templateName ? `: <strong>${templateName}</strong>` : ""}.
              </p>

              <p style="margin:0 0 32px;font-size:15px;color:#64748b;line-height:1.6;">
                Please review the proposal and sign it if you agree with the terms.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="border-radius:12px;background:linear-gradient(135deg,#0f172a 0%,#334155 100%);">
                    <a href="${proposalUrl}" target="_blank" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:-0.01em;">
                      View Proposal →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:32px 0 0;font-size:13px;color:#94a3b8;line-height:1.6;">
                Or copy and paste this link into your browser:<br/>
                <a href="${proposalUrl}" style="color:#6366f1;word-break:break-all;">${proposalUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Signature -->
          ${emailSignature ? `
          <tr>
            <td style="padding:0 40px 32px;">
              <div style="border-top:1px solid #f1f5f9;padding-top:20px;font-size:13px;color:#94a3b8;line-height:1.6;white-space:pre-line;">${emailSignature}</div>
            </td>
          </tr>
          ` : ""}

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #f1f5f9;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                Sent via <strong style="color:#64748b;">ProposalMS</strong> on behalf of ${displayCompany}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

    const fromAddress = process.env.RESEND_FROM_EMAIL || "proposals@resend.dev";

    const { error } = await resend.emails.send({
      from: `${displayCompany} <${fromAddress}>`,
      to: [to],
      subject: `Proposal from ${displayCompany}: ${templateName || "Review & Sign"}`,
      html: htmlBody,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
