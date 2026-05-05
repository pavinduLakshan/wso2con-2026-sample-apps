import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
  }
  return db;
}

export function initDb(): void {
  const database = getDb();

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sub TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS flights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      airline TEXT NOT NULL,
      flight_number TEXT NOT NULL,
      origin TEXT NOT NULL,
      origin_city TEXT NOT NULL,
      destination TEXT NOT NULL,
      destination_city TEXT NOT NULL,
      departure_time TEXT NOT NULL,
      arrival_time TEXT NOT NULL,
      price REAL NOT NULL,
      stops INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS hotels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      city TEXT NOT NULL,
      country TEXT NOT NULL,
      star_rating INTEGER NOT NULL CHECK (star_rating >= 1 AND star_rating <= 5),
      price_per_night REAL NOT NULL,
      amenities TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      type TEXT NOT NULL CHECK (type IN ('flight', 'hotel')),
      item_id INTEGER NOT NULL,
      check_in_date TEXT,
      check_out_date TEXT,
      guests INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
      total_price REAL NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('flight', 'hotel')),
      origin TEXT,
      destination TEXT,
      city TEXT,
      max_price REAL,
      min_stars INTEGER,
      enabled INTEGER NOT NULL DEFAULT 1,
      ciba_status TEXT NOT NULL DEFAULT 'none' CHECK (ciba_status IN ('pending', 'approved', 'denied', 'none')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
}
