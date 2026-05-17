import Database from "better-sqlite3";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiRoot = resolve(__dirname, "..");
const configuredDbPath = process.env.SQLITE_DB_PATH || "wayfinder.sqlite";
const dbPath = resolve(apiRoot, configuredDbPath);
const schemaPath = resolve(apiRoot, "schema.sql");
const forceSeed = process.argv.includes("--force") || process.argv.includes("-f");

const flights = [
  {
    id: "flight-nyc-lax-01",
    from: "New York",
    to: "Los Angeles",
    airline: "Horizon Airlines",
    departure_time: "08:00",
    arrival_time: "11:30",
    duration: "5h 30m",
    stops: 0,
    price: 268,
    currency: "USD",
    cabin: "Economy",
    dates: "Jun 12 - Jun 18",
    tags: JSON.stringify(["Best value", "Nonstop"])
  },
  {
    id: "flight-chi-mia-01",
    from: "Chicago",
    to: "Miami",
    airline: "American Air",
    departure_time: "10:15",
    arrival_time: "14:45",
    duration: "3h 30m",
    stops: 0,
    price: 245,
    currency: "USD",
    cabin: "Economy",
    dates: "Jul 04 - Jul 16",
    tags: JSON.stringify(["Nonstop", "Popular"])
  },
  {
    id: "flight-sfo-sea-01",
    from: "San Francisco",
    to: "Seattle",
    airline: "West Coast Express",
    departure_time: "14:20",
    arrival_time: "16:10",
    duration: "2h 50m",
    stops: 0,
    price: 156,
    currency: "USD",
    cabin: "Economy",
    dates: "Aug 21 - Aug 27",
    tags: JSON.stringify(["Quick trip"])
  },
  {
    id: "flight-bos-fll-01",
    from: "Boston",
    to: "Fort Lauderdale",
    airline: "East Coast Airways",
    departure_time: "11:45",
    arrival_time: "15:20",
    duration: "3h 35m",
    stops: 0,
    price: 224,
    currency: "USD",
    cabin: "Economy",
    dates: "Jun 20 - Jun 26",
    tags: JSON.stringify(["Beach trip"])
  },
  {
    id: "flight-den-las-01",
    from: "Denver",
    to: "Las Vegas",
    airline: "Mountain Air",
    departure_time: "09:30",
    arrival_time: "10:45",
    duration: "2h 15m",
    stops: 0,
    price: 132,
    currency: "USD",
    cabin: "Economy",
    dates: "Jun 12 - Jun 18",
    tags: JSON.stringify(["Budget flight", "Direct"])
  },
  {
    id: "flight-phx-nyc-01",
    from: "Phoenix",
    to: "New York",
    airline: "Horizon Airlines",
    departure_time: "13:00",
    arrival_time: "20:15",
    duration: "4h 15m",
    stops: 0,
    price: 289,
    currency: "USD",
    cabin: "Economy",
    dates: "Jun 12 - Jun 18",
    tags: JSON.stringify(["Flexible ticket", "Carry-on included"])
  },
  {
    id: "flight-dal-msy-01",
    from: "Dallas",
    to: "New Orleans",
    airline: "Southern Sky",
    departure_time: "07:15",
    arrival_time: "09:45",
    duration: "2h 30m",
    stops: 0,
    price: 147,
    currency: "USD",
    cabin: "Economy",
    dates: "Jul 04 - Jul 16",
    tags: JSON.stringify(["Good price", "Morning"])
  },
  {
    id: "flight-lax-san-01",
    from: "Los Angeles",
    to: "San Diego",
    airline: "SunFly",
    departure_time: "15:30",
    arrival_time: "16:20",
    duration: "1h 50m",
    stops: 0,
    price: 98,
    currency: "USD",
    cabin: "Economy",
    dates: "Sep 02 - Sep 09",
    tags: JSON.stringify(["Shortest flight", "Budget"])
  },
  {
    id: "flight-nyc-lax-02",
    from: "New York",
    to: "Los Angeles",
    airline: "Blue Sky Airlines",
    departure_time: "20:45",
    arrival_time: "00:20",
    duration: "5h 35m",
    stops: 0,
    price: 298,
    currency: "USD",
    cabin: "Economy",
    dates: "Jun 12 - Jun 18",
    tags: JSON.stringify(["Evening", "Red-eye"])
  },
  {
    id: "flight-chi-mia-02",
    from: "Chicago",
    to: "Miami",
    airline: "Star Airways",
    departure_time: "16:00",
    arrival_time: "20:30",
    duration: "3h 30m",
    stops: 0,
    price: 198,
    currency: "USD",
    cabin: "Economy",
    dates: "Oct 10 - Oct 18",
    tags: JSON.stringify(["Afternoon", "Nonstop"])
  },
  {
    id: "flight-atl-ord-01",
    from: "Atlanta",
    to: "Chicago",
    airline: "Delta Connect",
    departure_time: "06:45",
    arrival_time: "08:30",
    duration: "1h 45m",
    stops: 0,
    price: 119,
    currency: "USD",
    cabin: "Economy",
    dates: "Jun 12 - Jun 18",
    tags: JSON.stringify(["Early bird", "Nonstop"])
  },
  {
    id: "flight-mia-jfk-01",
    from: "Miami",
    to: "New York",
    airline: "Coastal Air",
    departure_time: "12:30",
    arrival_time: "15:50",
    duration: "3h 20m",
    stops: 0,
    price: 237,
    currency: "USD",
    cabin: "Economy",
    dates: "Jul 04 - Jul 16",
    tags: JSON.stringify(["Midday", "Nonstop"])
  },
  {
    id: "flight-sea-lax-01",
    from: "Seattle",
    to: "Los Angeles",
    airline: "Pacific Wings",
    departure_time: "07:00",
    arrival_time: "09:45",
    duration: "2h 45m",
    stops: 0,
    price: 173,
    currency: "USD",
    cabin: "Economy",
    dates: "Aug 21 - Aug 27",
    tags: JSON.stringify(["Morning", "Best value"])
  },
  {
    id: "flight-las-sfo-01",
    from: "Las Vegas",
    to: "San Francisco",
    airline: "SunFly",
    departure_time: "18:10",
    arrival_time: "19:55",
    duration: "1h 45m",
    stops: 0,
    price: 112,
    currency: "USD",
    cabin: "Economy",
    dates: "Sep 02 - Sep 09",
    tags: JSON.stringify(["Evening", "Budget"])
  },
  {
    id: "flight-nyc-ord-01",
    from: "New York",
    to: "Chicago",
    airline: "Horizon Airlines",
    departure_time: "09:00",
    arrival_time: "10:55",
    duration: "2h 55m",
    stops: 0,
    price: 189,
    currency: "USD",
    cabin: "Economy",
    dates: "Jun 20 - Jun 26",
    tags: JSON.stringify(["Morning", "Popular"])
  },
  {
    id: "flight-dfw-phx-01",
    from: "Dallas",
    to: "Phoenix",
    airline: "Southwest Sky",
    departure_time: "11:00",
    arrival_time: "12:30",
    duration: "1h 30m",
    stops: 0,
    price: 104,
    currency: "USD",
    cabin: "Economy",
    dates: "Oct 10 - Oct 18",
    tags: JSON.stringify(["Quick trip", "Budget"])
  },
  {
    id: "flight-bos-ord-01",
    from: "Boston",
    to: "Chicago",
    airline: "East Coast Airways",
    departure_time: "14:00",
    arrival_time: "15:50",
    duration: "2h 50m",
    stops: 0,
    price: 163,
    currency: "USD",
    cabin: "Economy",
    dates: "Jun 12 - Jun 18",
    tags: JSON.stringify(["Afternoon", "Nonstop"])
  },
  {
    id: "flight-nyc-lax-03",
    from: "New York",
    to: "Los Angeles",
    airline: "Horizon Airlines",
    departure_time: "13:30",
    arrival_time: "17:10",
    duration: "5h 40m",
    stops: 0,
    price: 349,
    currency: "USD",
    cabin: "Business",
    dates: "Jun 12 - Jun 18",
    tags: JSON.stringify(["Business class", "Premium"])
  },
  {
    id: "flight-lax-jfk-01",
    from: "Los Angeles",
    to: "New York",
    airline: "Blue Sky Airlines",
    departure_time: "22:00",
    arrival_time: "06:10",
    duration: "5h 10m",
    stops: 0,
    price: 312,
    currency: "USD",
    cabin: "Economy",
    dates: "Jul 04 - Jul 16",
    tags: JSON.stringify(["Red-eye", "Nonstop"])
  },
  {
    id: "flight-sea-ord-01",
    from: "Seattle",
    to: "Chicago",
    airline: "West Coast Express",
    departure_time: "08:45",
    arrival_time: "14:20",
    duration: "3h 35m",
    stops: 0,
    price: 218,
    currency: "USD",
    cabin: "Economy",
    dates: "Aug 21 - Aug 27",
    tags: JSON.stringify(["Direct", "Morning"])
  },
  {
    id: "flight-den-sfo-01",
    from: "Denver",
    to: "San Francisco",
    airline: "Mountain Air",
    departure_time: "10:00",
    arrival_time: "11:50",
    duration: "2h 50m",
    stops: 0,
    price: 141,
    currency: "USD",
    cabin: "Economy",
    dates: "Sep 02 - Sep 09",
    tags: JSON.stringify(["Nonstop", "Good price"])
  },
  {
    id: "flight-chi-nyc-01",
    from: "Chicago",
    to: "New York",
    airline: "Star Airways",
    departure_time: "17:30",
    arrival_time: "21:00",
    duration: "2h 30m",
    stops: 0,
    price: 176,
    currency: "USD",
    cabin: "Economy",
    dates: "Jun 20 - Jun 26",
    tags: JSON.stringify(["Evening", "Popular"])
  },
  {
    id: "flight-atl-mia-01",
    from: "Atlanta",
    to: "Miami",
    airline: "Southern Sky",
    departure_time: "08:30",
    arrival_time: "10:10",
    duration: "1h 40m",
    stops: 0,
    price: 128,
    currency: "USD",
    cabin: "Economy",
    dates: "Oct 10 - Oct 18",
    tags: JSON.stringify(["Short hop", "Budget"])
  },
  {
    id: "flight-msp-lax-01",
    from: "Minneapolis",
    to: "Los Angeles",
    airline: "NorthStar Air",
    departure_time: "07:30",
    arrival_time: "10:00",
    duration: "4h 30m",
    stops: 0,
    price: 254,
    currency: "USD",
    cabin: "Economy",
    dates: "Jul 04 - Jul 16",
    tags: JSON.stringify(["Nonstop", "Morning"])
  }
];

const hotels = [
  {
    id: "hotel-la-marina-resort",
    name: "LA Marina Resort",
    location: "Los Angeles Marina",
    nightly_rate: 148,
    currency: "USD",
    rating: 9.1,
    amenities: JSON.stringify(["Beachfront", "Pool", "Gym"])
  },
  {
    id: "hotel-miami-beach-palace",
    name: "Miami Beach Palace",
    location: "Miami Beach",
    nightly_rate: 156,
    currency: "USD",
    rating: 8.8,
    amenities: JSON.stringify(["Ocean view", "Spa", "Restaurant"])
  },
  {
    id: "hotel-midtown-manhattan",
    name: "Midtown Manhattan Lofts",
    location: "New York Manhattan",
    nightly_rate: 218,
    currency: "USD",
    rating: 9.4,
    amenities: JSON.stringify(["Central location", "Fitness center", "Concierge"])
  },
  {
    id: "hotel-chicago-downtown",
    name: "Chicago Downtown Inn",
    location: "Chicago Downtown",
    nightly_rate: 128,
    currency: "USD",
    rating: 8.9,
    amenities: JSON.stringify(["Loop location", "Breakfast", "Business center"])
  },
  {
    id: "hotel-sf-union-square",
    name: "Union Square Hotel",
    location: "San Francisco Union Square",
    nightly_rate: 174,
    currency: "USD",
    rating: 8.7,
    amenities: JSON.stringify(["Shopping district", "Restaurant", "Workout room"])
  },
  {
    id: "hotel-boston-backbay",
    name: "Boston Back Bay Suites",
    location: "Boston Back Bay",
    nightly_rate: 149,
    currency: "USD",
    rating: 9.0,
    amenities: JSON.stringify(["Historic area", "Parking", "Free WiFi"])
  },
  {
    id: "hotel-seattle-waterfront",
    name: "Seattle Waterfront Lodge",
    location: "Seattle Waterfront",
    nightly_rate: 162,
    currency: "USD",
    rating: 9.2,
    amenities: JSON.stringify(["Waterfront views", "Restaurant", "Business services"])
  },
  {
    id: "hotel-vegas-strip-view",
    name: "Vegas Strip View Hotel",
    location: "Las Vegas Strip",
    nightly_rate: 118,
    currency: "USD",
    rating: 8.6,
    amenities: JSON.stringify(["Strip access", "Casino", "Entertainment"])
  },
  {
    id: "hotel-denver-downtown",
    name: "Denver Downtown Hotel",
    location: "Denver Downtown",
    nightly_rate: 119,
    currency: "USD",
    rating: 8.5,
    amenities: JSON.stringify(["Downtown location", "Fitness center", "Breakfast"])
  },
  {
    id: "hotel-sanDiego-harbor",
    name: "San Diego Harbor Inn",
    location: "San Diego Harbor",
    nightly_rate: 138,
    currency: "USD",
    rating: 8.9,
    amenities: JSON.stringify(["Bay views", "Waterfront dining", "Concierge"])
  },
  {
    id: "hotel-atlanta-midtown",
    name: "Atlanta Midtown Suites",
    location: "Atlanta Midtown",
    nightly_rate: 112,
    currency: "USD",
    rating: 8.6,
    amenities: JSON.stringify(["Rooftop pool", "Fitness center", "Free breakfast"])
  },
  {
    id: "hotel-phoenix-desert-resort",
    name: "Phoenix Desert Resort",
    location: "Phoenix Scottsdale",
    nightly_rate: 189,
    currency: "USD",
    rating: 9.3,
    amenities: JSON.stringify(["Pool", "Spa", "Desert views", "Golf"])
  },
  {
    id: "hotel-new-orleans-french-quarter",
    name: "French Quarter Inn",
    location: "New Orleans French Quarter",
    nightly_rate: 145,
    currency: "USD",
    rating: 9.0,
    amenities: JSON.stringify(["Historic building", "Jazz lounge", "Courtyard"])
  },
  {
    id: "hotel-minneapolis-downtown",
    name: "Minneapolis City Center Hotel",
    location: "Minneapolis Downtown",
    nightly_rate: 109,
    currency: "USD",
    rating: 8.4,
    amenities: JSON.stringify(["Skyway access", "Free WiFi", "Business center"])
  },
  {
    id: "hotel-la-luxury-hills",
    name: "Beverly Hills Grand",
    location: "Los Angeles Beverly Hills",
    nightly_rate: 385,
    currency: "USD",
    rating: 9.7,
    amenities: JSON.stringify(["Luxury suites", "Valet parking", "Fine dining", "Spa"])
  },
  {
    id: "hotel-nyc-tribeca-loft",
    name: "Tribeca Loft Hotel",
    location: "New York Tribeca",
    nightly_rate: 265,
    currency: "USD",
    rating: 9.1,
    amenities: JSON.stringify(["Loft rooms", "Rooftop bar", "Concierge"])
  },
  {
    id: "hotel-miami-design-district",
    name: "Design District Boutique",
    location: "Miami Design District",
    nightly_rate: 198,
    currency: "USD",
    rating: 9.0,
    amenities: JSON.stringify(["Art gallery", "Rooftop pool", "Restaurant"])
  },
  {
    id: "hotel-sf-fishermans-wharf",
    name: "Fisherman's Wharf Hotel",
    location: "San Francisco Fisherman's Wharf",
    nightly_rate: 188,
    currency: "USD",
    rating: 8.8,
    amenities: JSON.stringify(["Harbor views", "Seafood restaurant", "Bike rentals"])
  },
  {
    id: "hotel-chicago-magnificent-mile",
    name: "Magnificent Mile Residences",
    location: "Chicago Magnificent Mile",
    nightly_rate: 172,
    currency: "USD",
    rating: 9.2,
    amenities: JSON.stringify(["Lake views", "Shopping nearby", "Fitness center"])
  },
  {
    id: "hotel-dallas-uptown",
    name: "Uptown Dallas Hotel",
    location: "Dallas Uptown",
    nightly_rate: 132,
    currency: "USD",
    rating: 8.7,
    amenities: JSON.stringify(["Rooftop pool", "Free parking", "Restaurant"])
  }
];

const trips = [
  {
    id: "trip-la-getaway",
    title: "Los Angeles beach getaway",
    destination: "Los Angeles",
    flight_id: "flight-nyc-lax-01",
    hotel_id: "hotel-la-marina-resort",
    status: "planning",
    total_estimate: 966,
    currency: "USD"
  },
  {
    id: "trip-miami-week",
    title: "Miami sunshine week",
    destination: "Miami",
    flight_id: "flight-chi-mia-01",
    hotel_id: "hotel-miami-beach-palace",
    status: "saved",
    total_estimate: 924,
    currency: "USD"
  },
  {
    id: "trip-nyc-city-escape",
    title: "New York city escape",
    destination: "New York",
    flight_id: "flight-phx-nyc-01",
    hotel_id: "hotel-midtown-manhattan",
    status: "planning",
    total_estimate: 1726,
    currency: "USD"
  },
  {
    id: "trip-chicago-break",
    title: "Chicago city break",
    destination: "Chicago",
    flight_id: "flight-chi-mia-02",
    hotel_id: "hotel-chicago-downtown",
    status: "saved",
    total_estimate: 524,
    currency: "USD"
  },
  {
    id: "trip-sf-tech-tour",
    title: "San Francisco tech tour",
    destination: "San Francisco",
    flight_id: "flight-sfo-sea-01",
    hotel_id: "hotel-sf-union-square",
    status: "planning",
    total_estimate: 696,
    currency: "USD"
  },
  {
    id: "trip-boston-historic",
    title: "Boston historic tour",
    destination: "Boston",
    flight_id: "flight-bos-fll-01",
    hotel_id: "hotel-boston-backbay",
    status: "saved",
    total_estimate: 820,
    currency: "USD"
  },
  {
    id: "trip-seattle-escape",
    title: "Seattle weekend escape",
    destination: "Seattle",
    flight_id: "flight-sfo-sea-01",
    hotel_id: "hotel-seattle-waterfront",
    status: "planning",
    total_estimate: 806,
    currency: "USD"
  },
  {
    id: "trip-vegas-adventure",
    title: "Las Vegas adventure",
    destination: "Las Vegas",
    flight_id: "flight-den-las-01",
    hotel_id: "hotel-vegas-strip-view",
    status: "saved",
    total_estimate: 604,
    currency: "USD"
  },
  {
    id: "trip-denver-rockies",
    title: "Denver Rockies road trip",
    destination: "Denver",
    flight_id: "flight-den-sfo-01",
    hotel_id: "hotel-denver-downtown",
    status: "planning",
    total_estimate: 567,
    currency: "USD"
  },
  {
    id: "trip-new-orleans-jazz",
    title: "New Orleans jazz weekend",
    destination: "New Orleans",
    flight_id: "flight-dal-msy-01",
    hotel_id: "hotel-new-orleans-french-quarter",
    status: "saved",
    total_estimate: 727,
    currency: "USD"
  },
  {
    id: "trip-atlanta-city",
    title: "Atlanta city experience",
    destination: "Atlanta",
    flight_id: "flight-atl-ord-01",
    hotel_id: "hotel-atlanta-midtown",
    status: "planning",
    total_estimate: 511,
    currency: "USD"
  },
  {
    id: "trip-phoenix-desert",
    title: "Phoenix desert retreat",
    destination: "Phoenix",
    flight_id: "flight-dfw-phx-01",
    hotel_id: "hotel-phoenix-desert-resort",
    status: "saved",
    total_estimate: 1198,
    currency: "USD"
  },
  {
    id: "trip-la-luxury",
    title: "Los Angeles luxury break",
    destination: "Los Angeles",
    flight_id: "flight-nyc-lax-03",
    hotel_id: "hotel-la-luxury-hills",
    status: "planning",
    total_estimate: 3044,
    currency: "USD"
  },
  {
    id: "trip-nyc-tribeca",
    title: "New York Tribeca stay",
    destination: "New York",
    flight_id: "flight-mia-jfk-01",
    hotel_id: "hotel-nyc-tribeca-loft",
    status: "saved",
    total_estimate: 2097,
    currency: "USD"
  },
  {
    id: "trip-miami-design",
    title: "Miami design district tour",
    destination: "Miami",
    flight_id: "flight-atl-mia-01",
    hotel_id: "hotel-miami-design-district",
    status: "planning",
    total_estimate: 1514,
    currency: "USD"
  },
  {
    id: "trip-minneapolis-getaway",
    title: "Minneapolis city getaway",
    destination: "Minneapolis",
    flight_id: "flight-msp-lax-01",
    hotel_id: "hotel-minneapolis-downtown",
    status: "saved",
    total_estimate: 581,
    currency: "USD"
  },
  {
    id: "trip-dallas-uptown",
    title: "Dallas uptown weekend",
    destination: "Dallas",
    flight_id: "flight-dfw-phx-01",
    hotel_id: "hotel-dallas-uptown",
    status: "planning",
    total_estimate: 632,
    currency: "USD"
  }
];

if (!existsSync(apiRoot)) {
  mkdirSync(apiRoot, { recursive: true });
}

if (forceSeed) {
  for (const path of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
    if (existsSync(path)) {
      rmSync(path, { force: true });
    }
  }
}

const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(readFileSync(schemaPath, "utf8"));

const insertFlight = db.prepare(`
  INSERT INTO flights (
    id,
    from_city,
    to_city,
    airline,
    departure_time,
    arrival_time,
    duration,
    stops,
    price,
    currency,
    cabin,
    dates,
    tags
  ) VALUES (
    @id,
    @from,
    @to,
    @airline,
    @departure_time,
    @arrival_time,
    @duration,
    @stops,
    @price,
    @currency,
    @cabin,
    @dates,
    @tags
  )
`);

const insertHotel = db.prepare(`
  INSERT INTO hotels (
    id,
    name,
    location,
    nightly_rate,
    currency,
    rating,
    amenities
  ) VALUES (
    @id,
    @name,
    @location,
    @nightly_rate,
    @currency,
    @rating,
    @amenities
  )
`);

const insertTrip = db.prepare(`
  INSERT INTO trips (
    id,
    title,
    destination,
    flight_id,
    hotel_id,
    status,
    total_estimate,
    currency
  ) VALUES (
    @id,
    @title,
    @destination,
    @flight_id,
    @hotel_id,
    @status,
    @total_estimate,
    @currency
  )
`);

const seed = db.transaction(() => {
  for (const flight of flights) {
    insertFlight.run(flight);
  }

  for (const hotel of hotels) {
    insertHotel.run(hotel);
  }

  for (const trip of trips) {
    insertTrip.run(trip);
  }
});

seed();
db.close();

console.log(`Seeded SQLite database at ${dbPath}${forceSeed ? " after force reset" : ""}`);
