/*
Copyright (c) 2026, WSO2 LLC. (http://www.wso2.com). All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvFile(filePath: string) {
    if (!existsSync(filePath)) {
        return;
    }

    const lines = readFileSync(filePath, "utf8").split(/\r?\n/);

    for (const line of lines) {
        const trimmedLine = line.trim();

        if (!trimmedLine || trimmedLine.startsWith("#")) {
            continue;
        }

        const separatorIndex = trimmedLine.indexOf("=");

        if (separatorIndex <= 0) {
            continue;
        }

        const key = trimmedLine.slice(0, separatorIndex).trim();
        const rawValue = trimmedLine.slice(separatorIndex + 1).trim();
        const value = rawValue.replace(/^\s*["']|["']\s*$/g, "");

        if (key && process.env[key] === undefined) {
            process.env[key] = value;
        }
    }
}

loadEnvFile(resolve(__dirname, ".env"));

const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:8787";
const port = Number(process.env.PORT || process.env.MCP_PORT || 8000);
const host = process.env.HOST || "localhost";
const cibaGrantType = "urn:openid:params:grant-type:ciba";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function getAuthorizationHeader(request: IncomingMessage): string | undefined {
    const authorization = request.headers.authorization;

    return Array.isArray(authorization) ? authorization[0] : authorization;
}

function createApiClient(authorization?: string) {
    async function requestApi(path: string, options: RequestInit = {}): Promise<JsonValue> {
        const headers = new Headers(options.headers);

        headers.set("Accept", "application/json");

        if (options.body && !headers.has("Content-Type")) {
            headers.set("Content-Type", "application/json");
        }

        if (authorization) {
            headers.set("Authorization", authorization);
        }

        const response = await fetch(`${apiBaseUrl}${path}`, {
            ...options,
            headers,
        });

        const contentType = response.headers.get("content-type") || "";
        const body = contentType.includes("application/json")
            ? await response.json()
            : await response.text();

        if (!response.ok) {
            throw new Error(`API request failed with ${response.status}: ${JSON.stringify(body)}`);
        }

        return body as JsonValue;
    }

    return {
        get: (path: string) => requestApi(path),
        post: (path: string, body: JsonValue) => requestApi(path, {
            method: "POST",
            body: JSON.stringify(body),
        }),
        patch: (path: string, body: JsonValue, bearerToken?: string) => {
            const headers = bearerToken ? { Authorization: `Bearer ${bearerToken}` } : undefined;

            return requestApi(path, {
                method: "PATCH",
                headers,
                body: JSON.stringify(body),
            });
        },
    };
}

function toToolContent(data: JsonValue) {
    return {
        content: [
            {
                type: "text" as const,
                text: typeof data === "string" ? data : JSON.stringify(data, null, 2),
            },
        ],
    };
}

function getRequiredEnv(name: string) {
    const value = process.env[name]?.trim();

    if (!value) {
        throw new Error(`${name} is required for the CIBA better-deal tool. Add ASGARDEO_BASE_URL, CIBA_CLIENT_ID, and CIBA_CLIENT_SECRET to apps/common/mcp/.env, then restart the MCP server.`);
    }

    return value;
}

function getBearerToken(authorization?: string) {
    if (!authorization?.startsWith("Bearer ")) {
        return "";
    }

    return authorization.slice("Bearer ".length).trim();
}

function buildCibaAuthorizationHeader() {
    const clientId = getRequiredEnv("CIBA_CLIENT_ID");
    const clientSecret = getRequiredEnv("CIBA_CLIENT_SECRET");
    const encodedCredentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    return `Basic ${encodedCredentials}`;
}

async function postAsgardeoForm(path: string, body: URLSearchParams) {
    const baseUrl = getRequiredEnv("ASGARDEO_BASE_URL").replace(/\/$/, "");
    const response = await fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: {
            Authorization: buildCibaAuthorizationHeader(),
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
        },
        body: body.toString(),
    });
    const data = await response.json().catch(() => ({})) as Record<string, unknown>;

    if (!response.ok) {
        const message = data.error_description || data.error || `Asgardeo request failed with ${response.status}`;

        throw new Error(String(message));
    }

    return data;
}

function delay(milliseconds: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, milliseconds);
    });
}

async function invokeCiba({
    authorization,
    bindingMessage,
    loginHint,
}: {
    authorization?: string;
    bindingMessage: string;
    loginHint: string;
}) {
    const scope = process.env.CIBA_SCOPE?.trim() || "openid profile";
    const cibaBody = new URLSearchParams({
        scope,
        login_hint: loginHint,
        binding_message: bindingMessage,
    });
    const actorToken = getBearerToken(authorization);

    if (actorToken && process.env.CIBA_INCLUDE_ACTOR_TOKEN === "true") {
        cibaBody.set("actor_token", actorToken);
    }

    const cibaResponse = await postAsgardeoForm("/oauth2/ciba", cibaBody);
    const authReqId = typeof cibaResponse.auth_req_id === "string" ? cibaResponse.auth_req_id : "";

    if (!authReqId) {
        throw new Error("Asgardeo CIBA response did not include auth_req_id.");
    }

    const intervalSeconds = Number(cibaResponse.interval || process.env.CIBA_POLL_INTERVAL_SECONDS || 3);
    const expiresInSeconds = Number(cibaResponse.expires_in || 120);
    const timeoutMs = Number(process.env.CIBA_POLL_TIMEOUT_MS || expiresInSeconds * 1000);
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
        await delay(Math.max(intervalSeconds, 1) * 1000);

        const tokenBody = new URLSearchParams({
            grant_type: cibaGrantType,
            auth_req_id: authReqId,
        });

        try {
            const tokenResponse = await postAsgardeoForm("/oauth2/token", tokenBody);
            const accessToken = typeof tokenResponse.access_token === "string" ? tokenResponse.access_token : "";

            if (!accessToken) {
                throw new Error("Asgardeo token response did not include access_token.");
            }

            return {
                accessToken,
                authReqId,
                authUrl: typeof cibaResponse.auth_url === "string" ? cibaResponse.auth_url : undefined,
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);

            if (message.includes("authorization_pending") || message.includes("slow_down")) {
                continue;
            }

            throw error;
        }
    }

    throw new Error("Timed out waiting for the user to approve the CIBA request.");
}

function createTravelMcpServer(authorization?: string) {
    const api = createApiClient(authorization);
    const server = new McpServer({
        name: "wayfinder-travel-api",
        version: "1.0.0",
    });

    server.tool(
        "search_flights",
        "Search available flights from the travel API.",
        {
            from: z.string().optional().describe("Departure location, for example Colombo."),
            to: z.string().optional().describe("Arrival location, for example Singapore."),
        },
        async ({ from, to }) => {
            const params = new URLSearchParams();

            if (from) {
                params.set("from", from);
            }

            if (to) {
                params.set("to", to);
            }

            const query = params.toString();

            return toToolContent(await api.get(`/api/flights${query ? `?${query}` : ""}`));
        },
    );

    server.tool(
        "search_hotels",
        "Search available hotels from the travel API.",
        {
            location: z.string().optional().describe("Hotel location, for example Singapore."),
        },
        async ({ location }) => {
            const params = new URLSearchParams();

            if (location) {
                params.set("location", location);
            }

            const query = params.toString();

            return toToolContent(await api.get(`/api/hotels${query ? `?${query}` : ""}`));
        },
    );

    server.tool(
        "get_trips",
        "Get saved trip ideas from the travel API.",
        {},
        async () => toToolContent(await api.get("/api/trips")),
    );

    server.tool(
        "get_locations",
        "Get available travel locations from the travel API.",
        {
            category: z.enum(["flights", "hotels"]).optional().describe("Optional location category."),
        },
        async ({ category }) => {
            const query = category ? `?${new URLSearchParams({ category }).toString()}` : "";

            return toToolContent(await api.get(`/api/locations${query}`));
        },
    );

    server.tool(
        "create_booking",
        "Create a sample booking in the travel API.",
        {
            type: z.enum(["flight", "hotel"]).describe("Booking type."),
            itemId: z.string().describe("Flight or hotel item ID to book."),
            travelers: z.number().int().optional().describe("Number of travelers."),
        },
        async ({ type, itemId, travelers }) => toToolContent(await api.post("/api/bookings", {
            type,
            itemId,
            travelers: travelers ?? 1,
        })),
    );

    server.tool(
        "get_flight_bookings",
        "Get flight bookings for the current authenticated user.",
        {},
        async () => toToolContent(await api.get("/api/bookings/flights")),
    );

    server.tool(
        "get_profile",
        "Get the current authenticated user's profile from the travel API.",
        {},
        async () => toToolContent(await api.get("/api/me")),
    );

    server.tool(
        "store_deal_alert_consent",
        "Store whether a user consented to offline better-deal alerts for a flight booking.",
        {
            bookingId: z.string().describe("The confirmed flight booking ID."),
            username: z.string().describe("The username on the booking."),
            routeFrom: z.string().describe("Flight origin city."),
            routeTo: z.string().describe("Flight destination city."),
            enabled: z.boolean().describe("true when the user agrees to alerts, false when they decline."),
        },
        async ({ bookingId, username, routeFrom, routeTo, enabled }) => toToolContent(await api.post(
            "/api/deal-alert-consents",
            {
                bookingId,
                username,
                routeFrom,
                routeTo,
                enabled,
            },
        )),
    );

    server.tool(
        "invoke_ciba_better_deal",
        "For test input DEAL <username>, initiate Asgardeo CIBA consent and reduce a consented flight booking price.",
        {
            username: z.string().describe("The username that should receive the CIBA authorization request."),
            bookingId: z.string().optional().describe("Optional booking ID. If omitted, the newest enabled consent is used."),
            discountPercent: z.number().min(1).max(90).optional().describe("Optional discount percent. Defaults to 15."),
        },
        async ({ username, bookingId, discountPercent }) => {
            const consents = await api.get(`/api/deal-alert-consents/${encodeURIComponent(username)}`);
            const consentList = (
                typeof consents === "object" &&
                consents !== null &&
                !Array.isArray(consents) &&
                Array.isArray(consents.data)
            ) ? consents.data as Array<Record<string, JsonValue>> : [];
            const selectedConsent = bookingId
                ? consentList.find((consent) => consent.bookingId === bookingId)
                : consentList[0];

            if (!selectedConsent) {
                throw new Error(`No enabled better-deal alert consent found for ${username}.`);
            }

            const currentPrice = Number(selectedConsent.currentPrice);
            const percent = discountPercent ?? 15;
            const newPrice = Number((currentPrice * (1 - percent / 100)).toFixed(2));
            const routeFrom = String(selectedConsent.routeFrom || "");
            const routeTo = String(selectedConsent.routeTo || "");
            const selectedBookingId = String(selectedConsent.bookingId || "");
            const ciba = await invokeCiba({
                authorization,
                loginHint: username,
                bindingMessage: `Approve a ${percent}% better-deal price update for your ${routeFrom} to ${routeTo} booking.`,
            });
            const updatedBooking = await api.patch(
                `/api/bookings/${encodeURIComponent(selectedBookingId)}/price`,
                {
                    username,
                    price: newPrice,
                },
                ciba.accessToken,
            );

            return toToolContent({
                data: {
                    booking: updatedBooking,
                    ciba: {
                        authReqId: ciba.authReqId,
                        authUrl: ciba.authUrl || null,
                    },
                    previousPrice: currentPrice,
                    newPrice,
                    discountPercent: percent,
                },
            });
        },
    );

    return server;
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
    const chunks: Buffer[] = [];

    for await (const chunk of request) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    if (chunks.length === 0) {
        return undefined;
    }

    const body = Buffer.concat(chunks).toString("utf8");

    return body ? JSON.parse(body) : undefined;
}

function sendJson(response: ServerResponse, statusCode: number, body: JsonValue) {
    response.writeHead(statusCode, { "Content-Type": "application/json" });
    response.end(JSON.stringify(body));
}

const httpServer = createServer(async (request, response) => {
    if (request.url === "/health") {
        sendJson(response, 200, { status: "ok" });

        return;
    }

    if (request.url !== "/mcp") {
        sendJson(response, 404, { error: "Not found" });

        return;
    }

    if (request.method !== "POST") {
        sendJson(response, 405, { error: "Method not allowed" });

        return;
    }

    try {
        const server = createTravelMcpServer(getAuthorizationHeader(request));
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
        });
        const body = await readJsonBody(request);

        response.on("close", () => {
            transport.close();
        });

        await server.connect(transport);
        await transport.handleRequest(request, response, body);
    } catch (error) {
        console.error("Error handling MCP request:", error);

        if (!response.headersSent) {
            sendJson(response, 500, {
                error: error instanceof Error ? error.message : "Failed to handle MCP request.",
            });
        }
    }
});

httpServer.listen(port, host, () => {
    console.log(`Travel MCP server is running at http://${host}:${port}/mcp`);
    console.log(`Health check is available at http://${host}:${port}/health`);
});
