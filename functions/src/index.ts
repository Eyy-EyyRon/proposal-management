/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";
import {onDocumentCreated, onDocumentUpdated} from "firebase-functions/v2/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import {getFirestore, FieldValue, Timestamp} from "firebase-admin/firestore";
import {initializeApp} from "firebase-admin/app";

initializeApp();
const db = getFirestore();

// For cost control, we set the maximum number of containers.
setGlobalOptions({maxInstances: 10});

// ─── STATS HELPERS ──────────────────────────────────────────
const statsRef = () => db.doc("stats/global");

async function ensureStatsDoc() {
  const snap = await statsRef().get();
  if (!snap.exists) {
    await statsRef().set({
      totalProposals: 0,
      totalSent: 0,
      totalViewed: 0,
      totalAccepted: 0,
      totalRejected: 0,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
}

// ─── onProposalCreate ────────────────────────────────────────
// Increments totalProposals and totalSent on stats/global.
export const onProposalCreate = onDocumentCreated(
  "proposals/{proposalId}",
  async () => {
    await ensureStatsDoc();
    await statsRef().update({
      totalProposals: FieldValue.increment(1),
      totalSent: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
);

// ─── onProposalUpdate ────────────────────────────────────────
// Triggers when any proposal document is modified.
// Creates in-app notifications, logs email hooks, and updates stats/global.
export const onProposalUpdate = onDocumentUpdated(
  "proposals/{proposalId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    const proposalId = event.params.proposalId;
    const userId = after.userId as string;
    const clientName = (after.clientName as string) || "A client";
    const templateName = (after.templateName as string) || "a proposal";
    const oldStatus = before.status as string;
    const newStatus = after.status as string;

    // No status change — nothing to do
    if (oldStatus === newStatus) return;

    // ── Stats aggregation ────────────────────────────────────
    await ensureStatsDoc();
    const decKey = `total${oldStatus.charAt(0).toUpperCase()}${oldStatus.slice(1)}` as string;
    const incKey = `total${newStatus.charAt(0).toUpperCase()}${newStatus.slice(1)}` as string;
    const statsUpdate: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };
    // Decrement old status counter (if it's a tracked status)
    if (["totalSent", "totalViewed", "totalAccepted", "totalRejected"].includes(decKey)) {
      statsUpdate[decKey] = FieldValue.increment(-1);
    }
    // Increment new status counter
    if (["totalSent", "totalViewed", "totalAccepted", "totalRejected"].includes(incKey)) {
      statsUpdate[incKey] = FieldValue.increment(1);
    }
    await statsRef().update(statsUpdate);

    // ── sent → viewed ──────────────────────────────────────
    if (oldStatus === "sent" && newStatus === "viewed") {
      logger.info(
        `📬 Proposal viewed: "${templateName}" by ${clientName}`,
        {proposalId, userId, oldStatus, newStatus}
      );

      // EMAIL HOOK: Replace with Resend/SendGrid call later
      logger.info(
        `📧 [EMAIL HOOK] Would send "Proposal Viewed" email to owner ${userId}`,
        {proposalId, clientName}
      );

      await db.collection("notifications").add({
        userId,
        proposalId,
        type: "viewed",
        message: `${clientName} viewed "${templateName}"`,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });

      return;
    }

    // ── * → accepted ───────────────────────────────────────
    if (newStatus === "accepted") {
      logger.info(
        `🎉 Deal closed: "${templateName}" signed by ${clientName}`,
        {proposalId, userId, oldStatus, newStatus}
      );

      // EMAIL HOOK: Replace with Resend/SendGrid call later
      logger.info(
        `📧 [EMAIL HOOK] Would send "Deal Closed" email to owner ${userId}`,
        {proposalId, clientName}
      );

      await db.collection("notifications").add({
        userId,
        proposalId,
        type: "signed",
        message: `${clientName} signed "${templateName}" — deal closed!`,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });

      return;
    }

    // ── * → rejected ───────────────────────────────────────
    if (newStatus === "rejected") {
      logger.info(
        `❌ Proposal declined: "${templateName}" by ${clientName}`,
        {proposalId, userId, oldStatus, newStatus}
      );

      // EMAIL HOOK: Replace with Resend/SendGrid call later
      logger.info(
        `📧 [EMAIL HOOK] Would send "Proposal Declined" email to owner ${userId}`,
        {proposalId, clientName}
      );

      await db.collection("notifications").add({
        userId,
        proposalId,
        type: "rejected",
        message: `${clientName} declined "${templateName}"`,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });

      return;
    }
  }
);

// ─── JIT ELEVATION: onElevationCreate ───────────────────────
// Fires when a super_admin creates their elevation doc.
// Notifies the root CEO immediately via in-app notification + logs email hook.
export const onElevationCreate = onDocumentCreated(
  "elevations/{uid}",
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const {uid, actorName, justification, durationMs} = data as {
      uid: string;
      actorName: string;
      justification: string;
      durationMs: number;
    };

    const durationMin = Math.round(durationMs / 60000);
    const durationLabel = durationMin >= 60
      ? `${Math.round(durationMin / 60)}h`
      : `${durationMin}m`;

    logger.info(`🔐 JIT Elevation requested by ${actorName} (${uid}) for ${durationLabel}`, {justification});

    // Find the root CEO
    const ceoSnap = await db.collection("users")
      .where("isRootCEO", "==", true)
      .limit(1)
      .get();

    if (ceoSnap.empty) {
      logger.warn("No root CEO found — skipping CEO notification for elevation.");
      return;
    }

    const ceoDoc = ceoSnap.docs[0];
    const ceoId = ceoDoc.id;

    // In-app notification to CEO
    await db.collection("notifications").add({
      userId: ceoId,
      type: "jit_elevation",
      message: `🔐 ${actorName} elevated to Super Admin for ${durationLabel}. Reason: ${justification}`,
      actorRole: "system",
      actorName,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Audit log
    await db.collection("logs").add({
      action: "jit_elevation_requested",
      actorId: uid,
      actorName,
      actorRole: "super_admin",
      description: `${actorName} activated Super Admin mode for ${durationLabel}. Reason: ${justification}`,
      metadata: {justification, durationMs},
      createdAt: FieldValue.serverTimestamp(),
    });

    // EMAIL HOOK — replace with Resend/SendGrid
    const ceoEmail = ceoDoc.data().email as string | undefined;
    logger.info(
      `📧 [EMAIL HOOK] CEO ${ceoEmail ?? ceoId} should be emailed: ` +
      `"${actorName} elevated to Super Admin for ${durationLabel}. Reason: ${justification}"`,
      {uid, ceoId}
    );
  }
);

// ─── JIT ELEVATION: scheduledElevationCleanup ───────────────
// Runs every minute. Finds elevation docs where expiresAt < now
// and status == "active", then marks them expired.
export const scheduledElevationCleanup = onSchedule(
  {schedule: "every 1 minutes", timeoutSeconds: 60},
  async () => {
    const now = Timestamp.now();

    const expired = await db.collection("elevations")
      .where("status", "==", "active")
      .where("expiresAt", "<=", now)
      .get();

    if (expired.empty) {
      logger.info("scheduledElevationCleanup: no expired elevations found.");
      return;
    }

    const batch = db.batch();
    expired.docs.forEach((snap) => {
      batch.update(snap.ref, {status: "expired"});
    });
    await batch.commit();

    logger.info(
      `scheduledElevationCleanup: expired ${expired.size} elevation(s).`,
      {ids: expired.docs.map((d) => d.id)}
    );

    // Write audit log entries for each auto-revoked elevation
    await Promise.all(
      expired.docs.map((snap) => {
        const d = snap.data() as {actorName?: string};
        return db.collection("logs").add({
          action: "jit_elevation_revoked",
          actorId: snap.id,
          actorName: d.actorName ?? "Super Admin",
          actorRole: "super_admin",
          description: `${d.actorName ?? "Super Admin"} Super Admin elevation auto-expired (timer).`,
          metadata: {revokedBy: "timer"},
          createdAt: FieldValue.serverTimestamp(),
        });
      })
    );
  }
);
