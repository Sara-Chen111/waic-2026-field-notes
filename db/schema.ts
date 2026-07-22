import { text, sqliteTable } from "drizzle-orm/sqlite-core";

export const exhibitorOverrides = sqliteTable("exhibitor_overrides", {
  exhibitorId: text("exhibitor_id").primaryKey(),
  payload: text("payload").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const feedback = sqliteTable("feedback", {
  id: text("id").primaryKey(),
  exhibitorId: text("exhibitor_id").notNull(),
  exhibitorName: text("exhibitor_name").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: text("created_at").notNull(),
});
