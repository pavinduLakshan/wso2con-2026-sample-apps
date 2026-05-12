# Asgardeo B2C Sample App

This repository contains a sample B2C travel booking application secured with Asgardeo. It is split into a React + Vite frontend, a Node.js REST API backed by SQLite, a TypeScript MCP server, and a WebSocket AI agent sample.

The application demonstrates a travel experience where users can search for flights and hotels, view trip ideas, and use Asgardeo-powered account actions such as sign in, sign up, and sign out. The MCP server wraps the travel REST API as tools. The AI agent sample demonstrates how an agent can authenticate with Asgardeo, receive an agent token, and use that token to call protected MCP tools through LangChain over a `/chat` WebSocket endpoint.

## Project Structure

```text
asgardeo-b2c-sample-app/
├── frontend/        React + Vite web application
├── api/             Node.js REST API
├── mcp/             TypeScript MCP server that wraps the REST API
├── ai-agent/        LangChain WebSocket agent with Asgardeo agent authentication
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

## MCP Server

The `mcp/` app exposes the REST API as MCP tools for the AI agent.

Main responsibilities:

- Wrap flight, hotel, trip, location, booking, and profile endpoints as MCP tools
- Serve MCP requests over Streamable HTTP at `/mcp`
- Forward the incoming `Authorization` header to the REST API
- Provide a local health endpoint

See `mcp/README.md` for setup, tools, and local run instructions.

## AI Agent

The `ai-agent/` app provides a local WebSocket sample for authenticating AI agents with Asgardeo.

Main responsibilities:

- Request an Asgardeo agent token using agent credentials
- Connect to an MCP server with the agent token as a bearer token
- Load MCP tools into a LangChain ReAct agent
- Use Google Gemini as the chat model
- Serve chat requests over `ws://localhost:8790/chat`

See `ai-agent/README.md` for setup, environment variables, and local run instructions.

## Local Development

Run the API, frontend, and AI agent in separate terminals as needed.

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

MCP server:

```bash
cd mcp
npm install
npm start
```

AI agent:

```bash
cd ai-agent
npm install
npm start
```

Default local URLs:

```text
Frontend: http://localhost:5173
API:      http://localhost:8787
MCP:      http://localhost:8000/mcp
Agent:    ws://localhost:8790/chat
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
VITE_ASGARDEO_ORG_NAME=your-organization-name
VITE_ASGARDEO_BASE_URL=https://api.asgardeo.io/t/your-organization-name
```

The API can run without token validation for local demos. To require Asgardeo access tokens for protected endpoints, enable the API auth settings in `api/.env`.

For the AI agent, configure the Asgardeo application details, agent credentials, Gemini API key, and MCP server URL in the `.env` file described in `ai-agent/README.md`.
