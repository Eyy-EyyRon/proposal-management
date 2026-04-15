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

// ─── TYPES ───────────────────────────────────────────────────

export type NotificationType = "viewed" | "signed" | "rejected";

export interface AppNotification {
  id: string;
  userId: string;
  proposalId: string;
  type: NotificationType;
  message: string;
  read: boolean;
  createdAt: Timestamp;
}

// ─── REAL-TIME LISTENER ──────────────────────────────────────
// Returns an unsubscribe function.
export function subscribeToNotifications(
  userId: string,
  callback: (notifications: AppNotification[]) => void,
  maxItems = 30
) {
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(maxItems)
  );

  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as AppNotification[];
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
