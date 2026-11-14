CREATE TABLE users (
    id          BIGSERIAL PRIMARY KEY,
    google_sub  TEXT NOT NULL UNIQUE,
    email       TEXT NOT NULL,
    name        TEXT NOT NULL DEFAULT '',
    avatar_url  TEXT NOT NULL DEFAULT '',
    role        TEXT NOT NULL DEFAULT 'user'
                CHECK (role IN ('user', 'organizer', 'admin')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX users_email_lower_idx ON users (lower(email));

CREATE TABLE communities (
    id           BIGSERIAL PRIMARY KEY,
    slug         TEXT NOT NULL UNIQUE,
    name         TEXT NOT NULL,
    tagline      TEXT NOT NULL DEFAULT '',
    description  TEXT NOT NULL DEFAULT '',
    logo_key     TEXT,
    banner_key   TEXT,
    category     TEXT NOT NULL DEFAULT '',
    city         TEXT NOT NULL DEFAULT '',
    socials      JSONB NOT NULL DEFAULT '{}'::jsonb,
    organizer_id BIGINT UNIQUE REFERENCES users (id) ON DELETE SET NULL,
    status       TEXT NOT NULL DEFAULT 'published'
                 CHECK (status IN ('draft', 'published', 'archived')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX communities_status_idx ON communities (status);
CREATE INDEX communities_category_idx ON communities (category);
CREATE INDEX communities_city_idx ON communities (city);
CREATE INDEX communities_name_lower_idx ON communities (lower(name));

CREATE TABLE events (
    id             BIGSERIAL PRIMARY KEY,
    community_id   BIGINT NOT NULL REFERENCES communities (id) ON DELETE CASCADE,
    title          TEXT NOT NULL,
    description    TEXT NOT NULL DEFAULT '',
    starts_at      TIMESTAMPTZ NOT NULL,
    ends_at        TIMESTAMPTZ,
    location_name  TEXT NOT NULL DEFAULT '',
    location_url   TEXT,
    capacity       INTEGER CHECK (capacity IS NULL OR capacity > 0),
    poster_key     TEXT,
    external_url   TEXT,
    external_label TEXT NOT NULL DEFAULT 'Kunjungi Instagram',
    status         TEXT NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft', 'published', 'cancelled')),
    price          INTEGER NOT NULL DEFAULT 0 CHECK (price >= 0),
    currency       TEXT NOT NULL DEFAULT 'IDR',
    created_by     BIGINT REFERENCES users (id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT events_time_order CHECK (ends_at IS NULL OR ends_at >= starts_at)
);

CREATE INDEX events_community_idx ON events (community_id);
CREATE INDEX events_status_starts_idx ON events (status, starts_at);

CREATE TABLE registrations (
    id          BIGSERIAL PRIMARY KEY,
    event_id    BIGINT NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    user_id     BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    decided_by  BIGINT REFERENCES users (id) ON DELETE SET NULL,
    decided_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (event_id, user_id)
);

CREATE INDEX registrations_event_status_idx ON registrations (event_id, status);
CREATE INDEX registrations_user_idx ON registrations (user_id);

CREATE TABLE email_logs (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT REFERENCES users (id) ON DELETE SET NULL,
    template   TEXT NOT NULL,
    payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
    sent_at    TIMESTAMPTZ,
    error      TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
