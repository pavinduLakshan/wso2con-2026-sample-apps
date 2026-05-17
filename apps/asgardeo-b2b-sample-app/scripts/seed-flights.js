/**
 * Seed global flight data into the B2B app SQLite database.
 * Flights are shared across all organizations — only bookings are org-scoped.
 *
 * Usage:
 *   node scripts/seed-flights.js           (seed if not already seeded)
 *   node scripts/seed-flights.js --force   (reset and re-seed)
 */

import Database from "better-sqlite3";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const schemaPath = resolve(root, "app/lib/db/schema.sql");
const dbPath = resolve(root, process.env.DB_PATH ?? "data/app.db");
const force = process.argv.includes("--force") || process.argv.includes("-f");

// ─── Flight catalog (global, shared across all orgs) ─────────────────────────

const flights = [
  // ── Economy — within typical $500 policy cap ──────────────────────────────
  {
    id: "flight-nyc-lax-01",
    from_city: "New York",
    to_city: "Los Angeles",
    airline: "Horizon Airlines",
    departure_time: "08:00",
    arrival_time: "11:30",
    duration: "5h 30m",
    stops: 0,
    price: 268,
    currency: "USD",
    cabin: "Economy",
    dates: "Jun 12 - Jun 18",
    tags: JSON.stringify(["Best value", "Nonstop"]),
  },
  {
    id: "flight-chi-mia-01",
    from_city: "Chicago",
    to_city: "Miami",
    airline: "American Air",
    departure_time: "10:15",
    arrival_time: "14:45",
    duration: "3h 30m",
    stops: 0,
    price: 245,
    currency: "USD",
    cabin: "Economy",
    dates: "Jul 04 - Jul 16",
    tags: JSON.stringify(["Nonstop", "Popular"]),
  },
  {
    id: "flight-sfo-sea-01",
    from_city: "San Francisco",
    to_city: "Seattle",
    airline: "West Coast Express",
    departure_time: "14:20",
    arrival_time: "16:10",
    duration: "2h 50m",
    stops: 0,
    price: 156,
    currency: "USD",
    cabin: "Economy",
    dates: "Aug 21 - Aug 27",
    tags: JSON.stringify(["Quick trip"]),
  },
  {
    id: "flight-bos-fll-01",
    from_city: "Boston",
    to_city: "Fort Lauderdale",
    airline: "East Coast Airways",
    departure_time: "11:45",
    arrival_time: "15:20",
    duration: "3h 35m",
    stops: 0,
    price: 224,
    currency: "USD",
    cabin: "Economy",
    dates: "Jun 20 - Jun 26",
    tags: JSON.stringify(["Beach trip"]),
  },
  {
    id: "flight-den-las-01",
    from_city: "Denver",
    to_city: "Las Vegas",
    airline: "Mountain Air",
    departure_time: "09:30",
    arrival_time: "10:45",
    duration: "2h 15m",
    stops: 0,
    price: 132,
    currency: "USD",
    cabin: "Economy",
    dates: "Jun 12 - Jun 18",
    tags: JSON.stringify(["Budget flight", "Direct"]),
  },
  {
    id: "flight-phx-nyc-01",
    from_city: "Phoenix",
    to_city: "New York",
    airline: "Horizon Airlines",
    departure_time: "13:00",
    arrival_time: "20:15",
    duration: "4h 15m",
    stops: 0,
    price: 289,
    currency: "USD",
    cabin: "Economy",
    dates: "Jun 12 - Jun 18",
    tags: JSON.stringify(["Flexible ticket", "Carry-on included"]),
  },
  {
    id: "flight-dal-msy-01",
    from_city: "Dallas",
    to_city: "New Orleans",
    airline: "Southern Sky",
    departure_time: "07:15",
    arrival_time: "09:45",
    duration: "2h 30m",
    stops: 0,
    price: 147,
    currency: "USD",
    cabin: "Economy",
    dates: "Jul 04 - Jul 16",
    tags: JSON.stringify(["Good price", "Morning"]),
  },
  {
    id: "flight-lax-san-01",
    from_city: "Los Angeles",
    to_city: "San Diego",
    airline: "SunFly",
    departure_time: "15:30",
    arrival_time: "16:20",
    duration: "1h 50m",
    stops: 0,
    price: 98,
    currency: "USD",
    cabin: "Economy",
    dates: "Sep 02 - Sep 09",
    tags: JSON.stringify(["Shortest flight", "Budget"]),
  },
  {
    id: "flight-nyc-lax-02",
    from_city: "New York",
    to_city: "Los Angeles",
    airline: "Blue Sky Airlines",
    departure_time: "20:45",
    arrival_time: "00:20",
    duration: "5h 35m",
    stops: 0,
    price: 298,
    currency: "USD",
    cabin: "Economy",
    dates: "Jun 12 - Jun 18",
    tags: JSON.stringify(["Evening", "Red-eye"]),
  },
  {
    id: "flight-sea-lax-01",
    from_city: "Seattle",
    to_city: "Los Angeles",
    airline: "Pacific Jet",
    departure_time: "06:30",
    arrival_time: "09:10",
    duration: "2h 40m",
    stops: 0,
    price: 178,
    currency: "USD",
    cabin: "Economy",
    dates: "Jul 15 - Jul 22",
    tags: JSON.stringify(["Early bird", "Nonstop"]),
  },
  // ── Economy — slightly above $500 cap (approval-required territory) ────────
  {
    id: "flight-jfk-lhr-01",
    from_city: "New York",
    to_city: "London",
    airline: "TransAtlantic Airways",
    departure_time: "21:00",
    arrival_time: "09:30+1",
    duration: "8h 30m",
    stops: 0,
    price: 548,
    currency: "USD",
    cabin: "Economy",
    dates: "Aug 01 - Aug 10",
    tags: JSON.stringify(["International", "Nonstop"]),
  },
  {
    id: "flight-lax-ord-01",
    from_city: "Los Angeles",
    to_city: "Chicago",
    airline: "Horizon Airlines",
    departure_time: "11:00",
    arrival_time: "16:45",
    duration: "3h 45m",
    stops: 0,
    price: 530,
    currency: "USD",
    cabin: "Economy",
    dates: "Sep 10 - Sep 17",
    tags: JSON.stringify(["Business route"]),
  },
  // ── Premium Economy ────────────────────────────────────────────────────────
  {
    id: "flight-chi-mia-02",
    from_city: "Chicago",
    to_city: "Miami",
    airline: "Star Airways",
    departure_time: "16:00",
    arrival_time: "20:30",
    duration: "3h 30m",
    stops: 0,
    price: 420,
    currency: "USD",
    cabin: "Premium Economy",
    dates: "Oct 10 - Oct 18",
    tags: JSON.stringify(["Premium", "Nonstop"]),
  },
  {
    id: "flight-nyc-mia-01",
    from_city: "New York",
    to_city: "Miami",
    airline: "Eastern Jet",
    departure_time: "07:45",
    arrival_time: "11:05",
    duration: "3h 20m",
    stops: 0,
    price: 385,
    currency: "USD",
    cabin: "Premium Economy",
    dates: "Jun 25 - Jul 02",
    tags: JSON.stringify(["Comfortable", "Extra legroom"]),
  },
  {
    id: "flight-sfo-jfk-01",
    from_city: "San Francisco",
    to_city: "New York",
    airline: "Cross Country Air",
    departure_time: "10:30",
    arrival_time: "19:15",
    duration: "5h 45m",
    stops: 0,
    price: 620,
    currency: "USD",
    cabin: "Premium Economy",
    dates: "Jul 20 - Jul 28",
    tags: JSON.stringify(["Premium", "Transcontinental"]),
  },
  // ── Business class ─────────────────────────────────────────────────────────
  {
    id: "flight-nyc-lax-biz-01",
    from_city: "New York",
    to_city: "Los Angeles",
    airline: "Executive Air",
    departure_time: "09:00",
    arrival_time: "12:30",
    duration: "5h 30m",
    stops: 0,
    price: 1450,
    currency: "USD",
    cabin: "Business",
    dates: "Jun 12 - Jun 18",
    tags: JSON.stringify(["Lie-flat", "Premium lounge"]),
  },
  {
    id: "flight-jfk-lhr-biz-01",
    from_city: "New York",
    to_city: "London",
    airline: "Global Business Jets",
    departure_time: "18:30",
    arrival_time: "06:45+1",
    duration: "8h 15m",
    stops: 0,
    price: 3200,
    currency: "USD",
    cabin: "Business",
    dates: "Aug 05 - Aug 14",
    tags: JSON.stringify(["International business", "Flat bed"]),
  },
  {
    id: "flight-chi-lax-biz-01",
    from_city: "Chicago",
    to_city: "Los Angeles",
    airline: "BlueSky Premier",
    departure_time: "07:30",
    arrival_time: "10:00",
    duration: "3h 30m",
    stops: 0,
    price: 1820,
    currency: "USD",
    cabin: "Business",
    dates: "Sep 01 - Sep 08",
    tags: JSON.stringify(["Early morning", "Business class"]),
  },
  // ── First class ────────────────────────────────────────────────────────────
  {
    id: "flight-nyc-lax-first-01",
    from_city: "New York",
    to_city: "Los Angeles",
    airline: "Prestige Airways",
    departure_time: "10:00",
    arrival_time: "13:30",
    duration: "5h 30m",
    stops: 0,
    price: 4800,
    currency: "USD",
    cabin: "First Class",
    dates: "Jun 12 - Jun 18",
    tags: JSON.stringify(["Private suite", "Gourmet dining"]),
  },
];

// ─── Seeding ──────────────────────────────────────────────────────────────────

if (!existsSync(dirname(dbPath))) {
  mkdirSync(dirname(dbPath), { recursive: true });
}

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(readFileSync(schemaPath, "utf8"));

const existing = db.prepare("SELECT COUNT(*) as count FROM flights").get();
if (existing.count > 0 && !force) {
  console.log(`Flights already seeded (${existing.count} rows). Use --force to re-seed.`);
  db.close();
  process.exit(0);
}

if (force) {
  db.prepare("DELETE FROM flights").run();
  console.log("Cleared existing flights.");
}

const insert = db.prepare(`
  INSERT OR REPLACE INTO flights
    (id, from_city, to_city, airline, departure_time, arrival_time, duration, stops, price, currency, cabin, dates, tags)
  VALUES
    (@id, @from_city, @to_city, @airline, @departure_time, @arrival_time, @duration, @stops, @price, @currency, @cabin, @dates, @tags)
`);

const seed = db.transaction(() => {
  for (const f of flights) insert.run(f);
  return flights.length;
});

const count = seed();
db.close();

console.log(`Seeded ${count} flights into ${dbPath}`);
console.log("\nFlight mix:");
console.log("  Economy (≤$300):         10 flights — in-policy for typical $500 cap");
console.log("  Economy ($530-$548):       2 flights — approval-required zone");
console.log("  Premium Economy:           3 flights — cabin upgrade, mixed prices");
console.log("  Business:                  3 flights — out-of-policy for Economy policies");
console.log("  First Class:               1 flight  — always out-of-policy");
