-- ============================================================
--  متجري — سكريبت إنشاء قاعدة البيانات
--  شغّله مرة واحدة على قاعدة بياناتك المحلية:
--    psql -U postgres -d matjari -f scripts/setup-db.sql
-- ============================================================

-- أنواع Enum
DO $$ BEGIN
  CREATE TYPE product_category AS ENUM (
    'perfume_men','perfume_women','oud','skincare','makeup','gifts'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('cod','bank_transfer');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'new','processing','shipped','delivered','cancelled'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── التجار ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS merchants (
  id                SERIAL PRIMARY KEY,
  slug              VARCHAR(100)  NOT NULL UNIQUE,
  store_name        VARCHAR(150)  NOT NULL,
  email             VARCHAR(150)  NOT NULL UNIQUE,
  password_hash     TEXT          NOT NULL,
  logo_url          TEXT,
  banner_url        TEXT,
  description       TEXT,
  accent_color      VARCHAR(7)    NOT NULL DEFAULT '#B08D4F',
  bank_transfer_info TEXT,
  phone             VARCHAR(20),
  created_at        TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- ── المنتجات ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id            SERIAL PRIMARY KEY,
  merchant_id   INTEGER        NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  name          VARCHAR(200)   NOT NULL,
  description   TEXT,
  category      product_category NOT NULL,
  image_urls    TEXT[]         NOT NULL DEFAULT '{}',
  note_top      VARCHAR(100),
  note_heart    VARCHAR(100),
  note_base     VARCHAR(100),
  skin_type     VARCHAR(100),
  ingredients   TEXT,
  batch_expiry  VARCHAR(20),
  is_active     BOOLEAN        NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP      NOT NULL DEFAULT NOW()
);

-- ── خيارات المنتج (الأسعار والمخزون) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_variants (
  id             SERIAL PRIMARY KEY,
  product_id     INTEGER       NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_label  VARCHAR(50)   NOT NULL,
  price          INTEGER       NOT NULL,
  stock          INTEGER       NOT NULL DEFAULT 0
);

-- ── صور المنتجات (تُخزَّن كـ binary في قاعدة البيانات) ───────────────────────
CREATE TABLE IF NOT EXISTS product_images (
  id          SERIAL PRIMARY KEY,
  product_id  INTEGER      NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  data        BYTEA        NOT NULL,
  mime_type   VARCHAR(50)  NOT NULL DEFAULT 'image/jpeg',
  created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ── الطلبات ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                SERIAL PRIMARY KEY,
  merchant_id       INTEGER         NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  customer_name     VARCHAR(150)    NOT NULL,
  customer_phone    VARCHAR(20)     NOT NULL,
  customer_address  TEXT            NOT NULL,
  payment_method    payment_method  NOT NULL,
  is_gift           BOOLEAN         NOT NULL DEFAULT FALSE,
  gift_message      TEXT,
  discount_code     VARCHAR(30),
  subtotal          INTEGER         NOT NULL,
  total             INTEGER         NOT NULL,
  status            order_status    NOT NULL DEFAULT 'new',
  created_at        TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- ── عناصر الطلب ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id              SERIAL PRIMARY KEY,
  order_id        INTEGER      NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  variant_id      INTEGER      REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name    VARCHAR(200) NOT NULL,
  variant_label   VARCHAR(50)  NOT NULL,
  quantity        INTEGER      NOT NULL,
  price_at_order  INTEGER      NOT NULL
);

-- ── أكواد الخصم ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS discount_codes (
  id           SERIAL PRIMARY KEY,
  merchant_id  INTEGER     NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  code         VARCHAR(30) NOT NULL,
  percent_off  INTEGER     NOT NULL,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMP   NOT NULL DEFAULT NOW(),
  UNIQUE (merchant_id, code)
);

-- ============================================================
--  تم إنشاء جميع الجداول بنجاح ✓
-- ============================================================
