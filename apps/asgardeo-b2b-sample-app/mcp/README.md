# Wayfinder Enterprise MCP Server

This server exposes B2B sample app capabilities as MCP tools for the AI agent.

## Tools

- `get_travel_policy`: Reads the active organization travel policy.
- `update_travel_policy`: Updates selected travel policy fields.
- `list_organization_users`: Lists organization users.
- `invite_organization_user`: Invites an employee.
- `list_organization_roles`: Lists roles and user assignments.
- `search_enterprise_flights`: Searches sample enterprise fares and policy status.

## Local Setup

```bash
cd mcp
npm install
cp .env.example .env
npm run dev
```

The default endpoint is:

```text
http://localhost:8001/mcp
```

The AI agent forwards its Asgardeo agent token to this server. The MCP server then forwards that token to protected Next.js API routes.
