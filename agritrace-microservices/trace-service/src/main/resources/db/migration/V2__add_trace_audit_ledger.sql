-- Audit ledger for traceability operations (append-only)

CREATE TABLE IF NOT EXISTS trace_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    trace_log_id UUID,
    batch_code VARCHAR(100),
    operation VARCHAR(50) NOT NULL,
    actor_id UUID,
    actor_role VARCHAR(30),
    actor_region VARCHAR(100),
    actor_facility_id UUID,
    before_snapshot JSONB,
    after_snapshot JSONB,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trace_audit_logs_trace_log_id ON trace_audit_logs(trace_log_id);
CREATE INDEX IF NOT EXISTS idx_trace_audit_logs_batch_code ON trace_audit_logs(batch_code);
CREATE INDEX IF NOT EXISTS idx_trace_audit_logs_created_at ON trace_audit_logs(created_at);

-- WORM guarantee for audit ledger: block UPDATE/DELETE.
CREATE OR REPLACE FUNCTION prevent_trace_audit_mutation()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'trace_audit_logs is append-only (WORM). Operation % is forbidden.', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_trace_audit_update ON trace_audit_logs;
CREATE TRIGGER trg_prevent_trace_audit_update
BEFORE UPDATE ON trace_audit_logs
FOR EACH ROW
EXECUTE FUNCTION prevent_trace_audit_mutation();

DROP TRIGGER IF EXISTS trg_prevent_trace_audit_delete ON trace_audit_logs;
CREATE TRIGGER trg_prevent_trace_audit_delete
BEFORE DELETE ON trace_audit_logs
FOR EACH ROW
EXECUTE FUNCTION prevent_trace_audit_mutation();
