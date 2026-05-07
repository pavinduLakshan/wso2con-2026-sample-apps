# Asgardeo B2C Sample App

This repository contains a sample B2C travel booking application secured with Asgardeo. It is split into a React + Vite frontend and a Node.js REST API backed by SQLite.

The application demonstrates a travel experience where users can search for flights and hotels, view trip ideas, and use Asgardeo-powered account actions such as sign in, sign up, and sign out.

## Project Structure

```text
asgardeo-b2c-sample-app/
├── frontend/        React + Vite web application
├── api/             Node.js REST API
└── README.md        Project overview
```

## Frontend

The `frontend/` app provides the travel booking UI and integrates with the Asgardeo React SDK.

Main responsibilities:

- Render the flight, hotel, and trip planning experience
- Handle sign in, sign up, and sign out with Asgardeo
- Read Asgardeo configuration from environment variables
- Call the backend API for travel data

See `frontend/README.md` for setup and local run instructions.

## API

The `api/` app provides REST endpoints used by the frontend.

Main responsibilities:

- Serve flight search data
- Serve hotel search data
- Serve saved trip data
- Create sample bookings
- Optionally validate Asgardeo bearer tokens for protected endpoints
- Store seed data in a local SQLite database

API documentation is available in:

```text
api/openapi.yaml
```

See `api/README.md` for setup, database seeding, and local run instructions.

## Local Development

Run the API and frontend in separate terminals.

API:

```bash
cd api
npm install
npm run seed
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Default local URLs:

```text
Frontend: http://localhost:5173
API:      http://localhost:8787
```

## Asgardeo Setup

Create a Single Page Application in Asgardeo for the frontend.

Typical local settings:

```text
Authorized redirect URL: http://localhost:5173
Authorized origin:       http://localhost:5173
```

Configure the frontend environment using the values from your Asgardeo application:

```bash
VITE_ASGARDEO_CLIENT_ID=your-asgardeo-application-client-id
VITE_ASGARDEO_BASE_URL=https://api.asgardeo.io/t/your-organization-name
```

The API can run without token validation for local demos. To require Asgardeo access tokens for protected endpoints, enable the API auth settings in `api/.env`.
