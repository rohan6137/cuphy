import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

export interface AppSettings {
  appName: string;
  tagline: string;
  primaryColor: string;
  secondaryColor: string;
  darkMode: boolean;
  maintenanceMode: boolean;
  contactEmail: string;
  contactPhone: string;
  razorpayKeyId: string;

  supportEnabled: boolean;
  supportTicketEnabled: boolean;
  supportWhatsappNumber: string;
  supportWhatsappLabel: string;
  supportEmail: string;
  supportEmailLabel: string;
  supportNote: string;
}

const defaultSettings: AppSettings = {
  appName: "CUPHY",
  tagline: "Physics Made Powerful",
  primaryColor: "#7C3AED",
  secondaryColor: "#1E1B4B",
  darkMode: false,
  maintenanceMode: false,
  contactEmail: "",
  contactPhone: "",
  razorpayKeyId: "",

  supportEnabled: true,
  supportTicketEnabled: true,
  supportWhatsappNumber: "",
  supportWhatsappLabel: "Chat on WhatsApp",
  supportEmail: "",
  supportEmailLabel: "Email Support",
  supportNote:
    "For urgent issues, use WhatsApp. For detailed issues, use email or submit a support ticket.",
};

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loading, setLoading] = useState(false); // 👈 IMPORTANT CHANGE

  useEffect(() => {
    try {
      if (!db) {
        console.warn("Firebase DB not initialized");
        return;
      }

      const ref = doc(db, "appSettings", "main");

      const unsubscribe = onSnapshot(
        ref,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data() as Partial<AppSettings>;
            setSettings({ ...defaultSettings, ...data });
          }
        },
        (error) => {
          console.error("AppSettings error:", error);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error("useAppSettings failed:", err);
    }
  }, []);

  return { settings, loading };
}