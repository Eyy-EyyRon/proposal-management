import { NextRequest, NextResponse } from "next/server";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const dynamic = "force-dynamic";

// Generic status-change notification (rejected, archived, etc.)
export async function POST(req: NextRequest) {
  try {
    const { userId, proposalId, type, clientName, proposalTitle } = await req.json() as {
      userId: string;
      proposalId: string;
      type: "rejected" | "viewed" | "signed";
      clientName: string;
      proposalTitle: string;
    };

    if (!userId || !proposalId || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const messages: Record<string, string> = {
      rejected: `${clientName} rejected "${proposalTitle}"`,
      viewed:   `${clientName} viewed "${proposalTitle}"`,
      signed:   `${clientName} signed "${proposalTitle}"`,
    };

    await addDoc(collection(db, "notifications"), {
      userId,
      type,
      message: messages[type] ?? `${clientName} updated "${proposalTitle}"`,
      proposalId,
      actorRole: "client",
      actorName: clientName,
      read: false,
      createdAt: serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
