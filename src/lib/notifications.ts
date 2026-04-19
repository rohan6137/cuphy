import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type NotificationTargetType = "all" | "user" | "batch";
export type NotificationContentType =
  | "batch"
  | "note"
  | "lecture"
  | "test"
  | "pyq"
  | "assignment"
  | "general";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  createdAt?: Timestamp | any;
  targetType: NotificationTargetType;
  targetUserId?: string;
  targetUid?: string;
  targetValue?: string | null;
  userUid?: string;
  userPhone?: string;
  userEmail?: string;
  targetBatchId?: string;
  batchId?: string;
  contentType?: NotificationContentType;
  entityId?: string;
  routePath?: string;
  senderName?: string;
  isActive?: boolean;
}

export interface NotificationWithRead extends NotificationItem {
  isRead: boolean;
}

export function buildNotificationRoute(
  contentType?: NotificationContentType,
  entityId?: string
) {
  if (!contentType || !entityId) return "/notifications";

  switch (contentType) {
    case "batch":
      return `/batches/${entityId}`;
    case "note":
      return `/notes/${entityId}`;
    case "lecture":
      return `/lectures/${entityId}`;
    case "test":
      return `/tests/${entityId}`;
    case "pyq":
      return `/pyqs/${entityId}`;
    case "assignment":
      return `/assignments/${entityId}`;
    default:
      return "/notifications";
  }
}

export async function getUserEnrolledBatchIds(uid: string): Promise<string[]> {
  try {
    const queries = [
      query(
        collection(db, "subscriptions"),
        where("userUid", "==", uid),
        where("active", "==", true)
      ),
      query(
        collection(db, "subscriptions"),
        where("userId", "==", uid),
        where("active", "==", true)
      ),
      query(
        collection(db, "subscriptions"),
        where("uid", "==", uid),
        where("active", "==", true)
      ),
    ];

    const subscriptionMap = new Map<string, any>();

    for (const qItem of queries) {
      try {
        const snap = await getDocs(qItem);
        snap.docs.forEach((docItem) => {
          subscriptionMap.set(docItem.id, docItem.data());
        });
      } catch (error) {
        console.warn("Subscription batch lookup failed:", error);
      }
    }

    return Array.from(subscriptionMap.values())
      .map((data: any) => data.batchId as string | undefined)
      .filter(Boolean) as string[];
  } catch (error) {
    console.error("Error fetching enrolled batches:", error);
    return [];
  }
}

export function markNotificationAsRead(uid: string, notificationId: string) {
  return setDoc(
    doc(db, "users", uid, "notificationReads", notificationId),
    {
      notificationId,
      readAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export function subscribeToReadNotifications(
  uid: string,
  callback: (readIds: Set<string>) => void
) {
  const q = query(collection(db, "users", uid, "notificationReads"));

  return onSnapshot(q, (snapshot) => {
    const ids = new Set<string>();
    snapshot.docs.forEach((doc) => ids.add(doc.id));
    callback(ids);
  });
}

export function subscribeToNotifications(
  callback: (items: NotificationItem[]) => void
) {
  const q = query(
    collection(db, "notifications"),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const items: NotificationItem[] = snapshot.docs
      .map((docSnap) => {
        const data = docSnap.data() as Omit<NotificationItem, "id">;
        return {
          id: docSnap.id,
          ...data,
        };
      })
      .filter((item) => item.isActive !== false);

    callback(items);
  });
}

export function filterNotificationsForUser(
  notifications: NotificationItem[],
  uid: string,
  enrolledBatchIds: string[]
) {
  return notifications.filter((item) => {
    if (item.targetType === "all") return true;
    if (
      item.targetType === "user" &&
      (
        item.targetUserId === uid ||
        (item as any).targetUid === uid ||
        (item as any).targetValue === uid ||
        (item as any).userUid === uid
      )
    ) {
      return true;
    }
    if (item.targetType === "batch") {
      const batchTarget =
        item.targetBatchId ||
        (typeof item.targetValue === "string" ? item.targetValue : "") ||
        item.batchId ||
        "";

      if (batchTarget && enrolledBatchIds.includes(batchTarget)) {
        return true;
      }
    }
    return false;
  });
}