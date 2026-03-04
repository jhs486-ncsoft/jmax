// JMAX TUI Theme - Color constants and styling
// Inspired by OpenCode's theme system, simplified to a single dark theme

import chalk from "chalk";

// ─── Color Palette ──────────────────────────────────────────────────

export const colors = {
  // Primary
  primary: "#7AA2F7",      // Soft blue (Tokyo Night inspired)
  secondary: "#9ECE6A",    // Green
  accent: "#BB9AF7",       // Purple

  // Status
  success: "#9ECE6A",      // Green
  warning: "#E0AF68",      // Orange
  error: "#F7768E",        // Red/Pink
  info: "#7DCFFF",         // Light blue

  // Text
  text: "#C0CAF5",         // Light text
  textMuted: "#565F89",    // Muted gray
  textEmphasized: "#FFFFFF",

  // Backgrounds
  bg: "#1A1B26",           // Dark background
  bgSecondary: "#24283B",  // Slightly lighter
  bgDarker: "#16161E",     // Even darker

  // Borders
  border: "#3B4261",       // Subtle border
  borderFocused: "#7AA2F7", // Highlighted border
  borderDim: "#292E42",    // Dimmed border

  // Roles
  user: "#7AA2F7",         // User message color
  assistant: "#9ECE6A",    // Assistant message color
  system: "#BB9AF7",       // System message color
} as const;

// ─── Chalk Styles ───────────────────────────────────────────────────

export const styles = {
  // Text styles
  primary: chalk.hex(colors.primary),
  secondary: chalk.hex(colors.secondary),
  accent: chalk.hex(colors.accent),
  muted: chalk.hex(colors.textMuted),
  emphasized: chalk.hex(colors.textEmphasized).bold,

  // Status styles
  success: chalk.hex(colors.success),
  warning: chalk.hex(colors.warning),
  error: chalk.hex(colors.error),
  info: chalk.hex(colors.info),

  // Role styles
  user: chalk.hex(colors.user).bold,
  assistant: chalk.hex(colors.assistant).bold,
  system: chalk.hex(colors.accent).italic,

  // Decorative
  dim: chalk.dim,
  bold: chalk.bold,
  italic: chalk.italic,
  underline: chalk.underline,
} as const;

// ─── Unicode Box Drawing Characters ─────────────────────────────────

export const icons = {
  // Message indicators
  userPrompt: "❯",
  assistantPrompt: "◆",
  separator: "─",
  verticalBar: "┃",

  // Status
  check: "✓",
  cross: "✗",
  dot: "●",
  circle: "○",
  arrow: "→",

  // Corners & borders (for custom drawing)
  topLeft: "╭",
  topRight: "╮",
  bottomLeft: "╰",
  bottomRight: "╯",
  horizontal: "─",
  vertical: "│",
} as const;

// ─── Ink Color Props Helper ─────────────────────────────────────────
// Ink's <Text> accepts color as hex strings directly

export const inkColors = {
  primary: colors.primary,
  secondary: colors.secondary,
  accent: colors.accent,
  success: colors.success,
  warning: colors.warning,
  error: colors.error,
  info: colors.info,
  text: colors.text,
  muted: colors.textMuted,
  border: colors.border,
  borderFocused: colors.borderFocused,
  borderDim: colors.borderDim,
  user: colors.user,
  assistant: colors.assistant,
} as const;
