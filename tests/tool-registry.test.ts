// ToolRegistry Tests
import { describe, it, expect } from "vitest";
import { ToolRegistryImpl } from "../src/agent/tool-registry.js";
import type { Tool } from "../src/types/index.js";

describe("ToolRegistry", () => {
  function createMockTool(name: string, output: string = "ok"): Tool {
    return {
      name,
      description: `Mock tool: ${name}`,
      parameters: {},
      execute: async () => ({ success: true, output }),
    };
  }

  it("should register and retrieve tools", () => {
    const registry = new ToolRegistryImpl();
    const tool = createMockTool("test-tool");

    registry.register(tool);

    expect(registry.get("test-tool")).toBe(tool);
  });

  it("should throw on duplicate registration", () => {
    const registry = new ToolRegistryImpl();
    const tool = createMockTool("test-tool");

    registry.register(tool);

    expect(() => registry.register(tool)).toThrow("already registered");
  });

  it("should return undefined for unknown tools", () => {
    const registry = new ToolRegistryImpl();

    expect(registry.get("nonexistent")).toBeUndefined();
  });

  it("should list all registered tools", () => {
    const registry = new ToolRegistryImpl();
    registry.register(createMockTool("tool-a"));
    registry.register(createMockTool("tool-b"));

    const tools = registry.list();
    expect(tools).toHaveLength(2);
    expect(tools.map((t) => t.name)).toContain("tool-a");
    expect(tools.map((t) => t.name)).toContain("tool-b");
  });

  it("should execute a registered tool", async () => {
    const registry = new ToolRegistryImpl();
    registry.register(createMockTool("test-tool", "result"));

    const result = await registry.execute("test-tool", {});

    expect(result.success).toBe(true);
    expect(result.output).toBe("result");
  });

  it("should return error for unknown tool execution", async () => {
    const registry = new ToolRegistryImpl();

    const result = await registry.execute("nonexistent", {});

    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
  });

  it("should handle tool execution errors", async () => {
    const registry = new ToolRegistryImpl();
    const errorTool: Tool = {
      name: "error-tool",
      description: "throws",
      parameters: {},
      execute: async () => {
        throw new Error("tool failed");
      },
    };

    registry.register(errorTool);
    const result = await registry.execute("error-tool", {});

    expect(result.success).toBe(false);
    expect(result.error).toBe("tool failed");
  });
});
