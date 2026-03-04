// Message Component - Individual chat message with markdown rendering
// Styled like OpenCode: left border indicator, role label, rendered content
// Now supports tool execution messages

import React, { useMemo } from "react";
import { Box, Text } from "ink";
import { inkColors, icons } from "../theme.js";
import { renderMarkdown } from "../markdown.js";

export interface ChatMessageData {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: number;
  model?: string;
  duration?: number; // ms
  isStreaming?: boolean;
  /** Tool execution metadata */
  toolName?: string;
  toolSuccess?: boolean;
  toolCallCount?: number;
}

export interface MessageProps {
  message: ChatMessageData;
  width: number;
}

export const Message: React.FC<MessageProps> = ({ message, width }) => {
  const { role, content, model, duration, isStreaming, toolName, toolSuccess, toolCallCount } = message;

  // Determine colors and labels based on role
  let borderColor: string;
  let roleLabel: string;
  let roleLabelColor: string;

  if (role === "tool") {
    borderColor = toolSuccess ? inkColors.success : inkColors.error;
    roleLabel = `${toolSuccess ? icons.check : icons.cross} Tool: ${toolName ?? "unknown"}`;
    roleLabelColor = borderColor;
  } else if (role === "user") {
    borderColor = inkColors.user;
    roleLabel = `${icons.userPrompt} You`;
    roleLabelColor = inkColors.user;
  } else {
    borderColor = inkColors.assistant;
    roleLabel = `${icons.assistantPrompt} Assistant`;
    roleLabelColor = inkColors.assistant;
  }

  // Render markdown content (memoized to avoid re-rendering on scroll)
  const renderedContent = useMemo(() => {
    if (!content) return "";
    // Reserve space for border (3 chars: "┃ ") and padding
    const contentWidth = Math.max(width - 6, 40);
    return renderMarkdown(content, contentWidth);
  }, [content, width]);

  // Build the header line: role + model + duration + tool count
  const headerParts: string[] = [];
  if (model) headerParts.push(model);
  if (duration !== undefined && !isStreaming) {
    headerParts.push(`${(duration / 1000).toFixed(1)}s`);
  }
  if (isStreaming) {
    headerParts.push("streaming...");
  }
  if (toolCallCount && toolCallCount > 0) {
    headerParts.push(`${toolCallCount} tool call${toolCallCount > 1 ? "s" : ""}`);
  }

  return (
    <Box flexDirection="column" paddingX={1} marginBottom={1}>
      {/* Header: role label + metadata */}
      <Box>
        <Text color={borderColor}>{icons.verticalBar} </Text>
        <Text bold color={roleLabelColor}>
          {roleLabel}
        </Text>
        {headerParts.length > 0 && (
          <Text color={inkColors.muted}>
            {" "}({headerParts.join(" · ")})
          </Text>
        )}
      </Box>

      {/* Content */}
      {content ? (
        <Box>
          <Text color={borderColor}>{icons.verticalBar} </Text>
          <Box flexDirection="column" flexShrink={1}>
            <Text>{renderedContent}</Text>
          </Box>
        </Box>
      ) : (
        <Box>
          <Text color={borderColor}>{icons.verticalBar} </Text>
          <Text color={inkColors.muted}>...</Text>
        </Box>
      )}
    </Box>
  );
};
