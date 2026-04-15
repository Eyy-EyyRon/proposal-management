/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";
import {onDocumentUpdated} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {initializeApp} from "firebase-admin/app";

initializeApp();
const db = getFirestore();

// For cost control, we set the maximum number of containers.
setGlobalOptions({maxInstances: 10});

// ─── onProposalUpdate ────────────────────────────────────────
// Triggers when any proposal document is modified.
// Creates in-app notifications and logs email hooks.
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