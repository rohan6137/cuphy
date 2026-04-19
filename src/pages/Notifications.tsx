import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Timestamp,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import {
  Bell,
  Inbox,
  ArrowRight,
  FileText,
  ClipboardList,
  GraduationCap,
  Layers,
} from "lucide-react";

function getCreatedAtValue(createdAt: any) {
  if (!createdAt) return 0;
  if (createdAt instanceof Timestamp) return createdAt.toMillis();
  if (typeof createdAt?.toMillis === "function") return createdAt.toMillis();
  if (typeof createdAt === "string") {
    const parsed = new Date(createdAt).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function getNotificationIcon(contentType?: string) {
  switch (contentType) {
    case "batch":
      return <Layers className="w-5 h-5" />;
    case "lecture":
      return <GraduationCap className="w-5 h-5" />;
    case "note":
    case "pyq":
    case "assignment":
      return <FileText className="w-5 h-5" />;
    case "test":
      return <ClipboardList className="w-5 h-5" />;
    default:
      return <Bell className="w-5 h-5" />;
  }
}

export default function Notifications() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [enrolledBatchIds, setEnrolledBatchIds] = useState<string[]>([]);

  useEffect(() => {
    let unsubscribeNotifications: (() => void) | null = null;
    let unsubscribeReads: (() => void) | null = null;

    const setupRealtimeNotifications = async () => {
      if (!user?.uid) {
        setNotifications([]);
        setReadIds(new Set());
        setEnrolledBatchIds([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const subscriptionMap = new Map<string, any>();

        if (user?.uid) {
          const subscriptionQueries = [
            query(
              collection(db, "subscriptions"),
              where("userUid", "==", user.uid),
              where("active", "==", true)
            ),
            query(
              collection(db, "subscriptions"),
              where("userId", "==", user.uid),
              where("active", "==", true)
            ),
            query(
              collection(db, "subscriptions"),
              where("uid", "==", user.uid),
              where("active", "==", true)
            ),
          ];

          for (const subQuery of subscriptionQueries) {
            try {
              const subSnap = await getDocs(subQuery);

              subSnap.docs.forEach((docItem) => {
                subscriptionMap.set(docItem.id, {
                  id: docItem.id,
                  ...docItem.data(),
                });
              });
            } catch (err) {
              console.warn("Subscription query failed:", err);
            }
          }
        }

        const batchIds = Array.from(subscriptionMap.values())
          .map((sub: any) => sub.batchId || sub.batchID || sub.batch)
          .filter(Boolean);

        setEnrolledBatchIds([...new Set(batchIds)]);

        unsubscribeNotifications = onSnapshot(
          query(collection(db, "notifications"), orderBy("createdAt", "desc")),
          (snap) => {
            const allNotifications = snap.docs.map((d) => ({
              id: d.id,
              ...d.data(),
            }));

            const visibleNotifications = allNotifications.filter((n: any) => {
              if (n.isActive === false) return false;

              if (n.targetType === "all") return true;

              if (n.targetType === "user") {
                return (
                  n.userUid === user.uid ||
                  n.targetValue === user.uid ||
                  n.targetUserId === user.uid ||
                  n.targetUid === user.uid
                );
              }

              if (n.targetType === "batch") {
                const targetBatch =
                  n.targetValue || n.targetBatchId || n.batchId || n.batchID;
                return targetBatch && batchIds.includes(targetBatch);
              }

              return false;
            });

            visibleNotifications.sort(
              (a: any, b: any) =>
                getCreatedAtValue(b.createdAt) - getCreatedAtValue(a.createdAt)
            );

            setNotifications(visibleNotifications);
            setLoading(false);
          },
          (err) => {
            console.error("Notifications realtime error:", err);
            setNotifications([]);
            setLoading(false);
          }
        );

        unsubscribeReads = onSnapshot(
          collection(db, "users", user.uid, "notificationReads"),
          (snap) => {
            const next = new Set<string>();
            snap.docs.forEach((d) => next.add(d.id));
            setReadIds(next);
          },
          (err) => {
            console.error("Read status realtime error:", err);
            setReadIds(new Set());
          }
        );
      } catch (err) {
        console.error("Notifications setup error:", err);
        setNotifications([]);
        setReadIds(new Set());
        setLoading(false);
      }
    };

    setupRealtimeNotifications();

    return () => {
      if (unsubscribeNotifications) unsubscribeNotifications();
      if (unsubscribeReads) unsubscribeReads();
    };
  }, [user?.uid]);

  const emptyText = useMemo(() => {
    if (!user) return "Please sign in to view notifications.";
    return "No notifications available right now.";
  }, [user]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !readIds.has(n.id)).length;
  }, [notifications, readIds]);

  const markAsRead = async (notificationId: string) => {
    if (!user?.uid || !notificationId) return;

    try {
      await setDoc(
        doc(db, "users", user.uid, "notificationReads", notificationId),
        {
          notificationId,
          readAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const handleClick = async (n: any) => {
    await markAsRead(n.id);
    const routePath = n.routePath || "/dashboard";
    navigate(routePath);
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
            <p className="text-sm text-muted-foreground">
              Updates and alerts sent from the admin panel
            </p>
            {user && (
              <p className="text-xs text-muted-foreground mt-1">
                {unreadCount > 0
                  ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
                  : "All caught up"}
              </p>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-3xl border bg-card p-10 text-center">
            <div className="w-14 h-14 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
              <Inbox className="w-7 h-7" />
            </div>
            <p className="font-medium">All caught up</p>
            <p className="text-sm text-muted-foreground mt-1">{emptyText}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => {
              const createdAtValue = getCreatedAtValue(n.createdAt);
              const isRead = readIds.has(n.id);

              return (
                <div
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`group p-4 md:p-5 rounded-2xl border cursor-pointer hover:bg-muted/40 hover:shadow-sm transition ${isRead ? "bg-card" : "bg-primary/5 border-primary/20"
                    }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${isRead
                          ? "bg-primary/10 text-primary"
                          : "bg-primary text-primary-foreground"
                          }`}
                      >
                        {getNotificationIcon(n.contentType)}
                      </div>

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold">{n.title}</h3>
                          {!isRead && (
                            <span className="mt-1 w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
                          )}
                        </div>

                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {n.message}
                        </p>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {n.contentType ? (
                            <span className="text-[11px] px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                              {String(n.contentType).toUpperCase()}
                            </span>
                          ) : null}

                          {createdAtValue ? (
                            <span className="text-[11px] text-muted-foreground">
                              {new Date(createdAtValue).toLocaleDateString("en-IN")}{" "}
                              {new Date(createdAtValue).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition shrink-0 mt-1" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}