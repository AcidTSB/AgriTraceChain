-- Product Service Database Schema

CREATE TABLE IF NOT EXISTS batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_code VARCHAR(100) UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_type VARCHAR(100),
    harvest_date TIMESTAMP,
    quantity INTEGER,
    unit VARCHAR(50),
    facility_id UUID,
    facility_name VARCHAR(255),
    owner_id UUID NOT NULL,
    owner_name VARCHAR(255),
    is_compromised BOOLEAN NOT NULL DEFAULT false,
    qr_code_url TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_batches_code ON batches(batch_code);
CREATE INDEX idx_batches_owner ON batches(owner_id);
CREATE INDEX idx_batches_facility ON batches(facility_id);
