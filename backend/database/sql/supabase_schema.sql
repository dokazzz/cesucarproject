-- ============================================================
-- CESUCAR — Supabase / PostgreSQL Schema
-- Version: 1.0.0
-- Authentication: Custom (FastAPI + bcrypt + JWT)
-- RLS: Disabled (enforced in FastAPI)
-- ============================================================


-- ============================================================
-- STEP 1: ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM (
    'ADMIN',
    'DRIVER',
    'PASSENGER'
);

CREATE TYPE trip_type AS ENUM (
    'GOING_TO_CESUCA',
    'RETURNING_HOME'
);

CREATE TYPE ride_status AS ENUM (
    'ACTIVE',
    'FULL',
    'COMPLETED',
    'CANCELLED'
);

CREATE TYPE request_status AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'CANCELLED'
);

CREATE TYPE notification_type AS ENUM (
    'INFO',
    'SUCCESS',
    'WARNING',
    'RIDE_REQUEST',
    'RIDE_APPROVED',
    'RIDE_REJECTED',
    'RIDE_CANCELLED',
    'SYSTEM'
);

CREATE TYPE audit_action AS ENUM (
    'USER_REGISTERED',
    'USER_LOGIN',
    'USER_LOGOUT',
    'USER_UPDATED',
    'USER_DEACTIVATED',
    'USER_DELETED',
    'PASSWORD_CHANGED',
    'RIDE_CREATED',
    'RIDE_UPDATED',
    'RIDE_CANCELLED',
    'RIDE_COMPLETED',
    'REQUEST_CREATED',
    'REQUEST_APPROVED',
    'REQUEST_REJECTED',
    'REQUEST_CANCELLED',
    'ADMIN_ACTION'
);


-- ============================================================
-- STEP 2: TRIGGER FUNCTION (updated_at auto-update)
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- STEP 3: TABLES
-- ============================================================

-- ----------------------------------------------------------
-- TABLE: users
-- ----------------------------------------------------------
CREATE TABLE users (
    id              UUID            NOT NULL DEFAULT gen_random_uuid(),
    rgm             CHAR(8)         NOT NULL,
    full_name       VARCHAR(150)    NOT NULL,
    password_hash   VARCHAR(255)    NOT NULL,
    role            user_role       NOT NULL DEFAULT 'PASSENGER',
    course          VARCHAR(100),
    city            VARCHAR(100),
    phone           VARCHAR(20),
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_users
        PRIMARY KEY (id),

    CONSTRAINT uq_users_rgm
        UNIQUE (rgm),

    CONSTRAINT chk_users_rgm_format
        CHECK (rgm ~ '^\d{8}$')
);

COMMENT ON TABLE  users                IS 'Platform users: admins, drivers, and passengers';
COMMENT ON COLUMN users.rgm            IS 'University registration number — exactly 8 numeric digits';
COMMENT ON COLUMN users.password_hash  IS 'bcrypt hash — never store plaintext passwords';
COMMENT ON COLUMN users.role           IS 'ADMIN | DRIVER | PASSENGER';


-- ----------------------------------------------------------
-- TABLE: ride_offers
-- ----------------------------------------------------------
CREATE TABLE ride_offers (
    id                  UUID            NOT NULL DEFAULT gen_random_uuid(),
    driver_id           UUID            NOT NULL,
    trip_type           trip_type       NOT NULL,
    departure_city      VARCHAR(100)    NOT NULL,
    destination         VARCHAR(100)    NOT NULL,
    departure_time      TIMESTAMPTZ     NOT NULL,
    available_seats     SMALLINT        NOT NULL,
    price_per_passenger NUMERIC(8, 2)   NOT NULL,
    vehicle             VARCHAR(100),
    license_plate       VARCHAR(20),
    status              ride_status     NOT NULL DEFAULT 'ACTIVE',
    notes               TEXT,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_ride_offers
        PRIMARY KEY (id),

    CONSTRAINT chk_ride_offers_seats
        CHECK (available_seats >= 0),

    CONSTRAINT chk_ride_offers_price
        CHECK (price_per_passenger >= 0),

    CONSTRAINT fk_ride_offers_driver
        FOREIGN KEY (driver_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

COMMENT ON TABLE  ride_offers                  IS 'Rides offered by drivers';
COMMENT ON COLUMN ride_offers.trip_type        IS 'GOING_TO_CESUCA or RETURNING_HOME';
COMMENT ON COLUMN ride_offers.available_seats  IS 'Remaining seats available for passengers';
COMMENT ON COLUMN ride_offers.status           IS 'ACTIVE | FULL | COMPLETED | CANCELLED';


-- ----------------------------------------------------------
-- TABLE: ride_requests
-- ----------------------------------------------------------
CREATE TABLE ride_requests (
    id              UUID            NOT NULL DEFAULT gen_random_uuid(),
    ride_id         UUID            NOT NULL,
    passenger_id    UUID            NOT NULL,
    status          request_status  NOT NULL DEFAULT 'PENDING',
    message         TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_ride_requests
        PRIMARY KEY (id),

    CONSTRAINT uq_ride_requests_passenger
        UNIQUE (ride_id, passenger_id),

    CONSTRAINT fk_ride_requests_ride
        FOREIGN KEY (ride_id)
        REFERENCES ride_offers(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_ride_requests_passenger
        FOREIGN KEY (passenger_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

COMMENT ON TABLE  ride_requests           IS 'Passenger seat requests for a ride offer';
COMMENT ON COLUMN ride_requests.status    IS 'PENDING | APPROVED | REJECTED | CANCELLED';
COMMENT ON COLUMN ride_requests.message   IS 'Optional note from the passenger to the driver';


-- ----------------------------------------------------------
-- TABLE: notifications
-- ----------------------------------------------------------
CREATE TABLE notifications (
    id                  UUID                NOT NULL DEFAULT gen_random_uuid(),
    user_id             UUID                NOT NULL,
    title               VARCHAR(200)        NOT NULL,
    message             TEXT                NOT NULL,
    type                notification_type   NOT NULL DEFAULT 'INFO',
    is_read             BOOLEAN             NOT NULL DEFAULT FALSE,
    related_ride_id     UUID,
    related_request_id  UUID,
    created_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_notifications
        PRIMARY KEY (id),

    CONSTRAINT fk_notifications_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_notifications_ride
        FOREIGN KEY (related_ride_id)
        REFERENCES ride_offers(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_notifications_request
        FOREIGN KEY (related_request_id)
        REFERENCES ride_requests(id)
        ON DELETE SET NULL
);

COMMENT ON TABLE  notifications                    IS 'Per-user notification feed';
COMMENT ON COLUMN notifications.is_read            IS 'False = unread; True = already seen by user';
COMMENT ON COLUMN notifications.related_ride_id    IS 'Optional reference to the ride this notification is about';
COMMENT ON COLUMN notifications.related_request_id IS 'Optional reference to the request this notification is about';


-- ----------------------------------------------------------
-- TABLE: audit_logs
-- ----------------------------------------------------------
CREATE TABLE audit_logs (
    id          UUID            NOT NULL DEFAULT gen_random_uuid(),
    user_id     UUID,
    action      audit_action    NOT NULL,
    entity_type VARCHAR(50),
    entity_id   VARCHAR(36),
    details     JSONB,
    ip_address  VARCHAR(45),
    user_agent  TEXT,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_audit_logs
        PRIMARY KEY (id),

    CONSTRAINT fk_audit_logs_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
);

COMMENT ON TABLE  audit_logs            IS 'Immutable system-wide event log for security and administration';
COMMENT ON COLUMN audit_logs.user_id    IS 'NULL when action is performed by the system itself';
COMMENT ON COLUMN audit_logs.entity_type IS 'Type of entity affected (e.g. user, ride)';
COMMENT ON COLUMN audit_logs.details     IS 'Arbitrary JSON context for this event';


-- ----------------------------------------------------------
-- TABLE: system_settings
-- ----------------------------------------------------------
CREATE TABLE system_settings (
    id          UUID        NOT NULL DEFAULT gen_random_uuid(),
    key         VARCHAR(100) NOT NULL,
    value       TEXT,
    description TEXT,
    updated_by  UUID,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_system_settings
        PRIMARY KEY (id),

    CONSTRAINT uq_system_settings_key
        UNIQUE (key),

    CONSTRAINT fk_system_settings_user
        FOREIGN KEY (updated_by)
        REFERENCES users(id)
        ON DELETE SET NULL
);

COMMENT ON TABLE  system_settings IS 'Admin-configurable key-value platform settings';
COMMENT ON COLUMN system_settings.key IS 'Unique setting identifier (e.g. max_seats_per_ride)';


-- ============================================================
-- STEP 4: INDEXES
-- ============================================================

-- users
CREATE INDEX idx_users_rgm       ON users(rgm);
CREATE INDEX idx_users_role      ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

-- ride_offers
CREATE INDEX idx_ride_offers_driver_id      ON ride_offers(driver_id);
CREATE INDEX idx_ride_offers_status         ON ride_offers(status);
CREATE INDEX idx_ride_offers_trip_type      ON ride_offers(trip_type);
CREATE INDEX idx_ride_offers_departure_time ON ride_offers(departure_time);
CREATE INDEX idx_ride_offers_departure_city ON ride_offers(departure_city);

-- ride_requests
CREATE INDEX idx_ride_requests_ride_id      ON ride_requests(ride_id);
CREATE INDEX idx_ride_requests_passenger_id ON ride_requests(passenger_id);
CREATE INDEX idx_ride_requests_status       ON ride_requests(status);

-- notifications
CREATE INDEX idx_notifications_user_id   ON notifications(user_id);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created   ON notifications(created_at DESC);

-- audit_logs
CREATE INDEX idx_audit_logs_user_id    ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action     ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);


-- ============================================================
-- STEP 5: TRIGGERS (updated_at)
-- ============================================================

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_ride_offers_updated_at
    BEFORE UPDATE ON ride_offers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_ride_requests_updated_at
    BEFORE UPDATE ON ride_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- STEP 6: DISABLE RLS (access enforced in FastAPI)
-- ============================================================

ALTER TABLE users           DISABLE ROW LEVEL SECURITY;
ALTER TABLE ride_offers     DISABLE ROW LEVEL SECURITY;
ALTER TABLE ride_requests   DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications   DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs      DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings DISABLE ROW LEVEL SECURITY;


-- ============================================================
-- STEP 7: VERIFICATION QUERIES
-- (Run these after schema creation to confirm everything)
-- ============================================================

-- List all tables
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' ORDER BY table_name;

-- List all enums
-- SELECT typname FROM pg_type WHERE typcategory = 'E' ORDER BY typname;

-- List all indexes
-- SELECT indexname, tablename FROM pg_indexes
-- WHERE schemaname = 'public' ORDER BY tablename, indexname;

-- List all foreign keys
-- SELECT tc.constraint_name, tc.table_name, kcu.column_name,
--        ccu.table_name AS foreign_table, ccu.column_name AS foreign_column
-- FROM information_schema.table_constraints tc
-- JOIN information_schema.key_column_usage kcu
--   ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.constraint_column_usage ccu
--   ON ccu.constraint_name = tc.constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY';


-- ============================================================
-- NOTE: Admin account is seeded via Python (reads ADMIN_PASSWORD
-- from environment variable). Run: python backend/seed_supabase.py
-- ============================================================
