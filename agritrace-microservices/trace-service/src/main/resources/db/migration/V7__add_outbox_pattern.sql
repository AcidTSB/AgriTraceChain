-- ============================================================
-- V7: Outbox Pattern for Kafka Event Publishing
-- ============================================================
-- PURPOSE:
--   Implements the Transactional Outbox Pattern to guarantee
--   at-least-once event delivery to Kafka. Events are written
--   to this table in the SAME database transaction as the
--   trace_log insert, eliminating the dual-write problem.
--
-- FLOW:
--   1. Service writes trace_log + outbox_event atomically.
--   2. Scheduled poller reads PENDING events.
--   3. Poller publishes event to Kafka.
--   4. On Kafka ACK, event marked PUBLISHED.
--   5. Cleanup job deletes PUBLISHED events older than 7 days.
--
-- TRADEOFF:
--   Additional DB polling overhead (~1 req/s), but ensures
--   no lost events even on service crash mid-publish.
-- ============================================================

CREATE TABLE IF NOT EXISTS trace_outbox_events (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Reference to the trace log that triggered this event (nullable for system events)
    trace_log_id  UUID             REFERENCES trace_logs(id) ON DELETE SET NULL,
    -- Kafka topic to publish to
    topic         VARCHAR(255)     NOT NULL,
    -- Partition key for Kafka (typically batchId for ordering guarantees)
    partition_key VARCHAR(255),
    -- JSON payload to publish
    payload       TEXT             NOT NULL,
    -- Event type for consumer-side routing (e.g., TRACE_CREATED, BATCH_APPROVED)
    event_type    VARCHAR(100)     NOT NULL,
    -- Processing status: PENDING → PUBLISHING → PUBLISHED | FAILED
    status        VARCHAR(20)      NOT NULL DEFAULT 'PENDING',
    -- Number of publish attempts (for retry backoff logic)
    retry_count   INTEGER          NOT NULL DEFAULT 0,
    -- Last error message for debugging failed events
    last_error    TEXT,
    created_at    TIMESTAMP        NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP        NOT NULL DEFAULT NOW(),
    -- Events published successfully, eligible for cleanup
    published_at  TIMESTAMP
);

-- Index for efficient polling of PENDING events (primary query pattern)
CREATE INDEX idx_outbox_status_created ON trace_outbox_events(status, created_at)
    WHERE status IN ('PENDING', 'FAILED');

-- Index for trace log lookups (audit/debugging)
CREATE INDEX idx_outbox_trace_log_id ON trace_outbox_events(trace_log_id)
    WHERE trace_log_id IS NOT NULL;

-- Trigger to auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION update_outbox_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_outbox_updated_at
    BEFORE UPDATE ON trace_outbox_events
    FOR EACH ROW EXECUTE FUNCTION update_outbox_updated_at();

COMMENT ON TABLE trace_outbox_events IS
    'Transactional Outbox for Kafka event publishing – ensures exactly-once semantics at the DB level';
COMMENT ON COLUMN trace_outbox_events.status IS
    'PENDING: waiting to be published; PUBLISHING: lock acquired; PUBLISHED: success; FAILED: max retries exceeded';
