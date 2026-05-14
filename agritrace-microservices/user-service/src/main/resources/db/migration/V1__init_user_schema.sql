-- User Service Database Schema

CREATE TABLE IF NOT EXISTS facilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    certificate_code VARCHAR(100),
    address TEXT,
    owner_id UUID,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'FARMER', 'INSPECTOR')),
    facility_id UUID REFERENCES facilities(id),
    active BOOLEAN NOT NULL DEFAULT true,
    public_key TEXT,
    private_key_encrypted TEXT,
    key_algorithm VARCHAR(20) DEFAULT 'RSA',
    key_size INTEGER DEFAULT 2048,
    key_generated_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_facility ON users(facility_id);

ALTER TABLE facilities ADD CONSTRAINT fk_facility_owner
    FOREIGN KEY (owner_id) REFERENCES users(id);
