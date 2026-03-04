// Message Component - Individual chat message with markdown rendering
// Styled like OpenCode: left border indicator, role label, rendered content

import React, { useMemo } from "react";
import { Box, Text } from "ink";
import { inkColors, icons } from "../theme.js";
import { renderMarkdown } from "../markdown.js";

export interface ChatMessageData {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  model?: string;
  duration?: number; // ms
  isStreaming?: boolean;
}

export interface MessageProps {
  message: ChatMessageData;
  width: number;
}

export const Message: React.FC<MessageProps> = ({ message, width }) => {
  const { role, content, model, duration, isStreaming } = message;

  // Determine colors based on role
  const borderColor = role === "user" ? inkColors.user : inkColors.assistant;
  const roleLabel =
    role === "user"
      ? `${icons.userPrompt} You`
      : `${icons.assistantPrompt} Assistant`;
  const roleLabelColor = role === "user" ? inkColors.user : inkColors.assistant;

  // Render markdown content (memoized to avoid re-rendering on scroll)
  const renderedContent = useMemo(() => {
    if (!content) return "";
    // Reserve space for border (3 chars: "┃ ") and padding
    const contentWidth = Math.max(width - 6, 40);
    return renderMarkdown(content, contentWidth);
  }, [content, width]);

  // Build the header line: role + model + duration
  const headerParts: string[] = [];
  if (model) headerParts.push(model);
  if (duration !== undefined && !isStreaming) {
    headerParts.push(`${(duration / 1000).toFixed(1)}s`);
  }
  if (isStreaming) {
    headerParts.push("streaming...");
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
