CREATE TABLE IF NOT EXISTS "categories" (
  "id" serial PRIMARY KEY,
  "merchant_id" integer NOT NULL REFERENCES "merchants"("id") ON DELETE CASCADE,
  "slug" varchar(100) NOT NULL,
  "label" varchar(150) NOT NULL,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now()
);

-- Unique constraint: slug must be unique per merchant
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_merchant_slug ON "categories"("merchant_id", "slug");

-- Index for listing categories by merchant
CREATE INDEX IF NOT EXISTS idx_categories_merchant_id ON "categories"("merchant_id");

-- Migrate products.category from enum to varchar
ALTER TABLE "products" ALTER COLUMN "category" DROP DEFAULT;
ALTER TABLE "products" ALTER COLUMN "category" TYPE varchar(100) USING "category"::text;
ALTER TABLE "products" ALTER COLUMN "category" SET NOT NULL;

-- Seed default categories for existing merchants
INSERT INTO "categories" ("merchant_id", "slug", "label", "sort_order")
SELECT "id", 'perfume_men', 'عطور رجالي', 1 FROM "merchants"
ON CONFLICT DO NOTHING;
INSERT INTO "categories" ("merchant_id", "slug", "label", "sort_order")
SELECT "id", 'perfume_women', 'عطور نسائي', 2 FROM "merchants"
ON CONFLICT DO NOTHING;
INSERT INTO "categories" ("merchant_id", "slug", "label", "sort_order")
SELECT "id", 'oud', 'عود وبخور', 3 FROM "merchants"
ON CONFLICT DO NOTHING;
INSERT INTO "categories" ("merchant_id", "slug", "label", "sort_order")
SELECT "id", 'skincare', 'عناية بالبشرة', 4 FROM "merchants"
ON CONFLICT DO NOTHING;
INSERT INTO "categories" ("merchant_id", "slug", "label", "sort_order")
SELECT "id", 'makeup', 'مكياج', 5 FROM "merchants"
ON CONFLICT DO NOTHING;
INSERT INTO "categories" ("merchant_id", "slug", "label", "sort_order")
SELECT "id", 'gifts', 'هدايا', 6 FROM "merchants"
ON CONFLICT DO NOTHING;

-- Drop the old enum type (only after migration is confirmed)
-- DROP TYPE IF EXISTS "product_category";
