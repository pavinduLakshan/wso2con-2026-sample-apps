# Wayfinder Enterprise AI Agent

This folder contains a WebSocket-based AI agent sample that demonstrates Asgardeo agent authentication with LangChain for the B2B Next.js app.

The agent authenticates with Asgardeo using agent credentials, receives an agent access token, and uses that token to call a protected MCP server. The MCP tools are then exposed to a LangChain ReAct agent backed by Google Gemini, so clients can connect to the `/chat` WebSocket endpoint and let the agent call MCP tools on their behalf.

## What It Demonstrates

- Authenticating an AI agent with Asgardeo
- Requesting an agent token through `@asgardeo/javascript`
- Passing the agent token to an MCP server as a bearer token
- Loading MCP tools with `@langchain/mcp-adapters`
- Serving a `/chat` WebSocket endpoint for enterprise travel conversations

## Local Configuration

Install dependencies:

```bash
cd ai-agent
npm install
```

Create a local environment file from the example:

```bash
cp .env.example .env
```

Then update the values in `.env` for your local setup.

Environment variables:

- `CLIENT_ID`: Client ID of the Asgardeo application used by the agent flow.
- `ASGARDEO_BASE_URL`: Base URL of your Asgardeo organization.
- `REDIRECT_URI`: Redirect URI configured for the Asgardeo application.
- `AGENT_ID`: Agent identifier issued by Asgardeo.
- `AGENT_SECRET`: Agent secret issued by Asgardeo.
- `GOOGLE_API_KEY`: API key used by the Gemini chat model.
- `MODEL_NAME`: Optional Gemini model name. Defaults to `gemini-2.5-flash`.
- `MCP_SERVER_URL`: Optional MCP server endpoint. Defaults to `http://localhost:8001/mcp`.
- `AGENT_PORT`: Optional port for the WebSocket server. Defaults to `8791`.
- `HOST`: Optional host for the WebSocket server. Defaults to `localhost`.
- `INCLUDE_CLIENT_SECRET_IN_AUTHORIZE`: Optional troubleshooting flag. Defaults to `true`.

## Run Locally

Start your MCP server first, then run the agent WebSocket server:

```bash
cd ai-agent
npm run dev
```

The dev command watches `agent.ts` and restarts the agent after code changes. Use `npm start` when you want a non-watching process.

The chat endpoint is available at:

```text
ws://localhost:8791/chat
```

The health endpoint is available at:

```text
http://localhost:8791/health
```

## B2B Tool Flow

The Next.js workspace includes a chat widget that connects to this agent. The agent authenticates with Asgardeo, forwards the agent token to the B2B MCP server, and can use tools for travel policies, organization users, roles, and sample enterprise fares.

## WebSocket Protocol

Connect to `/chat` and send either a plain text message:

```text
Add 45 and 99
```

Or a JSON payload:

```json
{
  "message": "Add 45 and 99"
}
```

The server responds with JSON messages. A successful agent reply has this shape:

```json
{
  "type": "response",
  "message": "144"
}
```

The server can also send:

- `ready`: Sent after the WebSocket connection is established.
- `processing`: Sent after a message is accepted and before the agent response is ready.
- `error`: Sent when the message cannot be processed.

## Notes

- The MCP server must accept `Authorization: Bearer <agent-access-token>`.
- The WebSocket endpoint currently accepts text frames with either plain text or JSON payloads.
- The sample is intended for local demos and development. Do not commit real agent secrets, API keys, or local `.env` files.
