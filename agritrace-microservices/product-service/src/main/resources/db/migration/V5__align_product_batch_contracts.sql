-- Align Product/Batch data contracts across DB, REST DTOs, gRPC and frontend.

-- 1) Persist product reference in batches so product_id is no longer lost after create-batch.
ALTER TABLE batches
    ADD COLUMN IF NOT EXISTS product_id UUID;

UPDATE batches b
SET product_id = p.id
FROM products p
WHERE b.product_id IS NULL
  AND b.product_name = p.name;

CREATE INDEX IF NOT EXISTS idx_batches_product_id ON batches(product_id);

-- 2) Keep quantity precision (frontend + API use decimal values).
ALTER TABLE batches
    ALTER COLUMN quantity TYPE DOUBLE PRECISION
    USING quantity::DOUBLE PRECISION;

-- 3) Prevent overflow when storing product type/category display metadata.
ALTER TABLE batches
    ALTER COLUMN product_type TYPE VARCHAR(255);

-- 4) Add product activation flag required by admin UI contract.
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
