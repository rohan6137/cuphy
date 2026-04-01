import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { batchesTable, enrollmentsTable, subjectsTable, lecturesTable, notesTable, testsTable } from "@workspace/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth";

const router: IRouter = Router();

function formatBatch(batch: any, studentsCount = 0) {
  return {
    id: batch.id,
    name: batch.name,
    description: batch.description,
    semester: batch.semester,
    thumbnail: batch.thumbnail,
    price: parseFloat(batch.price ?? "0"),
    originalPrice: batch.originalPrice ? parseFloat(batch.originalPrice) : null,
    paymentLink: batch.paymentLink,
    isActive: batch.isActive,
    expiresAt: batch.expiresAt?.toISOString?.() ?? null,
    createdAt: batch.createdAt?.toISOString?.() ?? batch.createdAt,
    studentsCount,
  };
}

router.get("/batches", async (req, res) => {
  try {
    const semester = req.query.semester ? parseInt(String(req.query.semester)) : undefined;
    const isActive = req.query.isActive !== undefined ? req.query.isActive === "true" : undefined;

    let batches = await db.select().from(batchesTable);
    if (semester !== undefined) {
      batches = batches.filter(b => b.semester === semester);
    }
    if (isActive !== undefined) {
      batches = batches.filter(b => b.isActive === isActive);
    }

    const counts = await Promise.all(batches.map(async (b) => {
      const [ct] = await db.select({ count: sql<number>`count(*)` }).from(enrollmentsTable).where(eq(enrollmentsTable.batchId, b.id));
      return { batchId: b.id, count: Number(ct.count) };
    }));

    const countMap = Object.fromEntries(counts.map(c => [c.batchId, c.count]));
    res.json({ batches: batches.map(b => formatBatch(b, countMap[b.id] ?? 0)), total: batches.length });
  } catch (err) {
    req.log.error(err, "Error listing batches");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/batches", requireAdmin, async (req, res) => {
  try {
    const { name, description, semester, thumbnail, price, originalPrice, paymentLink, isActive, expiresAt } = req.body;
    const [batch] = await db.insert(batchesTable).values({
      name, description, semester, thumbnail,
      price: String(price ?? 0),
      originalPrice: originalPrice ? String(originalPrice) : null,
      paymentLink, isActive: isActive ?? true,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    }).returning();
    res.status(201).json(formatBatch(batch));
  } catch (err) {
    req.log.error(err, "Error creating batch");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/batches/my-batches", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const enrollments = await db.select({ batch: batchesTable })
      .from(enrollmentsTable)
      .leftJoin(batchesTable, eq(enrollmentsTable.batchId, batchesTable.id))
      .where(eq(enrollmentsTable.userId, user.id));
    const batches = enrollments.map(e => e.batch).filter(Boolean);
    res.json({ batches: batches.map(b => formatBatch(b!)), total: batches.length });
  } catch (err) {
    req.log.error(err, "Error getting my batches");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/batches/:batchId", async (req, res) => {
  try {
    const batchId = parseInt(req.params.batchId);
    const [batch] = await db.select().from(batchesTable).where(eq(batchesTable.id, batchId));
    if (!batch) {
      res.status(404).json({ error: "Batch not found" });
      return;
    }

    const [ct] = await db.select({ count: sql<number>`count(*)` }).from(enrollmentsTable).where(eq(enrollmentsTable.batchId, batchId));
    const subjects = await db.select().from(subjectsTable).where(eq(subjectsTable.batchId, batchId));

    const subjectsWithCounts = await Promise.all(subjects.map(async (s) => {
      const [lc] = await db.select({ count: sql<number>`count(*)` }).from(lecturesTable).where(eq(lecturesTable.subjectId, s.id));
      const [nc] = await db.select({ count: sql<number>`count(*)` }).from(notesTable).where(eq(notesTable.subjectId, s.id));
      return { ...s, lecturesCount: Number(lc.count), notesCount: Number(nc.count) };
    }));

    const [tlc] = await db.select({ count: sql<number>`count(*)` }).from(lecturesTable).where(eq(lecturesTable.batchId, batchId));
    const [tnc] = await db.select({ count: sql<number>`count(*)` }).from(notesTable).where(eq(notesTable.batchId, batchId));
    const [ttc] = await db.select({ count: sql<number>`count(*)` }).from(testsTable).where(eq(testsTable.batchId, batchId));

    res.json({
      ...formatBatch(batch, Number(ct.count)),
      subjects: subjectsWithCounts,
      totalLectures: Number(tlc.count),
      totalNotes: Number(tnc.count),
      totalTests: Number(ttc.count),
    });
  } catch (err) {
    req.log.error(err, "Error getting batch");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/batches/:batchId", requireAdmin, async (req, res) => {
  try {
    const batchId = parseInt(req.params.batchId);
    const { name, description, semester, thumbnail, price, originalPrice, paymentLink, isActive, expiresAt } = req.body;
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (semester !== undefined) updates.semester = semester;
    if (thumbnail !== undefined) updates.thumbnail = thumbnail;
    if (price !== undefined) updates.price = String(price);
    if (originalPrice !== undefined) updates.originalPrice = originalPrice ? String(originalPrice) : null;
    if (paymentLink !== undefined) updates.paymentLink = paymentLink;
    if (isActive !== undefined) updates.isActive = isActive;
    if (expiresAt !== undefined) updates.expiresAt = expiresAt ? new Date(expiresAt) : null;

    const [updated] = await db.update(batchesTable).set(updates).where(eq(batchesTable.id, batchId)).returning();
    if (!updated) {
      res.status(404).json({ error: "Batch not found" });
      return;
    }
    const [ct] = await db.select({ count: sql<number>`count(*)` }).from(enrollmentsTable).where(eq(enrollmentsTable.batchId, batchId));
    res.json(formatBatch(updated, Number(ct.count)));
  } catch (err) {
    req.log.error(err, "Error updating batch");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/batches/:batchId", requireAdmin, async (req, res) => {
  try {
    const batchId = parseInt(req.params.batchId);
    await db.delete(batchesTable).where(eq(batchesTable.id, batchId));
    res.json({ message: "Batch deleted" });
  } catch (err) {
    req.log.error(err, "Error deleting batch");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/batches/:batchId/enroll", requireAdmin, async (req, res) => {
  try {
    const batchId = parseInt(req.params.batchId);
    const { userId } = req.body;
    const existing = await db.select().from(enrollmentsTable).where(and(eq(enrollmentsTable.batchId, batchId), eq(enrollmentsTable.userId, userId)));
    if (existing.length === 0) {
      await db.insert(enrollmentsTable).values({ batchId, userId });
    }
    res.json({ message: "Enrolled" });
  } catch (err) {
    req.log.error(err, "Error enrolling");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/batches/:batchId/unenroll", requireAdmin, async (req, res) => {
  try {
    const batchId = parseInt(req.params.batchId);
    const { userId } = req.body;
    await db.delete(enrollmentsTable).where(and(eq(enrollmentsTable.batchId, batchId), eq(enrollmentsTable.userId, userId)));
    res.json({ message: "Unenrolled" });
  } catch (err) {
    req.log.error(err, "Error unenrolling");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
