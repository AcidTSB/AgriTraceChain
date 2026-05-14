-- Trace Service Database Schema

CREATE TABLE IF NOT EXISTS trace_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL,
    batch_code VARCHAR(100),
    action_type VARCHAR(50) NOT NULL,
    description TEXT,
    location TEXT,
    latitude VARCHAR(50),
    longitude VARCHAR(50),
    current_hash TEXT NOT NULL,
    previous_hash TEXT,
    signature TEXT,
    signature_algorithm VARCHAR(50),
    signed_by UUID,
    signed_at TIMESTAMP,
    signature_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMP,
    verified_by UUID,
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_trace_logs_batch ON trace_logs(batch_id);
CREATE INDEX idx_trace_logs_created ON trace_logs(created_at);
