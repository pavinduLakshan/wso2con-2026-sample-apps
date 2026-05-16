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

import { createServer, type ServerResponse } from "node:http";
import { createHash, randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
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

type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
    fatal: 50,
};

type LogContext = Record<string, unknown>;

function normalizeLogLevel(value: string | undefined): LogLevel {
    return value === "debug" || value === "info" || value === "warn" || value === "error" || value === "fatal"
        ? value
        : "info";
}

function redactLogValue(key: string, value: unknown): unknown {
    if (
        key.toLowerCase().includes("authorization") ||
        key.toLowerCase().includes("token") ||
        key.toLowerCase().includes("secret")
    ) {
        return "[redacted]";
    }

    if (value instanceof Error) {
        return summarizeError(value);
    }

    return value;
}

function formatLogContext(context: LogContext) {
    const entries = Object.entries(context)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => {
            const redactedValue = redactLogValue(key, value);
            const formattedValue = typeof redactedValue === "string"
                ? redactedValue.replace(/\s+/g, " ")
                : JSON.stringify(redactedValue);

            return `${key}=${formattedValue}`;
        });

    return entries.length > 0 ? ` ${entries.join(" ")}` : "";
}

function createLogger(context: LogContext = {}) {
    const configuredLevel = normalizeLogLevel(process.env.LOG_LEVEL);

    function write(level: LogLevel, first: string | LogContext, second?: string) {
        if (LOG_LEVEL_ORDER[level] < LOG_LEVEL_ORDER[configuredLevel]) {
            return;
        }

        const message = typeof first === "string" ? first : second || "";
        const childContext = typeof first === "string" ? {} : first;
        const timestamp = new Date().toISOString();
        const contextText = formatLogContext({ ...context, ...childContext });
        const line = `${timestamp} ${level.toUpperCase()} ${message}${contextText}`;

        if (level === "warn") {
            console.warn(line);
        } else if (level === "error" || level === "fatal") {
            console.error(line);
        } else {
            console.log(line);
        }
    }

    return {
        child: (childContext: LogContext) => createLogger({ ...context, ...childContext }),
        debug: (first: string | LogContext, second?: string) => write("debug", first, second),
        info: (first: string | LogContext, second?: string) => write("info", first, second),
        warn: (first: string | LogContext, second?: string) => write("warn", first, second),
        error: (first: string | LogContext, second?: string) => write("error", first, second),
        fatal: (first: string | LogContext, second?: string) => write("fatal", first, second),
    };
}

const logger = createLogger();

function summarizeError(error: Error) {
    const errorLike = error as Error & {
        code?: string;
        statusCode?: number;
        statusText?: string;
    };
    const collapsedMessage = error.message.replace(/\s+/g, " ");
    const truncatedMessage = collapsedMessage.length > 500
        ? `${collapsedMessage.slice(0, 500)}...`
        : collapsedMessage;

    return [
        error.name,
        errorLike.code,
        errorLike.statusCode ? `status=${errorLike.statusCode}` : "",
        errorLike.statusText,
        truncatedMessage,
    ].filter(Boolean).join(" ");
}

function getEnv(name: string) {
    return process.env[name]?.trim() || "";
}

const asgardeoConfig = {
    afterSignInUrl: getEnv("REDIRECT_URI"),
    clientId: getEnv("CLIENT_ID"),
    clientSecret: getEnv("CLIENT_SECRET"),
    baseUrl: getEnv("ASGARDEO_BASE_URL").replace(/\/$/, ""),
};

const agentConfig = {
    agentID: getEnv("AGENT_ID"),
    agentSecret: getEnv("AGENT_SECRET"),
};

const model = new ChatGoogleGenerativeAI({
    apiKey: getEnv("GOOGLE_API_KEY"),
    model: getEnv("MODEL_NAME") || "gemini-2.5-flash",
});

const agentPrompt = [
    "You are Wayfinder Enterprise's AI assistant for business travel administrators and employees.",
    "Help users understand travel policies, organization users and roles, and compliant flight options by using the available MCP tools.",
    "When a user asks to update a travel policy, call update_travel_policy with only the fields the user clearly asked to change.",
    "When a user asks to invite an employee, call invite_organization_user only when an email address is provided.",
    "Keep answers concise and business-focused.",
    "Never show auth request IDs, access tokens, raw JSON, or other technical identifiers to the user.",
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
        logger.warn({ err: error }, "Unable to write WebSocket frame");

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
    if (getEnv("INCLUDE_CLIENT_SECRET_IN_AUTHORIZE") === "false") {
        logger.warn("Skipping client_secret injection for the agent authorize request");

        return;
    }

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

        return signInUrl;
    };
}

function validateAgentConfiguration() {
    const requiredValues = {
        ASGARDEO_BASE_URL: asgardeoConfig.baseUrl,
        CLIENT_ID: asgardeoConfig.clientId,
        CLIENT_SECRET: asgardeoConfig.clientSecret,
        REDIRECT_URI: asgardeoConfig.afterSignInUrl,
        AGENT_ID: agentConfig.agentID,
        AGENT_SECRET: agentConfig.agentSecret,
        GOOGLE_API_KEY: getEnv("GOOGLE_API_KEY"),
    };
    const missingValues = Object.entries(requiredValues)
        .filter(([, value]) => !value)
        .map(([name]) => name);

    if (missingValues.length > 0) {
        throw new Error(`Missing required AI agent environment values: ${missingValues.join(", ")}`);
    }

    if (asgardeoConfig.baseUrl.includes("<") || asgardeoConfig.baseUrl.includes(">")) {
        throw new Error("ASGARDEO_BASE_URL still contains a placeholder value.");
    }

    try {
        new URL(asgardeoConfig.afterSignInUrl);
    } catch {
        throw new Error("REDIRECT_URI must be an absolute URL, for example http://localhost:8791.");
    }
}

function writeHttpJson(response: ServerResponse, statusCode: number, body: Record<string, unknown>) {
    response.writeHead(statusCode, { "Content-Type": "application/json" });
    response.end(JSON.stringify(body));
}

async function createAgent() {
    logger.info("Starting Wayfinder Enterprise AI agent with Asgardeo and LangChain");
    validateAgentConfiguration();
    logger.info({
        baseUrl: asgardeoConfig.baseUrl,
        clientId: redactSecret(asgardeoConfig.clientId),
        redirectUri: asgardeoConfig.afterSignInUrl,
        agentId: redactSecret(agentConfig.agentID),
    }, "Requesting Asgardeo agent token");

    const asgardeoJavaScriptClient = new AsgardeoJavaScriptClient(asgardeoConfig);
    includeClientSecretInAgentAuthorizeRequest(asgardeoJavaScriptClient);
    const agentToken = await asgardeoJavaScriptClient.getAgentToken(agentConfig);

    const client = new MultiServerMCPClient({
        travel: {
            transport: "http",
            url: process.env.MCP_SERVER_URL || "http://localhost:8001/mcp",
            headers: {
                Authorization: `Bearer ${agentToken.accessToken}`,
            },
        },
    });

    const tools = sanitizeToolSchemasForGemini(await client.getTools());
    logger.info({
        tools: tools.map((tool) => tool.name).filter(Boolean),
    }, "Loaded MCP tools");

    const agent = createReactAgent({
        llm: model,
        tools: tools,
        prompt: agentPrompt,
    });

    return { agent, client, tools };
}

async function runAgentServer() {
    const { agent, client, tools } = await createAgent();
    const port = Number(process.env.PORT || process.env.AGENT_PORT || 8791);
    const host = process.env.HOST || "localhost";

    const server = createServer(async (request, response) => {
        const requestId = randomUUID();
        const startedAt = performance.now();
        const requestLogger = logger.child({
            requestId,
            method: request.method,
            path: request.url,
        });

        response.setHeader("X-Request-Id", requestId);
        response.on("finish", () => {
            requestLogger.info({
                statusCode: response.statusCode,
                durationMs: Number((performance.now() - startedAt).toFixed(1)),
            }, "HTTP request completed");
        });
        requestLogger.info("HTTP request started");

        if (request.url === "/health") {
            writeHttpJson(response, 200, {
                status: "ok",
                features: {
            enterpriseTravelTools: true,
            travelPolicyTool: tools.some((tool) => isToolNamed(tool, "get_travel_policy")),
                },
            });

            return;
        }

        writeHttpJson(response, 404, { error: "Not found" });
    });

    const handleConnection = (socket: Duplex) => {
        const connectionId = randomUUID();
        const connectionLogger = logger.child({ connectionId });
        let isClosed = false;

        connectionLogger.info("WebSocket client connected");

        socket.on("close", () => {
            isClosed = true;
            connectionLogger.info("WebSocket client closed connection");
        });

        socket.on("end", () => {
            isClosed = true;
        });

        socket.on("error", (error) => {
            isClosed = true;
            connectionLogger.warn({ err: error }, "WebSocket client disconnected");
        });

        sendJson(socket, {
            type: "ready",
            message: "Connected to the Wayfinder Enterprise AI agent.",
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
                            const messageLogger = connectionLogger.child({
                                messageCount: messages.length,
                                latestMessageLength: latestMessage.length,
                            });

                            if (!sendJson(socket, { type: "processing" })) {
                                isClosed = true;
                                return;
                            }

                            messageLogger.info("Processing chat message");
                            const responseMessage = getResponseContent(
                                (await agent.invoke({ messages })).messages.at(-1)?.content
                            );

                            if (isClosed) {
                                return;
                            }

                            sendJson(socket, {
                                type: "response",
                                message: responseMessage,
                            });
                            messageLogger.info({ responseLength: responseMessage.length }, "Chat message processed");
                        }).catch((error: unknown) => {
                            if (isClosed) {
                                return;
                            }

                            connectionLogger.error({ err: error }, "Error handling chat message");
                            sendJson(socket, {
                                type: "error",
                                message: error instanceof Error ? error.message : "Failed to process chat message.",
                            });
                        });
                    }

                    parsed = parseWebSocketFrame(buffer);
                }
            } catch (error) {
                connectionLogger.error({ err: error }, "Error parsing WebSocket frame");
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
            logger.warn({ err: error }, "WebSocket upgrade socket error");
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
            logger.error({ err: error }, "Error upgrading WebSocket connection");
            socket.destroy();
        }
    });

    server.listen(port, host, () => {
        logger.info({
            chatUrl: `ws://${host}:${port}/chat`,
            healthUrl: `http://${host}:${port}/health`,
        }, "AI agent WebSocket server started");
    });

    const shutdown = async () => {
        logger.info("Shutting down AI agent");
        server.close();
        await client.close();
        process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
}

runAgentServer().catch((error: unknown) => {
    logger.fatal({ err: error }, "AI agent failed to start");
    process.exit(1);
});
