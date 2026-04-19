import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getPremiumAccessMeta } from "@/lib/access";

type AccessStatus =
  | "free"
  | "login_required"
  | "no_batch"
  | "locked"
  | "expired"
  | "granted";

interface UseAccessResult {
  hasAccess: boolean;
  loading: boolean;
  status: AccessStatus;
  isLoggedIn: boolean;
  isPremiumContent: boolean;
  expiryDate: Date | null;
}

export function useAccess(
  batchId?: string,
  isPremium: boolean = false
): UseAccessResult {
  const { user } = useAuth();

  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<AccessStatus>("locked");
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkAccess = async () => {
      setLoading(true);

      try {
        // Free content always allowed
        if (!isPremium) {
          if (!isMounted) return;
          setHasAccess(true);
          setStatus("free");
          setExpiryDate(null);
          return;
        }

        // Premium but not logged in
        if (!user?.uid && !user?.email) {
          if (!isMounted) return;
          setHasAccess(false);
          setStatus("login_required");
          setExpiryDate(null);
          return;
        }

        // Premium but no batchId
        if (!batchId) {
          if (!isMounted) return;
          setHasAccess(false);
          setStatus("no_batch");
          setExpiryDate(null);
          return;
        }

        const result = await getPremiumAccessMeta(
          user.uid || "",
          user.email || "",
          batchId
        );
        if (!isMounted) return;

        setHasAccess(result.hasAccess);
        setStatus(result.status);
        setExpiryDate(result.expiryDate);
      } catch (error) {
        console.error("Access check error:", error);

        if (!isMounted) return;
        setHasAccess(false);
        setStatus("locked");
        setExpiryDate(null);
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    };

    checkAccess();

    return () => {
      isMounted = false;
    };
  }, [user?.uid, user?.email, batchId, isPremium]);

  return {
    hasAccess,
    loading,
    status,
    isLoggedIn: !!user?.uid || !!user?.email,
    isPremiumContent: isPremium,
    expiryDate,
  };
}