-- Add performance indexes on foreign keys used in frequent queries
-- These are the most common lookup patterns in the storefront API

-- Products: merchant_id used in every storefront query
CREATE INDEX IF NOT EXISTS idx_products_merchant_id ON products(merchant_id);
-- Products: is_active used in every storefront query
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
-- Products: composite index for the most common query pattern
CREATE INDEX IF NOT EXISTS idx_products_merchant_active ON products(merchant_id, is_active);
-- Products: category filter
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- Product variants: product_id used in every variant query
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);

-- Orders: merchant_id used in all order queries
CREATE INDEX IF NOT EXISTS idx_orders_merchant_id ON orders(merchant_id);
-- Orders: status filter
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
-- Orders: created_at for sorting
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Order items: order_id
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Reviews: product_id used in review queries
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
-- Reviews: composite for approved reviews
CREATE INDEX IF NOT EXISTS idx_reviews_product_approved ON reviews(product_id, is_approved);

-- Bundles: merchant_id
CREATE INDEX IF NOT EXISTS idx_bundles_merchant_id ON bundles(merchant_id);

-- Bundle items: bundle_id
CREATE INDEX IF NOT EXISTS idx_bundle_items_bundle_id ON bundle_items(bundle_id);
