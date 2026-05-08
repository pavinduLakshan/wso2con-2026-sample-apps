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
    path: resolve(__dirname, "../../.env"),
});

const asgardeoConfig = {
    afterSignInUrl: process.env.REDIRECT_URI || "",
    clientId: process.env.CLIENT_ID || "",
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
    payload: Buffer;
};

const WEB_SOCKET_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

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

function parseWebSocketFrame(buffer: Buffer): { frame: WebSocketFrame; remaining: Buffer } | null {
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

function sendJson(socket: Duplex, payload: Record<string, unknown>) {
    if (!socket.destroyed) {
        socket.write(encodeWebSocketFrame(JSON.stringify(payload)));
    }
}

function closeWebSocket(socket: Duplex) {
    if (!socket.destroyed) {
        socket.end(encodeWebSocketFrame("", 0x8));
    }
}

async function createAgent() {
    console.log("##########################################################################################################");
    console.log("##      This is an Agent Authentication Flow sample application for authenticating AI agents            ##");
    console.log("##                         using Asgardeo and LangChain framework                                       ##");
    console.log("##########################################################################################################");

    const asgardeoJavaScriptClient = new AsgardeoJavaScriptClient(asgardeoConfig);
    const agentToken = await asgardeoJavaScriptClient.getAgentToken(agentConfig);

    const client = new MultiServerMCPClient({
        math: {
            transport: "http",
            url: process.env.MCP_SERVER_URL || "http://localhost:8000/mcp",
            headers: {
                Authorization: `Bearer ${agentToken.accessToken}`,
            },
        },
    });

    const tools = await client.getTools();

    const agent = createReactAgent({
        llm: model,
        tools: tools,
    });

    return { agent, client };
}

async function runAgentServer() {
    const { agent, client } = await createAgent();
    const port = Number(process.env.PORT || process.env.AGENT_PORT || 8790);
    const host = process.env.HOST || "localhost";

    const server = createServer((request, response) => {
        if (request.url === "/health") {
            response.writeHead(200, { "Content-Type": "application/json" });
            response.end(JSON.stringify({ status: "ok" }));

            return;
        }

        response.writeHead(404, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ error: "Not found" }));
    });

    const handleConnection = (socket: Duplex) => {
        sendJson(socket, {
            type: "ready",
            message: "Connected to the Asgardeo AI agent.",
        });

        let queue = Promise.resolve();
        let buffer = Buffer.alloc(0);

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
                        socket.write(encodeWebSocketFrame(parsed.frame.payload.toString(), 0xA));
                    }

                    if (parsed.frame.opcode === 0x1) {
                        const payload = parsed.frame.payload.toString("utf8");

                        queue = queue.then(async () => {
                            const messages = parseChatRequest(payload);

                            sendJson(socket, { type: "processing" });

                            const result = await agent.invoke({ messages });
                            const finalResponse = result.messages[result.messages.length - 1];

                            sendJson(socket, {
                                type: "response",
                                message: getResponseContent(finalResponse.content),
                            });
                        }).catch((error: unknown) => {
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
        try {
            const url = new URL(request.url || "", `http://${request.headers.host || host}`);
            const key = request.headers["sec-websocket-key"];

            if (url.pathname !== "/chat" || typeof key !== "string") {
                socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
                socket.destroy();

                return;
            }

            socket.write([
                "HTTP/1.1 101 Switching Protocols",
                "Upgrade: websocket",
                "Connection: Upgrade",
                `Sec-WebSocket-Accept: ${createWebSocketAcceptKey(key)}`,
                "",
                "",
            ].join("\r\n"));

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
