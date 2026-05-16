CREATE TABLE IF NOT EXISTS travel_policies (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id            TEXT    NOT NULL UNIQUE,
  domestic_cabin    TEXT    NOT NULL DEFAULT 'Economy',
  intl_cabin        TEXT    NOT NULL DEFAULT 'Business',
  long_haul_hours   INTEGER NOT NULL DEFAULT 8,
  price_cap_percent INTEGER NOT NULL DEFAULT 20,
  min_days_advance  INTEGER NOT NULL DEFAULT 14,
  updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS enterprise_idps (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id     TEXT    NOT NULL UNIQUE,
  idp_id     TEXT    NOT NULL,
  idp_name   TEXT    NOT NULL,
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
