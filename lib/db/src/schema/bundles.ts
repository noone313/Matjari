import { pgTable, serial, integer, varchar, text, boolean, timestamp, customType } from "drizzle-orm/pg-core";
import { merchantsTable } from "./merchants";
import { productVariantsTable } from "./products";

const bytea = customType<{ data: Buffer; notNull: false; default: false }>({
  dataType() { return "bytea"; },
});

export const bundlesTable = pgTable("bundles", {
  id: serial("id").primaryKey(),
  merchantId: integer("merchant_id")
    .notNull()
    .references(() => merchantsTable.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  imageData: bytea("image_data"),
  imageMime: varchar("image_mime", { length: 50 }),
  bundlePrice: integer("bundle_price").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const bundleItemsTable = pgTable("bundle_items", {
  id: serial("id").primaryKey(),
  bundleId: integer("bundle_id")
    .notNull()
    .references(() => bundlesTable.id, { onDelete: "cascade" }),
  variantId: integer("variant_id")
    .notNull()
    .references(() => productVariantsTable.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull().default(1),
});

export type Bundle = typeof bundlesTable.$inferSelect;
export type BundleItem = typeof bundleItemsTable.$inferSelect;