import {
  pgTable,
  serial,
  varchar,
  integer,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { productsTable } from "./products";

export const reviewsTable = pgTable("reviews", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }),
  customerName: varchar("customer_name", { length: 100 }).notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  isApproved: boolean("is_approved").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertReviewSchema = createInsertSchema(reviewsTable).omit({
  id: true,
  isApproved: true,
  createdAt: true,
});

export type Review = typeof reviewsTable.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;