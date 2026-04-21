import { NextRequest, NextResponse } from "next/server";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      proposalId,
      proposalClientName,
      sharedWith,
      sharedBy,
      originDepartment,
    } = body as {
      proposalId: string;
      proposalClientName: string;
      sharedWith: string[];
      sharedBy: string;
      originDepartment: string;
    };

    if (!proposalId || !sharedWith?.length || !sharedBy) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Find admin users in each target department and create in-app notifications
    let notified = 0;
    for (const dept of sharedWith) {
      const usersQ = query(
        collection(db, "users"),
        where("department", "==", dept),
        where("role", "in", ["admin", "ceo"])
      );
      const usersSnap = await getDocs(usersQ);

      for (const userDoc of usersSnap.docs) {
        await addDoc(collection(db, "notifications"), {
          userId: userDoc.id,
          type: "proposal_shared",
          message: `${sharedBy} (${originDepartment}) shared a proposal for "${proposalClientName}" with your department`,
          proposalId,
          actorRole: "admin",
          actorName: sharedBy,
          read: false,
          createdAt: serverTimestamp(),
        });
        notified++;
      }
    }

    return NextResponse.json({ success: true, notified });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Share notification error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
