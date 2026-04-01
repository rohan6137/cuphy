import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { testsTable, questionsTable, testResultsTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth";

const router: IRouter = Router();

function formatTest(t: any, questionsCount = 0) {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    type: t.type,
    batchId: t.batchId,
    subjectId: t.subjectId,
    totalMarks: parseFloat(t.totalMarks ?? "0"),
    durationMinutes: t.durationMinutes,
    isActive: t.isActive,
    questionsCount,
    createdAt: t.createdAt?.toISOString?.() ?? t.createdAt,
  };
}

function formatResult(r: any) {
  return {
    id: r.id,
    testId: r.testId,
    userId: r.userId,
    score: parseFloat(r.score ?? "0"),
    totalMarks: parseFloat(r.totalMarks ?? "0"),
    percentage: parseFloat(r.percentage ?? "0"),
    timeTaken: r.timeTaken,
    submittedAt: r.submittedAt?.toISOString?.() ?? r.submittedAt,
  };
}

router.get("/tests", async (req, res) => {
  try {
    const batchId = req.query.batchId ? parseInt(String(req.query.batchId)) : undefined;
    const subjectId = req.query.subjectId ? parseInt(String(req.query.subjectId)) : undefined;
    const type = req.query.type as string | undefined;

    let tests = await db.select().from(testsTable);
    if (batchId !== undefined) tests = tests.filter(t => t.batchId === batchId);
    if (subjectId !== undefined) tests = tests.filter(t => t.subjectId === subjectId);
    if (type) tests = tests.filter(t => t.type === type);

    const withCounts = await Promise.all(tests.map(async (t) => {
      const [qc] = await db.select({ count: sql<number>`count(*)` }).from(questionsTable).where(eq(questionsTable.testId, t.id));
      return formatTest(t, Number(qc.count));
    }));

    res.json({ tests: withCounts });
  } catch (err) {
    req.log.error(err, "Error listing tests");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/tests", requireAdmin, async (req, res) => {
  try {
    const { title, description, type, batchId, subjectId, durationMinutes, isActive, questions } = req.body;
    const totalMarks = questions ? questions.reduce((sum: number, q: any) => sum + (parseFloat(q.marks) || 1), 0) : 0;

    const [test] = await db.insert(testsTable).values({
      title, description, type: type ?? "quiz", batchId, subjectId,
      totalMarks: String(totalMarks), durationMinutes: durationMinutes ?? 30, isActive: isActive ?? true,
    }).returning();

    if (questions && questions.length > 0) {
      await db.insert(questionsTable).values(questions.map((q: any, i: number) => ({
        testId: test.id,
        text: q.text,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctOption: q.correctOption,
        explanation: q.explanation,
        marks: String(q.marks ?? 1),
        order: i,
      })));
    }

    res.status(201).json(formatTest(test, questions?.length ?? 0));
  } catch (err) {
    req.log.error(err, "Error creating test");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/tests/my-results", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const results = await db.select().from(testResultsTable).where(eq(testResultsTable.userId, user.id));
    res.json({ results: results.map(formatResult) });
  } catch (err) {
    req.log.error(err, "Error getting my results");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/tests/:testId", async (req, res) => {
  try {
    const testId = parseInt(req.params.testId);
    const [test] = await db.select().from(testsTable).where(eq(testsTable.id, testId));
    if (!test) {
      res.status(404).json({ error: "Test not found" });
      return;
    }
    const questions = await db.select().from(questionsTable).where(eq(questionsTable.testId, testId));
    const formattedQuestions = questions.map(q => ({
      ...q,
      marks: parseFloat(q.marks ?? "1"),
    }));
    res.json({ ...formatTest(test, questions.length), questions: formattedQuestions });
  } catch (err) {
    req.log.error(err, "Error getting test");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/tests/:testId", requireAdmin, async (req, res) => {
  try {
    const testId = parseInt(req.params.testId);
    const { title, description, type, batchId, subjectId, durationMinutes, isActive } = req.body;
    const [updated] = await db.update(testsTable).set({ title, description, type, batchId, subjectId, durationMinutes, isActive }).where(eq(testsTable.id, testId)).returning();
    if (!updated) {
      res.status(404).json({ error: "Test not found" });
      return;
    }
    const [qc] = await db.select({ count: sql<number>`count(*)` }).from(questionsTable).where(eq(questionsTable.testId, testId));
    res.json(formatTest(updated, Number(qc.count)));
  } catch (err) {
    req.log.error(err, "Error updating test");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/tests/:testId", requireAdmin, async (req, res) => {
  try {
    const testId = parseInt(req.params.testId);
    await db.delete(testsTable).where(eq(testsTable.id, testId));
    res.json({ message: "Test deleted" });
  } catch (err) {
    req.log.error(err, "Error deleting test");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/tests/:testId/submit", requireAuth, async (req, res) => {
  try {
    const testId = parseInt(req.params.testId);
    const user = (req as any).user;
    const { answers } = req.body;

    const [test] = await db.select().from(testsTable).where(eq(testsTable.id, testId));
    if (!test) {
      res.status(404).json({ error: "Test not found" });
      return;
    }

    const questions = await db.select().from(questionsTable).where(eq(questionsTable.testId, testId));
    let score = 0;
    const totalMarks = questions.reduce((sum, q) => sum + parseFloat(q.marks ?? "1"), 0);

    for (const answer of answers) {
      const question = questions.find(q => q.id === answer.questionId);
      if (question && question.correctOption === answer.selectedOption) {
        score += parseFloat(question.marks ?? "1");
      }
    }

    const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;

    const [result] = await db.insert(testResultsTable).values({
      testId,
      userId: user.id,
      score: String(score),
      totalMarks: String(totalMarks),
      percentage: String(percentage),
    }).returning();

    res.json(formatResult(result));
  } catch (err) {
    req.log.error(err, "Error submitting test");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/tests/:testId/questions", requireAdmin, async (req, res) => {
  try {
    const testId = parseInt(req.params.testId);
    const { text, optionA, optionB, optionC, optionD, correctOption, explanation, marks, order } = req.body;
    const [q] = await db.insert(questionsTable).values({
      testId, text, optionA, optionB, optionC, optionD, correctOption, explanation,
      marks: String(marks ?? 1), order: order ?? 1
    }).returning();
    res.status(201).json({ ...q, marks: parseFloat(q.marks ?? "1") });
  } catch (err) {
    req.log.error(err, "Error creating question");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/tests/:testId/questions/:questionId", requireAdmin, async (req, res) => {
  try {
    const questionId = parseInt(req.params.questionId);
    await db.delete(questionsTable).where(eq(questionsTable.id, questionId));
    res.json({ message: "Question deleted" });
  } catch (err) {
    req.log.error(err, "Error deleting question");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/tests/:testId/results", requireAdmin, async (req, res) => {
  try {
    const testId = parseInt(req.params.testId);
    const results = await db.select().from(testResultsTable).where(eq(testResultsTable.testId, testId));
    res.json({ results: results.map(formatResult) });
  } catch (err) {
    req.log.error(err, "Error getting results");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
