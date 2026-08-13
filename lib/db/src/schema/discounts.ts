import {
  pgTable,
  serial,
  varchar,
  boolean,
  timestamp,
  integer,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { merchantsTable } from "./merchants";

export const discountCodesTable = pgTable(
  "discount_codes",
  {
    id: serial("id").primaryKey(),
    merchantId: integer("merchant_id")
      .notNull()
      .references(() => merchantsTable.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 30 }).notNull(),
    percentOff: integer("percent_off"),
    amountOff: integer("amount_off"),
    minOrderTotal: integer("min_order_total"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique().on(t.merchantId, t.code)],
);

export const insertDiscountCodeSchema = createInsertSchema(
  discountCodesTable,
).omit({ id: true, createdAt: true });

export type DiscountCode = typeof discountCodesTable.$inferSelect;
export type InsertDiscountCode = z.infer<typeof insertDiscountCodeSchema>;
