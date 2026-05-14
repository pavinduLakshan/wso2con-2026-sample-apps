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

import { createServer } from "node:http";
import { createHash } from "node:crypto";
import type { Duplex } from "node:stream";

import { AsgardeoJavaScriptClient } from "@asgardeo/javascript";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

dotenv.config({
    path: resolve(__dirname, ".env"),
});

const asgardeoConfig = {
    afterSignInUrl: process.env.REDIRECT_URI || "",
    clientId: process.env.CLIENT_ID || "",
    clientSecret: process.env.CLIENT_SECRET || "",
    baseUrl: process.env.ASGARDEO_BASE_URL || "",
};

const agentConfig = {
    agentID: process.env.AGENT_ID || "",
    agentSecret: process.env.AGENT_SECRET || "",
};

const model = new ChatGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_API_KEY || "",
    model: process.env.MODEL_NAME || "gemini-2.5-flash",
});

const agentPrompt = [
    "You are Wayfinder's travel assistant.",
    "When a user asks to store offline better-deal alert consent for a flight booking, call store_deal_alert_consent with the exact bookingId, username, routeFrom, routeTo, and enabled values supplied by the user message.",
    "When the user message is exactly DEAL <username> or asks to test a deal for a username, call the available better-deal CIBA tool with that username. Do not invent a username.",
    "After storing consent or applying a better deal, summarize the result briefly.",
    "Never show booking IDs, auth request IDs, access tokens, raw JSON, or other technical identifiers to the user.",
].join("\n");

type ChatMessage = {
    role: "user" | "assistant" | "system";
    content: string;
};

type ChatRequest = {
    message?: unknown;
    messages?: unknown;
};

type WebSocketFrame = {
    opcode: number;
    payload: Buffer<ArrayBufferLike>;
};

const WEB_SOCKET_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
const JSON_SCHEMA_TYPE_VALUES = new Set(["string", "number", "integer", "boolean", "array", "object"]);

type JsonSchemaObject = {
    [key: string]: unknown;
};

type ToolWithSchema = {
    name?: string;
    schema?: unknown;
    invoke?: (input: Record<string, unknown>) => Promise<unknown> | unknown;
};

function isToolNamed(tool: ToolWithSchema, name: string) {
    return tool.name === name || Boolean(tool.name?.endsWith(`_${name}`));
}

function isJsonSchemaObject(value: unknown): value is JsonSchemaObject {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getGeminiSchemaType(schema: JsonSchemaObject): string | undefined {
    const type = schema.type;

    if (typeof type === "string" && JSON_SCHEMA_TYPE_VALUES.has(type)) {
        return type;
    }

    if (Array.isArray(type)) {
        const nullable = type.includes("null");
        const schemaType = type.find((candidate): candidate is string => (
            typeof candidate === "string" &&
            candidate !== "null" &&
            JSON_SCHEMA_TYPE_VALUES.has(candidate)
        ));

        if (schemaType) {
            if (nullable && schema.nullable === undefined) {
                schema.nullable = true;
            }

            return schemaType;
        }
    }

    if (isJsonSchemaObject(schema.properties)) {
        return "object";
    }

    if (isJsonSchemaObject(schema.items)) {
        return "array";
    }

    if (Array.isArray(schema.enum)) {
        return "string";
    }

    return undefined;
}

function sanitizeGeminiSchema(schema: unknown): unknown {
    if (!isJsonSchemaObject(schema)) {
        return schema;
    }

    const type = getGeminiSchemaType(schema);
    const sanitized: JsonSchemaObject = {};

    if (type) {
        sanitized.type = type;
    }

    if (typeof schema.description === "string") {
        sanitized.description = schema.description;
    }

    if (typeof schema.nullable === "boolean") {
        sanitized.nullable = schema.nullable;
    }

    if (type === "string" && typeof schema.format === "string") {
        sanitized.format = schema.format;
    }

    if (type === "string" && Array.isArray(schema.enum)) {
        sanitized.enum = schema.enum.filter((value): value is string => typeof value === "string");
        sanitized.format = "enum";
    }

    if ((type === "number" || type === "integer") && typeof schema.format === "string") {
        sanitized.format = schema.format;
    }

    if (type === "array") {
        sanitized.items = sanitizeGeminiSchema(schema.items);

        if (typeof schema.minItems === "number") {
            sanitized.minItems = schema.minItems;
        }

        if (typeof schema.maxItems === "number") {
            sanitized.maxItems = schema.maxItems;
        }
    }

    if (type === "object") {
        const properties: JsonSchemaObject = {};

        if (isJsonSchemaObject(schema.properties)) {
            for (const [propertyName, propertySchema] of Object.entries(schema.properties)) {
                properties[propertyName] = sanitizeGeminiSchema(propertySchema);
            }
        }

        sanitized.properties = properties;

        if (Array.isArray(schema.required)) {
            sanitized.required = schema.required.filter((propertyName): propertyName is string => (
                typeof propertyName === "string" &&
                Object.hasOwn(properties, propertyName)
            ));
        }
    }

    return sanitized;
}

function sanitizeToolSchemasForGemini<T extends ToolWithSchema>(tools: T[]): T[] {
    return tools.map((tool) => {
        if (tool.schema) {
            tool.schema = sanitizeGeminiSchema(tool.schema);
        }

        return tool;
    });
}

function parseChatRequest(payload: string): ChatMessage[] {

    try {
        const request = JSON.parse(payload) as ChatRequest;

        if (typeof request.message === "string" && request.message.trim()) {
            return [{ role: "user", content: request.message }];
        }

        if (Array.isArray(request.messages)) {
            const messages = request.messages.filter((message): message is ChatMessage => {
                if (typeof message !== "object" || message === null) {
                    return false;
                }

                const candidate = message as Partial<ChatMessage>;

                return (
                    typeof candidate.content === "string" &&
                    ["user", "assistant", "system"].includes(candidate.role || "")
                );
            });

            if (messages.length > 0) {
                return messages;
            }
        }
    } catch {
        if (payload.trim()) {
            return [{ role: "user", content: payload }];
        }
    }

    throw new Error("Send a non-empty text message or JSON payload with a `message` field.");
}

function getResponseContent(content: unknown): string {
    if (typeof content === "string") {
        return content;
    }

    return JSON.stringify(content);
}

function getToolResponseContent(result: unknown): string {
    if (typeof result === "string") {
        return result;
    }

    if (isJsonSchemaObject(result) && Array.isArray(result.content)) {
        const textParts = result.content
            .filter((item): item is { text: string } => (
                isJsonSchemaObject(item) &&
                typeof item.text === "string"
            ))
            .map((item) => item.text);

        if (textParts.length > 0) {
            return textParts.join("\n");
        }
    }

    return JSON.stringify(result);
}

function getToolText(result: unknown): string {
    return getToolResponseContent(result);
}

function parseToolJson(result: unknown): unknown {
    const text = getToolText(result);

    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

function formatBetterDealResponse(result: unknown): string {
    const parsed = parseToolJson(result);
    const data = isJsonSchemaObject(parsed) && isJsonSchemaObject(parsed.data) ? parsed.data : {};
    const previousPrice = typeof data.previousPrice === "number" ? data.previousPrice : null;
    const newPrice = typeof data.newPrice === "number" ? data.newPrice : null;

    if (previousPrice !== null && newPrice !== null) {
        return `Good news. The better-deal consent was approved, and your booking price was updated from $${previousPrice} to $${newPrice}.`;
    }

    return "Good news. The better-deal consent was approved, and your booking price has been updated.";
}

async function runHardcodedDealCommand(message: string, tools: ToolWithSchema[]) {
    const dealMatch = message.trim().match(/^DEAL\s+(.+)$/i);

    if (!dealMatch) {
        return null;
    }

    const username = dealMatch[1].trim();
    const dealTool = tools.find((tool) => isToolNamed(tool, "invoke_ciba_better_deal"));

    if (!dealTool?.invoke) {
        const availableTools = tools
            .map((tool) => tool.name)
            .filter(Boolean)
            .join(", ");

        throw new Error(`invoke_ciba_better_deal tool is not available. Loaded tools: ${availableTools || "none"}.`);
    }

    console.log(`Matched hardcoded DEAL command for username: ${username}`);

    return formatBetterDealResponse(await dealTool.invoke({ username }));
}

async function runHardcodedConsentCommand(message: string, tools: ToolWithSchema[]) {
    if (!message.includes("Store offline better-deal alert consent")) {
        return null;
    }

    const values = Object.fromEntries(
        message
            .split("\n")
            .map((line) => line.match(/^([A-Za-z]+):\s*(.+)$/))
            .filter((match): match is RegExpMatchArray => Boolean(match))
            .map((match) => [match[1], match[2].trim()])
    );
    const consentTool = tools.find((tool) => isToolNamed(tool, "store_deal_alert_consent"));

    if (!consentTool?.invoke) {
        const availableTools = tools
            .map((tool) => tool.name)
            .filter(Boolean)
            .join(", ");

        throw new Error(`store_deal_alert_consent tool is not available. Loaded tools: ${availableTools || "none"}.`);
    }

    const enabled = values.enabled === "true";

    await consentTool.invoke({
        bookingId: values.bookingId,
        username: values.username,
        routeFrom: values.routeFrom,
        routeTo: values.routeTo,
        enabled,
    });

    return enabled
        ? `Great, I will watch for better deals on ${values.routeFrom} to ${values.routeTo} and ask for your consent before applying any update.`
        : "No problem. I will not send better-deal alerts for this booking.";
}

function createWebSocketAcceptKey(key: string): string {
    return createHash("sha1")
        .update(`${key}${WEB_SOCKET_GUID}`)
        .digest("base64");
}

function encodeWebSocketFrame(payload: string, opcode = 0x1): Buffer {
    const payloadBuffer = Buffer.from(payload);
    const payloadLength = payloadBuffer.length;

    if (payloadLength <= 125) {
        return Buffer.concat([
            Buffer.from([0x80 | opcode, payloadLength]),
            payloadBuffer,
        ]);
    }

    if (payloadLength <= 65535) {
        const header = Buffer.alloc(4);
        header[0] = 0x80 | opcode;
        header[1] = 126;
        header.writeUInt16BE(payloadLength, 2);

        return Buffer.concat([header, payloadBuffer]);
    }

    const header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(payloadLength), 2);

    return Buffer.concat([header, payloadBuffer]);
}

function parseWebSocketFrame(
    buffer: Buffer<ArrayBufferLike>
): { frame: WebSocketFrame; remaining: Buffer<ArrayBufferLike> } | null {
    if (buffer.length < 2) {
        return null;
    }

    const opcode = buffer[0] & 0x0f;
    const isMasked = (buffer[1] & 0x80) === 0x80;
    let payloadLength = buffer[1] & 0x7f;
    let offset = 2;

    if (payloadLength === 126) {
        if (buffer.length < offset + 2) {
            return null;
        }

        payloadLength = buffer.readUInt16BE(offset);
        offset += 2;
    } else if (payloadLength === 127) {
        if (buffer.length < offset + 8) {
            return null;
        }

        const extendedPayloadLength = buffer.readBigUInt64BE(offset);

        if (extendedPayloadLength > BigInt(Number.MAX_SAFE_INTEGER)) {
            throw new Error("WebSocket message is too large.");
        }

        payloadLength = Number(extendedPayloadLength);
        offset += 8;
    }

    const maskOffset = offset;

    if (isMasked) {
        offset += 4;
    }

    if (buffer.length < offset + payloadLength) {
        return null;
    }

    const payload = Buffer.from(buffer.subarray(offset, offset + payloadLength));

    if (isMasked) {
        const mask = buffer.subarray(maskOffset, maskOffset + 4);

        for (let index = 0; index < payload.length; index += 1) {
            payload[index] = payload[index] ^ mask[index % 4];
        }
    }

    return {
        frame: { opcode, payload },
        remaining: buffer.subarray(offset + payloadLength),
    };
}

function isSocketWritable(socket: Duplex) {
    return !socket.destroyed && !socket.writableEnded;
}

function writeFrame(socket: Duplex, frame: Buffer) {
    if (!isSocketWritable(socket)) {
        return false;
    }

    try {
        socket.write(frame);

        return true;
    } catch (error) {
        console.warn("Unable to write WebSocket frame:", error instanceof Error ? error.message : error);

        return false;
    }
}

function sendJson(socket: Duplex, payload: Record<string, unknown>) {
    return writeFrame(socket, encodeWebSocketFrame(JSON.stringify(payload)));
}

function closeWebSocket(socket: Duplex) {
    if (isSocketWritable(socket)) {
        try {
            socket.end(encodeWebSocketFrame("", 0x8));
        } catch {
            socket.destroy();
        }
    }
}

function redactSecret(value: string) {
    if (!value) {
        return "";
    }

    if (value.length <= 6) {
        return "***";
    }

    return `${value.slice(0, 3)}***${value.slice(-3)}`;
}

function includeClientSecretInAgentAuthorizeRequest(client: AsgardeoJavaScriptClient) {
    if (!asgardeoConfig.clientSecret) {
        return;
    }

    const sdkClient = client as unknown as {
        auth?: {
            getSignInUrl?: (requestConfig?: Record<string, unknown>, userId?: string) => Promise<string>;
        };
    };
    const getSignInUrl = sdkClient.auth?.getSignInUrl?.bind(sdkClient.auth);

    if (!getSignInUrl || !sdkClient.auth) {
        return;
    }

    sdkClient.auth.getSignInUrl = async (requestConfig = {}, userId?: string) => {
        const signInUrl = await getSignInUrl({
            ...requestConfig,
            client_secret: requestConfig.client_secret ?? "__include_client_secret__",
        }, userId);
        const signInUrlParams = new URL(signInUrl).searchParams;

        console.log("Agent authorize URL includes client_secret:", signInUrlParams.has("client_secret"));

        return signInUrl;
    };
}

async function createAgent() {
    console.log("##########################################################################################################");
    console.log("##      This is an Agent Authentication Flow sample application for authenticating AI agents            ##");
    console.log("##                         using Asgardeo and LangChain framework                                       ##");
    console.log("##########################################################################################################");

    const asgardeoJavaScriptClient = new AsgardeoJavaScriptClient(asgardeoConfig);
    includeClientSecretInAgentAuthorizeRequest(asgardeoJavaScriptClient);
    console.log("Agent auth config:", {
        clientId: asgardeoConfig.clientId,
        clientSecret: asgardeoConfig.clientSecret,
        baseUrl: asgardeoConfig.baseUrl,
        redirectUri: asgardeoConfig.afterSignInUrl,
        agentID: agentConfig.agentID,
        agentSecret: redactSecret(agentConfig.agentSecret),
    });
    const agentToken = await asgardeoJavaScriptClient.getAgentToken(agentConfig);

    const client = new MultiServerMCPClient({
        travel: {
            transport: "http",
            url: process.env.MCP_SERVER_URL || "http://localhost:8000/mcp",
            headers: {
                Authorization: `Bearer ${agentToken.accessToken}`,
            },
        },
    });

    const tools = sanitizeToolSchemasForGemini(await client.getTools());
    console.log(`Loaded MCP tools: ${tools.map((tool) => tool.name).filter(Boolean).join(", ")}`);

    const agent = createReactAgent({
        llm: model,
        tools: tools,
        prompt: agentPrompt,
    });

    return { agent, client, tools };
}

async function runAgentServer() {
    const { agent, client, tools } = await createAgent();
    const port = Number(process.env.PORT || process.env.AGENT_PORT || 8790);
    const host = process.env.HOST || "localhost";

    const server = createServer((request, response) => {
        if (request.url === "/health") {
            response.writeHead(200, { "Content-Type": "application/json" });
            response.end(JSON.stringify({
                status: "ok",
                features: {
                    hardcodedDealCommand: true,
                    cibaTool: tools.some((tool) => isToolNamed(tool, "invoke_ciba_better_deal")),
                },
            }));

            return;
        }

        response.writeHead(404, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ error: "Not found" }));
    });

    const handleConnection = (socket: Duplex) => {
        let isClosed = false;

        socket.on("close", () => {
            isClosed = true;
        });

        socket.on("end", () => {
            isClosed = true;
        });

        socket.on("error", (error) => {
            isClosed = true;
            console.warn("WebSocket client disconnected:", error.message);
        });

        sendJson(socket, {
            type: "ready",
            message: "Connected to the Asgardeo AI agent.",
        });

        let queue = Promise.resolve();
        let buffer: Buffer<ArrayBufferLike> = Buffer.alloc(0);

        socket.on("data", (data) => {
            buffer = Buffer.concat([buffer, data]);

            try {
                let parsed = parseWebSocketFrame(buffer);

                while (parsed) {
                    buffer = parsed.remaining;

                    if (parsed.frame.opcode === 0x8) {
                        closeWebSocket(socket);

                        return;
                    }

                    if (parsed.frame.opcode === 0x9) {
                        writeFrame(socket, encodeWebSocketFrame(parsed.frame.payload.toString(), 0xA));
                    }

                    if (parsed.frame.opcode === 0x1) {
                        const payload = parsed.frame.payload.toString("utf8");

                        queue = queue.then(async () => {
                            if (isClosed) {
                                return;
                            }

                            const messages = parseChatRequest(payload);
                            const latestMessage = messages[messages.length - 1]?.content || "";

                            if (!sendJson(socket, { type: "processing" })) {
                                isClosed = true;
                                return;
                            }

                            const hardcodedResponse =
                                await runHardcodedConsentCommand(latestMessage, tools) ??
                                await runHardcodedDealCommand(latestMessage, tools);
                            const responseMessage = hardcodedResponse ?? getResponseContent(
                                (await agent.invoke({ messages })).messages.at(-1)?.content
                            );

                            if (isClosed) {
                                return;
                            }

                            sendJson(socket, {
                                type: "response",
                                message: responseMessage,
                            });
                        }).catch((error: unknown) => {
                            if (isClosed) {
                                return;
                            }

                            console.error("Error handling chat message:", error);
                            sendJson(socket, {
                                type: "error",
                                message: error instanceof Error ? error.message : "Failed to process chat message.",
                            });
                        });
                    }

                    parsed = parseWebSocketFrame(buffer);
                }
            } catch (error) {
                console.error("Error parsing WebSocket frame:", error);
                sendJson(socket, {
                    type: "error",
                    message: error instanceof Error ? error.message : "Invalid WebSocket message.",
                });
                closeWebSocket(socket);
            }
        });
    };

    server.on("upgrade", (request, socket, head) => {
        socket.on("error", (error) => {
            console.warn("WebSocket upgrade socket error:", error.message);
        });

        try {
            const url = new URL(request.url || "", `http://${request.headers.host || host}`);
            const key = request.headers["sec-websocket-key"];

            if (url.pathname !== "/chat" || typeof key !== "string") {
                if (!socket.destroyed && !socket.writableEnded) {
                    socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
                }
                socket.destroy();

                return;
            }

            writeFrame(socket, Buffer.from([
                "HTTP/1.1 101 Switching Protocols",
                "Upgrade: websocket",
                "Connection: Upgrade",
                `Sec-WebSocket-Accept: ${createWebSocketAcceptKey(key)}`,
                "",
                "",
            ].join("\r\n")));

            if (head.length > 0) {
                socket.unshift(head);
            }

            handleConnection(socket);
        } catch (error) {
            console.error("Error upgrading WebSocket connection:", error);
            socket.destroy();
        }
    });

    server.listen(port, host, () => {
        console.log(`AI agent WebSocket server is running at ws://${host}:${port}/chat`);
        console.log(`Health check is available at http://${host}:${port}/health`);
    });

    const shutdown = async () => {
        console.log("Shutting down AI agent server...");
        server.close();
        await client.close();
        process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
}

runAgentServer().catch(console.error);
