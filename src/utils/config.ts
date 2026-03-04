// JMAX Configuration
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import type { JMAXConfig } from "../types/index.js";
import { defaultMCPServers } from "../mcp/servers.js";

const CONFIG_PATH = ".jmax.json";

export const defaultConfig: JMAXConfig = {
  model: {
    primary: "github-copilot",
    fallback: ["claude", "openai"],
  },
  mcp: {
    servers: defaultMCPServers,
  },
  git: {
    autoCommit: true,
    autoPR: true,
    autoMerge: false,
    prTemplate: `## Feature\n\n{description}\n\n## Changes\n\n{changes}\n\n## Test\n\n{tests}`,
    baseBranch: "main",
  },
  logging: {
    level: "info",
    directory: "./logs",
    categories: ["session", "task", "tool", "git", "reasoning"],
  },
};

export async function loadConfig(): Promise<JMAXConfig> {
  if (existsSync(CONFIG_PATH)) {
    try {
      const raw = await readFile(CONFIG_PATH, "utf-8");
      const userConfig = JSON.parse(raw) as Partial<JMAXConfig>;
      return mergeConfig(defaultConfig, userConfig);
    } catch {
      return defaultConfig;
    }
  }
  return defaultConfig;
}

export async function saveConfig(config: JMAXConfig): Promise<void> {
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

function mergeConfig(
  base: JMAXConfig,
  override: Partial<JMAXConfig>
): JMAXConfig {
  return {
    model: { ...base.model, ...override.model },
    mcp: override.mcp ?? base.mcp,
    git: { ...base.git, ...override.git },
    logging: { ...base.logging, ...override.logging },
  };
}
