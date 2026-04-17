import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
  getDocs,
  type Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { UserRole } from "@/contexts/auth-context";

// ─── TYPES ───────────────────────────────────────────────────

export type NotificationType =
  | "viewed"
  | "signed"
  | "rejected"
  | "team_joined"
  | "template_updated"
  | "major_deal"
  | "system";

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
}

// ─── NOTIFICATION TYPES PER ROLE ────────────────────────────
const ROLE_NOTIFICATION_TYPES: Record<string, NotificationType[]> = {
  staff:  ["viewed", "signed", "rejected"],
  admin:  ["viewed", "signed", "rejected", "team_joined", "template_updated"],
  ceo:    ["viewed", "signed", "rejected", "team_joined", "template_updated", "major_deal", "system"],
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
