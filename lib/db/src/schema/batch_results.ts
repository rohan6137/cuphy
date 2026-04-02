import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { batchesTable } from "./batches";
import { usersTable } from "./users";

export const batchResultsTable = pgTable("batch_results", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id").notNull().references(() => batchesTable.id, { onDelete: "cascade" }),
  studentName: text("student_name").notNull(),
  phone: text("phone"),
  score: numeric("score", { precision: 10, scale: 2 }),
  maxScore: numeric("max_score", { precision: 10, scale: 2 }),
  subject: text("subject"),
  examType: text("exam_type"),
  rank: integer("rank"),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

export const insertBatchResultSchema = createInsertSchema(batchResultsTable).omit({ id: true, uploadedAt: true });
export type InsertBatchResult = z.infer<typeof insertBatchResultSchema>;
export type BatchResult = typeof batchResultsTable.$inferSelect;
