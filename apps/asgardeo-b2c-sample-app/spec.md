# Asgardeo B2C Sample App

This sample app demonstrates Asgardeo B2C (Business-to-Consumer) authentication capabilities.

## Tech stack

- Next.js 15 (App Router)
- Asgardeo Next.js SDK
- better-sqlite3 (SQLite)

## What is this about

**WanderWise** is a consumer-facing travel booking application where individual users can search for flights and hotels, book them instantly, and manage their bookings. Users can also configure price alerts that leverage Asgardeo CIBA (Client Initiated Backchannel Authentication) push notifications, allowing users to approve or deny alert activation from their devices.

## Architecture

The application uses the Asgardeo Next.js SDK for OAuth-based authentication. Protected routes (`/search`, `/bookings`, `/alerts`) are enforced via `asgardeoMiddleware`. API routes use `AsgardeoNext.getInstance()` for server-side session verification and automatic user provisioning from the Asgardeo user profile.

Mock backend APIs serve flight and hotel data from a SQLite database.

### Pages

| Route | Access | Description |
|-------|--------|-------------|
| `/` | Public | Landing page with hero, feature cards, and sign-in CTA |
| `/search` | Protected | Tabbed flight search (table) and hotel search (card grid) with instant booking |
| `/bookings` | Protected | Summary cards, filterable booking list with cancel flow |
| `/alerts` | Protected | CRUD for price alerts with CIBA push notification simulation |

### API routes

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/flights` | GET | Search flights by origin/destination |
| `/api/hotels` | GET | Search hotels by city/country |
| `/api/bookings` | GET, POST, PATCH | List user bookings, create a booking, cancel a booking |
| `/api/alerts` | GET, POST, PATCH, DELETE | CRUD for price alerts, toggle enabled, simulate CIBA push |

### Database schema

- **users** — id, sub, name, email, created_at
- **flights** — id, airline, flight_number, origin, origin_city, destination, destination_city, departure_time, arrival_time, price, stops
- **hotels** — id, name, location, city, country, star_rating, price_per_night, amenities, image_url
- **bookings** — id, user_id, type, item_id, check_in_date, check_out_date, guests, status, total_price, timestamps
- **alerts** — id, user_id, name, type, origin, destination, city, max_price, min_stars, enabled, ciba_status, timestamps

## Setting up the application

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables (copy `.env.example` to `.env` and fill in Asgardeo credentials):
   ```bash
   cp .env.example .env
   ```

3. Run the seed script to initialize and seed the SQLite database:
   ```bash
   npm run seed
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```
