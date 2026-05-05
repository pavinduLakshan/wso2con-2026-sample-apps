# Asgardeo B2B Sample App

This sample app demonstrates Asgardeo B2B capabilities.

## Tech stack

- Next.js 15 (App Router)
- @asgardeo/nextjs SDK (v0.3.x)
- SQLite (better-sqlite3)
- TypeScript
- No external CSS framework (custom CSS in globals.css)

## What is this about

TravelDesk is a demo booking application, similar to Skyscanner, that allows organizations to register their employees so that employees can search for flights and hotels, submit travel arrangement requests, and organization administrators can approve or reject them through their admin dashboard.

## Architecture

The application is developed using Next.js App Router and uses the `@asgardeo/nextjs` SDK to implement B2B authentication capabilities. The SDK provides:

- `AsgardeoProvider` in the root layout for server-side session management and OAuth redirect flows.
- `asgardeoMiddleware` to protect routes (`/employee/*`, `/admin/*`) by redirecting unauthenticated users to the Asgardeo sign-in page.
- Client-side components (`SignInButton`, `SignOutButton`, `SignedIn`, `SignedOut`) from the SDK for the UI.

## Pages

### `/` — Landing Page
Public page. Shows a hero section with sign-in CTA. When signed in, redirects to the employee dashboard. Displays cards explaining the three-step flow: organization onboarding, search & request, and admin approval.

### `/employee` — Employee Dashboard
Protected route. Employees can:
- Search flights by origin and destination (city name or airport code).
- Search hotels by city.
- Submit a travel request for a flight or hotel (creates a record with status "pending").
- View success/failure messages after submission.

### `/employee/requests` — My Requests
Protected route. Lists all travel requests for the signed-in employee in a table with columns: ID, type, item ID, dates, status, admin notes, and creation date.

### `/admin` — Admin Dashboard
Protected route. Administrators see:
- Summary cards showing total, pending, and approved request counts.
- Filterable table of all travel requests across all employees.
- Ability to approve or reject pending requests with optional admin notes.
- Read-only view of already-processed requests.

## API Routes

### `GET /api/flights?origin=&destination=`
Returns flights filtered by origin and/or destination. Both parameters support partial matching against airport codes and city names. Seeds 12 flights across 6 airlines.

### `GET /api/hotels?city=&country=`
Returns hotels filtered by city and/or country. Returns 12 hotels across 11 cities.

### `GET /api/travel-requests`
Returns travel requests for the authenticated user (employees see their own, admins see all). Includes user name and email via a JOIN on the users table.

### `POST /api/travel-requests`
Creates a new travel request. Required body: `{ type: "flight" | "hotel", item_id: number, check_in_date?: string, check_out_date?: string }`. Auto-creates a user record on first request using Asgardeo profile data.

### `PATCH /api/travel-requests/[id]`
Admin-only. Updates status to "approved" or "rejected" with optional admin notes.

## Database

SQLite database (`data.db`) with the following tables:

| Table | Columns |
|-------|---------|
| `organizations` | id, name, created_at |
| `users` | id, sub, name, email, organization_id, role (employee/admin), created_at |
| `flights` | id, airline, flight_number, origin, origin_city, destination, destination_city, departure_time, arrival_time, price, stops |
| `hotels` | id, name, location, city, country, star_rating, price_per_night, amenities, image_url |
| `travel_requests` | id, user_id, type (flight/hotel), item_id, check_in_date, check_out_date, status (pending/approved/rejected), admin_notes, created_at, updated_at |

## Authentication Flow

1. User visits a protected page (`/employee` or `/admin`).
2. The `asgardeoMiddleware` detects no valid session and redirects to Asgardeo sign-in.
3. After successful sign-in, Asgardeo redirects back to `afterSignInUrl` (`/api/auth/callback/asgardeo`).
4. The `AsgardeoProvider` processes the OAuth callback, creates a session, and redirects to the originally requested page.
5. On subsequent requests, the middleware refreshes the access token automatically.
6. Sign-out clears the session and redirects to `afterSignOutUrl` (`/`).

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_ASGARDEO_BASE_URL` | Asgardeo tenant base URL (e.g. `https://api.asgardeo.io/t/<org_name>`) |
| `NEXT_PUBLIC_ASGARDEO_CLIENT_ID` | OAuth client ID from Asgardeo application |
| `NEXT_PUBLIC_ASGARDEO_SIGN_IN_REDIRECT_URL` | Post-sign-in redirect URL |
| `NEXT_PUBLIC_ASGARDEO_SIGN_OUT_REDIRECT_URL` | Post-sign-out redirect URL |
| `ASGARDEO_CLIENT_SECRET` | OAuth client secret (server-side only) |

## Setting up the application

1. Copy `.env.example` to `.env` and fill in your Asgardeo credentials.
2. Run the seed script to initialize and seed the SQLite database:
   ```
   npm run seed
   ```
3. Start the development server:
   ```
   npm run dev
   ```
4. Open `http://localhost:3000` and sign in with your Asgardeo credentials.
