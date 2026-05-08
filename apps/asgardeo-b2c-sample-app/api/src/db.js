import Database from "better-sqlite3";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultDbPath = resolve(__dirname, "..", "wayfinder.sqlite");
const dbPath = process.env.SQLITE_DB_PATH || defaultDbPath;

let db;

function ensureSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      type TEXT NOT NULL,
      item_id TEXT NOT NULL,
      travelers INTEGER NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}

function getDatabase() {
  if (!existsSync(dbPath)) {
    throw new Error("SQLite database not found. Run `npm run seed` from the api directory.");
  }

  if (!db) {
    db = new Database(dbPath);
    ensureSchema(db);
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

export function listTrips({ destination } = {}) {
  const conditions = [];
  const params = {};

  if (destination) {
    conditions.push("LOWER(destination) LIKE LOWER(@destination)");
    params.destination = `%${destination}%`;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = getDatabase()
    .prepare(`SELECT * FROM trips ${whereClause} ORDER BY total_estimate ASC`)
    .all(params);

  return rows.map(mapTrip);
}

export function listLocations({ category } = {}) {
  let query = `
    SELECT from_city AS name, 'city' AS type FROM flights
    UNION
    SELECT to_city AS name, 'city' AS type FROM flights
  `;

  if (category === "hotels") {
    query = `
      SELECT location AS name, 'area' AS type FROM hotels
    `;
  }

  if (category === "trips") {
    query = `
      SELECT destination AS name, 'destination' AS type FROM trips
    `;
  }

  const rows = getDatabase()
    .prepare(`SELECT DISTINCT name, type FROM (${query}) ORDER BY name ASC`)
    .all();

  return rows;
}

export function createBookingRecord({ id, user, type, itemId, travelers, status, createdAt }) {
  const username = user.username || user.email || user.id;

  getDatabase()
    .prepare(
      `
        INSERT INTO bookings (
          id,
          user_id,
          username,
          type,
          item_id,
          travelers,
          status,
          created_at
        ) VALUES (
          @id,
          @userId,
          @username,
          @type,
          @itemId,
          @travelers,
          @status,
          @createdAt
        )
      `
    )
    .run({
      id,
      userId: user.id,
      username,
      type,
      itemId,
      travelers,
      status,
      createdAt
    });

  return {
    id,
    userId: user.id,
    username,
    type,
    itemId,
    travelers,
    status,
    createdAt
  };
}

export function listBookedFlights(username) {
  const rows = getDatabase()
    .prepare(
      `
        SELECT
          bookings.id AS booking_id,
          bookings.username,
          bookings.travelers,
          bookings.status,
          bookings.created_at,
          flights.*
        FROM bookings
        INNER JOIN flights ON bookings.item_id = flights.id
        WHERE bookings.type = 'flight'
          AND bookings.username = @username
        ORDER BY bookings.created_at DESC
      `
    )
    .all({ username });

  return rows.map((row) => ({
    id: row.booking_id,
    username: row.username,
    travelers: row.travelers,
    status: row.status,
    createdAt: row.created_at,
    flight: mapFlight(row)
  }));
}
