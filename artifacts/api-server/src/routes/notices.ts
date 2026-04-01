import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { noticesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../lib/auth";

const router: IRouter = Router();

function formatNotice(n: any) {
  return { ...n, createdAt: n.createdAt?.toISOString?.() ?? n.createdAt, expiresAt: n.expiresAt?.toISOString?.() ?? null };
}

router.get("/notices", async (req, res) => {
  try {
    const batchId = req.query.batchId ? parseInt(String(req.query.batchId)) : undefined;
    const type = req.query.type as string | undefined;
    let notices = await db.select().from(noticesTable);
    if (batchId !== undefined) notices = notices.filter(n => n.batchId === batchId);
    if (type) notices = notices.filter(n => n.type === type);
    notices = notices.filter(n => n.isActive);
    res.json({ notices: notices.map(formatNotice) });
  } catch (err) {
    req.log.error(err, "Error listing notices");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/notices", requireAdmin, async (req, res) => {
  try {
    const { title, content, type, batchId, isActive, expiresAt } = req.body;
    const [notice] = await db.insert(noticesTable).values({
      title, content, type: type ?? "notice", batchId,
      isActive: isActive ?? true,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    }).returning();
    res.status(201).json(formatNotice(notice));
  } catch (err) {
    req.log.error(err, "Error creating notice");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/notices/:noticeId", requireAdmin, async (req, res) => {
  try {
    const noticeId = parseInt(req.params.noticeId);
    const { title, content, type, batchId, isActive, expiresAt } = req.body;
    const [updated] = await db.update(noticesTable).set({
      title, content, type, batchId, isActive,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    }).where(eq(noticesTable.id, noticeId)).returning();
    if (!updated) {
      res.status(404).json({ error: "Notice not found" });
      return;
    }
    res.json(formatNotice(updated));
  } catch (err) {
    req.log.error(err, "Error updating notice");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/notices/:noticeId", requireAdmin, async (req, res) => {
  try {
    const noticeId = parseInt(req.params.noticeId);
    await db.delete(noticesTable).where(eq(noticesTable.id, noticeId));
    res.json({ message: "Notice deleted" });
  } catch (err) {
    req.log.error(err, "Error deleting notice");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
