# Wayfinder Travel API

REST API for the Wayfinder Travel frontend. It provides sample flight search, hotel search, saved trip, and booking endpoints for the React + Vite application.

## Run Locally

Create a local environment file:

```bash
cd api
cp .env.example .env
```

Start the API:

```bash
npm install
npm run seed
npm run dev
```

The API runs on:

```text
http://localhost:8787
```

## Endpoints

```text
GET  /health
GET  /api/flights?from=Colombo&to=Singapore
POST /api/flights
DELETE /api/flights/:flightId
GET  /api/hotels?location=Singapore
GET  /api/trips
GET  /api/locations?category=flights
POST /api/bookings
GET  /api/bookings/flights
GET  /api/bookings/flights/:bookingId
PATCH /api/bookings/:bookingId/price
PATCH /api/bookings/:bookingId/cancel
POST /api/deal-alert-consents
POST /api/deal-alert-consents/transfer
GET  /api/deal-alert-consents/:username
GET  /api/me
GET  /api/me/profile
PATCH /api/me/profile
```

OpenAPI documentation is available in:

```text
openapi.yaml
```

`POST /api/bookings` accepts:

```json
{
  "type": "flight",
  "itemId": "flight-cmb-sin-01",
  "travelers": 2
}
```

`POST /api/flights` inserts a flight, checks enabled better-deal alert consents, and calls the configured agent webhook when criteria match:

```json
{
  "from": "Colombo",
  "to": "Singapore",
  "airline": "Serendib Air",
  "departureTime": "10:20",
  "arrivalTime": "16:30",
  "duration": "4h 10m",
  "stops": 0,
  "price": 250,
  "currency": "USD",
  "cabin": "Economy",
  "dates": "Jun 12 - Jun 18",
  "tags": ["Better deal"]
}
```

## Asgardeo API Protection

By default, `API_REQUIRE_AUTH=false` so the frontend can call the sample API during local demos.
When auth is disabled but a request includes an Asgardeo bearer token, the API uses the token claims for booking ownership instead of the local demo user.

To require Asgardeo access tokens for protected endpoints:

```bash
API_REQUIRE_AUTH=true
ASGARDEO_BASE_URL=https://api.asgardeo.io/t/your-organization-name
ASGARDEO_AUDIENCE=your-asgardeo-application-client-id
```

When enabled, protected routes require:

```text
Authorization: Bearer <asgardeo-access-token>
```

Protected endpoints:

```text
POST /api/bookings
GET  /api/bookings/flights
GET  /api/me
GET  /api/me/profile
PATCH /api/me/profile
PATCH /api/bookings/:bookingId/price
PATCH /api/bookings/:bookingId/cancel
```
