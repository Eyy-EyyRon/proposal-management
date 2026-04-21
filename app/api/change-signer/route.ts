import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Email service not configured" }, { status: 500 });
    }
    const resend = new Resend(apiKey);

    const body = await req.json();
    const {
      proposalId,
      newSignerName,
      newSignerEmail,
      originalClientName,
      proposalTitle,
      senderName,
      companyName,
    } = body as {
      proposalId: string;
      newSignerName: string;
      newSignerEmail: string;
      originalClientName: string;
      proposalTitle: string;
      senderName: string;
      companyName: string;
    };

    if (!proposalId || !newSignerEmail || !newSignerName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Update Firestore — stamp forwarded signer info on the proposal
    await updateDoc(doc(db, "proposals", proposalId), {
      forwardedSignerName: newSignerName,
      forwardedSignerEmail: newSignerEmail,
      forwardedAt: serverTimestamp(),
      clientName: newSignerName,
      clientEmail: newSignerEmail,
      updatedAt: serverTimestamp(),
    });

    // 2. Send email to new signer
    const proposalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/p/${proposalId}`;
    const displayCompany = companyName || "Our Team";
    const displaySender = senderName || "The Team";

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.06)">
    <div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:32px 40px;">
      <p style="margin:0;font-size:13px;font-weight:600;color:rgba(255,255,255,0.7);letter-spacing:0.1em;text-transform:uppercase">${displayCompany}</p>
      <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;color:#fff">A Proposal Requires Your Signature</h1>
    </div>
    <div style="padding:32px 40px;">
      <p style="margin:0 0 16px;font-size:15px;color:#334155">Hi <strong>${newSignerName}</strong>,</p>
      <p style="margin:0 0 16px;font-size:14px;color:#64748b;line-height:1.7">
        <strong>${originalClientName}</strong> has forwarded a proposal from <strong>${displaySender}</strong> at <strong>${displayCompany}</strong> to you for review and authorized signature.
      </p>
      <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.7">
        The proposal <strong>"${proposalTitle}"</strong> is ready for your review. Please click the button below to open it.
      </p>
      <a href="${proposalUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 28px;border-radius:10px;letter-spacing:0.01em">
        Review &amp; Sign Proposal →
      </a>
      <p style="margin:24px 0 0;font-size:12px;color:#94a3b8">
        If you were not expecting this, please contact ${displayCompany} directly.
      </p>
    </div>
  </div>
</body>
</html>`;

    await resend.emails.send({
      from: `${displaySender} via ${displayCompany} <proposals@resend.dev>`,
      to: newSignerEmail,
      subject: `[Action Required] Proposal forwarded for your signature — ${proposalTitle}`,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[change-signer]", err);
    return NextResponse.json({ error: "Failed to forward proposal" }, { status: 500 });
  }
}
