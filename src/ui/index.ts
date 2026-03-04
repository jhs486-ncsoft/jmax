// UI module exports
export { renderApp } from "./app.js";
export type { RenderAppOptions } from "./app.js";

// Components
export { Header } from "./components/header.js";
export { MessageList } from "./components/message-list.js";
export { Message } from "./components/message.js";
export { Editor } from "./components/editor.js";
export { StatusBar } from "./components/status-bar.js";
export { LoadingSpinner } from "./components/spinner.js";

// Hooks
export { useChat } from "./hooks/use-chat.js";
export { useScroll } from "./hooks/use-scroll.js";
export { useTerminalSize } from "./hooks/use-terminal-size.js";

// Theme & Markdown
export { colors, styles, icons, inkColors } from "./theme.js";
export { renderMarkdown } from "./markdown.js";
