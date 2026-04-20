import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import {
  onAuthStateChanged,
  signOut,
  User as FirebaseUser,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  EmailAuthProvider,
  linkWithCredential,
  deleteUser,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useQueryClient } from "@tanstack/react-query";

export interface AppUser {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  role: "student" | "admin";
  isAdmin: boolean;
  isActive: boolean;
  semester?: number;
  profilePicture?: string;
  createdAt?: any;
  updatedAt?: any;
  lastLoginAt?: any;
  activeWebSessionId?: string;
  lastWebLoginAt?: any;
  lastPlatform?: string;
}

interface PendingSignupData {
  fullName: string;
  phone: string;
  password: string;
  email?: string;
}

interface PendingPasswordResetData {
  uid: string;
  phone: string;
  email?: string;
}

interface AuthContextType {
  user: AppUser | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;

  loginWithEmail: (email: string, password: string) => Promise<void>;
  loginWithPhone: (phone: string, password: string) => Promise<void>;
  loginAdminWithEmail: (email: string, password: string) => Promise<void>;

  startStudentSignup: (
    fullName: string,
    phone: string,
    password: string,
    email?: string,
    containerId?: string
  ) => Promise<ConfirmationResult>;

  completeStudentSignup: (
    confirmation: ConfirmationResult,
    otp: string
  ) => Promise<void>;

  forgotPassword: (email: string) => Promise<void>;
  forgotPasswordByPhone: (phone: string) => Promise<{ mode: "email"; email: string }>;

  startForgotPasswordOtp: (
    identifier: string,
    containerId?: string
  ) => Promise<{ confirmation: ConfirmationResult; maskedPhone: string }>;

  completeForgotPasswordOtp: (
    confirmation: ConfirmationResult,
    otp: string,
    newPassword: string
  ) => Promise<void>;

  logout: () => Promise<void>;

  setupPhoneRecaptcha: (containerId?: string) => Promise<RecaptchaVerifier>;
  sendPhoneOtp: (phone: string, containerId?: string) => Promise<ConfirmationResult>;
  verifyPhoneOtp: (confirmation: ConfirmationResult, otp: string) => Promise<void>;

  refreshUser: () => Promise<void>;
  updateUser: (updatedUser: AppUser) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    recaptchaWidgetId?: number;
    recaptchaContainerId?: string;
    grecaptcha?: {
      reset: (widgetId?: number) => void;
    };
  }
}

const INTERNAL_EMAIL_DOMAIN = "cuphy-user.local";
const WEB_SESSION_KEY = "cuphy_web_session_id";
const MUST_SET_PASSWORD_KEY = "cuphy_must_set_password";

function setMustSetPasswordFlag(value: boolean) {
  if (value) {
    sessionStorage.setItem(MUST_SET_PASSWORD_KEY, "1");
  } else {
    sessionStorage.removeItem(MUST_SET_PASSWORD_KEY);
  }
}

function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, "");

  if (!digits) return "";

  if (digits.startsWith("91") && digits.length >= 12) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  if (raw.trim().startsWith("+")) {
    return `+${digits}`;
  }

  return `+${digits}`;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getInternalEmailFromPhone(phone: string) {
  const normalized = normalizePhone(phone);
  const digits = normalized.replace(/\D/g, "");
  return `${digits}@${INTERNAL_EMAIL_DOMAIN}`;
}

function isInternalGeneratedEmail(email?: string) {
  if (!email) return true;
  return email.toLowerCase().endsWith(`@${INTERNAL_EMAIL_DOMAIN}`);
}

function generateSessionId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

function getLocalWebSessionId() {
  return localStorage.getItem(WEB_SESSION_KEY) || "";
}

function setLocalWebSessionId(sessionId: string) {
  localStorage.setItem(WEB_SESSION_KEY, sessionId);
}

function clearLocalWebSessionId() {
  localStorage.removeItem(WEB_SESSION_KEY);
}

function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return phone;
  const last4 = digits.slice(-4);
  return `+${digits.slice(0, Math.max(0, digits.length - 4)).replace(/\d/g, "*")}${last4}`;
}

async function findUserByPhone(phone: string) {
  const normalized = normalizePhone(phone);

  const q = query(
    collection(db, "users"),
    where("phone", "==", normalized),
    limit(1)
  );

  const snap = await getDocs(q);

  if (snap.empty) return null;

  const foundDoc = snap.docs[0];
  return {
    id: foundDoc.id,
    data: foundDoc.data() as Partial<AppUser>,
  };
}

async function findUserByEmail(email: string) {
  const normalized = normalizeEmail(email);

  const q = query(
    collection(db, "users"),
    where("email", "==", normalized),
    limit(1)
  );

  const snap = await getDocs(q);

  if (snap.empty) return null;

  const foundDoc = snap.docs[0];
  return {
    id: foundDoc.id,
    data: foundDoc.data() as Partial<AppUser>,
  };
}

async function findUserByIdentifier(identifier: string) {
  const raw = identifier.trim();

  if (!raw) return null;

  if (raw.includes("@")) {
    return await findUserByEmail(raw);
  }

  return await findUserByPhone(raw);
}

async function createOrSyncUserDoc(firebaseUser: FirebaseUser): Promise<AppUser | null> {
  const userRef = doc(db, "users", firebaseUser.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const existing = userSnap.data() as Partial<AppUser>;
    const resolvedPhone = normalizePhone(existing.phone || firebaseUser.phoneNumber || "");

    if (!resolvedPhone) {
      console.error("Phone missing for user:", firebaseUser.uid);
      return null;
    }

    const resolvedEmail =
      existing.email && !isInternalGeneratedEmail(existing.email)
        ? normalizeEmail(existing.email)
        : "";

    const syncedUser: AppUser = {
      uid: firebaseUser.uid,
      fullName: existing.fullName || firebaseUser.displayName || "Student",
      email: resolvedEmail,
      phone: resolvedPhone,
      role: existing.role === "admin" ? "admin" : "student",
      isAdmin: existing.isAdmin ?? existing.role === "admin",
      isActive: existing.isActive ?? true,
      semester: existing.semester,
      profilePicture: existing.profilePicture || "",
      createdAt: existing.createdAt,
      updatedAt: serverTimestamp(),
      lastLoginAt: existing.lastLoginAt,
      activeWebSessionId: existing.activeWebSessionId || "",
      lastWebLoginAt: existing.lastWebLoginAt,
      lastPlatform: existing.lastPlatform || "web",
    };

    await updateDoc(userRef, {
      uid: firebaseUser.uid,
      fullName: syncedUser.fullName,
      email: syncedUser.email,
      phone: syncedUser.phone,
      role: syncedUser.role,
      isAdmin: syncedUser.isAdmin,
      isActive: syncedUser.isActive,
      semester: syncedUser.semester ?? null,
      profilePicture: syncedUser.profilePicture || "",
      updatedAt: serverTimestamp(),
    });

    return syncedUser;
  }

  const fallbackPhone = normalizePhone(firebaseUser.phoneNumber || "");
  if (!fallbackPhone) {
    return null;
  }

  // VERY IMPORTANT:
  // If OTP login lands on a different Firebase auth session,
  // reuse the existing CUPHY user doc by phone instead of creating a duplicate.
  const existingByPhone = await findUserByPhone(fallbackPhone);

  if (existingByPhone?.data) {
    const existing = existingByPhone.data as Partial<AppUser>;

    return {
      uid: existingByPhone.id,
      fullName: existing.fullName || firebaseUser.displayName || "Student",
      email:
        existing.email && !isInternalGeneratedEmail(existing.email)
          ? normalizeEmail(existing.email)
          : "",
      phone: normalizePhone(existing.phone || fallbackPhone),
      role: existing.role === "admin" ? "admin" : "student",
      isAdmin: existing.isAdmin ?? existing.role === "admin",
      isActive: existing.isActive ?? true,
      semester: existing.semester,
      profilePicture: existing.profilePicture || "",
      createdAt: existing.createdAt,
      updatedAt: existing.updatedAt,
      lastLoginAt: existing.lastLoginAt,
      activeWebSessionId: existing.activeWebSessionId || "",
      lastWebLoginAt: existing.lastWebLoginAt,
      lastPlatform: existing.lastPlatform || "web",
    };
  }

  const newUserDoc = {
    uid: firebaseUser.uid,
    fullName: firebaseUser.displayName || "Student",
    email: "",
    phone: fallbackPhone,
    role: "student" as const,
    isAdmin: false,
    isActive: true,
    profilePicture: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
    activeWebSessionId: "",
    lastWebLoginAt: null,
    lastPlatform: "web",
  };

  await setDoc(userRef, newUserDoc, { merge: true });

  return {
    ...newUserDoc,
    semester: undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  const userDocUnsubscribeRef = useRef<null | (() => void)>(null);
  const forcedLogoutRef = useRef(false);
  const sessionReadyRef = useRef(false);
  const sessionCheckDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSignupRef = useRef<PendingSignupData | null>(null);
  const pendingPasswordResetRef = useRef<PendingPasswordResetData | null>(null);

  async function attachWebSession(uid: string) {
    const sessionId = generateSessionId();
    setLocalWebSessionId(sessionId);

    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      activeWebSessionId: sessionId,
      lastWebLoginAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      lastPlatform: "web",
      updatedAt: serverTimestamp(),
    });

    sessionReadyRef.current = false;
    if (sessionCheckDelayRef.current) clearTimeout(sessionCheckDelayRef.current);
    sessionCheckDelayRef.current = setTimeout(() => {
      sessionReadyRef.current = true;
    }, 2000);
  }

  async function refreshUser() {
    const current = auth.currentUser;

    if (!current) {
      setUser(null);
      setFirebaseUser(null);
      return;
    }

    const syncedUser = await createOrSyncUserDoc(current);

    if (!syncedUser) {
      await signOut(auth);
      clearLocalWebSessionId();
      setUser(null);
      setFirebaseUser(null);
      queryClient.clear();
      throw new Error("Account not found. Register first.");
    }

    if (!syncedUser.isActive) {
      await signOut(auth);
      clearLocalWebSessionId();
      setUser(null);
      setFirebaseUser(null);
      queryClient.clear();
      throw new Error("Your account is inactive. Please contact admin.");
    }

    setFirebaseUser(current);
    setUser(syncedUser);
  }

  async function forceLogoutDueToNewSession() {
    if (forcedLogoutRef.current) return;
    forcedLogoutRef.current = true;

    try {
      await signOut(auth);
    } catch (error) {
      console.error("Forced logout signOut error:", error);
    }

    clearLocalWebSessionId();
    setMustSetPasswordFlag(false);
    setUser(null);
    setFirebaseUser(null);
    queryClient.clear();

    window.alert("Your account was logged in on another browser. You have been logged out.");
    window.location.href = "/login";
  }

  function subscribeToUserSession(uid: string) {
    if (userDocUnsubscribeRef.current) {
      userDocUnsubscribeRef.current();
      userDocUnsubscribeRef.current = null;
    }

    const userRef = doc(db, "users", uid);

    userDocUnsubscribeRef.current = onSnapshot(
      userRef,
      (snap) => {
        if (!snap.exists()) return;

        const latest = snap.data() as Partial<AppUser>;
        const localSessionId = getLocalWebSessionId();

        setUser((prev) =>
          prev
            ? {
              ...prev,
              ...latest,
              phone: normalizePhone(latest.phone || prev.phone || ""),
              email:
                latest.email && !isInternalGeneratedEmail(latest.email)
                  ? normalizeEmail(latest.email)
                  : prev.email || "",
            }
            : prev
        );

        if (!sessionReadyRef.current) return;
        if (!localSessionId) return;
        if (!latest.activeWebSessionId) return;

        if (latest.activeWebSessionId !== localSessionId) {
          forceLogoutDueToNewSession();
        }
      },
      (error) => {
        console.error("User session listener error:", error);
      }
    );
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setIsLoading(true);
      forcedLogoutRef.current = false;

      try {
        if (!fbUser) {
          setUser(null);
          setFirebaseUser(null);

          if (userDocUnsubscribeRef.current) {
            userDocUnsubscribeRef.current();
            userDocUnsubscribeRef.current = null;
          }

          if (sessionCheckDelayRef.current) {
            clearTimeout(sessionCheckDelayRef.current);
            sessionCheckDelayRef.current = null;
          }

          sessionReadyRef.current = false;
          setIsLoading(false);
          return;
        }

        const syncedUser = await createOrSyncUserDoc(fbUser);

        if (!syncedUser) {
          await signOut(auth);
          clearLocalWebSessionId();
          setMustSetPasswordFlag(false);
          setUser(null);
          setFirebaseUser(null);
          queryClient.clear();
          setIsLoading(false);
          return;
        }

        if (!syncedUser.isActive) {
          await signOut(auth);
          clearLocalWebSessionId();
          setMustSetPasswordFlag(false);
          setUser(null);
          setFirebaseUser(null);
          queryClient.clear();
          setIsLoading(false);
          return;
        }

        setFirebaseUser(fbUser);
        setUser(syncedUser);
        subscribeToUserSession(fbUser.uid);

        sessionReadyRef.current = false;
        if (sessionCheckDelayRef.current) clearTimeout(sessionCheckDelayRef.current);
        sessionCheckDelayRef.current = setTimeout(() => {
          sessionReadyRef.current = true;
        }, 2000);
      } catch (error) {
        console.error("Error loading auth user:", error);
        setUser(null);
        setFirebaseUser(null);
      } finally {
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribe();

      if (userDocUnsubscribeRef.current) {
        userDocUnsubscribeRef.current();
        userDocUnsubscribeRef.current = null;
      }

      if (sessionCheckDelayRef.current) {
        clearTimeout(sessionCheckDelayRef.current);
        sessionCheckDelayRef.current = null;
      }

      sessionReadyRef.current = false;

      try {
        if (window.recaptchaVerifier) {
          window.recaptchaVerifier.clear();
          window.recaptchaVerifier = undefined;
        }
      } catch (error) {
        console.warn("Failed to clear reCAPTCHA on unmount:", error);
      }

      window.recaptchaWidgetId = undefined;
      window.recaptchaContainerId = undefined;
    };
  }, [queryClient]);

  async function loginWithEmail(email: string, password: string) {
    const normalizedEmail = normalizeEmail(email);

    const found = await findUserByEmail(normalizedEmail);

    if (!found?.data) {
      throw new Error("No account found with this email address.");
    }

    if (found.data.isActive === false) {
      throw new Error("Your account is inactive. Please contact admin.");
    }

    const linkedPhone = normalizePhone(found.data.phone || "");

    if (!linkedPhone) {
      throw new Error("No linked phone number found for this account.");
    }

    const internalEmail = getInternalEmailFromPhone(linkedPhone);

    const credential = await signInWithEmailAndPassword(auth, internalEmail, password);
    const syncedUser = await createOrSyncUserDoc(credential.user);

    if (!syncedUser) {
      await signOut(auth);
      throw new Error("Account not found. Register first.");
    }

    await attachWebSession(credential.user.uid);
    await refreshUser();
  }


  async function loginWithPhone(phone: string, password: string) {
    const normalizedPhone = normalizePhone(phone);
    const internalEmail = getInternalEmailFromPhone(normalizedPhone);

    try {
      const credential = await signInWithEmailAndPassword(auth, internalEmail, password);
      const syncedUser = await createOrSyncUserDoc(credential.user);

      if (!syncedUser) {
        await signOut(auth);
        throw new Error("Account not found. Register first.");
      }

      if (!syncedUser.phone) {
        await signOut(auth);
        throw new Error("Invalid account. Phone missing.");
      }

      await attachWebSession(credential.user.uid);
      await refreshUser();
    } catch (error: any) {
      const found = await findUserByPhone(normalizedPhone);

      if (found?.data?.email && !isInternalGeneratedEmail(found.data.email)) {
        const fallbackCredential = await signInWithEmailAndPassword(
          auth,
          found.data.email,
          password
        );

        const syncedUser = await createOrSyncUserDoc(fallbackCredential.user);

        if (!syncedUser) {
          await signOut(auth);
          throw new Error("Account not found. Register first.");
        }

        await attachWebSession(fallbackCredential.user.uid);
        await refreshUser();
        return;
      }

      throw error;
    }
  }

  async function loginAdminWithEmail(email: string, password: string) {
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);

    const userRef = doc(db, "users", credential.user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await signOut(auth);
      throw new Error("Admin account not configured.");
    }

    const data = userSnap.data() as Partial<AppUser>;
    const allowed = data.isAdmin === true || data.role === "admin";

    if (!allowed) {
      await signOut(auth);
      throw new Error("You are not authorized as admin.");
    }

    if (data.isActive === false) {
      await signOut(auth);
      throw new Error("Your admin account is inactive.");
    }

    await attachWebSession(credential.user.uid);
    await refreshUser();
  }

  async function setupPhoneRecaptcha(
    containerId = "recaptcha-container"
  ): Promise<RecaptchaVerifier> {
    const container = document.getElementById(containerId);

    if (!container) {
      throw new Error("reCAPTCHA container not found.");
    }

    const existingInner = document.getElementById(`${containerId}-inner`);

    const staleVerifier =
      !!window.recaptchaVerifier &&
      (
        window.recaptchaContainerId !== containerId ||
        !existingInner ||
        !document.body.contains(container)
      );

    if (staleVerifier) {
      try {
        window.recaptchaVerifier?.clear();
      } catch (e) { }

      window.recaptchaVerifier = undefined;
      window.recaptchaWidgetId = undefined;
      window.recaptchaContainerId = undefined;
    }

    const sameContainer =
      !!window.recaptchaVerifier &&
      window.recaptchaContainerId === containerId &&
      !!existingInner &&
      document.body.contains(existingInner);

    if (sameContainer) {
      try {
        if (
          typeof window.recaptchaWidgetId === "number" &&
          window.grecaptcha &&
          typeof window.grecaptcha.reset === "function"
        ) {
          window.grecaptcha.reset(window.recaptchaWidgetId);
        }
      } catch { }

      return window.recaptchaVerifier!;
    }

    try {
      window.recaptchaVerifier?.clear();
    } catch { }

    window.recaptchaVerifier = undefined;
    window.recaptchaWidgetId = undefined;
    window.recaptchaContainerId = undefined;

    container.innerHTML = "";

    const inner = document.createElement("div");
    inner.id = `${containerId}-inner`;
    container.appendChild(inner);

    const verifier = new RecaptchaVerifier(auth, inner, {
      size: "invisible",
    });

    const widgetId = await verifier.render();

    window.recaptchaVerifier = verifier;
    window.recaptchaWidgetId = widgetId;
    window.recaptchaContainerId = containerId;

    return verifier;
  }

  async function sendOtpInternal(
    phone: string,
    purpose: "login" | "signup" | "reset-password",
    containerId = "recaptcha-container"
  ): Promise<ConfirmationResult> {
    const normalizedPhone = normalizePhone(phone);

    if (!normalizedPhone) {
      throw new Error("Enter a valid mobile number.");
    }

    // 🔒 Validation logic (UNCHANGED)
    if (purpose === "login") {
      const found = await findUserByPhone(normalizedPhone);
      if (!found?.data) {
        throw new Error("Account not found. Register first.");
      }
      if (found.data.isActive === false) {
        throw new Error("Your account is inactive. Please contact admin.");
      }
    }

    if (purpose === "signup") {
      const found = await findUserByPhone(normalizedPhone);
      if (found?.data) {
        throw new Error("This mobile number is already registered.");
      }
    }

    if (purpose === "reset-password") {
      const found = await findUserByPhone(normalizedPhone);
      if (!found?.data) {
        throw new Error("No account found with this linked mobile number.");
      }
      if (found.data.isActive === false) {
        throw new Error("Your account is inactive. Please contact admin.");
      }
    }

    let verifier: RecaptchaVerifier;

    // 🔁 Always ensure fresh verifier
    try {
      verifier = await setupPhoneRecaptcha(containerId);
    } catch {
      try {
        window.recaptchaVerifier?.clear();
      } catch { }

      window.recaptchaVerifier = undefined;
      window.recaptchaWidgetId = undefined;
      window.recaptchaContainerId = undefined;

      verifier = await setupPhoneRecaptcha(containerId);
    }

    try {
      // 🔄 Reset widget before sending OTP
      if (
        typeof window.recaptchaWidgetId === "number" &&
        window.grecaptcha &&
        typeof window.grecaptcha.reset === "function"
      ) {
        window.grecaptcha.reset(window.recaptchaWidgetId);
      }

      const confirmation = await signInWithPhoneNumber(
        auth,
        normalizedPhone,
        verifier
      );

      return confirmation;
    } catch (error: any) {
      // ❗ Clear broken verifier completely
      try {
        window.recaptchaVerifier?.clear();
      } catch { }

      window.recaptchaVerifier = undefined;
      window.recaptchaWidgetId = undefined;
      window.recaptchaContainerId = undefined;

      // 🔥 Handle recaptcha-specific errors
      if (
        String(error?.message || "").toLowerCase().includes("recaptcha") ||
        String(error?.message || "").toLowerCase().includes("removed")
      ) {
        throw new Error("Verification expired. Please try again.");
      }

      if (error?.code === "auth/invalid-phone-number") {
        throw new Error("Invalid mobile number.");
      }

      if (error?.code === "auth/too-many-requests") {
        throw new Error("Too many OTP requests. Please wait and try again.");
      }

      if (error?.code === "auth/quota-exceeded") {
        throw new Error("OTP quota exceeded. Please try again later.");
      }

      throw error;
    }
  }

  async function sendPhoneOtp(phone: string, containerId = "recaptcha-container") {
    return await sendOtpInternal(phone, "login", containerId);
  }

  async function verifyPhoneOtp(confirmation: ConfirmationResult, otp: string) {
    const cleanOtp = otp.trim();

    if (!cleanOtp || cleanOtp.length !== 6) {
      throw new Error("Enter a valid 6-digit OTP.");
    }

    try {
      await confirmation.confirm(cleanOtp);
      await refreshUser();
    } catch (error: any) {
      if (error?.code === "auth/invalid-verification-code") {
        throw new Error("Invalid OTP. Please try again.");
      }

      if (error?.code === "auth/code-expired") {
        throw new Error("OTP expired. Please request a new OTP.");
      }

      if (error?.code === "auth/session-expired") {
        throw new Error("OTP session expired. Please request a new OTP.");
      }

      throw error;
    }
  }

  async function startStudentSignup(
    fullName: string,
    phone: string,
    password: string,
    email?: string,
    containerId = "recaptcha-container"
  ) {
    const normalizedPhone = normalizePhone(phone);

    pendingSignupRef.current = {
      fullName: fullName.trim(),
      phone: normalizedPhone,
      password,
      email: email?.trim().toLowerCase() || "",
    };

    try {
      return await sendOtpInternal(normalizedPhone, "signup", containerId);
    } catch (error) {
      pendingSignupRef.current = null;
      throw error;
    }
  }

  async function completeStudentSignup(
    confirmation: ConfirmationResult,
    otp: string
  ) {
    if (!pendingSignupRef.current) {
      throw new Error("Signup session expired. Please try again.");
    }

    const { fullName, phone, password, email } = pendingSignupRef.current;

    const authEmail = getInternalEmailFromPhone(phone);
    const optionalEmail = email?.trim().toLowerCase() || "";

    let resultUser: FirebaseUser | null = null;

    try {
      const cleanOtp = otp.trim();

      if (!cleanOtp || cleanOtp.length !== 6) {
        throw new Error("Enter a valid 6-digit OTP.");
      }

      const result = await confirmation.confirm(cleanOtp);
      resultUser = result.user;

      const existingUserDoc = await getDoc(doc(db, "users", resultUser.uid));
      if (existingUserDoc.exists()) {
        throw new Error("This mobile number is already registered.");
      }

      const credential = EmailAuthProvider.credential(authEmail, password);
      await linkWithCredential(resultUser, credential);

      await updateProfile(resultUser, {
        displayName: fullName,
      });

      const userRef = doc(db, "users", resultUser.uid);

      const newUser = {
        uid: resultUser.uid,
        fullName,
        email: optionalEmail,
        phone,
        role: "student" as const,
        isAdmin: false,
        isActive: true,
        profilePicture: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        activeWebSessionId: "",
        lastWebLoginAt: null,
        lastPlatform: "web",
      };

      await setDoc(userRef, newUser);
      await attachWebSession(resultUser.uid);
      await refreshUser();

      pendingSignupRef.current = null;
    } catch (error: any) {
      console.error("Student signup completion error:", error);

      if (resultUser) {
        try {
          await deleteUser(resultUser);
        } catch (cleanupError) {
          console.error("Failed to cleanup partial signup user:", cleanupError);
        }
      }

      pendingSignupRef.current = null;

      if (error?.code === "auth/credential-already-in-use") {
        throw new Error("This account is already linked.");
      }

      if (error?.code === "auth/email-already-in-use") {
        throw new Error("This account already exists.");
      }

      if (error?.code === "auth/invalid-verification-code") {
        throw new Error("Invalid OTP. Please try again.");
      }

      if (error?.code === "auth/code-expired") {
        throw new Error("OTP expired. Please request a new OTP.");
      }

      if (error?.code === "auth/session-expired") {
        throw new Error("OTP session expired. Please request a new OTP.");
      }

      if (error?.code === "auth/provider-already-linked") {
        throw new Error("This phone number is already registered.");
      }

      throw error;
    }
  }

  async function startForgotPasswordOtp(
    identifier: string,
    containerId = "recaptcha-container"
  ) {
    const found = await findUserByIdentifier(identifier);

    if (!found?.data) {
      throw new Error("Account not found. Please check your mobile number or email.");
    }

    if (found.data.isActive === false) {
      throw new Error("Your account is inactive. Please contact admin.");
    }

    const linkedPhone = normalizePhone(found.data.phone || "");

    if (!linkedPhone) {
      throw new Error("No linked phone number found for this account.");
    }

    pendingPasswordResetRef.current = {
      uid: found.id,
      phone: linkedPhone,
      email: found.data.email || "",
    };

    try {
      const confirmation = await sendOtpInternal(
        linkedPhone,
        "reset-password",
        containerId
      );

      return {
        confirmation,
        maskedPhone: maskPhone(linkedPhone),
      };
    } catch (error) {
      pendingPasswordResetRef.current = null;
      throw error;
    }
  }

  async function completeForgotPasswordOtp(
    confirmation: ConfirmationResult,
    otp: string,
    _newPassword: string
  ) {
    if (!pendingPasswordResetRef.current) {
      throw new Error("Password reset session expired. Please request OTP again.");
    }

    const cleanOtp = otp.trim();

    if (!cleanOtp || cleanOtp.length !== 6) {
      throw new Error("Enter a valid 6-digit OTP.");
    }

    try {
      const result = await confirmation.confirm(cleanOtp);

      const verifiedPhone = normalizePhone(result.user.phoneNumber || "");
      const expectedPhone = normalizePhone(pendingPasswordResetRef.current.phone);
      const correctUid = pendingPasswordResetRef.current.uid;

      if (verifiedPhone !== expectedPhone) {
        throw new Error("OTP verified for a different phone number.");
      }

      const correctUserRef = doc(db, "users", correctUid);
      const correctUserSnap = await getDoc(correctUserRef);

      if (!correctUserSnap.exists()) {
        throw new Error("Account not found for password reset.");
      }

      const correctUserData = correctUserSnap.data() as Partial<AppUser>;

      if (correctUserData.isActive === false) {
        throw new Error("Your account is inactive. Please contact admin.");
      }

      const resolvedUser: AppUser = {
        uid: correctUid,
        fullName: correctUserData.fullName || result.user.displayName || "Student",
        email:
          correctUserData.email && !isInternalGeneratedEmail(correctUserData.email)
            ? normalizeEmail(correctUserData.email)
            : "",
        phone: normalizePhone(correctUserData.phone || expectedPhone),
        role: correctUserData.role === "admin" ? "admin" : "student",
        isAdmin: correctUserData.isAdmin ?? correctUserData.role === "admin",
        isActive: correctUserData.isActive ?? true,
        semester: correctUserData.semester,
        profilePicture: correctUserData.profilePicture || "",
        createdAt: correctUserData.createdAt,
        updatedAt: correctUserData.updatedAt,
        lastLoginAt: correctUserData.lastLoginAt,
        activeWebSessionId: correctUserData.activeWebSessionId || "",
        lastWebLoginAt: correctUserData.lastWebLoginAt,
        lastPlatform: correctUserData.lastPlatform || "web",
      };

      // Keep the OTP Firebase session alive for now,
      // but switch the app-level user context to the real CUPHY account.
      setFirebaseUser(result.user);
      setUser(resolvedUser);
      setMustSetPasswordFlag(true);

      pendingPasswordResetRef.current = null;
    } catch (error: any) {
      if (error?.code === "auth/invalid-verification-code") {
        throw new Error("Invalid OTP. Please try again.");
      }

      if (error?.code === "auth/code-expired") {
        throw new Error("OTP expired. Please request a new OTP.");
      }

      if (error?.code === "auth/session-expired") {
        throw new Error("OTP session expired. Please request a new OTP.");
      }

      throw error;
    }
  }

  async function forgotPassword(email: string) {
    await sendPasswordResetEmail(auth, email.trim());
  }

  async function forgotPasswordByPhone(phone: string) {
    const found = await findUserByPhone(phone);

    if (!found?.data) {
      throw new Error("No account found with this mobile number.");
    }

    const accountEmail = found.data.email || "";

    if (!accountEmail || isInternalGeneratedEmail(accountEmail)) {
      throw new Error(
        "No linked personal email found for this mobile number. Please contact admin or update your email in profile first."
      );
    }

    await sendPasswordResetEmail(auth, accountEmail);

    return {
      mode: "email" as const,
      email: accountEmail,
    };
  }

  async function logout() {
    try {
      if (auth.currentUser?.uid) {
        const currentUid = auth.currentUser.uid;
        const currentLocalSession = getLocalWebSessionId();

        const userRef = doc(db, "users", currentUid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
          const data = snap.data() as Partial<AppUser>;
          if (data.activeWebSessionId && data.activeWebSessionId === currentLocalSession) {
            await updateDoc(userRef, {
              activeWebSessionId: "",
              updatedAt: serverTimestamp(),
            });
          }
        }
      }

      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      clearLocalWebSessionId();
      setMustSetPasswordFlag(false);
      setUser(null);
      setFirebaseUser(null);
      queryClient.clear();

      if (userDocUnsubscribeRef.current) {
        userDocUnsubscribeRef.current();
        userDocUnsubscribeRef.current = null;
      }

      if (sessionCheckDelayRef.current) {
        clearTimeout(sessionCheckDelayRef.current);
        sessionCheckDelayRef.current = null;
      }

      sessionReadyRef.current = false;
    }
  }

  function updateUser(updatedUser: AppUser) {
    setUser(updatedUser);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        isLoading,
        isAuthenticated: !!user,
        isAdmin: user?.isAdmin === true || user?.role === "admin",
        loginWithEmail,
        loginWithPhone,
        loginAdminWithEmail,
        startStudentSignup,
        completeStudentSignup,
        forgotPassword,
        forgotPasswordByPhone,
        startForgotPasswordOtp,
        completeForgotPasswordOtp,
        logout,
        setupPhoneRecaptcha,
        sendPhoneOtp,
        verifyPhoneOtp,
        refreshUser,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}