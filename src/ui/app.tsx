// App - Root TUI Component
// Full-screen layout: Header → MessageList → Editor → StatusBar
// Keyboard: Ctrl+C quit, Ctrl+N new session, Ctrl+L clear, Esc cancel, PgUp/PgDn scroll

import React, { useState, useCallback } from "react";
import { render, Box, Text, useInput, useApp } from "ink";
import type { AgentCore } from "../agent/agent-core.js";
import { Header } from "./components/header.js";
import { MessageList } from "./components/message-list.js";
import { Editor } from "./components/editor.js";
import { StatusBar } from "./components/status-bar.js";
import { useChat } from "./hooks/use-chat.js";
import { useScroll } from "./hooks/use-scroll.js";
import { useTerminalSize } from "./hooks/use-terminal-size.js";
import { inkColors } from "./theme.js";

const VERSION = "0.1.0";

// ─── Layout Constants ───────────────────────────────────────────────
const HEADER_HEIGHT = 3;     // border + content + border
const EDITOR_HEIGHT = 3;     // border + content + border
const STATUS_HEIGHT = 1;     // single line
const CHROME_HEIGHT = HEADER_HEIGHT + EDITOR_HEIGHT + STATUS_HEIGHT;

// ─── Main App ───────────────────────────────────────────────────────

interface AppProps {
  agent: AgentCore;
  model: string;
  isAuthenticated: boolean;
}

const App: React.FC<AppProps> = ({ agent, model, isAuthenticated }) => {
  const { exit } = useApp();
  const { columns, rows } = useTerminalSize();
  const [inputValue, setInputValue] = useState("");
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  const chat = useChat(agent);

  // Calculate message area height
  const messageAreaHeight = Math.max(rows - CHROME_HEIGHT, 5);

  // Scroll management
  const scroll = useScroll({
    totalLines: chat.messages.length * 4 + (chat.isStreaming ? 4 : 0),
    viewportHeight: messageAreaHeight,
    autoScroll: true,
  });

  // ─── Input Handling ─────────────────────────────────────────────

  const handleSubmit = useCallback(
    (value: string) => {
      const trimmed = value.trim();

      // Handle slash commands
      if (trimmed === "/exit" || trimmed === "/quit") {
        exit();
        return;
      }

      if (trimmed === "/clear") {
        chat.clearHistory();
        setInputValue("");
        return;
      }

      if (trimmed && !chat.isStreaming) {
        chat.sendMessage(trimmed);
        setInputValue("");
      }
    },
    [chat, exit]
  );

  // ─── Keyboard Shortcuts ─────────────────────────────────────────

  useInput((input, key) => {
    // Ctrl+C: quit (with confirmation)
    if (input === "c" && key.ctrl) {
      if (chat.isStreaming) {
        chat.cancelStream();
      } else if (showQuitConfirm) {
        exit();
      } else {
        setShowQuitConfirm(true);
        setTimeout(() => setShowQuitConfirm(false), 2000);
      }
      return;
    }

    // Ctrl+N: new session
    if (input === "n" && key.ctrl) {
      chat.clearHistory();
      setInputValue("");
      return;
    }

    // Ctrl+L: clear screen (same as /clear)
    if (input === "l" && key.ctrl) {
      chat.clearHistory();
      setInputValue("");
      return;
    }

    // Escape: cancel streaming
    if (key.escape) {
      if (chat.isStreaming) {
        chat.cancelStream();
      }
      if (showQuitConfirm) {
        setShowQuitConfirm(false);
      }
      return;
    }

    // Page navigation
    if (key.pageUp) {
      scroll.pageUp();
      return;
    }
    if (key.pageDown) {
      scroll.pageDown();
      return;
    }
  });

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <Box flexDirection="column" height={rows} width={columns}>
      {/* Header */}
      <Header
        version={VERSION}
        model={model}
        isAuthenticated={isAuthenticated}
        isStreaming={chat.isStreaming}
      />

      {/* Message Area */}
      <Box flexDirection="column" flexGrow={1}>
        <MessageList
          messages={chat.messages}
          streamingContent={chat.streamingContent}
          streamingPhase={chat.streamingPhase}
          width={columns}
          height={messageAreaHeight}
          scrollState={scroll.state}
        />
      </Box>

      {/* Quit confirmation overlay */}
      {showQuitConfirm && (
        <Box justifyContent="center" paddingX={1}>
          <Text color={inkColors.warning}>
            Press Ctrl+C again to quit, or Esc to cancel
          </Text>
        </Box>
      )}

      {/* Editor */}
      <Editor
        value={inputValue}
        onChange={setInputValue}
        onSubmit={handleSubmit}
        isActive={!chat.isStreaming}
        placeholder={
          chat.isStreaming
            ? "Waiting for response... (Esc to cancel)"
            : "Type your message..."
        }
      />

      {/* Status Bar */}
      <StatusBar
        messageCount={chat.messages.length}
        tokenEstimate={chat.tokenEstimate}
        model={model}
        isStreaming={chat.isStreaming}
        streamDuration={chat.streamDuration}
      />
    </Box>
  );
};

// ─── Render Function (entry point) ─────────────────────────────────

export interface RenderAppOptions {
  agent: AgentCore;
  model?: string;
  isAuthenticated?: boolean;
}

export function renderApp(options: RenderAppOptions): void {
  const { agent, model = "gpt-4o", isAuthenticated = true } = options;

  render(
    <App
      agent={agent}
      model={model}
      isAuthenticated={isAuthenticated}
    />,
    {
      exitOnCtrlC: false,
      patchConsole: true,
    }
  );
}
