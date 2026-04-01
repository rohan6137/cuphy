import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { generateToken, generateOtp, hashPassword, requireAuth, formatUser } from "../lib/auth";

const router: IRouter = Router();

router.post("/auth/request-otp", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      res.status(400).json({ message: "Phone is required" });
      return;
    }

    let [user] = await db.select().from(usersTable).where(eq(usersTable.phone, phone));
    const otp = generateOtp();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    if (!user) {
      const [created] = await db.insert(usersTable).values({
        name: "Student",
        phone,
        role: "student",
        isActive: true,
        otpCode: otp,
        otpExpiresAt,
      }).returning();
      user = created;
    } else {
      await db.update(usersTable)
        .set({ otpCode: otp, otpExpiresAt })
        .where(eq(usersTable.id, user.id));
    }

    req.log.info({ phone, otp }, "OTP generated");
    res.json({ message: `OTP sent to ${phone}. (Dev: ${otp})` });
  } catch (err) {
    req.log.error(err, "Error requesting OTP");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/auth/verify-otp", async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      res.status(400).json({ message: "Phone and OTP are required" });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.phone, phone));
    if (!user) {
      res.status(401).json({ message: "Invalid phone number" });
      return;
    }

    if (!user.otpCode || user.otpCode !== otp) {
      res.status(401).json({ message: "Invalid OTP" });
      return;
    }

    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      res.status(401).json({ message: "OTP expired" });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ message: "Account disabled" });
      return;
    }

    const token = generateToken();
    await db.update(usersTable)
      .set({ currentSessionToken: token, otpCode: null, otpExpiresAt: null })
      .where(eq(usersTable.id, user.id));

    res.json({ user: formatUser(user), token });
  } catch (err) {
    req.log.error(err, "Error verifying OTP");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      res.status(400).json({ message: "Phone and password are required" });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.phone, phone));
    if (!user) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const hashed = await hashPassword(password);
    if (user.passwordHash !== hashed) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ message: "Account disabled" });
      return;
    }

    const token = generateToken();
    await db.update(usersTable)
      .set({ currentSessionToken: token })
      .where(eq(usersTable.id, user.id));

    res.json({ user: formatUser(user), token });
  } catch (err) {
    req.log.error(err, "Error logging in");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/auth/logout", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    await db.update(usersTable)
      .set({ currentSessionToken: null })
      .where(eq(usersTable.id, user.id));
    res.json({ message: "Logged out" });
  } catch (err) {
    req.log.error(err, "Error logging out");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/auth/me", requireAuth, async (req, res) => {
  const user = (req as any).user;
  res.json(formatUser(user));
});

router.post("/auth/change-password", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ message: "Current and new password are required" });
      return;
    }
    const currentHashed = await hashPassword(currentPassword);
    if (user.passwordHash !== currentHashed) {
      res.status(401).json({ message: "Current password is incorrect" });
      return;
    }
    const newHashed = await hashPassword(newPassword);
    await db.update(usersTable).set({ passwordHash: newHashed }).where(eq(usersTable.id, user.id));
    res.json({ message: "Password changed successfully" });
  } catch (err) {
    req.log.error(err, "Error changing password");
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
