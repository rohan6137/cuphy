import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { notesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../lib/auth";

const router: IRouter = Router();

function formatNote(n: any) {
  return { ...n, createdAt: n.createdAt?.toISOString?.() ?? n.createdAt };
}

router.get("/notes", async (req, res) => {
  try {
    const subjectId = req.query.subjectId ? parseInt(String(req.query.subjectId)) : undefined;
    const batchId = req.query.batchId ? parseInt(String(req.query.batchId)) : undefined;
    const category = req.query.category as string | undefined;
    let notes = await db.select().from(notesTable);
    if (subjectId !== undefined) notes = notes.filter(n => n.subjectId === subjectId);
    if (batchId !== undefined) notes = notes.filter(n => n.batchId === batchId);
    if (category) notes = notes.filter(n => n.category === category);
    res.json({ notes: notes.map(formatNote) });
  } catch (err) {
    req.log.error(err, "Error listing notes");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/notes", requireAdmin, async (req, res) => {
  try {
    const { title, description, pdfUrl, subjectId, batchId, category, isFree } = req.body;
    const [note] = await db.insert(notesTable).values({ title, description, pdfUrl, subjectId, batchId, category, isFree: isFree ?? false }).returning();
    res.status(201).json(formatNote(note));
  } catch (err) {
    req.log.error(err, "Error creating note");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/notes/:noteId", requireAdmin, async (req, res) => {
  try {
    const noteId = parseInt(req.params.noteId);
    const { title, description, pdfUrl, subjectId, batchId, category, isFree } = req.body;
    const [updated] = await db.update(notesTable).set({ title, description, pdfUrl, subjectId, batchId, category, isFree }).where(eq(notesTable.id, noteId)).returning();
    if (!updated) {
      res.status(404).json({ error: "Note not found" });
      return;
    }
    res.json(formatNote(updated));
  } catch (err) {
    req.log.error(err, "Error updating note");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/notes/:noteId", requireAdmin, async (req, res) => {
  try {
    const noteId = parseInt(req.params.noteId);
    await db.delete(notesTable).where(eq(notesTable.id, noteId));
    res.json({ message: "Note deleted" });
  } catch (err) {
    req.log.error(err, "Error deleting note");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
