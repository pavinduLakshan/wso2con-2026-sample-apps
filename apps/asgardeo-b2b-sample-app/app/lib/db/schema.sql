CREATE TABLE IF NOT EXISTS travel_policies (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id            TEXT    NOT NULL UNIQUE,
  domestic_cabin    TEXT    NOT NULL DEFAULT 'Economy',
  max_flight_price  INTEGER NOT NULL DEFAULT 500,
  price_cap_percent INTEGER NOT NULL DEFAULT 20,
  updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS enterprise_idps (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id     TEXT    NOT NULL UNIQUE,
  idp_id     TEXT    NOT NULL,
  idp_name   TEXT    NOT NULL,
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS org_tiers (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id     TEXT    NOT NULL UNIQUE,
  tier       TEXT    NOT NULL DEFAULT 'FREE',
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS branding_preferences (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id             TEXT    NOT NULL UNIQUE,
  primary_color      TEXT    NOT NULL DEFAULT '#2563EB',
  secondary_color    TEXT    NOT NULL DEFAULT '#FBBF24',
  logo_url           TEXT    NOT NULL DEFAULT '',
  favicon_url        TEXT    NOT NULL DEFAULT '',
  font_family        TEXT    NOT NULL DEFAULT 'Inter',
  font_import_url    TEXT    NOT NULL DEFAULT 'https://fonts.googleapis.com/css?family=Inter',
  text_primary_color TEXT    NOT NULL DEFAULT '#111827',
  display_name       TEXT    NOT NULL DEFAULT '',
  support_email      TEXT    NOT NULL DEFAULT '',
  updated_at         TEXT    NOT NULL DEFAULT (datetime('now'))
);
