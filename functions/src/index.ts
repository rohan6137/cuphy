import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import Razorpay from "razorpay";
import crypto from "crypto";
import cors from "cors";

admin.initializeApp();

const db = admin.firestore();
const corsHandler = cors({ origin: true });

function getRazorpayClient(): Razorpay {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Missing Razorpay environment variables");
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

export const createRazorpayOrder = onRequest(
  { region: "asia-south1" },
  async (req, res) => {
    corsHandler(req, res, async () => {
      try {
        if (req.method !== "POST") {
          res.status(405).json({
            success: false,
            message: "Method not allowed",
          });
          return;
        }

        const body = req.body || {};
        const batchId = body.batchId as string;
        const batchName = body.batchName as string;
        const semester = (body.semester as string) || "";
        const amount = body.amount as number;
        const userEmail = body.userEmail as string;
        const userName = (body.userName as string) || "";

        if (!batchId || !batchName || !amount || !userEmail) {
          res.status(400).json({
            success: false,
            message: "Missing required fields",
          });
          return;
        }

        const razorpay = getRazorpayClient();

        const order = await razorpay.orders.create({
          amount: Number(amount) * 100,
          currency: "INR",
          receipt: `cuphy_${batchId}_${Date.now()}`,
          notes: {
            batchId,
            batchName,
            semester,
            userEmail,
            userName,
          },
        });

        res.status(200).json({
          success: true,
          order,
          key: process.env.RAZORPAY_KEY_ID,
        });
      } catch (error: unknown) {
        logger.error("createRazorpayOrder error", error);
        res.status(500).json({
          success: false,
          message: "Failed to create Razorpay order",
        });
      }
    });
  }
);

export const verifyRazorpayPayment = onRequest(
  { region: "asia-south1" },
  async (req, res) => {
    corsHandler(req, res, async () => {
      try {
        if (req.method !== "POST") {
          res.status(405).json({
            success: false,
            message: "Method not allowed",
          });
          return;
        }

        const body = req.body || {};
        const razorpayOrderId = body.razorpay_order_id as string;
        const razorpayPaymentId = body.razorpay_payment_id as string;
        const razorpaySignature = body.razorpay_signature as string;
        const batchId = body.batchId as string;
        const batchName = body.batchName as string;
        const semester = (body.semester as string) || "";
        const amount = body.amount as number;
        const userEmail = body.userEmail as string;
        const userName = (body.userName as string) || "";

        if (
          !razorpayOrderId ||
          !razorpayPaymentId ||
          !razorpaySignature ||
          !batchId ||
          !userEmail
        ) {
          res.status(400).json({
            success: false,
            message: "Missing required verification fields",
          });
          return;
        }

        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        if (!keySecret) {
          throw new Error("Missing Razorpay secret");
        }

        const expectedSignature = crypto
          .createHmac("sha256", keySecret)
          .update(`${razorpayOrderId}|${razorpayPaymentId}`)
          .digest("hex");

        if (expectedSignature !== razorpaySignature) {
          res.status(400).json({
            success: false,
            message: "Invalid payment signature",
          });
          return;
        }

        await db.collection("payments").add({
          batchId,
          batchName,
          semester,
          amount: Number(amount || 0),
          userEmail,
          userName,
          paymentGateway: "razorpay",
          paymentStatus: "paid",
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        const existingSubSnap = await db
          .collection("subscriptions")
          .where("userEmail", "==", userEmail)
          .where("batchId", "==", batchId)
          .limit(1)
          .get();

        if (!existingSubSnap.empty) {
          const subRef = existingSubSnap.docs[0].ref;

          await subRef.update({
            batchName,
            semester,
            paymentStatus: "paid",
            active: true,
            premiumUnlocked: true,
            expiredByAdmin: false,
            manualExpiry: true,
            expiryDate: null,
            purchaseDate: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            paymentGateway: "razorpay",
            razorpayOrderId,
            razorpayPaymentId,
          });
        } else {
          await db.collection("subscriptions").add({
            userEmail,
            userName,
            batchId,
            batchName,
            semester,
            paymentStatus: "paid",
            active: true,
            premiumUnlocked: true,
            expiredByAdmin: false,
            manualExpiry: true,
            expiryDate: null,
            purchaseDate: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            paymentGateway: "razorpay",
            razorpayOrderId,
            razorpayPaymentId,
          });
        }

        res.status(200).json({
          success: true,
          message: "Payment verified and premium unlocked",
        });
      } catch (error: unknown) {
        logger.error("verifyRazorpayPayment error", error);
        res.status(500).json({
          success: false,
          message: "Failed to verify payment",
        });
      }
    });
  }
);
export const resetUserPassword = onRequest(
  { region: "asia-south1" },
  async (req, res) => {
    corsHandler(req, res, async () => {
      try {
        if (req.method !== "POST") {
          res.status(405).json({
            success: false,
            message: "Method not allowed",
          });
          return;
        }

        const body = req.body || {};
        const uid = body.uid as string;
        const newPassword = body.newPassword as string;

        if (!uid || !newPassword) {
          res.status(400).json({
            success: false,
            message: "Missing required fields",
          });
          return;
        }

        if (String(newPassword).length < 6) {
          res.status(400).json({
            success: false,
            message: "Password must be at least 6 characters",
          });
          return;
        }

        await admin.auth().updateUser(uid, {
          password: newPassword,
        });

        res.status(200).json({
          success: true,
          message: "Password updated successfully",
        });
      } catch (error: any) {
        logger.error("resetUserPassword error", error);
        res.status(500).json({
          success: false,
          message: error?.message || "Failed to reset password",
        });
      }
    });
  }
);