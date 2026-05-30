-- Add compromise status fields to batches table
ALTER TABLE batches ADD COLUMN IF NOT EXISTS compromised_at TIMESTAMP;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS compromise_reason VARCHAR(500);
ALTER TABLE batches ADD COLUMN IF NOT EXISTS compromised_by_audit_id VARCHAR(100);
