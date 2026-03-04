// useChat hook - Chat state management
// Manages messages, streaming state, and agent interaction

import { useState, useCallback, useRef } from "react";
import type { AgentCore } from "../../agent/agent-core.js";
import type { ChatMessageData } from "../components/message.js";
import type { StreamingPhase } from "../components/spinner.js";

let messageIdCounter = 0;
function nextId(): string {
  return `msg-${++messageIdCounter}-${Date.now()}`;
}

export interface UseChatResult {
  messages: ChatMessageData[];
  streamingContent: string;
  streamingPhase: StreamingPhase;
  streamDuration: number;
  isStreaming: boolean;
  tokenEstimate: number;

  sendMessage: (text: string) => Promise<void>;
  cancelStream: () => void;
  clearHistory: () => void;
}

export function useChat(agent: AgentCore): UseChatResult {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingPhase, setStreamingPhase] = useState<StreamingPhase>("idle");
  const [streamDuration, setStreamDuration] = useState(0);
  const [tokenEstimate, setTokenEstimate] = useState(0);

  const cancelledRef = useRef(false);
  const streamStartRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isStreaming = streamingPhase !== "idle";

  const sendMessage = useCallback(
    async (text: string) => {
      if (isStreaming) return;

      const trimmed = text.trim();
      if (!trimmed) return;

      // Add user message
      const userMsg: ChatMessageData = {
        id: nextId(),
        role: "user",
        content: trimmed,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);

      // Start streaming
      cancelledRef.current = false;
      setStreamingContent("");
      setStreamingPhase("thinking");
      setStreamDuration(0);

      // Duration timer
      streamStartRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setStreamDuration(Date.now() - streamStartRef.current);
      }, 100);

      try {
        const reply = await agent.chatStream(trimmed, (token) => {
          if (cancelledRef.current) return;
          setStreamingPhase("generating");
          setStreamingContent((prev) => prev + token);
        });

        // Clear timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        const duration = Date.now() - streamStartRef.current;

        if (!cancelledRef.current) {
          // Add completed assistant message
          const assistantMsg: ChatMessageData = {
            id: nextId(),
            role: "assistant",
            content: reply,
            timestamp: Date.now(),
            model: agent.config.model.primary,
            duration,
          };
          setMessages((prev) => [...prev, assistantMsg]);

          // Rough token estimate (4 chars ~ 1 token)
          setTokenEstimate((prev) =>
            prev + Math.ceil((trimmed.length + reply.length) / 4)
          );
        }
      } catch (err) {
        // Clear timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        if (!cancelledRef.current) {
          const errorContent =
            err instanceof Error ? err.message : String(err);
          const errorMsg: ChatMessageData = {
            id: nextId(),
            role: "assistant",
            content: `**Error:** ${errorContent}`,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, errorMsg]);
        }
      } finally {
        setStreamingContent("");
        setStreamingPhase("idle");
        setStreamDuration(0);
      }
    },
    [agent, isStreaming]
  );

  const cancelStream = useCallback(() => {
    cancelledRef.current = true;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setStreamingContent("");
    setStreamingPhase("idle");
    setStreamDuration(0);
  }, []);

  const clearHistory = useCallback(() => {
    setMessages([]);
    setStreamingContent("");
    setStreamingPhase("idle");
    setStreamDuration(0);
    setTokenEstimate(0);
    agent.resetChat();
  }, [agent]);

  return {
    messages,
    streamingContent,
    streamingPhase,
    streamDuration,
    isStreaming,
    tokenEstimate,
    sendMessage,
    cancelStream,
    clearHistory,
  };
}
