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
      clientName,
      comment,
      quote,
      staffId, // sentById - the actual sender
      ownerId, // ownerId - the CEO/identity owner
    } = body as {
      proposalId: string;
      clientName: string;
      comment: string;
      quote?: string | null;
      staffId: string;
      ownerId?: string;
    };

    if (!proposalId || !staffId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Fetch proposal details
    const proposalSnap = await getDoc(doc(db, "proposals", proposalId));
    let proposalTitle = "Proposal";
    let actualOwnerId = ownerId;
    let actualSentById = staffId;
    
    if (proposalSnap.exists()) {
      const proposalData = proposalSnap.data();
      proposalTitle = proposalData.templateName || "Proposal";
      actualOwnerId = proposalData.ownerId || ownerId;
      actualSentById = proposalData.sentById || staffId;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const proposalUrl = `${appUrl}/dashboard/proposals/${proposalId}`;
    const fromAddress = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

    // Determine who to notify: both sentById (staff) and ownerId (CEO if different)
    const notifyUserIds = new Set<string>();
    notifyUserIds.add(actualSentById);
    if (actualOwnerId && actualOwnerId !== actualSentById) {
      notifyUserIds.add(actualOwnerId);
    }

    // Fetch user details and send notifications
    const notifications: Promise<void>[] = [];

    for (const userId of notifyUserIds) {
      const userSnap = await getDoc(doc(db, "users", userId));
      if (!userSnap.exists()) continue;
      
      const userData = userSnap.data();
      const userEmail = userData.email;
      const userName = `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || userEmail;
      const isCeo = userId === actualOwnerId && actualOwnerId !== actualSentById;

      if (!userEmail) continue;

      // Send email
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
            <td style="background:linear-gradient(135deg,#8b5cf6 0%,#a78bfa 100%);padding:32px 40px;text-align:center;">
              <div style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">Hyacinth Proposal System</div>
            </td>
          </tr>

          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">
                ${isCeo ? "💬 Client Message (Delegated Proposal)" : "💬 New Client Comment"}
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6;">
                ${isCeo 
                  ? `Hi ${userName}, <strong>${clientName}</strong> left a comment on a proposal sent on your behalf.` 
                  : `Hi ${userName}, <strong>${clientName}</strong> left a new comment on their proposal.`}
              </p>

              ${quote ? `
              <div style="background-color:#f5f3ff;border-left:4px solid #8b5cf6;border-radius:0 8px 8px 0;padding:12px 16px;margin-bottom:16px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#7c3aed;text-transform:uppercase;letter-spacing:0.05em;">Quoted Text</p>
                <p style="margin:0;font-size:13px;font-style:italic;color:#5b21b6;">"${quote}"</p>
              </div>
              ` : ""}

              <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px;">
                <p style="margin:0 0 8px;font-size:14px;color:#334155;line-height:1.5;">
                  <strong>Comment:</strong>
                </p>
                <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">"${comment}"</p>
              </div>

              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="border-radius:12px;background:linear-gradient(135deg,#8b5cf6 0%,#a78bfa 100%);">
                    <a href="${proposalUrl}" target="_blank" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:-0.01em;">
                      Reply in Dashboard →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:32px 0 0;font-size:13px;color:#94a3b8;line-height:1.6;">
                Proposal: <strong>${proposalTitle}</strong><br/>
                Client: ${clientName}
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

      notifications.push(
        resend.emails.send({
          from: `Hyacinth Proposal System <${fromAddress}>`,
          to: [userEmail],
          subject: isCeo 
            ? `💬 Client message on your delegated proposal - ${clientName}`
            : `💬 New comment from ${clientName} on ${proposalTitle}`,
          html: emailHtml,
        }).then(() => {})
      );

      // Create in-app notification — top-level collection, keyed by userId
      notifications.push(
        addDoc(collection(db, "notifications"), {
          userId,
          type: "commented",
          message: `${clientName} commented on "${proposalTitle}"${isCeo ? " (on your behalf)" : ""}`,
          proposalId,
          actorRole: "client",
          actorName: clientName,
          read: false,
          createdAt: serverTimestamp(),
        }).then(() => {})
      );
    }

    await Promise.all(notifications);

    return NextResponse.json({ 
      success: true, 
      notified: Array.from(notifyUserIds) 
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Comment notification error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}