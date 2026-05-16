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
