import { initDb, getDb } from "../src/lib/db";

function seed() {
  initDb();
  const db = getDb();

  const flightCount = db.prepare("SELECT COUNT(*) as count FROM flights").get() as {
    count: number;
  };

  if (flightCount.count > 0) {
    console.log("Database already seeded. Skipping.");
    return;
  }

  const insertFlight = db.prepare(`
    INSERT INTO flights (airline, flight_number, origin, origin_city, destination, destination_city, departure_time, arrival_time, price, stops)
    VALUES (@airline, @flight_number, @origin, @origin_city, @destination, @destination_city, @departure_time, @arrival_time, @price, @stops)
  `);

  const insertHotel = db.prepare(`
    INSERT INTO hotels (name, location, city, country, star_rating, price_per_night, amenities, image_url)
    VALUES (@name, @location, @city, @country, @star_rating, @price_per_night, @amenities, @image_url)
  `);

  const flights = [
    { airline: "Emirates", flight_number: "EK501", origin: "DXB", origin_city: "Dubai", destination: "LHR", destination_city: "London", departure_time: "2026-06-15 08:00", arrival_time: "2026-06-15 14:30", price: 850, stops: 0 },
    { airline: "Emirates", flight_number: "EK502", origin: "LHR", origin_city: "London", destination: "DXB", destination_city: "Dubai", departure_time: "2026-06-16 16:00", arrival_time: "2026-06-17 02:30", price: 780, stops: 0 },
    { airline: "Qatar Airways", flight_number: "QR101", origin: "DOH", origin_city: "Doha", destination: "JFK", destination_city: "New York", departure_time: "2026-06-15 01:00", arrival_time: "2026-06-15 07:30", price: 1200, stops: 0 },
    { airline: "Qatar Airways", flight_number: "QR102", origin: "JFK", origin_city: "New York", destination: "DOH", destination_city: "Doha", departure_time: "2026-06-16 21:00", arrival_time: "2026-06-17 17:30", price: 1150, stops: 0 },
    { airline: "Singapore Airlines", flight_number: "SQ321", origin: "SIN", origin_city: "Singapore", destination: "SYD", destination_city: "Sydney", departure_time: "2026-06-15 22:00", arrival_time: "2026-06-16 07:30", price: 650, stops: 0 },
    { airline: "Singapore Airlines", flight_number: "SQ322", origin: "SYD", origin_city: "Sydney", destination: "SIN", destination_city: "Singapore", departure_time: "2026-06-16 10:00", arrival_time: "2026-06-16 16:00", price: 620, stops: 0 },
    { airline: "Lufthansa", flight_number: "LH400", origin: "FRA", origin_city: "Frankfurt", destination: "NRT", destination_city: "Tokyo", departure_time: "2026-06-15 13:00", arrival_time: "2026-06-16 08:30", price: 1100, stops: 1 },
    { airline: "Lufthansa", flight_number: "LH401", origin: "NRT", origin_city: "Tokyo", destination: "FRA", destination_city: "Frankfurt", departure_time: "2026-06-16 10:00", arrival_time: "2026-06-16 17:30", price: 1050, stops: 1 },
    { airline: "Delta", flight_number: "DL200", origin: "ATL", origin_city: "Atlanta", destination: "CDG", destination_city: "Paris", departure_time: "2026-06-15 17:00", arrival_time: "2026-06-16 07:30", price: 900, stops: 0 },
    { airline: "Delta", flight_number: "DL201", origin: "CDG", origin_city: "Paris", destination: "ATL", destination_city: "Atlanta", departure_time: "2026-06-16 10:00", arrival_time: "2026-06-16 14:30", price: 950, stops: 0 },
    { airline: "British Airways", flight_number: "BA100", origin: "LHR", origin_city: "London", destination: "HKG", destination_city: "Hong Kong", departure_time: "2026-06-15 18:00", arrival_time: "2026-06-16 14:30", price: 980, stops: 0 },
    { airline: "British Airways", flight_number: "BA101", origin: "HKG", origin_city: "Hong Kong", destination: "LHR", destination_city: "London", departure_time: "2026-06-16 23:00", arrival_time: "2026-06-17 05:30", price: 950, stops: 0 },
  ];

  const hotels = [
    { name: "Marriott Marquis", location: "1535 Broadway", city: "New York", country: "USA", star_rating: 5, price_per_night: 350, amenities: "Pool, Gym, Spa, Restaurant", image_url: "" },
    { name: "Hilton London Metropole", location: "225 Edgware Rd", city: "London", country: "UK", star_rating: 4, price_per_night: 220, amenities: "Gym, Restaurant, Bar, Business Center", image_url: "" },
    { name: "Burj Al Arab", location: "Jumeirah St", city: "Dubai", country: "UAE", star_rating: 5, price_per_night: 1200, amenities: "Private Beach, Spa, Butler Service, Helipad", image_url: "" },
    { name: "Park Hyatt Tokyo", location: "3-7-1-2 Nishi-Shinjuku", city: "Tokyo", country: "Japan", star_rating: 5, price_per_night: 480, amenities: "Spa, Pool, Restaurant, Bar", image_url: "" },
    { name: "Marina Bay Sands", location: "10 Bayfront Ave", city: "Singapore", country: "Singapore", star_rating: 5, price_per_night: 520, amenities: "Infinity Pool, Casino, Mall, SkyPark", image_url: "" },
    { name: "Pullman Paris Tour Eiffel", location: "18 Avenue De Suffren", city: "Paris", country: "France", star_rating: 4, price_per_night: 310, amenities: "Restaurant, Bar, Gym, Terrace", image_url: "" },
    { name: "InterContinental Sydney", location: "117 Macquarie St", city: "Sydney", country: "Australia", star_rating: 5, price_per_night: 290, amenities: "Harbour Views, Restaurant, Gym, Pool", image_url: "" },
    { name: "Grand Hyatt Hong Kong", location: "1 Harbour Rd", city: "Hong Kong", country: "China", star_rating: 5, price_per_night: 380, amenities: "Pool, Spa, Restaurant, Harbor View", image_url: "" },
    { name: "Kempinski Hotel Frankfurt", location: "Opernplatz 2", city: "Frankfurt", country: "Germany", star_rating: 5, price_per_night: 260, amenities: "Spa, Restaurant, Gym, Business Center", image_url: "" },
    { name: "The Ritz-Carlton Doha", location: "West Bay Lagoon", city: "Doha", country: "Qatar", star_rating: 5, price_per_night: 340, amenities: "Private Beach, Spa, Pool, Fine Dining", image_url: "" },
    { name: "W Atlanta Downtown", location: "45 Ivan Allen Jr Blvd", city: "Atlanta", country: "USA", star_rating: 4, price_per_night: 200, amenities: "Pool, Gym, Bar, Rooftop", image_url: "" },
    { name: "Hotel Okura Amsterdam", location: "Ferdinand Bolstraat 333", city: "Amsterdam", country: "Netherlands", star_rating: 5, price_per_night: 310, amenities: "Spa, Restaurant, Bar, Gym", image_url: "" },
  ];

  const insertAll = db.transaction(() => {
    for (const flight of flights) {
      insertFlight.run(flight);
    }
    for (const hotel of hotels) {
      insertHotel.run(hotel);
    }
  });

  insertAll();

  console.log(`Seeded ${flights.length} flights and ${hotels.length} hotels.`);
}

seed();
