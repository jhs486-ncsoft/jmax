// Config Tests
import { describe, it, expect } from "vitest";
import { defaultConfig } from "../src/utils/config.js";

describe("Config", () => {
  it("should have valid default config", () => {
    expect(defaultConfig.model.primary).toBe("github-copilot");
    expect(defaultConfig.model.fallback).toContain("claude");
    expect(defaultConfig.model.fallback).toContain("openai");
  });

  it("should have MCP servers configured", () => {
    expect(defaultConfig.mcp.servers.length).toBeGreaterThan(0);

    const context7 = defaultConfig.mcp.servers.find(
      (s) => s.name === "context7"
    );
    expect(context7).toBeDefined();
    expect(context7?.enabled).toBe(true);
  });

  it("should have git config", () => {
    expect(defaultConfig.git.autoCommit).toBe(true);
    expect(defaultConfig.git.autoPR).toBe(true);
    expect(defaultConfig.git.autoMerge).toBe(false);
    expect(defaultConfig.git.baseBranch).toBe("main");
  });

  it("should have logging config", () => {
    expect(defaultConfig.logging.level).toBe("info");
    expect(defaultConfig.logging.directory).toBe("./logs");
    expect(defaultConfig.logging.categories).toContain("session");
    expect(defaultConfig.logging.categories).toContain("task");
    expect(defaultConfig.logging.categories).toContain("git");
  });
});
