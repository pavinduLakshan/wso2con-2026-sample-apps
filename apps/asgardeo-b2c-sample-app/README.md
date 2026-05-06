# WanderWise — Asgardeo B2C Sample App

A consumer-facing travel booking app demonstrating **Asgardeo B2C (Business-to-Consumer) authentication** with the Asgardeo Next.js SDK. Users can search for flights and hotels, book them instantly, manage bookings, and configure price alerts with CIBA push notification simulation.

**Tech stack:** Next.js 15 (App Router), Asgardeo Next.js SDK, better-sqlite3 (SQLite)

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- An [Asgardeo](https://asgardeo.io/) account

## Asgardeo Configuration

Before running the app, create and configure an OIDC application in the Asgardeo Console:

1. Sign in to [Asgardeo Console](https://console.asgardeo.io/) and select your organization.

2. Go to **Applications** > **New Application** and choose **OIDC Standard-Based Application**.

3. Provide a meaningful name, select **OAuth 2.0 OpenID Connect** as the protocol and click **Create**.

3. Once the application created, under the **Protocol** tab, configure:
   - **Allowed redirect URLs:** add `http://localhost:3000/api/auth/callback/asgardeo`
   - **Allowed origins:** add `http://localhost:3000` (required for sign-out and token refresh)
   - **Allowed grant types:** select the **Code** and **CIBA** grant type.

5. Click **Update** and copy the **Client ID** and **Client Secret**.

## Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configure environment variables:**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and fill in your Asgardeo credentials:

   | Variable | Description |
   |---|---|
   | `NEXT_PUBLIC_ASGARDEO_BASE_URL` | Asgardeo API URL (replace `<org_name>` with your org) |
   | `NEXT_PUBLIC_ASGARDEO_CLIENT_ID` | OIDC client ID from your Asgardeo application |
   | `ASGARDEO_CLIENT_SECRET` | OIDC client secret from your Asgardeo application |
   | `NEXT_PUBLIC_ASGARDEO_SIGN_IN_REDIRECT_URL` | Post-login callback URL |
   | `NEXT_PUBLIC_ASGARDEO_SIGN_OUT_REDIRECT_URL` | Post-logout landing URL |

   On your Asgardeo application, make sure `http://localhost:3000/api/auth/callback/asgardeo` is added as an allowed redirect URL.

3. **Seed the database:**

   ```bash
   npm run seed
   ```

4. **Start the dev server:**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Pages

| Route | Access | Description |
|---|---|---|
| `/` | Public | Landing page with sign-in CTA |
| `/search` | Protected | Search flights (table) and hotels (card grid) with instant booking |
| `/bookings` | Protected | View, filter, and cancel your bookings |
| `/alerts` | Protected | Manage price alerts with CIBA push notification simulation |
