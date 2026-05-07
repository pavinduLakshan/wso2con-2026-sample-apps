# VoyageOps

A Next.js starter for a B2B travel management platform secured with the Asgardeo Next.js SDK.

## Getting Started

Install dependencies:

```bash
npm install
```

Copy the sample environment file and configure it with values from your Asgardeo application:

```bash
cp .env.example .env.local
```

Required values:

```bash
NEXT_PUBLIC_ASGARDEO_BASE_URL=https://api.asgardeo.io/t/<your-organization-name>
NEXT_PUBLIC_ASGARDEO_CLIENT_ID=<your-client-id>
NEXT_PUBLIC_ASGARDEO_CLIENT_SECRET=<your-client-secret>
```

Run the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Asgardeo Integration

- `app/layout.tsx` wraps the app with `AsgardeoProvider`.
- `middleware.ts` protects `/dashboard`, `/bookings`, `/requests`, and `/organization`.
- `app/page.tsx` uses `SignedIn`, `SignedOut`, `SignInButton`, and `SignOutButton`.
- `app/dashboard/page.tsx` renders authenticated user UI and sign-out controls.
