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
      proposalTitle,
      clientName,
      clientEmail,
      signatureUrl,
      ownerUserId,   // UID of the identity owner (CEO)
      senderUserId,  // UID of the actual sender (Staff/Admin)
      version,
    } = body as {
      proposalId: string;
      proposalTitle: string;
      clientName: string;
      clientEmail: string;
      signatureUrl: string;
      ownerUserId: string;
      senderUserId: string;
      version: number;
    };

    if (!proposalId || !clientEmail) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Resolve UIDs → email addresses from Firestore
    const resolveUser = async (uid: string): Promise<{ email: string; name: string } | null> => {
      if (!uid) return null;
      try {
        const snap = await getDoc(doc(db, "users", uid));
        if (!snap.exists()) return null;
        const d = snap.data();
        return {
          email: d.email || "",
          name: `${d.firstName || ""} ${d.lastName || ""}`.trim() || d.email || "",
        };
      } catch { return null; }
    };

    const [ownerUser, senderUser] = await Promise.all([
      resolveUser(ownerUserId),
      resolveUser(senderUserId),
    ]);

    // Deduplicate staff emails (owner + sender, skip if same)
    const staffEmailMap = new Map<string, string>();
    if (ownerUser?.email) staffEmailMap.set(ownerUserId, ownerUser.email);
    if (senderUser?.email) staffEmailMap.set(senderUserId, senderUser.email);
    const staffEmails = Array.from(staffEmailMap.values());

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const proposalUrl = `${appUrl}/p/${proposalId}`;
    const fromAddress = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

    // Email HTML template for signed document
    const createEmailHtml = (recipientType: "client" | "staff" | "ceo") => {
      const isClient = recipientType === "client";
      const greeting = isClient ? `Hi ${clientName}` : `Hello Team`;
      const message = isClient 
        ? `Your proposal "${proposalTitle}" (v${version}) has been successfully signed and executed.`
        : `The proposal "${proposalTitle}" (v${version}) sent to ${clientName} has been signed.`;

      return `
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
              <div style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">Hyacinth Proposal System</div>
            </td>
          </tr>

          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">
                ✍️ Document Signed - v${version}
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6;">
                ${greeting}, ${message}
              </p>

              <div style="background-color:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:20px;margin-bottom:24px;">
                <p style="margin:0 0 12px;font-size:14px;color:#15803d;font-weight:600;">
                  ✓ Signature Captured
                </p>
                <img src="${signatureUrl}" alt="Client Signature" style="max-height:100px;width:auto;border-radius:8px;background:white;padding:8px;" />
              </div>

              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="border-radius:12px;background:linear-gradient(135deg,#800020 0%,#a00030 100%);">
                    <a href="${proposalUrl}" target="_blank" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:-0.01em;">
                      View Signed Document →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:32px 0 0;font-size:13px;color:#94a3b8;line-height:1.6;">
                Proposal: <strong>${proposalTitle}</strong><br/>
                Version: v${version}<br/>
                Client: ${clientName}<br/>
                Status: <span style="color:#15803d;font-weight:600;">Signed & Executed</span>
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
    };

    const emails: Promise<unknown>[] = [];

    // Send to client
    emails.push(
      resend.emails.send({
        from: `Hyacinth Proposal System <${fromAddress}>`,
        to: [clientEmail],
        subject: `✍️ Your proposal has been signed - ${proposalTitle} (v${version})`,
        html: createEmailHtml("client"),
      })
    );

    // Send to all staff (owner + sender, already deduplicated)
    if (staffEmails.length > 0) {
      emails.push(
        resend.emails.send({
          from: `Hyacinth Proposal System <${fromAddress}>`,
          to: staffEmails,
          subject: `✍️ Proposal signed by client - ${proposalTitle} (v${version})`,
          html: createEmailHtml("staff"),
        })
      );
    }

    await Promise.all(emails);

    // Write in-app signed notifications for owner + sender (deduplicated)
    const notifyUids = new Set<string>([ownerUserId, senderUserId].filter(Boolean));
    await Promise.all(
      Array.from(notifyUids).map((uid) =>
        addDoc(collection(db, "notifications"), {
          userId: uid,
          type: "signed",
          message: `${clientName} signed "${proposalTitle}" (v${version})`,
          proposalId,
          actorRole: "client",
          actorName: clientName,
          read: false,
          createdAt: serverTimestamp(),
        })
      )
    );

    return NextResponse.json({ 
      success: true,
      notified: [clientEmail, ...staffEmails].filter(Boolean),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Send signed document error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
