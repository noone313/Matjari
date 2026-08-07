import { pgTable, serial, integer, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
import { productVariantsTable } from "./products";

export const stockNotificationsTable = pgTable("stock_notifications", {
  id: serial("id").primaryKey(),
  variantId: integer("variant_id")
    .notNull()
    .references(() => productVariantsTable.id, { onDelete: "cascade" }),
  customerPhone: varchar("customer_phone", { length: 20 }).notNull(),
  notified: boolean("notified").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type StockNotification = typeof stockNotificationsTable.$inferSelect;