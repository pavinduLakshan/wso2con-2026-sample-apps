import { initDb, getDb } from "../src/lib/db";

initDb();
const db = getDb();

const flightCount = db.prepare("SELECT COUNT(*) as count FROM flights").get() as { count: number };
if (flightCount.count > 0) {
  console.log("Database already seeded. Skipping.");
  process.exit(0);
}

const seedFlights = db.transaction(() => {
  const insertFlight = db.prepare(`
    INSERT INTO flights (airline, flight_number, origin, origin_city, destination, destination_city, departure_time, arrival_time, price, stops)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const flights = [
    ["Emirates", "EK202", "DXB", "Dubai", "LHR", "London", "2026-06-15T08:00:00", "2026-06-15T16:00:00", 850, 0],
    ["Qatar Airways", "QR738", "DOH", "Doha", "JFK", "New York", "2026-06-16T01:00:00", "2026-06-16T14:00:00", 920, 1],
    ["Singapore Airlines", "SQ321", "SIN", "Singapore", "SYD", "Sydney", "2026-06-17T10:00:00", "2026-06-17T18:00:00", 680, 0],
    ["Lufthansa", "LH400", "FRA", "Frankfurt", "NRT", "Tokyo", "2026-06-18T13:00:00", "2026-06-19T06:00:00", 1100, 0],
    ["Delta", "DL150", "ATL", "Atlanta", "CDG", "Paris", "2026-06-19T18:00:00", "2026-06-20T08:00:00", 750, 1],
    ["British Airways", "BA112", "LHR", "London", "HKG", "Hong Kong", "2026-06-20T09:00:00", "2026-06-21T03:00:00", 980, 0],
    ["Emirates", "EK501", "DXB", "Dubai", "SIN", "Singapore", "2026-06-21T02:00:00", "2026-06-21T13:00:00", 720, 0],
    ["Qatar Airways", "QR101", "DOH", "Doha", "CDG", "Paris", "2026-06-22T07:00:00", "2026-06-22T14:00:00", 650, 0],
    ["Singapore Airlines", "SQ888", "SIN", "Singapore", "LAX", "Los Angeles", "2026-06-23T20:00:00", "2026-06-24T18:00:00", 1300, 1],
    ["Lufthansa", "LH510", "FRA", "Frankfurt", "DXB", "Dubai", "2026-06-24T11:00:00", "2026-06-24T19:00:00", 580, 0],
    ["Delta", "DL890", "JFK", "New York", "LHR", "London", "2026-06-25T22:00:00", "2026-06-26T10:00:00", 620, 0],
    ["British Airways", "BA249", "LHR", "London", "DXB", "Dubai", "2026-06-26T14:00:00", "2026-06-27T01:00:00", 780, 0],
    ["Emirates", "EK304", "DXB", "Dubai", "JFK", "New York", "2026-06-27T03:00:00", "2026-06-27T16:00:00", 1050, 0],
    ["Cathay Pacific", "CX888", "HKG", "Hong Kong", "SFO", "San Francisco", "2026-06-28T09:00:00", "2026-06-28T21:00:00", 1150, 0],
    ["Turkish Airlines", "TK001", "IST", "Istanbul", "JFK", "New York", "2026-06-29T08:00:00", "2026-06-29T20:00:00", 870, 1],
    ["Air France", "AF008", "CDG", "Paris", "DXB", "Dubai", "2026-06-30T10:00:00", "2026-06-30T18:00:00", 690, 0],
  ];

  for (const flight of flights) {
    insertFlight.run(...flight);
  }
});

const seedHotels = db.transaction(() => {
  const insertHotel = db.prepare(`
    INSERT INTO hotels (name, location, city, country, star_rating, price_per_night, amenities, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const hotels = [
    ["Burj Al Arab", "Jumeirah Beach Road", "Dubai", "UAE", 5, 1200, "Pool, Spa, Private Beach, Butler Service", ""],
    ["Marina Bay Sands", "10 Bayfront Ave", "Singapore", "Singapore", 5, 450, "Infinity Pool, Casino, Rooftop Bar, Spa", ""],
    ["The Savoy", "Strand", "London", "UK", 5, 520, "Afternoon Tea, River Views, Fine Dining", ""],
    ["Park Hyatt", "3-7-1-2 Nishi-Shinjuku", "Tokyo", "Japan", 5, 480, "Spa, Mt Fuji Views, Indoor Pool", ""],
    ["Four Seasons", "57 E 57th St", "New York", "USA", 5, 850, "Spa, Fine Dining, City Views", ""],
    ["Ritz Paris", "15 Place Vendome", "Paris", "France", 5, 1100, "Michelin Restaurant, Spa, Garden", ""],
    ["Shangri-La", "176 Cumberland St", "Sydney", "Australia", 5, 380, "Harbour Views, Spa, Pool", ""],
    ["Mandarin Oriental", "5 Connaught Road", "Hong Kong", "Hong Kong", 5, 550, "Harbour Views, Michelin Dining, Spa", ""],
    ["Hotel de Rome", "Behrenstrasse 37", "Berlin", "Germany", 5, 420, "Rooftop Terrace, Spa, Indoor Pool", ""],
    ["Sofitel Downtown", "Wadi Street", "Dubai", "UAE", 4, 200, "Pool, Gym, City Views", ""],
    ["Holiday Inn Express", "Wall Street", "New York", "USA", 3, 180, "Free Breakfast, WiFi, Gym", ""],
    ["Premier Inn County Hall", "Belvedere Road", "London", "UK", 3, 140, "River Views, Budget-Friendly, WiFi", ""],
    ["Ibis Styles", "Bali Lane", "Singapore", "Singapore", 3, 120, "Colorful Rooms, Free WiFi, Breakfast Included", ""],
    ["Moxy Tokyo", "Minato-ku", "Tokyo", "Japan", 3, 160, "Trendy, Bar, 24hr Gym", ""],
    ["Generator Paris", "10 Place du Colonel Fabien", "Paris", "France", 2, 80, "Hostel, Rooftop Bar, Social Events", ""],
    ["YHA Sydney Harbour", "110 Cumberland St", "Sydney", "Australia", 2, 65, "Harbour Views, Budget, Shared Kitchen", ""],
  ];

  for (const hotel of hotels) {
    insertHotel.run(...hotel);
  }
});

seedFlights();
seedHotels();

console.log("Database seeded successfully.");
console.log(`  - ${db.prepare("SELECT COUNT(*) as count FROM flights").get() as { count: number }}.count flights`);
console.log(`  - ${db.prepare("SELECT COUNT(*) as count FROM hotels").get() as { count: number }}.count hotels`);
