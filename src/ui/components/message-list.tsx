// MessageList Component - Scrollable message history
// Renders messages and handles viewport slicing for scroll

import React, { useMemo, useRef, memo } from "react";
import { Box, Text } from "ink";
import { Message } from "./message.js";
import { LoadingSpinner } from "./spinner.js";
import { inkColors, icons } from "../theme.js";
import type { ChatMessageData } from "./message.js";
import type { StreamingPhase } from "./spinner.js";
import type { ScrollState } from "../hooks/use-scroll.js";

const MemoMessage = memo(Message);

export interface MessageListProps {
  messages: ChatMessageData[];
  streamingContent: string;
  streamingPhase: StreamingPhase;
  width: number;
  height: number;
  scrollState: ScrollState;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  streamingContent,
  streamingPhase,
  width,
  height,
  scrollState,
}) => {
  // Stable timestamp for streaming message — only created once, not on every render
  const streamingTimestampRef = useRef(Date.now());

  // Render all messages into text lines for scrolling
  const allContent = useMemo(() => {
    const items: React.ReactNode[] = [];

    if (messages.length === 0 && streamingPhase === "idle") {
      items.push(
        <Box key="empty" flexDirection="column" paddingX={2} paddingY={1}>
          <Text color={inkColors.muted}>
            Welcome to JMAX. Type a message to start chatting.
          </Text>
          <Text color={inkColors.muted}> </Text>
          <Text color={inkColors.muted}>
            {icons.dot} Powered by GitHub Copilot API
          </Text>
          <Text color={inkColors.muted}>
            {icons.dot} Markdown rendering enabled
          </Text>
          <Text color={inkColors.muted}>
            {icons.dot} Press Ctrl+N to start a new session
          </Text>
        </Box>
      );
    } else {
      for (const msg of messages) {
        items.push(
          <MemoMessage key={msg.id} message={msg} width={width} />
        );
      }
    }

    // Show streaming content as an in-progress assistant message
    if (streamingPhase !== "idle" && streamingContent) {
      items.push(
        <MemoMessage
          key="streaming"
          message={{
            id: "streaming",
            role: "assistant",
            content: streamingContent,
            timestamp: streamingTimestampRef.current,
            isStreaming: true,
          }}
          width={width}
        />
      );
    }

    return items;
  }, [messages, streamingContent, streamingPhase, width]);

  // Show spinner when thinking (before any content arrives)
  const showSpinner = streamingPhase === "thinking";

  return (
    <Box
      flexDirection="column"
      height={height}
      overflow="hidden"
    >
      <Box flexDirection="column" flexGrow={1}>
        {allContent}
        {showSpinner && <LoadingSpinner phase={streamingPhase} />}
      </Box>

      {/* Scroll indicator */}
      {!scrollState.isAtBottom && scrollState.totalLines > scrollState.viewportHeight && (
        <Box justifyContent="center">
          <Text color={inkColors.muted}>
            {icons.arrow} {scrollState.totalLines - scrollState.offset - scrollState.viewportHeight} more lines below (PgDn)
          </Text>
        </Box>
      )}
    </Box>
  );
};
