import { NextRequest, NextResponse } from "next/server";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { userId, proposalId, clientName, proposalTitle } = await req.json() as {
      userId: string;
      proposalId: string;
      clientName: string;
      proposalTitle: string;
    };

    if (!userId || !proposalId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await addDoc(collection(db, "notifications"), {
      userId,
      type: "viewed",
      message: `${clientName} viewed "${proposalTitle}"`,
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
