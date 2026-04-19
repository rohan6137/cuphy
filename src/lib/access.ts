import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

function normalizeId(value: any): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function parseExpiryDate(expiryDate: any): Date | null {
  if (!expiryDate) return null;

  if (typeof expiryDate?.toDate === "function") {
    return expiryDate.toDate();
  }

  const parsed = new Date(expiryDate);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export async function checkEnrollment(
  userUid: string,
  userEmail: string,
  batchId: string
) {
  if (!batchId || (!userUid && !userEmail)) return false;

  const enrollmentMap = new Map<string, any>();

  try {
    if (userUid) {
      const snapByUid = await getDocs(
        query(
          collection(db, "enrollments"),
          where("userUid", "==", userUid),
          where("batchId", "==", batchId)
        )
      );

      snapByUid.docs.forEach((d) => {
        enrollmentMap.set(d.id, d.data());
      });
    }

    if (userEmail) {
      const snapByEmail = await getDocs(
        query(
          collection(db, "enrollments"),
          where("userEmail", "==", userEmail),
          where("batchId", "==", batchId)
        )
      );

      snapByEmail.docs.forEach((d) => {
        enrollmentMap.set(d.id, d.data());
      });
    }
  } catch (error) {
    console.error("Enrollment check error:", error);
  }

  return enrollmentMap.size > 0;
}

export async function checkPremiumAccess(
  userUid: string,
  userEmail: string,
  batchId: string
) {
  if (!batchId || (!userUid && !userEmail)) return false;

  const subscriptionMap = new Map<string, any>();

  try {
    if (userUid) {
      const snapByUid = await getDocs(
        query(
          collection(db, "subscriptions"),
          where("userUid", "==", userUid),
          where("batchId", "==", batchId),
          where("active", "==", true)
        )
      );

      snapByUid.docs.forEach((d) => {
        subscriptionMap.set(d.id, d.data());
      });
    }

    if (userEmail) {
      const snapByEmail = await getDocs(
        query(
          collection(db, "subscriptions"),
          where("userEmail", "==", userEmail),
          where("batchId", "==", batchId),
          where("active", "==", true)
        )
      );

      snapByEmail.docs.forEach((d) => {
        subscriptionMap.set(d.id, d.data());
      });
    }
  } catch (error) {
    console.error("Premium access error:", error);
    return false;
  }

  if (subscriptionMap.size === 0) return false;

  const now = new Date();

  for (const sub of subscriptionMap.values()) {
    if (sub.active !== true) continue;
    if (sub.expiredByAdmin === true) continue;
    if (sub.paymentStatus && sub.paymentStatus !== "paid") continue;
    if (sub.premiumUnlocked !== true) continue;

    if (!sub.expiryDate) return true;

    const expiryDate = parseExpiryDate(sub.expiryDate);

    if (!expiryDate || expiryDate >= now) {
      return true;
    }
  }

  return false;
}

export async function getPremiumAccessMeta(
  userUid: string,
  userEmail: string,
  batchId: string
) {
  if (!batchId || (!userUid && !userEmail)) {
    return {
      hasAccess: false,
      status: "locked" as const,
      expiryDate: null as Date | null,
    };
  }

  const subscriptionMap = new Map<string, any>();

  try {
    if (userUid) {
      const snapByUid = await getDocs(
        query(
          collection(db, "subscriptions"),
          where("userUid", "==", userUid),
          where("batchId", "==", batchId)
        )
      );

      snapByUid.docs.forEach((d) => {
        subscriptionMap.set(d.id, d.data());
      });
    }

    if (userEmail) {
      const snapByEmail = await getDocs(
        query(
          collection(db, "subscriptions"),
          where("userEmail", "==", userEmail),
          where("batchId", "==", batchId)
        )
      );

      snapByEmail.docs.forEach((d) => {
        subscriptionMap.set(d.id, d.data());
      });
    }
  } catch (error) {
    console.error("Premium access meta error:", error);
    return {
      hasAccess: false,
      status: "locked" as const,
      expiryDate: null as Date | null,
    };
  }

  if (subscriptionMap.size === 0) {
    return {
      hasAccess: false,
      status: "locked" as const,
      expiryDate: null as Date | null,
    };
  }

  const now = new Date();
  let latestExpiry: Date | null = null;
  let granted = false;
  let expiredFound = false;

  for (const sub of subscriptionMap.values()) {
    if (sub.expiredByAdmin === true) continue;
    if (sub.paymentStatus && sub.paymentStatus !== "paid") continue;
    if (sub.premiumUnlocked !== true) continue;
    if (sub.active !== true) continue;

    if (!sub.expiryDate) {
      granted = true;
      latestExpiry = null;
      break;
    }

    const expiryDate = parseExpiryDate(sub.expiryDate);

    if (!expiryDate) {
      granted = true;
      latestExpiry = null;
      break;
    }

    if (!latestExpiry || expiryDate > latestExpiry) {
      latestExpiry = expiryDate;
    }

    if (expiryDate >= now) {
      granted = true;
    } else {
      expiredFound = true;
    }
  }

  if (granted) {
    return {
      hasAccess: true,
      status: "granted" as const,
      expiryDate: latestExpiry,
    };
  }

  if (expiredFound) {
    return {
      hasAccess: false,
      status: "expired" as const,
      expiryDate: latestExpiry,
    };
  }

  return {
    hasAccess: false,
    status: "locked" as const,
    expiryDate: latestExpiry,
  };
}