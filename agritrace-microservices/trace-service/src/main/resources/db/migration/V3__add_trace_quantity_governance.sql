-- Add per-event quantity for business governance

ALTER TABLE trace_logs
ADD COLUMN IF NOT EXISTS quantity NUMERIC(18,3);

CREATE INDEX IF NOT EXISTS idx_trace_logs_batch_action ON trace_logs(batch_id, action_type);
