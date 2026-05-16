# Wayfinder Enterprise

A Next.js starter for an enterprise travel management platform. It includes a standalone MCP server and AI agent sample for enterprise travel assistance.

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

## AI Agent

The B2B sample includes an Asgardeo-authenticated AI agent wired into the workspace UI.

- `mcp/`: Exposes B2B app capabilities as MCP tools.
- `ai-agent/`: Authenticates as an Asgardeo agent, loads MCP tools, and serves chat over WebSocket.
- `app/AgentChatWidget.tsx`: Connects the Next.js workspace to the agent at `NEXT_PUBLIC_AGENT_CHAT_URL`.

Run the Next.js app, MCP server, and agent in separate terminals:

```bash
npm run dev
npm run dev:mcp
npm run dev:agent
```

Default local endpoints:

```text
Next.js: http://localhost:3000
MCP:     http://localhost:8001/mcp
Agent:   ws://localhost:8791/chat
```

Configure the MCP server with `mcp/.env`, the agent with `ai-agent/.env`, and the chat URL with `NEXT_PUBLIC_AGENT_CHAT_URL` in `.env.local`.

## Onboarding

The `/onboarding` page calls `/api/onboarding` to provision a company workspace and create the submitted user in that workspace. Configure the server-only client values and `ASGARDEO_ONBOARDING_PARENT_ORGANIZATION_ID`, then authorize the application for workspace and user creation scopes shown in `.env.example`.

To verify locally, run:

```bash
npm run build
```
