import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export const runtime = "nodejs";

async function checkFirestore(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = Date.now();
  try {
    await getDoc(doc(db, "_health", "ping"));
    return { ok: true, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}

async function checkResend(): Promise<{ ok: boolean; latencyMs: number }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, latencyMs: 0 };
  const start = Date.now();
  try {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });
    return { ok: res.ok, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}

export async function GET() {
  const [firestore, resend] = await Promise.all([checkFirestore(), checkResend()]);

  const allOk = firestore.ok && resend.ok;

  return NextResponse.json(
    {
      status: allOk ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      services: {
        firestore: { ...firestore, name: "Firestore" },
        resend: { ...resend, name: "Resend (SMTP)" },
      },
    },
    { status: allOk ? 200 : 503 }
  );
}
