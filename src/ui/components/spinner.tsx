// Loading Spinner Component - Shows during streaming
import React from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { inkColors } from "../theme.js";

export type StreamingPhase = "thinking" | "generating" | "idle";

export interface LoadingSpinnerProps {
  phase: StreamingPhase;
}

const phaseLabels: Record<StreamingPhase, string> = {
  thinking: "Thinking...",
  generating: "Generating...",
  idle: "",
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ phase }) => {
  if (phase === "idle") return null;

  return (
    <Box paddingX={2} paddingY={0}>
      <Text color={inkColors.accent}>
        <Spinner type="dots" />
      </Text>
      <Text color={inkColors.muted}> {phaseLabels[phase]}</Text>
    </Box>
  );
};
