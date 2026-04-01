import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const appSettingsTable = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  primaryColor: text("primary_color").notNull().default("#6C3AEB"),
  secondaryColor: text("secondary_color").notNull().default("#1E1B4B"),
  logoUrl: text("logo_url"),
  appName: text("app_name").notNull().default("CUPHY"),
  tagline: text("tagline"),
  darkMode: boolean("dark_mode").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type AppSettings = typeof appSettingsTable.$inferSelect;
