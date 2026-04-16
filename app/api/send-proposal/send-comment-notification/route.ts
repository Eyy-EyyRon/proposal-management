import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_your_api_key");

export async function POST(req: Request) {
  try {
    const { proposalId, clientName, comment, staffId } = await req.json();

    // The secure link for the STAFF to review the proposal comments
    const staffDashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/proposals/${proposalId}`;

    await resend.emails.send({
      from: "Proposal System <notifications@yourdomain.com>", 
      to: ["staff@yourdomain.com"], // In reality, fetch staff email using staffId
      subject: `New Comment from ${clientName}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>${clientName} left a comment on their proposal</h2>
          <div style="padding: 15px; border-left: 4px solid #8b5cf6; background-color: #f3f4f6; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 16px; color: #374151;">"${comment}"</p>
          </div>
          <a href="${staffDashboardUrl}" style="background-color: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Reply to Comment
          </a>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Comment Email Error:", error);
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
  }
}