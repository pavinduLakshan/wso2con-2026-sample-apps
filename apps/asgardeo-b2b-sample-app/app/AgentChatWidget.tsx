"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type ChatRole = "user" | "assistant" | "system";
type ConnectionStatus = "connecting" | "connected" | "disconnected";

interface ChatMessage {
  id: string;
  role: ChatRole | "error";
  content: string;
}

interface AgentPayload {
  type?: "ready" | "processing" | "response" | "error";
  message?: string;
}

const AGENT_CHAT_URL = process.env.NEXT_PUBLIC_AGENT_CHAT_URL || "ws://localhost:8791/chat";

function createMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return {
    content,
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
  };
}

function toAgentMessages(messages: ChatMessage[]) {
  return messages
    .filter((message): message is ChatMessage & { role: ChatRole } => (
      message.role === "user" || message.role === "assistant" || message.role === "system"
    ))
    .map(({ role, content }) => ({ role, content }));
}

export default function AgentChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    createMessage("assistant", "Hi, I can help with enterprise travel policies, users, roles, and compliant fares."),
  ]);
  const socketRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const statusLabel = useMemo(() => {
    if (connectionStatus === "connected") return "Connected";
    if (connectionStatus === "connecting") return "Connecting";
    return "Offline";
  }, [connectionStatus]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setConnectionStatus("connecting");
    const socket = new WebSocket(AGENT_CHAT_URL);
    socketRef.current = socket;

    socket.addEventListener("open", () => {
      setConnectionStatus("connected");
    });

    socket.addEventListener("message", (event) => {
      let payload: AgentPayload;

      try {
        payload = JSON.parse(String(event.data)) as AgentPayload;
      } catch {
        return;
      }

      if (payload.type === "processing") {
        setIsProcessing(true);
      }

      if (payload.type === "response") {
        setIsProcessing(false);
        setMessages((current) => [
          ...current,
          createMessage("assistant", payload.message || "Done."),
        ]);
      }

      if (payload.type === "error") {
        setIsProcessing(false);
        setMessages((current) => [
          ...current,
          createMessage("error", payload.message || "The assistant could not process that request."),
        ]);
      }
    });

    socket.addEventListener("close", () => {
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
      setConnectionStatus("disconnected");
      setIsProcessing(false);
    });

    socket.addEventListener("error", () => {
      setConnectionStatus("disconnected");
      setIsProcessing(false);
    });

    return () => {
      socket.close();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages, isProcessing, isOpen]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const content = input.trim();
    const socket = socketRef.current;

    if (!content || isProcessing || !socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const userMessage = createMessage("user", content);
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setIsProcessing(true);
    socket.send(JSON.stringify({ messages: toAgentMessages(nextMessages) }));
  }

  return (
    <div className="agent-chat-widget">
      {isOpen && (
        <section className="agent-chat-panel" aria-label="AI assistant">
          <header className="agent-chat-header">
            <div>
              <span className="agent-chat-kicker">AI assistant</span>
              <h2>Wayfinder Enterprise</h2>
            </div>
            <div className="agent-chat-actions">
              <span className={`agent-chat-status agent-chat-status--${connectionStatus}`}>
                {statusLabel}
              </span>
              <button
                className="agent-chat-icon-button"
                type="button"
                aria-label="Close AI assistant"
                onClick={() => setIsOpen(false)}
              >
                X
              </button>
            </div>
          </header>

          <div className="agent-chat-messages" role="log" aria-live="polite">
            {messages.map((message) => (
              <div className={`agent-chat-message agent-chat-message--${message.role}`} key={message.id}>
                {message.content}
              </div>
            ))}
            {isProcessing && (
              <div className="agent-chat-message agent-chat-message--assistant agent-chat-message--typing">
                Working...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="agent-chat-composer" onSubmit={handleSubmit}>
            <label className="agent-chat-input-label">
              <span>Message</span>
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about policies, users, roles, or fares"
                disabled={connectionStatus !== "connected" || isProcessing}
              />
            </label>
            <button
              className="agent-chat-send-button"
              type="submit"
              disabled={connectionStatus !== "connected" || isProcessing || !input.trim()}
            >
              Send
            </button>
          </form>
        </section>
      )}

      <button
        className="agent-chat-launcher"
        type="button"
        aria-label={isOpen ? "Close AI assistant" : "Open AI assistant"}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        AI
      </button>
    </div>
  );
}
