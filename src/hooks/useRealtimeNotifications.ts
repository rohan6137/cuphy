import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  filterNotificationsForUser,
  getUserEnrolledBatchIds,
  NotificationItem,
  NotificationWithRead,
  subscribeToNotifications,
  subscribeToReadNotifications,
} from "@/lib/notifications";

export function useRealtimeNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [batchIds, setBatchIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  const uid = user?.uid || "";

  useEffect(() => {
    if (!uid) {
      setNotifications([]);
      setReadIds(new Set());
      setBatchIds([]);
      setLoading(false);
      return;
    }

    let unsubNotifications: (() => void) | null = null;
    let unsubReads: (() => void) | null = null;
    let isMounted = true;

    async function init() {
      setLoading(true);

      unsubNotifications = subscribeToNotifications((items) => {
        if (!isMounted) return;
        setNotifications(items);
      });

      unsubReads = subscribeToReadNotifications(uid, (ids) => {
        if (!isMounted) return;
        setReadIds(ids);
      });

      try {
        const enrolled = await getUserEnrolledBatchIds(uid);
        if (!isMounted) return;
        setBatchIds(enrolled);
      } catch (error) {
        console.error("Realtime batch lookup error:", error);
        if (!isMounted) return;
        setBatchIds([]);
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    }

    init();

    return () => {
      isMounted = false;
      if (unsubNotifications) unsubNotifications();
      if (unsubReads) unsubReads();
    };
  }, [uid]);

  const filteredNotifications = useMemo<NotificationWithRead[]>(() => {
    if (!uid) return [];

    const visible = filterNotificationsForUser(notifications, uid, batchIds);

    return visible.map((item) => ({
      ...item,
      isRead: readIds.has(item.id),
    }));
  }, [notifications, uid, batchIds, readIds]);

  const unreadCount = useMemo(() => {
    return filteredNotifications.filter((item) => !item.isRead).length;
  }, [filteredNotifications]);

  return {
    notifications: filteredNotifications,
    unreadCount,
    loading,
    uid,
  };
}