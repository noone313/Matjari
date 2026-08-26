-- ═══════════════════════════════════════════════════════════════════
-- 0004_add_dynamic_attributes.sql
-- Adds dynamic attribute system on top of existing categories table
-- All statements use IF NOT EXISTS / ON CONFLICT for idempotency
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Add parent_category_id to categories (nullable, for future subcategories) ──
ALTER TABLE "categories"
  ADD COLUMN IF NOT EXISTS "parent_category_id" integer;

-- ── 2. Add category_id FK to products (nullable, parallel to legacy category varchar) ──
ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "category_id" integer;

-- ── 3. Create attribute_definitions table ──
CREATE TABLE IF NOT EXISTS "attribute_definitions" (
  "id" serial PRIMARY KEY,
  "category_id" integer NOT NULL REFERENCES "categories"("id") ON DELETE CASCADE,
  "key" varchar(100) NOT NULL,
  "label" varchar(150) NOT NULL,
  "type" varchar(20) NOT NULL DEFAULT 'text',
  "options" text[],
  "required" boolean NOT NULL DEFAULT false,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attrdefs_category_id
  ON "attribute_definitions"("category_id");

-- ── 4. Create product_attribute_values table ──
CREATE TABLE IF NOT EXISTS "product_attribute_values" (
  "id" serial PRIMARY KEY,
  "product_id" integer NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "attribute_definition_id" integer NOT NULL REFERENCES "attribute_definitions"("id") ON DELETE CASCADE,
  "value" text
);

CREATE INDEX IF NOT EXISTS idx_pav_product_id
  ON "product_attribute_values"("product_id");
CREATE INDEX IF NOT EXISTS idx_pav_attrdef_id
  ON "product_attribute_values"("attribute_definition_id");

-- Unique constraint: one value per attribute per product
CREATE UNIQUE INDEX IF NOT EXISTS idx_pav_product_attrdef
  ON "product_attribute_values"("product_id", "attribute_definition_id");

-- ═══════════════════════════════════════════════════════════════════
-- 5. MIGRATE EXISTING PRODUCTS: link category_id where possible
-- ═══════════════════════════════════════════════════════════════════

-- 5a. Create a temporary mapping table of known slugs → labels
CREATE TEMPORARY TABLE _slug_label_map (
  slug varchar(100) PRIMARY KEY,
  label varchar(150) NOT NULL
);

INSERT INTO _slug_label_map (slug, label) VALUES
  ('perfume_men', 'عطور رجالي'),
  ('perfume_women', 'عطور نسائي'),
  ('oud', 'عود وبخور'),
  ('skincare', 'عناية بالبشرة'),
  ('makeup', 'مكياج'),
  ('gifts', 'هدايا');

-- 5b. For each product: try to find a matching category for its merchant
--     If the category exists in the merchant's categories → link it
--     If not → create a new category for it, then link
UPDATE "products" p
SET "category_id" = sub.matched_id
FROM (
  SELECT
    p2."id" AS product_id,
    c."id" AS matched_id
  FROM "products" p2
  JOIN "categories" c
    ON c."merchant_id" = p2."merchant_id"
    AND c."slug" = p2."category"
) sub
WHERE p."id" = sub.product_id
  AND p."category_id" IS NULL;

-- 5c. For remaining products with no matching category (their slug doesn't exist in categories):
--     Create new categories and link them
--     Uses a DO block to handle this idempotently

DO $$
DECLARE
  rec RECORD;
  new_cat_id integer;
BEGIN
  FOR rec IN
    SELECT DISTINCT p."merchant_id", p."category"
    FROM "products" p
    WHERE p."category_id" IS NULL
      AND p."category" IS NOT NULL
  LOOP
    -- Try to insert the missing category
    INSERT INTO "categories" ("merchant_id", "slug", "label", "sort_order", "is_active")
    VALUES (
      rec."merchant_id",
      rec."category",
      COALESCE(
        (SELECT "label" FROM _slug_label_map WHERE "slug" = rec."category"),
        rec."category"
      ),
      99,
      true
    )
    ON CONFLICT ("merchant_id", "slug") DO NOTHING
    RETURNING "id" INTO new_cat_id;

    -- If it already existed, fetch its id
    IF new_cat_id IS NULL THEN
      SELECT "id" INTO new_cat_id
      FROM "categories"
      WHERE "merchant_id" = rec."merchant_id"
        AND "slug" = rec."category";
    END IF;

    -- Link all products with this merchant_id + category
    UPDATE "products"
    SET "category_id" = new_cat_id
    WHERE "merchant_id" = rec."merchant_id"
      AND "category" = rec."category"
      AND "category_id" IS NULL;
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 6. Seed default attribute_definitions for the 6 default categories
-- ═══════════════════════════════════════════════════════════════════

-- Fragrance attributes (for perfume_men, perfume_women, oud)
DO $$
DECLARE
  cat_rec RECORD;
BEGIN
  FOR cat_rec IN
    SELECT c."id" AS cat_id, c."slug"
    FROM "categories" c
    WHERE c."slug" IN ('perfume_men', 'perfume_women', 'oud')
  LOOP
    -- note_top
    INSERT INTO "attribute_definitions" ("category_id", "key", "label", "type", "required")
    VALUES (cat_rec."cat_id", 'note_top', 'المقدمة (القمة)', 'text', false)
    ON CONFLICT DO NOTHING;

    -- note_heart
    INSERT INTO "attribute_definitions" ("category_id", "key", "label", "type", "required")
    VALUES (cat_rec."cat_id", 'note_heart', 'القلب', 'text', false)
    ON CONFLICT DO NOTHING;

    -- note_base
    INSERT INTO "attribute_definitions" ("category_id", "key", "label", "type", "required")
    VALUES (cat_rec."cat_id", 'note_base', 'القاعدة', 'text', false)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- Skincare attributes (for skincare, makeup)
DO $$
DECLARE
  cat_rec RECORD;
BEGIN
  FOR cat_rec IN
    SELECT c."id" AS cat_id, c."slug"
    FROM "categories" c
    WHERE c."slug" IN ('skincare', 'makeup')
  LOOP
    -- skin_type
    INSERT INTO "attribute_definitions" ("category_id", "key", "label", "type", "required")
    VALUES (cat_rec."cat_id", 'skin_type', 'نوع البشرة', 'text', false)
    ON CONFLICT DO NOTHING;

    -- ingredients
    INSERT INTO "attribute_definitions" ("category_id", "key", "label", "type", "required")
    VALUES (cat_rec."cat_id", 'ingredients', 'المكونات', 'textarea', false)
    ON CONFLICT DO NOTHING;

    -- batch_expiry
    INSERT INTO "attribute_definitions" ("category_id", "key", "label", "type", "required")
    VALUES (cat_rec."cat_id", 'batch_expiry', 'تاريخ الانتهاء', 'text', false)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- Cleanup temp table
DROP TABLE IF EXISTS _slug_label_map;

-- ═══════════════════════════════════════════════════════════════════
-- POST-MIGRATION NOTES:
--
-- Product with category='__________' (merchant_id=1):
--   category_id is NULL after migration (no matching category found).
--   This product has a broken/orphaned category slug from testing.
--   Merchant should manually assign it to the correct category via dashboard.
--
-- The legacy "category" varchar column is KEPT as-is.
-- It will continue to be used until all UI code is migrated to use categoryId.
-- ═══════════════════════════════════════════════════════════════════
