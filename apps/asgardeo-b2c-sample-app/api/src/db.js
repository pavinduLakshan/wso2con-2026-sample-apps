import Database from "better-sqlite3";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultDbPath = resolve(__dirname, "..", "wayfinder.sqlite");
const dbPath = process.env.SQLITE_DB_PATH || defaultDbPath;

let db;

function getDatabase() {
  if (!existsSync(dbPath)) {
    throw new Error("SQLite database not found. Run `npm run seed` from the api directory.");
  }

  if (!db) {
    db = new Database(dbPath, { readonly: true });
  }

  return db;
}

function parseJsonArray(value) {
  try {
    return JSON.parse(value || "[]");
  } catch {
    return [];
  }
}

function mapFlight(row) {
  return {
    id: row.id,
    from: row.from_city,
    to: row.to_city,
    airline: row.airline,
    departureTime: row.departure_time,
    arrivalTime: row.arrival_time,
    duration: row.duration,
    stops: row.stops,
    price: row.price,
    currency: row.currency,
    cabin: row.cabin,
    dates: row.dates,
    tags: parseJsonArray(row.tags)
  };
}

function mapHotel(row) {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    nightlyRate: row.nightly_rate,
    currency: row.currency,
    rating: row.rating,
    amenities: parseJsonArray(row.amenities)
  };
}

function mapTrip(row) {
  return {
    id: row.id,
    title: row.title,
    destination: row.destination,
    flightId: row.flight_id,
    hotelId: row.hotel_id,
    status: row.status,
    totalEstimate: row.total_estimate,
    currency: row.currency
  };
}

export function findFlights({ from, to, cabin }) {
  const conditions = [];
  const params = {};

  if (from) {
    conditions.push("LOWER(from_city) LIKE LOWER(@from)");
    params.from = `%${from}%`;
  }

  if (to) {
    conditions.push("LOWER(to_city) LIKE LOWER(@to)");
    params.to = `%${to}%`;
  }

  if (cabin) {
    conditions.push("LOWER(cabin) LIKE LOWER(@cabin)");
    params.cabin = `%${cabin}%`;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = getDatabase()
    .prepare(`SELECT * FROM flights ${whereClause} ORDER BY price ASC`)
    .all(params);

  return rows.map(mapFlight);
}

export function findHotels({ location, maxNightlyRate }) {
  const conditions = [];
  const params = {};

  if (location) {
    conditions.push("LOWER(location) LIKE LOWER(@location)");
    params.location = `%${location}%`;
  }

  if (maxNightlyRate) {
    conditions.push("nightly_rate <= @maxNightlyRate");
    params.maxNightlyRate = maxNightlyRate;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = getDatabase()
    .prepare(`SELECT * FROM hotels ${whereClause} ORDER BY rating DESC`)
    .all(params);

  return rows.map(mapHotel);
}

export function listTrips() {
  const rows = getDatabase().prepare("SELECT * FROM trips ORDER BY title ASC").all();

  return rows.map(mapTrip);
}
