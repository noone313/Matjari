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
import { categoriesTable } from "./categories";
import { productsTable } from "./products";

// ── Defines what attributes each category requires ──
// e.g. { categoryId: 3, key: "note_top", label: "المقدمة", type: "text", required: true }
export const attributeDefinitionsTable = pgTable("attribute_definitions", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categoriesTable.id, { onDelete: "cascade" }),
  key: varchar("key", { length: 100 }).notNull(),
  label: varchar("label", { length: 150 }).notNull(),
  type: varchar("type", { length: 20 }).notNull().default("text"),
  options: text("options").array(),
  required: boolean("required").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAttributeDefinitionSchema = createInsertSchema(
  attributeDefinitionsTable,
).omit({ id: true, createdAt: true });

export type AttributeDefinition =
  typeof attributeDefinitionsTable.$inferSelect;
export type InsertAttributeDefinition = z.infer<
  typeof insertAttributeDefinitionSchema
>;

// ── Stores actual attribute values per product ──
// e.g. { productId: 5, attributeDefinitionId: 12, value: "ليمون، برغموت" }
export const productAttributeValuesTable = pgTable("product_attribute_values", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }),
  attributeDefinitionId: integer("attribute_definition_id")
    .notNull()
    .references(() => attributeDefinitionsTable.id, { onDelete: "cascade" }),
  value: text("value"),
});

export const insertProductAttributeValueSchema = createInsertSchema(
  productAttributeValuesTable,
).omit({ id: true });

export type ProductAttributeValue =
  typeof productAttributeValuesTable.$inferSelect;
export type InsertProductAttributeValue = z.infer<
  typeof insertProductAttributeValueSchema
>;
