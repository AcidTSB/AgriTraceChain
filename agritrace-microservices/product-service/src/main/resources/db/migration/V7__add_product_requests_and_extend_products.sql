-- V7: Product Creation Request workflow
-- Adds product_requests table and extends products with unit + imageUrl

-- 1) Extend products table
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS unit       VARCHAR(50),
    ADD COLUMN IF NOT EXISTS image_url  TEXT;

-- 2) Create product_requests table
CREATE TABLE IF NOT EXISTS product_requests (
    id                   UUID         NOT NULL DEFAULT gen_random_uuid(),
    farmer_id            UUID         NOT NULL,
    product_name         VARCHAR(255) NOT NULL,
    category             VARCHAR(100),
    description          TEXT,
    unit                 VARCHAR(50),
    image_url            TEXT,
    note                 TEXT,
    status               VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    rejection_reason     TEXT,
    reviewed_by_admin_id UUID,
    created_at           TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at           TIMESTAMP    NOT NULL DEFAULT now(),

    CONSTRAINT pk_product_requests PRIMARY KEY (id),
    CONSTRAINT chk_product_request_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))
);

CREATE INDEX IF NOT EXISTS idx_product_requests_farmer_id ON product_requests(farmer_id);
CREATE INDEX IF NOT EXISTS idx_product_requests_status    ON product_requests(status);
CREATE INDEX IF NOT EXISTS idx_product_requests_created   ON product_requests(created_at DESC);
