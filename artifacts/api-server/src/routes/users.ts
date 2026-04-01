import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, enrollmentsTable, batchesTable } from "@workspace/db/schema";
import { eq, like, sql, and, ilike } from "drizzle-orm";
import { requireAuth, requireAdmin, formatUser, hashPassword } from "../lib/auth";

const router: IRouter = Router();

router.get("/users", requireAdmin, async (req, res) => {
  try {
    const page = parseInt(String(req.query.page ?? 1));
    const limit = parseInt(String(req.query.limit ?? 20));
    const search = req.query.search as string | undefined;
    const batchId = req.query.batchId ? parseInt(String(req.query.batchId)) : undefined;

    const offset = (page - 1) * limit;

    let query = db.select().from(usersTable);
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(usersTable);

    const conditions = [];
    if (search) {
      conditions.push(ilike(usersTable.name, `%${search}%`));
    }

    let users;
    let total;

    if (batchId) {
      const enrolledUserIds = await db.select({ userId: enrollmentsTable.userId })
        .from(enrollmentsTable)
        .where(eq(enrollmentsTable.batchId, batchId));
      const ids = enrolledUserIds.map(e => e.userId);
      if (ids.length === 0) {
        res.json({ users: [], total: 0, page, limit });
        return;
      }
      users = await db.select().from(usersTable)
        .where(sql`${usersTable.id} = ANY(${ids})`)
        .limit(limit).offset(offset);
      total = ids.length;
    } else {
      if (conditions.length > 0) {
        users = await db.select().from(usersTable)
          .where(and(...conditions))
          .limit(limit).offset(offset);
        const [ct] = await db.select({ count: sql<number>`count(*)` }).from(usersTable).where(and(...conditions));
        total = Number(ct.count);
      } else {
        users = await db.select().from(usersTable).limit(limit).offset(offset);
        const [ct] = await db.select({ count: sql<number>`count(*)` }).from(usersTable);
        total = Number(ct.count);
      }
    }

    res.json({ users: users.map(formatUser), total, page, limit });
  } catch (err) {
    req.log.error(err, "Error listing users");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/users/profile", requireAuth, async (req, res) => {
  res.json(formatUser((req as any).user));
});

router.put("/users/profile", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { name, email, semester } = req.body;
    const [updated] = await db.update(usersTable)
      .set({ name, email, semester })
      .where(eq(usersTable.id, user.id))
      .returning();
    res.json(formatUser(updated));
  } catch (err) {
    req.log.error(err, "Error updating profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/users/:userId", requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const enrollments = await db.select({ batch: batchesTable })
      .from(enrollmentsTable)
      .leftJoin(batchesTable, eq(enrollmentsTable.batchId, batchesTable.id))
      .where(eq(enrollmentsTable.userId, userId));

    const [resultCount] = await db.select({ count: sql<number>`count(*)` })
      .from(sql`test_results`)
      .where(sql`user_id = ${userId}`);

    res.json({
      ...formatUser(user),
      enrolledBatches: enrollments.map(e => e.batch).filter(Boolean),
      testResultsCount: Number(resultCount?.count ?? 0),
    });
  } catch (err) {
    req.log.error(err, "Error getting user");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/users/:userId", requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { name, email, semester, isActive, role } = req.body;
    const [updated] = await db.update(usersTable)
      .set({ name, email, semester, isActive, role })
      .where(eq(usersTable.id, userId))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(formatUser(updated));
  } catch (err) {
    req.log.error(err, "Error updating user");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/users/:userId", requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    await db.delete(usersTable).where(eq(usersTable.id, userId));
    res.json({ message: "User deleted" });
  } catch (err) {
    req.log.error(err, "Error deleting user");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
