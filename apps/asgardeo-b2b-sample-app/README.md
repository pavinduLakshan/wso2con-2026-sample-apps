# Wayfinder Enterprise

A Next.js starter for an enterprise travel management platform.

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Copy the sample environment file and configure it with your workspace values. Keep `ASGARDEO_CLIENT_SECRET` server-side; do not expose it with a `NEXT_PUBLIC_` prefix.

```bash
cp .env.example .env.local
```

3. Run the app:

```bash
npm run dev
```

4. Open `http://localhost:3000`.

## Onboarding

The `/onboarding` page calls `/api/onboarding` to provision a company workspace and create the submitted user in that workspace. Configure the server-only client values and `ASGARDEO_ONBOARDING_PARENT_ORGANIZATION_ID`, then authorize the application for workspace and user creation scopes shown in `.env.example`.

To verify locally, run:

```bash
npm run build
```
