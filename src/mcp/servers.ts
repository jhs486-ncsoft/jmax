// MCP Server Configurations for JMAX
import type { MCPServerConfig } from "../types/index.js";

export const defaultMCPServers: MCPServerConfig[] = [
  {
    name: "context7",
    command: "npx",
    args: ["-y", "@upstash/context7-mcp@latest"],
    enabled: true,
  },
  {
    name: "playwright",
    command: "npx",
    args: ["-y", "@anthropic/playwright-mcp@latest"],
    enabled: false,
  },
  {
    name: "atlassian",
    command: "npx",
    args: ["-y", "@anthropic/atlassian-mcp@latest"],
    env: {
      ATLASSIAN_SITE: "",
      ATLASSIAN_USER_EMAIL: "",
      ATLASSIAN_API_TOKEN: "",
    },
    enabled: false,
  },
];
