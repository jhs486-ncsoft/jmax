// useChat hook - Chat state management
// Manages messages, streaming state, tool execution feedback, and agent interaction

import { useState, useCallback, useRef, useEffect } from "react";
import type { AgentCore } from "../../agent/agent-core.js";
import type { ChatMessageData } from "../components/message.js";
import type { StreamingPhase } from "../components/spinner.js";
import type { ToolCallExecution } from "../../types/index.js";

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

  const isStreaming = streamingPhase !== "idle";

  // Duration timer — declarative effect, only runs while streaming.
  // Uses 500ms interval instead of 100ms to reduce re-render frequency.
  useEffect(() => {
    if (!isStreaming) return;
    const timer = setInterval(() => {
      setStreamDuration(Date.now() - streamStartRef.current);
    }, 500);
    return () => clearInterval(timer);
  }, [isStreaming]);

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
      streamStartRef.current = Date.now();

      try {
        const agentResponse = await agent.chatStream(
          trimmed,
          // onToken callback
          (token) => {
            if (cancelledRef.current) return;
            setStreamingPhase("generating");
            setStreamingContent((prev) => prev + token);
          },
          // onToolExec callback
          (execution: ToolCallExecution) => {
            if (cancelledRef.current) return;
            // Add tool execution as a system-style message
            const statusIcon = execution.result.success ? "✓" : "✗";
            const toolMsg: ChatMessageData = {
              id: nextId(),
              role: "tool",
              content: `**${statusIcon} ${execution.toolName}** (${execution.duration}ms)\n${
                execution.result.success
                  ? execution.result.output.slice(0, 500)
                  : `Error: ${execution.result.error}`
              }`,
              timestamp: Date.now(),
              toolName: execution.toolName,
              toolSuccess: execution.result.success,
              duration: execution.duration,
            };
            setMessages((prev) => [...prev, toolMsg]);
            // Reset streaming content after tool call (LLM will respond again)
            setStreamingContent("");
            setStreamingPhase("thinking");
          }
        );

        const duration = Date.now() - streamStartRef.current;

        if (!cancelledRef.current) {
          // Add completed assistant message
          const assistantMsg: ChatMessageData = {
            id: nextId(),
            role: "assistant",
            content: agentResponse.content,
            timestamp: Date.now(),
            model: agent.config.model.primary,
            duration,
            toolCallCount: agentResponse.toolCalls.length,
          };
          setMessages((prev) => [...prev, assistantMsg]);

          // Rough token estimate (4 chars ~ 1 token)
          setTokenEstimate((prev) =>
            prev + Math.ceil((trimmed.length + agentResponse.content.length) / 4)
          );
        }
      } catch (err) {
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
