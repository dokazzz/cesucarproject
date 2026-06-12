-- ============================================================
-- CESUCAR — Initial Database Schema
-- PostgreSQL 14+
-- Run with: psql -U cesucar_user -d cesucar_db -f 001_initial_schema.sql
-- ============================================================

-- ── Extension ────────────────────────────────────────────────────────────────
-- Enable pgcrypto for potential future use
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Users ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    full_name       VARCHAR(255)    NOT NULL,
    rgm             CHAR(8)         NOT NULL,
    password_hash   VARCHAR(255)    NOT NULL,
    role            VARCHAR(20)     NOT NULL DEFAULT 'passenger',
    course          VARCHAR(100),
    city            VARCHAR(100),
    phone           VARCHAR(20),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_users_rgm        UNIQUE (rgm),
    CONSTRAINT users_rgm_format    CHECK  (rgm ~ '^\d{8}$'),
    CONSTRAINT users_role_valid    CHECK  (role IN ('admin', 'passenger', 'driver'))
);

CREATE INDEX IF NOT EXISTS ix_users_rgm ON users (rgm);

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Ride Offers ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ride_offers (
    id                   SERIAL PRIMARY KEY,
    driver_id            INTEGER         NOT NULL,
    trip_type            VARCHAR(20)     NOT NULL,
    departure_city       VARCHAR(100)    NOT NULL,
    destination          VARCHAR(100)    NOT NULL,
    departure_time       TIMESTAMPTZ     NOT NULL,
    available_seats      INTEGER         NOT NULL,
    price_per_passenger  NUMERIC(10,2)   NOT NULL,
    vehicle              VARCHAR(100),
    license_plate        VARCHAR(10),
    status               VARCHAR(20)     NOT NULL DEFAULT 'active',
    created_at           TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_ride_offers_driver
        FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE,

    CONSTRAINT ride_offers_trip_type_valid
        CHECK (trip_type IN ('GOING_TO_CAMPUS', 'RETURNING_HOME')),

    CONSTRAINT ride_offers_status_valid
        CHECK (status IN ('active', 'full', 'cancelled', 'completed')),

    CONSTRAINT ride_offers_seats_positive
        CHECK (available_seats >= 0),

    CONSTRAINT ride_offers_price_positive
        CHECK (price_per_passenger >= 0)
);

CREATE INDEX IF NOT EXISTS ix_ride_offers_driver_id       ON ride_offers (driver_id);
CREATE INDEX IF NOT EXISTS ix_ride_offers_departure_time  ON ride_offers (departure_time);
CREATE INDEX IF NOT EXISTS ix_ride_offers_status          ON ride_offers (status);

-- ── Ride Requests ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ride_requests (
    id              SERIAL PRIMARY KEY,
    ride_id         INTEGER     NOT NULL,
    passenger_id    INTEGER     NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'confirmed',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_ride_requests_ride
        FOREIGN KEY (ride_id) REFERENCES ride_offers(id) ON DELETE CASCADE,

    CONSTRAINT fk_ride_requests_passenger
        FOREIGN KEY (passenger_id) REFERENCES users(id) ON DELETE CASCADE,

    CONSTRAINT uq_ride_request
        UNIQUE (ride_id, passenger_id),

    CONSTRAINT ride_requests_status_valid
        CHECK (status IN ('pending', 'confirmed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS ix_ride_requests_ride_id       ON ride_requests (ride_id);
CREATE INDEX IF NOT EXISTS ix_ride_requests_passenger_id  ON ride_requests (passenger_id);

-- ── Notifications ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER      NOT NULL,
    title        VARCHAR(255) NOT NULL,
    message      TEXT         NOT NULL,
    read_status  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_notifications_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_notifications_user_id ON notifications (user_id);

-- ── Audit Logs ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER,
    action     VARCHAR(255) NOT NULL,
    details    JSONB,
    timestamp  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_audit_logs_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ix_audit_logs_user_id   ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS ix_audit_logs_action    ON audit_logs (action);
CREATE INDEX IF NOT EXISTS ix_audit_logs_timestamp ON audit_logs (timestamp);

-- ── Verification query ────────────────────────────────────────────────────────
SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name) AS column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('users','ride_offers','ride_requests','notifications','audit_logs')
ORDER BY table_name;
