import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { subjectsTable, lecturesTable, notesTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireAdmin } from "../lib/auth";

const router: IRouter = Router();

router.get("/subjects", async (req, res) => {
  try {
    const batchId = req.query.batchId ? parseInt(String(req.query.batchId)) : undefined;
    let subjects = await db.select().from(subjectsTable);
    if (batchId !== undefined) {
      subjects = subjects.filter(s => s.batchId === batchId);
    }
    subjects.sort((a, b) => a.order - b.order);

    const withCounts = await Promise.all(subjects.map(async (s) => {
      const [lc] = await db.select({ count: sql<number>`count(*)` }).from(lecturesTable).where(eq(lecturesTable.subjectId, s.id));
      const [nc] = await db.select({ count: sql<number>`count(*)` }).from(notesTable).where(eq(notesTable.subjectId, s.id));
      return { ...s, lecturesCount: Number(lc.count), notesCount: Number(nc.count) };
    }));

    res.json({ subjects: withCounts });
  } catch (err) {
    req.log.error(err, "Error listing subjects");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/subjects", requireAdmin, async (req, res) => {
  try {
    const { name, description, batchId, icon, order } = req.body;
    const [subject] = await db.insert(subjectsTable).values({ name, description, batchId, icon, order: order ?? 0 }).returning();
    res.status(201).json({ ...subject, lecturesCount: 0, notesCount: 0 });
  } catch (err) {
    req.log.error(err, "Error creating subject");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/subjects/:subjectId", requireAdmin, async (req, res) => {
  try {
    const subjectId = parseInt(req.params.subjectId);
    const { name, description, batchId, icon, order } = req.body;
    const [updated] = await db.update(subjectsTable).set({ name, description, batchId, icon, order }).where(eq(subjectsTable.id, subjectId)).returning();
    if (!updated) {
      res.status(404).json({ error: "Subject not found" });
      return;
    }
    const [lc] = await db.select({ count: sql<number>`count(*)` }).from(lecturesTable).where(eq(lecturesTable.subjectId, subjectId));
    const [nc] = await db.select({ count: sql<number>`count(*)` }).from(notesTable).where(eq(notesTable.subjectId, subjectId));
    res.json({ ...updated, lecturesCount: Number(lc.count), notesCount: Number(nc.count) });
  } catch (err) {
    req.log.error(err, "Error updating subject");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/subjects/:subjectId", requireAdmin, async (req, res) => {
  try {
    const subjectId = parseInt(req.params.subjectId);
    await db.delete(subjectsTable).where(eq(subjectsTable.id, subjectId));
    res.json({ message: "Subject deleted" });
  } catch (err) {
    req.log.error(err, "Error deleting subject");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
