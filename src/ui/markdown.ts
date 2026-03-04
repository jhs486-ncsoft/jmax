// Markdown rendering utility
// Uses marked + marked-terminal for rich terminal markdown output

import { Marked } from "marked";
import { markedTerminal } from "marked-terminal";
import { styles } from "./theme.js";

// Create a configured marked instance with terminal renderer
const terminal = new Marked();
terminal.use(
  markedTerminal({
    // Heading styles
    firstHeading: styles.emphasized,
    heading: styles.primary,

    // Code styles
    code: styles.secondary,
    codespan: styles.accent,

    // Text styles
    strong: styles.bold,
    em: styles.italic,
    del: styles.dim,
    paragraph: styles.muted,

    // Link styles
    link: styles.info,
    href: styles.info,

    // List
    listitem: styles.muted,

    // Block quote
    blockquote: styles.muted,

    // Table
    table: styles.muted,

    // Options
    emoji: false,
    width: 80,
    showSectionPrefix: false,
    reflowText: true,
    tab: 2,
  }) as Parameters<typeof terminal.use>[0]
);

/**
 * Render markdown string to ANSI-colored terminal output.
 * Strips trailing whitespace/newlines.
 */
export function renderMarkdown(content: string, width?: number): string {
  try {
    // Update width if provided
    const result = terminal.parse(content) as string;
    // Strip trailing newlines but keep internal formatting
    return result.replace(/\n+$/, "");
  } catch {
    // Fallback to plain text if markdown parsing fails
    return content;
  }
}
