-- Align DB constraints with User entity and service-level uniqueness checks.

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email ON users (email);
