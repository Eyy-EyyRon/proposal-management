/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {onDocumentCreated, onDocumentUpdated} from "firebase-functions/v2/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import {getFirestore, FieldValue, Timestamp} from "firebase-admin/firestore";
import {getAuth} from "firebase-admin/auth";
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

    const {uid, actorName, justification, durationMs, tier} = data as {
      uid: string;
      actorName: string;
      justification: string;
      durationMs: number;
      tier?: string;
    };
    const elevationTier = tier ?? "operational";
    const isOperational = elevationTier === "operational";

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
    const notifMessage = isOperational
      ? `🔐 ${actorName} requested Operational elevation for ${durationLabel}. Reason: ${justification}`
      : `� ${actorName} requested Critical elevation for ${durationLabel} — awaiting your approval. Reason: ${justification}`;

    await db.collection("notifications").add({
      userId: ceoId,
      type: "jit_elevation",
      message: notifMessage,
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
      description: `${actorName} requested ${elevationTier} JIT elevation for ${durationLabel}. Reason: ${justification}`,
      metadata: {justification, durationMs, tier: elevationTier},
      createdAt: FieldValue.serverTimestamp(),
    });

    // EMAIL HOOK — replace with Resend/SendGrid
    const ceoEmail = ceoDoc.data().email as string | undefined;
    logger.info(
      `📧 [EMAIL HOOK] CEO ${ceoEmail ?? ceoId} should be emailed: "${notifMessage}"`,
      {uid, ceoId}
    );
  }
);

// ─── EMERGENCY BRAKE: revokeAllElevations ───────────────────
// CEO-only callable that:
//   1. Captures CEO network metadata (IP, UA) for the black-box log
//   2. Revokes Firebase Auth refresh tokens for every super_admin
//   3. Stamps forceLogoutTimestamp on every super_admin user doc
//   4. Deletes all documents in the elevations collection
//   5. Writes an immutable black-box entry to system_purge_logs
//   6. Writes a standard entry to logs (audit trail)
//   Returns: { revokedCount, elevationsWiped, logId }
export const revokeAllElevations = onCall(
  {enforceAppCheck: false},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in.");
    }

    // Verify caller is the root CEO
    const callerDoc = await db.collection("users").doc(request.auth.uid).get();
    if (!callerDoc.exists) {
      throw new HttpsError("permission-denied", "Caller user doc not found.");
    }
    const callerData = callerDoc.data() as {
      role?: string; isRootCEO?: boolean;
      firstName?: string; lastName?: string;
    };
    if (callerData.role !== "ceo" || !callerData.isRootCEO) {
      throw new HttpsError("permission-denied", "Only the root CEO may execute the Emergency Brake.");
    }

    // ── Capture network metadata for the black-box record ──────
    const rawHeaders = request.rawRequest?.headers ?? {};
    const ipAddress = (
      (rawHeaders["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
      (rawHeaders["x-real-ip"] as string | undefined) ??
      request.rawRequest?.socket?.remoteAddress ??
      "unknown"
    );
    const userAgent = (rawHeaders["user-agent"] as string | undefined) ?? "unknown";

    logger.warn("🚨 Emergency Brake activated by CEO.", {
      callerUid: request.auth.uid, ipAddress, userAgent,
    });

    const firebaseAuth = getAuth();
    const now = FieldValue.serverTimestamp();
    const callerName = `${callerData.firstName ?? ""} ${callerData.lastName ?? "CEO"}`.trim();

    // 1. Find all super_admins
    const adminSnap = await db.collection("users")
      .where("role", "==", "super_admin")
      .get();

    // 2. Revoke Auth tokens in parallel (outside batch — Auth Admin SDK call)
    const tokenRevocations = adminSnap.docs.map((d) =>
      firebaseAuth.revokeRefreshTokens(d.id).catch((err) => {
        logger.error(`Token revocation failed for ${d.id}:`, err);
      })
    );
    await Promise.all(tokenRevocations);

    // 3. Fetch elevations to wipe
    const elevSnap = await db.collection("elevations").get();

    // 4. Prepare black-box log ref (pre-generate ID so we can return it)
    const purgeLogRef = db.collection("system_purge_logs").doc();
    const logId = purgeLogRef.id;

    // 5. Single atomic batch: user stamps + elevation deletes + black-box + audit
    const batch = db.batch();

    // Stamp forceLogoutTimestamp on every super_admin
    for (const userDoc of adminSnap.docs) {
      batch.update(userDoc.ref, {forceLogoutTimestamp: now, isElevated: false});
    }

    // Delete all elevation docs
    for (const elevDoc of elevSnap.docs) {
      batch.delete(elevDoc.ref);
    }

    // Black-box: immutable system_purge_log entry
    batch.set(purgeLogRef, {
      action: "SYSTEM_PURGE_RESET",
      actorId: request.auth.uid,
      actorName: callerName,
      actorRole: "ceo",
      timestamp: now,
      details: `Total system reset triggered by ${callerName}. ${adminSnap.size} super admin(s) revoked, ${elevSnap.size} elevation(s) wiped.`,
      security: {
        ipAddress,
        userAgent,
        confirmationText: "REVOKE",
      },
      affectedUids: adminSnap.docs.map((d) => d.id),
      elevationsWiped: elevSnap.size,
    });

    // Standard audit log entry (for the existing audit-log UI)
    const auditRef = db.collection("logs").doc();
    batch.set(auditRef, {
      action: "emergency_brake_activated",
      actorId: request.auth.uid,
      actorName: callerName,
      actorRole: "ceo",
      description: `CEO executed Emergency Brake: revoked tokens for ${adminSnap.size} super admin(s) and wiped all elevation sessions. Log ID: ${logId}`,
      metadata: {
        affectedUids: adminSnap.docs.map((d) => d.id),
        elevationsWiped: elevSnap.size,
        purgeLogId: logId,
        ipAddress,
      },
      createdAt: now,
    });

    await batch.commit();

    logger.warn(`Emergency Brake complete: ${adminSnap.size} admins revoked, ${elevSnap.size} elevations wiped. Log: ${logId}`);
    return {revokedCount: adminSnap.size, elevationsWiped: elevSnap.size, logId};
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

// ─── FINALIZE PROBATIONARY PROMOTIONS (hourly) ───────────────
// Every hour: find users whose probation has expired and activate them.
export const finalizePromotions = onSchedule(
  {schedule: "every 60 minutes", timeZone: "UTC"},
  async () => {
    const now = Timestamp.now();

    // Query users in probation whose expiry is in the past
    const snap = await db.collection("users")
      .where("roleStatus", "==", "probation")
      .where("probationExpiry", "<=", now)
      .get();

    if (snap.empty) {
      logger.info("finalizePromotions: no expired probations found.");
      return;
    }

    const batch = db.batch();
    const logEntries: Promise<FirebaseFirestore.DocumentReference>[] = [];

    snap.docs.forEach((doc) => {
      const d = doc.data();
      const targetName = `${d.firstName ?? ""} ${d.lastName ?? ""}`.trim();
      const dept = d.assignedDepartment ?? null;

      // Activate the user as Dept Admin
      batch.update(doc.ref, {
        role: "admin",
        isDeptAdmin: true,
        department: dept,
        departments: dept ? [dept] : [],
        departmentId: d.assignedDepartmentId ?? null,
        pendingRole: null,
        roleStatus: "active",
        probationExpiry: null,
        probationStartedAt: null,
        probationDurationHours: null,
        assignedDepartment: null,
        assignedDepartmentId: null,
        promotedBy: null,
        promotedByName: null,
        updatedAt: FieldValue.serverTimestamp(),
      });

      logEntries.push(
        db.collection("promotion_logs").add({
          action: "probation_ascension",
          actorId: "system",
          actorName: "Automated Scheduler",
          actorRole: "system",
          targetId: doc.id,
          targetName,
          fromRole: d.role,
          toRole: "admin",
          department: dept,
          note: `Probation period ended. ${targetName} automatically promoted to Dept Admin (${dept}).`,
          createdAt: FieldValue.serverTimestamp(),
        })
      );

      logger.info(`finalizePromotions: activating ${targetName} → Dept Admin (${dept})`);
    });

    await Promise.all([batch.commit(), ...logEntries]);
    logger.info(`finalizePromotions: activated ${snap.size} user(s).`);
  }
);
