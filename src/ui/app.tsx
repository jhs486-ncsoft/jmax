// App - Root TUI Component
// Row-based layout: [Main Column (Header/MessageList/Editor/StatusBar)] + [Sidebar]
// Keyboard: Ctrl+C quit, Ctrl+N new session, Ctrl+L clear, Esc cancel,
//           PgUp/PgDn scroll, Tab toggle focus (editor ↔ sidebar),
//           ↑↓ navigate models (sidebar focused), Enter select model

import React, { useState, useCallback, useMemo, memo } from "react";
import { render, Box, Text, useInput, useApp } from "ink";
import type { AgentCore } from "../agent/agent-core.js";
import { Header } from "./components/header.js";
import { MessageList } from "./components/message-list.js";
import { Editor } from "./components/editor.js";
import { StatusBar } from "./components/status-bar.js";
import { Sidebar, SIDEBAR_WIDTH } from "./components/sidebar.js";
import { useChat } from "./hooks/use-chat.js";
import { useScroll } from "./hooks/use-scroll.js";
import { useTerminalSize } from "./hooks/use-terminal-size.js";
import { useModelSelector } from "./hooks/use-model-selector.js";
import { inkColors } from "./theme.js";

const VERSION = "0.1.0";

// ─── Layout Constants ───────────────────────────────────────────────
const HEADER_HEIGHT = 3;     // border + content + border
const EDITOR_HEIGHT = 3;     // border + content + border
const STATUS_HEIGHT = 1;     // single line
const CHROME_HEIGHT = HEADER_HEIGHT + EDITOR_HEIGHT + STATUS_HEIGHT;

type FocusTarget = "editor" | "sidebar";

// ─── Memoized child components to prevent re-render on parent state change ────
const MemoHeader = memo(Header);
const MemoMessageList = memo(MessageList);
const MemoEditor = memo(Editor);
const MemoStatusBar = memo(StatusBar);
const MemoSidebar = memo(Sidebar);

// ─── Main App ───────────────────────────────────────────────────────

interface AppProps {
  agent: AgentCore;
  isAuthenticated: boolean;
}

const App: React.FC<AppProps> = ({ agent, isAuthenticated }) => {
  const { exit } = useApp();
  const { columns, rows } = useTerminalSize();
  const [inputValue, setInputValue] = useState("");
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [focusTarget, setFocusTarget] = useState<FocusTarget>("editor");

  const chat = useChat(agent);
  const modelSelector = useModelSelector(agent);

  // ANTI-FLICKER: Destructure stable values from chat early.
  // useChat now returns a useMemo'd object, and each field is individually
  // stable (useState values / useCallback refs).  By destructuring here,
  // we avoid capturing the whole `chat` object in callbacks (which would
  // defeat memo stabilization even though the object is now memoized).
  const {
    messages, streamingContent, streamingPhase,
    streamDuration, isStreaming, tokenEstimate,
    sendMessage, clearHistory, cancelStream,
  } = chat;

  // Use rows - 1 to keep outputHeight below stdout.rows.
  // Ink uses clearTerminal (full screen repaint) when outputHeight >= stdout.rows,
  // which causes visible flicker. By reserving one row, we stay on the
  // incremental logUpdate path that only redraws changed lines.
  const availableRows = rows - 1;

  // Main content area width = total columns minus sidebar
  const mainWidth = useMemo(
    () => Math.max(columns - SIDEBAR_WIDTH, 40),
    [columns]
  );

  // Calculate message area height (memoized to avoid recalc on input change)
  const messageAreaHeight = useMemo(
    () => Math.max(availableRows - CHROME_HEIGHT, 5),
    [availableRows]
  );

  // Stable totalLines for scroll (avoid recomputing inline)
  const totalLines = useMemo(
    () => messages.length * 4 + (isStreaming ? 4 : 0),
    [messages.length, isStreaming]
  );

  // Scroll management
  const scroll = useScroll({
    totalLines,
    viewportHeight: messageAreaHeight,
    autoScroll: true,
  });

  // ─── Input Handling ─────────────────────────────────────────────
  // ANTI-FLICKER: handleSubmit depends on specific stable callbacks
  // destructured above, not the whole `chat` object.

  const handleSubmit = useCallback(
    (value: string) => {
      const trimmed = value.trim();

      // Handle slash commands
      if (trimmed === "/exit" || trimmed === "/quit") {
        exit();
        return;
      }

      if (trimmed === "/clear") {
        clearHistory();
        setInputValue("");
        return;
      }

      if (trimmed && !isStreaming) {
        sendMessage(trimmed);
        setInputValue("");
      }
    },
    [sendMessage, clearHistory, isStreaming, exit]
  );

  // ─── Keyboard Shortcuts ─────────────────────────────────────────
  // Only handle special keys; regular characters go to TextInput.

  useInput((input, key) => {
    // Tab: toggle focus between editor and sidebar
    if (key.tab) {
      setFocusTarget((prev) => (prev === "editor" ? "sidebar" : "editor"));
      return;
    }

    // Ctrl+C: quit (with confirmation)
    if (input === "c" && key.ctrl) {
      if (isStreaming) {
        cancelStream();
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
      clearHistory();
      setInputValue("");
      return;
    }

    // Ctrl+L: clear screen (same as /clear)
    if (input === "l" && key.ctrl) {
      clearHistory();
      setInputValue("");
      return;
    }

    // Escape: cancel streaming or quit confirm
    if (key.escape) {
      if (isStreaming) {
        cancelStream();
      }
      if (showQuitConfirm) {
        setShowQuitConfirm(false);
      }
      // Also return focus to editor on Esc
      if (focusTarget === "sidebar") {
        setFocusTarget("editor");
      }
      return;
    }

    // Sidebar-focused key handling: arrow keys + Enter for model selection
    if (focusTarget === "sidebar") {
      if (key.upArrow) {
        modelSelector.moveUp();
        return;
      }
      if (key.downArrow) {
        modelSelector.moveDown();
        return;
      }
      if (key.return) {
        modelSelector.confirm();
        return;
      }
    }

    // Page navigation (works in both focus modes)
    if (key.pageUp) {
      scroll.pageUp();
      return;
    }
    if (key.pageDown) {
      scroll.pageDown();
      return;
    }
  });

  // ─── Stable props for memoized children ─────────────────────────

  const editorPlaceholder = useMemo(
    () =>
      isStreaming
        ? "Waiting for response... (Esc to cancel)"
        : focusTarget === "sidebar"
          ? "Press Tab to return to editor"
          : "Type your message... (Tab → sidebar)",
    [isStreaming, focusTarget]
  );

  const editorIsActive = !isStreaming && focusTarget === "editor";

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <Box flexDirection="row" height={availableRows} width={columns}>
      {/* ── Main Content Area ── */}
      <Box flexDirection="column" width={mainWidth}>
        {/* Header */}
        <MemoHeader
          version={VERSION}
          model={modelSelector.activeModel}
          isAuthenticated={isAuthenticated}
          isStreaming={isStreaming}
        />

        {/* Message Area */}
        <Box flexDirection="column" flexGrow={1}>
          <MemoMessageList
            messages={messages}
            streamingContent={streamingContent}
            streamingPhase={streamingPhase}
            width={mainWidth}
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
        <MemoEditor
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSubmit}
          isActive={editorIsActive}
          placeholder={editorPlaceholder}
        />

        {/* Status Bar */}
        <MemoStatusBar
          messageCount={messages.length}
          tokenEstimate={tokenEstimate}
          model={modelSelector.activeModel}
          isStreaming={isStreaming}
          streamDuration={streamDuration}
        />
      </Box>

      {/* ── Sidebar ── */}
      <MemoSidebar
        isFocused={focusTarget === "sidebar"}
        models={modelSelector.models}
        selectedIndex={modelSelector.selectedIndex}
        activeModel={modelSelector.activeModel}
        isAuthenticated={isAuthenticated}
        isStreaming={isStreaming}
        messageCount={messages.length}
        tokenEstimate={tokenEstimate}
        height={availableRows}
      />
    </Box>
  );
};

// ─── Render Function (entry point) ─────────────────────────────────

export interface RenderAppOptions {
  agent: AgentCore;
  isAuthenticated?: boolean;
}

export function renderApp(options: RenderAppOptions): void {
  const { agent, isAuthenticated = true } = options;

  // ANTI-FLICKER: Suppress logger console output before TUI starts.
  // Ink's patchConsole intercepts console.log/warn/error and turns them into
  // Static output, which triggers a full clear+rewrite cycle (this.log.clear()
  // + stdout.write(data) + this.log(output)) — causing severe screen flicker.
  // Logger continues writing to files; only console output is suppressed.
  if ("suppressConsole" in agent.logger) {
    (agent.logger as { suppressConsole: boolean }).suppressConsole = true;
  }

  render(
    <App
      agent={agent}
      isAuthenticated={isAuthenticated}
    />,
    {
      exitOnCtrlC: false,
      // ANTI-FLICKER: Disable patchConsole. With logger console output
      // suppressed above, there's no need for Ink to intercept console calls.
      // This eliminates the Static output path entirely, avoiding the
      // log.clear() + log(output) double-write on every intercepted log.
      patchConsole: false,
    }
  );
}
