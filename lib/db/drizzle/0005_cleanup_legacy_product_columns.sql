-- ═══════════════════════════════════════════════════════════════════
-- 0005_cleanup_legacy_product_columns.sql
-- Migrates legacy hardcoded columns to product_attribute_values,
-- then drops them from the products table.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Migrate legacy note/skin/ingredients/expiry data → product_attribute_values ──
-- For each legacy column, find the matching attribute_definition by key,
-- then insert into product_attribute_values if a value exists.

DO $$
DECLARE
  col RECORD;
  attr RECORD;
  prod RECORD;
BEGIN
  -- Loop through the 6 legacy column → attribute key mappings
  FOR col IN
    SELECT * FROM (VALUES
      ('note_top', 'note_top'),
      ('note_heart', 'note_heart'),
      ('note_base', 'note_base'),
      ('skin_type', 'skin_type'),
      ('ingredients', 'ingredients'),
      ('batch_expiry', 'batch_expiry')
    ) AS mapping(legacy_col, attr_key)
  LOOP
    -- For each product that has a non-empty value in this legacy column
    FOR prod IN
      EXECUTE format(
        'SELECT p.id AS product_id, p.%I AS val, p.category_id
         FROM products p
         WHERE p.%I IS NOT NULL AND p.%I <> '''' AND p.category_id IS NOT NULL',
        col.legacy_col, col.legacy_col, col.legacy_col
      )
    LOOP
      -- Find the matching attribute_definition for this product's category
      SELECT ad.id INTO attr
      FROM attribute_definitions ad
      WHERE ad.category_id = prod.category_id
        AND ad.key = col.attr_key
      LIMIT 1;

      IF FOUND THEN
        INSERT INTO product_attribute_values (product_id, attribute_definition_id, value)
        VALUES (prod.product_id, attr.id, prod.val)
        ON CONFLICT (product_id, attribute_definition_id) DO UPDATE
        SET value = EXCLUDED.value;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- ── 2. Drop legacy columns ──
ALTER TABLE "products" DROP COLUMN IF EXISTS "note_top";
ALTER TABLE "products" DROP COLUMN IF EXISTS "note_heart";
ALTER TABLE "products" DROP COLUMN IF EXISTS "note_base";
ALTER TABLE "products" DROP COLUMN IF EXISTS "skin_type";
ALTER TABLE "products" DROP COLUMN IF EXISTS "ingredients";
ALTER TABLE "products" DROP COLUMN IF EXISTS "batch_expiry";
