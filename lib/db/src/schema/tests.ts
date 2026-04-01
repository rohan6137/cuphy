import { pgTable, serial, text, integer, boolean, timestamp, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { batchesTable } from "./batches";
import { subjectsTable } from "./subjects";
import { usersTable } from "./users";

export const testTypeEnum = pgEnum("test_type", ["test", "quiz"]);
export const correctOptionEnum = pgEnum("correct_option", ["A", "B", "C", "D"]);

export const testsTable = pgTable("tests", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  type: testTypeEnum("type").notNull().default("quiz"),
  batchId: integer("batch_id").notNull().references(() => batchesTable.id, { onDelete: "cascade" }),
  subjectId: integer("subject_id").references(() => subjectsTable.id, { onDelete: "set null" }),
  totalMarks: numeric("total_marks", { precision: 10, scale: 2 }).notNull().default("0"),
  durationMinutes: integer("duration_minutes").notNull().default(30),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const questionsTable = pgTable("questions", {
  id: serial("id").primaryKey(),
  testId: integer("test_id").notNull().references(() => testsTable.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  optionA: text("option_a").notNull(),
  optionB: text("option_b").notNull(),
  optionC: text("option_c").notNull(),
  optionD: text("option_d").notNull(),
  correctOption: correctOptionEnum("correct_option").notNull(),
  explanation: text("explanation"),
  marks: numeric("marks", { precision: 5, scale: 2 }).notNull().default("1"),
  order: integer("order").notNull().default(0),
});

export const testResultsTable = pgTable("test_results", {
  id: serial("id").primaryKey(),
  testId: integer("test_id").notNull().references(() => testsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  score: numeric("score", { precision: 10, scale: 2 }).notNull().default("0"),
  totalMarks: numeric("total_marks", { precision: 10, scale: 2 }).notNull().default("0"),
  percentage: numeric("percentage", { precision: 5, scale: 2 }).notNull().default("0"),
  timeTaken: integer("time_taken"),
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
});

export type Test = typeof testsTable.$inferSelect;
export type Question = typeof questionsTable.$inferSelect;
export type TestResult = typeof testResultsTable.$inferSelect;
