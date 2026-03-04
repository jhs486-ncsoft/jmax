// Sidebar Component - Right sidebar with Model Selector, System Status, Sessions
// Always visible, fixed width, bordered on the left

import React from "react";
import { Box, Text } from "ink";
import { inkColors } from "../theme.js";
import type { ModelInfo } from "../hooks/use-model-selector.js";

export const SIDEBAR_WIDTH = 28;

export interface SidebarProps {
  // Focus
  isFocused: boolean;

  // Model selector
  models: ModelInfo[];
  selectedIndex: number;
  activeModel: string;

  // System status
  isAuthenticated: boolean;
  isStreaming: boolean;
  messageCount: number;
  tokenEstimate: number;

  // Layout
  height: number;
}

// ─── Section Header ──────────────────────────────────────────────────

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <Box paddingX={1}>
    <Text bold color={inkColors.accent}>
      {title}
    </Text>
  </Box>
);

// ─── Model Selector Section ─────────────────────────────────────────

interface ModelListProps {
  models: ModelInfo[];
  selectedIndex: number;
  activeModel: string;
  isFocused: boolean;
}

const ModelList: React.FC<ModelListProps> = ({
  models,
  selectedIndex,
  activeModel,
  isFocused,
}) => (
  <Box flexDirection="column" paddingX={1}>
    {models.map((model, i) => {
      const isActive = model.id === activeModel;
      const isSelected = i === selectedIndex && isFocused;
      const prefix = isActive ? "● " : "○ ";

      if (isSelected) {
        return (
          <Text key={model.id} inverse>
            {prefix}
            {model.label}
          </Text>
        );
      }

      return (
        <Text
          key={model.id}
          color={isActive ? inkColors.success : inkColors.text}
          bold={isActive}
        >
          {prefix}
          {model.label}
        </Text>
      );
    })}
  </Box>
);

// ─── System Status Section ──────────────────────────────────────────

interface StatusSectionProps {
  isAuthenticated: boolean;
  isStreaming: boolean;
  messageCount: number;
  tokenEstimate: number;
  activeModel: string;
}

const StatusSection: React.FC<StatusSectionProps> = ({
  isAuthenticated,
  isStreaming,
  messageCount,
  tokenEstimate,
  activeModel,
}) => {
  const formatTokens = (n: number): string => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
  };

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text color={inkColors.muted}>
        Auth:{" "}
        <Text color={isAuthenticated ? inkColors.success : inkColors.error}>
          {isAuthenticated ? "OK" : "No"}
        </Text>
      </Text>
      <Text color={inkColors.muted}>
        Model:{" "}
        <Text color={inkColors.accent}>{activeModel}</Text>
      </Text>
      <Text color={inkColors.muted}>
        Msgs: {messageCount}
      </Text>
      <Text color={inkColors.muted}>
        Tokens: ~{formatTokens(tokenEstimate)}
      </Text>
      {isStreaming && (
        <Text color={inkColors.warning}>Streaming...</Text>
      )}
    </Box>
  );
};

// ─── Session Section ────────────────────────────────────────────────

const SessionSection: React.FC = () => (
  <Box flexDirection="column" paddingX={1}>
    <Text color={inkColors.primary}>● Current Session</Text>
    <Text color={inkColors.muted} dimColor>
      (session history TBD)
    </Text>
  </Box>
);

// ─── Main Sidebar ───────────────────────────────────────────────────

export const Sidebar: React.FC<SidebarProps> = ({
  isFocused,
  models,
  selectedIndex,
  activeModel,
  isAuthenticated,
  isStreaming,
  messageCount,
  tokenEstimate,
  height,
}) => {
  return (
    <Box
      flexDirection="column"
      width={SIDEBAR_WIDTH}
      height={height}
      borderStyle="single"
      borderColor={isFocused ? inkColors.borderFocused : inkColors.border}
      borderRight={true}
      borderTop={true}
      borderBottom={true}
      borderLeft={true}
      overflow="hidden"
    >
      {/* Model Selector */}
      <SectionHeader title="Models" />
      <ModelList
        models={models}
        selectedIndex={selectedIndex}
        activeModel={activeModel}
        isFocused={isFocused}
      />

      {/* Divider */}
      <Box paddingX={1} marginY={0}>
        <Text color={inkColors.borderDim}>
          {"─".repeat(SIDEBAR_WIDTH - 4)}
        </Text>
      </Box>

      {/* System Status */}
      <SectionHeader title="Status" />
      <StatusSection
        isAuthenticated={isAuthenticated}
        isStreaming={isStreaming}
        messageCount={messageCount}
        tokenEstimate={tokenEstimate}
        activeModel={activeModel}
      />

      {/* Divider */}
      <Box paddingX={1} marginY={0}>
        <Text color={inkColors.borderDim}>
          {"─".repeat(SIDEBAR_WIDTH - 4)}
        </Text>
      </Box>

      {/* Sessions */}
      <SectionHeader title="Sessions" />
      <SessionSection />
    </Box>
  );
};
