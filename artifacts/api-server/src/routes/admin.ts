import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, batchesTable, lecturesTable, notesTable, testsTable, noticesTable, enrollmentsTable, appSettingsTable } from "@workspace/db/schema";
import { sql, eq } from "drizzle-orm";
import { requireAdmin } from "../lib/auth";

const router: IRouter = Router();

router.get("/admin/dashboard-stats", requireAdmin, async (req, res) => {
  try {
    const [students] = await db.select({ count: sql<number>`count(*)` }).from(usersTable).where(eq(usersTable.role, "student"));
    const [batchCount] = await db.select({ count: sql<number>`count(*)` }).from(batchesTable);
    const [lectureCount] = await db.select({ count: sql<number>`count(*)` }).from(lecturesTable);
    const [noteCount] = await db.select({ count: sql<number>`count(*)` }).from(notesTable);
    const [testCount] = await db.select({ count: sql<number>`count(*)` }).from(testsTable);
    const [noticeCount] = await db.select({ count: sql<number>`count(*)` }).from(noticesTable).where(eq(noticesTable.isActive, true));

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [recentSignups] = await db.select({ count: sql<number>`count(*)` }).from(usersTable)
      .where(sql`created_at >= ${sevenDaysAgo}`);

    const batches = await db.select().from(batchesTable);
    const enrollmentsByBatch = await Promise.all(batches.map(async (b) => {
      const [ct] = await db.select({ count: sql<number>`count(*)` }).from(enrollmentsTable).where(eq(enrollmentsTable.batchId, b.id));
      return { batchId: b.id, batchName: b.name, count: Number(ct.count) };
    }));

    res.json({
      totalStudents: Number(students.count),
      totalBatches: Number(batchCount.count),
      totalLectures: Number(lectureCount.count),
      totalNotes: Number(noteCount.count),
      totalTests: Number(testCount.count),
      activeNotices: Number(noticeCount.count),
      enrollmentsByBatch,
      recentSignups: Number(recentSignups.count),
    });
  } catch (err) {
    req.log.error(err, "Error getting dashboard stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/app-settings", async (req, res) => {
  try {
    let [settings] = await db.select().from(appSettingsTable);
    if (!settings) {
      const [created] = await db.insert(appSettingsTable).values({}).returning();
      settings = created;
    }
    res.json(settings);
  } catch (err) {
    req.log.error(err, "Error getting settings");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/admin/app-settings", requireAdmin, async (req, res) => {
  try {
    const { primaryColor, secondaryColor, logoUrl, appName, tagline, darkMode } = req.body;
    let [settings] = await db.select().from(appSettingsTable);
    if (!settings) {
      const [created] = await db.insert(appSettingsTable).values({ primaryColor, secondaryColor, logoUrl, appName, tagline, darkMode }).returning();
      settings = created;
    } else {
      const [updated] = await db.update(appSettingsTable).set({ primaryColor, secondaryColor, logoUrl, appName, tagline, darkMode, updatedAt: new Date() }).where(eq(appSettingsTable.id, settings.id)).returning();
      settings = updated;
    }
    res.json(settings);
  } catch (err) {
    req.log.error(err, "Error updating settings");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/recent-activity", requireAdmin, async (req, res) => {
  try {
    const recentUsers = await db.select().from(usersTable).orderBy(sql`created_at DESC`).limit(5);
    const recentEnrollments = await db.select({
      id: enrollmentsTable.id,
      userId: enrollmentsTable.userId,
      batchId: enrollmentsTable.batchId,
      enrolledAt: enrollmentsTable.enrolledAt,
    }).from(enrollmentsTable).orderBy(sql`enrolled_at DESC`).limit(5);

    const activities: any[] = [];

    for (const u of recentUsers) {
      activities.push({
        id: u.id * 10000,
        type: "signup",
        description: `${u.name} joined as a student`,
        createdAt: u.createdAt?.toISOString?.() ?? u.createdAt,
        userId: u.id,
        userName: u.name,
      });
    }

    for (const e of recentEnrollments) {
      const [u] = await db.select().from(usersTable).where(eq(usersTable.id, e.userId));
      const [b] = await db.select().from(batchesTable).where(eq(batchesTable.id, e.batchId));
      activities.push({
        id: e.id * 10001,
        type: "enrollment",
        description: `${u?.name ?? "Student"} enrolled in ${b?.name ?? "a batch"}`,
        createdAt: e.enrolledAt?.toISOString?.() ?? e.enrolledAt,
        userId: e.userId,
        userName: u?.name ?? null,
      });
    }

    activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ activities: activities.slice(0, 10) });
  } catch (err) {
    req.log.error(err, "Error getting activity");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
