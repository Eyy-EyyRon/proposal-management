import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  writeBatch,
  getDocs,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { UserRole } from "@/contexts/auth-context";

// ─── TYPES ───────────────────────────────────────────────────

export type NotificationType =
  | "viewed"           // Client viewed proposal
  | "signed"           // Client signed proposal
  | "rejected"         // Client rejected proposal
  | "commented"        // Client or Staff commented
  | "team_joined"
  | "template_updated"
  | "major_deal"
  | "system"
  | "delegated_proposal"  // Staff sent proposal on CEO's behalf
  | "ceo_comment"        // CEO commented on proposal
  | "staff_action";      // Staff performed an action

export interface AppNotification {
  id: string;
  userId: string;
  proposalId?: string;
  type: NotificationType;
  message: string;
  read: boolean;
  createdAt: Timestamp;
  targetRole?: UserRole | "all";
  department?: string;
  actorRole?: "client" | "ceo" | "staff" | "system"; // Who performed the action
  actorName?: string; // Name of the person who performed the action
}

// ─── NOTIFICATION TYPES PER ROLE ────────────────────────────
// All roles now see actions from client, CEO, and staff
const ROLE_NOTIFICATION_TYPES: Record<string, NotificationType[]> = {
  staff:  ["viewed", "signed", "rejected", "commented", "ceo_comment", "staff_action", "delegated_proposal", "team_joined", "template_updated"],
  admin:  ["viewed", "signed", "rejected", "commented", "ceo_comment", "staff_action", "delegated_proposal", "team_joined", "template_updated"],
  ceo:    ["viewed", "signed", "rejected", "commented", "ceo_comment", "staff_action", "team_joined", "template_updated", "major_deal", "system", "delegated_proposal"],
};

// ─── REAL-TIME LISTENER ──────────────────────────────────────
// Returns an unsubscribe function.
// Filters by userId first; then optionally filters client-side by role-appropriate types.
export function subscribeToNotifications(
  userId: string,
  callback: (notifications: AppNotification[]) => void,
  maxItems = 30,
  role: UserRole = "staff"
) {
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(maxItems)
  );

  const allowedTypes = ROLE_NOTIFICATION_TYPES[role] ?? ROLE_NOTIFICATION_TYPES.staff;

  return onSnapshot(q, (snap) => {
    const items = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as AppNotification))
      .filter((n) => allowedTypes.includes(n.type));
    callback(items);
  });
}

// ─── MARK SINGLE AS READ ────────────────────────────────────
export async function markNotificationRead(notificationId: string): Promise<void> {
  await updateDoc(doc(db, "notifications", notificationId), { read: true });
}

// ─── MARK ALL AS READ ───────────────────────────────────────
export async function markAllNotificationsRead(userId: string): Promise<void> {
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    where("read", "==", false)
  );
  const snap = await getDocs(q);
  if (snap.empty) return;

  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
  await batch.commit();
}

// ─── CREATE IN-APP NOTIFICATION ─────────────────────────────
// Writes to the TOP-LEVEL notifications collection.
// subscribeToNotifications() filters by userId — this must match.
export async function createInAppNotification(payload: {
  userId: string;
  type: NotificationType;
  message: string;
  proposalId?: string;
  department?: string;
  actorRole?: AppNotification["actorRole"];
  actorName?: string;
}): Promise<void> {
  await addDoc(collection(db, "notifications"), {
    userId: payload.userId,
    type: payload.type,
    message: payload.message,
    proposalId: payload.proposalId ?? null,
    department: payload.department ?? null,
    actorRole: payload.actorRole ?? null,
    actorName: payload.actorName ?? null,
    read: false,
    createdAt: serverTimestamp(),
  });
}

// ─── BATCH NOTIFY MULTIPLE USERS ────────────────────────────
// Notifies owner + sender in one call, deduplicating if they are the same person.
export async function notifyProposalStakeholders(
  ownerUserId: string,
  senderUserId: string,
  payload: Omit<Parameters<typeof createInAppNotification>[0], "userId">
): Promise<void> {
  const targets = new Set<string>([ownerUserId, senderUserId].filter(Boolean));
  await Promise.all(
    Array.from(targets).map((uid) =>
      createInAppNotification({ ...payload, userId: uid })
    )
  );
}
