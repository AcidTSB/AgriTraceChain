-- Migration to enforce uniqueness of COMPROMISE_DETECTED per batch
CREATE UNIQUE INDEX IF NOT EXISTS idx_uniq_compromise_detected
ON trace_audit_logs (batch_code)
WHERE operation = 'COMPROMISE_DETECTED' AND batch_code IS NOT NULL;
