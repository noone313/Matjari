import { pgTable, serial, integer, varchar, text, boolean, timestamp, customType } from "drizzle-orm/pg-core";
import { merchantsTable } from "./merchants";

const bytea = customType<{ data: Buffer; notNull: false; default: false }>({
  dataType() { return "bytea"; },
  fromDriver(value: unknown): Buffer {
    if (value instanceof Buffer) return value;
    if (value instanceof Uint8Array) return Buffer.from(value);
    return Buffer.from(String(value), "hex");
  },
});

export const heroSlidesTable = pgTable("hero_slides", {
  id: serial("id").primaryKey(),
  merchantId: integer("merchant_id")
    .notNull()
    .references(() => merchantsTable.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 150 }),
  subtitle: varchar("subtitle", { length: 300 }),
  linkUrl: varchar("link_url", { length: 500 }),
  position: integer("position").notNull().default(0),
  imageData: bytea("image_data"),
  imageMime: varchar("image_mime", { length: 50 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type HeroSlide = typeof heroSlidesTable.$inferSelect;
