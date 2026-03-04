// Header Component - Top bar with app info and shortcuts
import React from "react";
import { Box, Text, Spacer } from "ink";
import { inkColors } from "../theme.js";

export interface HeaderProps {
  version: string;
  model: string;
  isAuthenticated: boolean;
  isStreaming?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  version,
  model,
  isAuthenticated,
  isStreaming,
}) => {
  return (
    <Box
      borderStyle="single"
      borderColor={inkColors.border}
      paddingX={1}
    >
      <Text bold color={inkColors.primary}>
        JMAX
      </Text>
      <Text color={inkColors.muted}> v{version} </Text>
      <Text color={inkColors.muted}>│ </Text>
      <Text color={inkColors.accent}>{model}</Text>
      <Text color={inkColors.muted}> │ </Text>
      {isAuthenticated ? (
        <Text color={inkColors.success}>Authenticated</Text>
      ) : (
        <Text color={inkColors.error}>Not authenticated</Text>
      )}
      {isStreaming && (
        <>
          <Text color={inkColors.muted}> │ </Text>
          <Text color={inkColors.warning}>Streaming...</Text>
        </>
      )}
      <Spacer />
      <Text color={inkColors.muted}>
        Ctrl+N new │ Ctrl+L clear │ Esc cancel │ Ctrl+C quit
      </Text>
    </Box>
  );
};
