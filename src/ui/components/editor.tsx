// Editor Component - Text input with Enter to send
// Wraps ink-text-input with JMAX styling

import React from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import { inkColors, icons } from "../theme.js";

export interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  isActive: boolean;
  placeholder?: string;
}

export const Editor: React.FC<EditorProps> = ({
  value,
  onChange,
  onSubmit,
  isActive,
  placeholder = "Type your message...",
}) => {
  return (
    <Box
      borderStyle="single"
      borderColor={isActive ? inkColors.borderFocused : inkColors.border}
      paddingX={1}
    >
      <Text bold color={isActive ? inkColors.primary : inkColors.muted}>
        {icons.userPrompt}{" "}
      </Text>
      <TextInput
        value={value}
        onChange={onChange}
        onSubmit={onSubmit}
        placeholder={placeholder}
        focus={isActive}
        showCursor={isActive}
      />
    </Box>
  );
};
