import { pgTable, serial, text, timestamp, varchar, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const merchantsTable = pgTable("merchants", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  storeName: varchar("store_name", { length: 150 }).notNull(),
  email: varchar("email", { length: 150 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  logoUrl: text("logo_url"),
  bannerUrl: text("banner_url"),
  heroEnabled: boolean("hero_enabled").notNull().default(false),
  description: text("description"),
  accentColor: varchar("accent_color", { length: 7 }).notNull().default("#B08D4F"),
  bankTransferInfo: text("bank_transfer_info"),
  phone: varchar("phone", { length: 20 }),
  instagramHandle: varchar("instagram_handle", { length: 100 }),
  whatsappNumber: varchar("whatsapp_number", { length: 20 }),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMerchantSchema = createInsertSchema(merchantsTable).omit({
  id: true,
  createdAt: true,
  passwordResetToken: true,
  passwordResetExpires: true,
});

export type Merchant = typeof merchantsTable.$inferSelect;
export type InsertMerchant = z.infer<typeof insertMerchantSchema>;
