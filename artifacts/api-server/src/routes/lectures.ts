import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { lecturesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAdmin } from "../lib/auth";

const router: IRouter = Router();

function formatLecture(l: any) {
  return { ...l, createdAt: l.createdAt?.toISOString?.() ?? l.createdAt };
}

router.get("/lectures", async (req, res) => {
  try {
    const subjectId = req.query.subjectId ? parseInt(String(req.query.subjectId)) : undefined;
    const batchId = req.query.batchId ? parseInt(String(req.query.batchId)) : undefined;
    let lectures = await db.select().from(lecturesTable);
    if (subjectId !== undefined) lectures = lectures.filter(l => l.subjectId === subjectId);
    if (batchId !== undefined) lectures = lectures.filter(l => l.batchId === batchId);
    lectures.sort((a, b) => a.order - b.order);
    res.json({ lectures: lectures.map(formatLecture) });
  } catch (err) {
    req.log.error(err, "Error listing lectures");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/lectures", requireAdmin, async (req, res) => {
  try {
    const { title, description, youtubeVideoId, subjectId, batchId, duration, order, isFree } = req.body;
    const [lecture] = await db.insert(lecturesTable).values({ title, description, youtubeVideoId, subjectId, batchId, duration, order: order ?? 0, isFree: isFree ?? false }).returning();
    res.status(201).json(formatLecture(lecture));
  } catch (err) {
    req.log.error(err, "Error creating lecture");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/lectures/:lectureId", async (req, res) => {
  try {
    const lectureId = parseInt(req.params.lectureId);
    const [lecture] = await db.select().from(lecturesTable).where(eq(lecturesTable.id, lectureId));
    if (!lecture) {
      res.status(404).json({ error: "Lecture not found" });
      return;
    }
    res.json(formatLecture(lecture));
  } catch (err) {
    req.log.error(err, "Error getting lecture");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/lectures/:lectureId", requireAdmin, async (req, res) => {
  try {
    const lectureId = parseInt(req.params.lectureId);
    const { title, description, youtubeVideoId, subjectId, batchId, duration, order, isFree } = req.body;
    const [updated] = await db.update(lecturesTable).set({ title, description, youtubeVideoId, subjectId, batchId, duration, order, isFree }).where(eq(lecturesTable.id, lectureId)).returning();
    if (!updated) {
      res.status(404).json({ error: "Lecture not found" });
      return;
    }
    res.json(formatLecture(updated));
  } catch (err) {
    req.log.error(err, "Error updating lecture");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/lectures/:lectureId", requireAdmin, async (req, res) => {
  try {
    const lectureId = parseInt(req.params.lectureId);
    await db.delete(lecturesTable).where(eq(lecturesTable.id, lectureId));
    res.json({ message: "Lecture deleted" });
  } catch (err) {
    req.log.error(err, "Error deleting lecture");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
