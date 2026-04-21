import { NextRequest, NextResponse } from "next/server";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const dynamic = "force-dynamic";

/*
  Fires in-app notifications for task lifecycle events.
  Body: { taskId, event, targetUserId, targetUserName, clientName, urgency, senderName }
  Events: "task_assigned" | "task_submitted" | "task_changes_requested" | "task_ready" | "task_sent"
*/

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      taskId,
      event,
      targetUserId,
      targetUserName,
      clientName,
      urgency,
      senderName,
    } = body as {
      taskId: string;
      event: string;
      targetUserId: string;
      targetUserName?: string;
      clientName: string;
      urgency: string;
      senderName: string;
    };

    if (!taskId || !event || !targetUserId || !clientName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const urgencyLabel =
      urgency === "p1" ? "CRITICAL" : urgency === "p2" ? "HIGH" : "Normal";

    let title = "";
    let message = "";

    switch (event) {
      case "task_assigned":
        title = urgency === "p1" ? `🔴 CRITICAL Task Assigned` : "New Task Assigned";
        message = `${senderName} assigned you a ${urgencyLabel} task for "${clientName}".`;
        break;
      case "task_submitted":
        title = "Proposal Submitted for Review";
        message = `${senderName} submitted the draft for "${clientName}" — review it now.`;
        break;
      case "task_changes_requested":
        title = "Changes Requested on Draft";
        message = `${senderName} requested changes on the draft for "${clientName}".`;
        break;
      case "task_ready":
        title = urgency === "p1" ? `🔴 CRITICAL Proposal Ready` : "Proposal Ready to Send";
        message = `The proposal for "${clientName}" has been verified and is ready in your Talking Inbox.`;
        break;
      case "task_sent":
        title = "Proposal Sent";
        message = `${senderName} sent the proposal for "${clientName}".`;
        break;
      default:
        title = "Task Update";
        message = `Update on task for "${clientName}".`;
    }

    // Write in-app notification
    await addDoc(collection(db, "notifications"), {
      userId: targetUserId,
      title,
      message,
      type: event,
      read: false,
      link: `/dashboard/tasks`,
      metadata: { taskId, clientName, urgency },
      createdAt: serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("notify-task error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
