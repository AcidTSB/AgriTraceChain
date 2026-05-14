-- Persistent signer keypair store for trace-service RSA signatures.
-- This prevents historical signature verification from breaking after service restarts.

CREATE TABLE IF NOT EXISTS trace_signer_keypair (
    id SMALLINT PRIMARY KEY CHECK (id = 1),
    private_key TEXT NOT NULL,
    public_key TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
