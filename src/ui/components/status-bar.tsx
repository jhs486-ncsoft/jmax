// Status Bar Component - Bottom bar with token count, message count, hints
import React from "react";
import { Box, Text, Spacer } from "ink";
import { inkColors } from "../theme.js";

export interface StatusBarProps {
  messageCount: number;
  tokenEstimate: number;
  model: string;
  isStreaming: boolean;
  streamDuration?: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  messageCount,
  tokenEstimate,
  model,
  isStreaming,
  streamDuration,
}) => {
  const formatTokens = (n: number): string => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
  };

  return (
    <Box paddingX={1}>
      <Text color={inkColors.muted}>
        tokens: ~{formatTokens(tokenEstimate)}
      </Text>
      <Text color={inkColors.muted}> │ </Text>
      <Text color={inkColors.muted}>
        messages: {messageCount}
      </Text>
      {isStreaming && streamDuration !== undefined && (
        <>
          <Text color={inkColors.muted}> │ </Text>
          <Text color={inkColors.warning}>
            {(streamDuration / 1000).toFixed(1)}s
          </Text>
        </>
      )}
      <Spacer />
      <Text color={inkColors.muted}>
        Enter send │ /clear │ /exit
      </Text>
    </Box>
  );
};
