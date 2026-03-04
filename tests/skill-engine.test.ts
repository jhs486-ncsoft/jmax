// SkillEngine Tests
import { describe, it, expect, vi } from "vitest";
import { SkillEngine } from "../src/agent/skill-engine.js";
import type { Skill, SkillContext, SkillResult } from "../src/types/index.js";

describe("SkillEngine", () => {
  function createMockSkill(name: string): Skill {
    return {
      name,
      description: `Mock skill: ${name}`,
      abilities: ["ability1", "ability2"],
      execute: vi.fn(async (): Promise<SkillResult> => ({
        success: true,
        output: `${name} executed`,
      })),
    };
  }

  function createMockContext(): SkillContext {
    return {
      task: {
        id: "test-id",
        title: "Test Task",
        description: "Test",
        status: "in_progress",
        steps: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      memory: {
        get: vi.fn(),
        set: vi.fn(),
        list: vi.fn(),
        load: vi.fn(),
      },
      tools: {
        register: vi.fn(),
        get: vi.fn(),
        list: vi.fn(() => []),
        execute: vi.fn(async () => ({ success: true, output: "" })),
      },
      logger: {
        log: vi.fn(),
        info: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
      },
    };
  }

  it("should register and retrieve skills", () => {
    const engine = new SkillEngine();
    const skill = createMockSkill("test-skill");

    engine.register(skill);

    expect(engine.get("test-skill")).toBe(skill);
  });

  it("should list all registered skills", () => {
    const engine = new SkillEngine();
    engine.register(createMockSkill("skill-a"));
    engine.register(createMockSkill("skill-b"));

    const skills = engine.list();
    expect(skills).toHaveLength(2);
  });

  it("should execute a skill", async () => {
    const engine = new SkillEngine();
    const skill = createMockSkill("test-skill");
    engine.register(skill);

    const context = createMockContext();
    const result = await engine.execute("test-skill", context);

    expect(result.success).toBe(true);
    expect(result.output).toBe("test-skill executed");
    expect(skill.execute).toHaveBeenCalledWith(context);
  });

  it("should return error for unknown skill", async () => {
    const engine = new SkillEngine();
    const context = createMockContext();

    const result = await engine.execute("nonexistent", context);

    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
  });

  it("should handle skill execution errors", async () => {
    const engine = new SkillEngine();
    const skill: Skill = {
      name: "error-skill",
      description: "throws",
      abilities: [],
      execute: async () => {
        throw new Error("skill failed");
      },
    };
    engine.register(skill);

    const context = createMockContext();
    const result = await engine.execute("error-skill", context);

    expect(result.success).toBe(false);
    expect(result.error).toBe("skill failed");
  });

  it("should load definitions from skill files", async () => {
    const engine = new SkillEngine();

    // Load from the actual skills directory
    await engine.loadDefinitions("./skills");

    const definitions = engine.listDefinitions();
    expect(definitions.length).toBeGreaterThan(0);

    const engineeringDef = definitions.find((d) => d.name === "engineering");
    expect(engineeringDef).toBeDefined();
    expect(engineeringDef?.abilities).toContain("design architecture");
  });
});
