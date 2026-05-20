-- V4: Add sku and category columns to products table
-- sku: unique product code (e.g. AT-TOM-001), manually assigned
-- category: product category (e.g. Rau củ, Trái cây, Ngũ cốc)

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS sku VARCHAR(50) UNIQUE;

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS category VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
