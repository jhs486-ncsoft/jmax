// Engineering Skill - 코드 생성, 설계, 리팩토링
import type { Skill, SkillContext, SkillResult } from "../types/index.js";

export class EngineeringSkill implements Skill {
  name = "engineering";
  description = "Design architecture, generate code, write tests, refactor code";
  abilities = [
    "design architecture",
    "generate code",
    "write tests",
    "refactor code",
  ];

  async execute(context: SkillContext): Promise<SkillResult> {
    const { task, logger } = context;
    logger.info("task", `[Engineering] Processing: ${task.title}`);

    try {
      // Analyze the task description to determine action
      const action = this.determineAction(task.description);
      logger.info("reasoning", `[Engineering] Action determined: ${action}`);

      switch (action) {
        case "design":
          return this.designArchitecture(context);
        case "generate":
          return this.generateCode(context);
        case "test":
          return this.writeTests(context);
        case "refactor":
          return this.refactorCode(context);
        default:
          return this.generateCode(context);
      }
    } catch (err) {
      return {
        success: false,
        output: "",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private determineAction(description: string): string {
    const lower = description.toLowerCase();
    if (lower.includes("design") || lower.includes("architect")) return "design";
    if (lower.includes("test")) return "test";
    if (lower.includes("refactor") || lower.includes("optimize")) return "refactor";
    return "generate";
  }

  private async designArchitecture(context: SkillContext): Promise<SkillResult> {
    context.logger.info("reasoning", "[Engineering] Designing architecture...");
    return {
      success: true,
      output: "Architecture design completed",
      artifacts: [
        {
          type: "document",
          path: "architecture/design.md",
          content: `# Architecture Design\n\nGenerated for: ${context.task.title}\n`,
        },
      ],
    };
  }

  private async generateCode(context: SkillContext): Promise<SkillResult> {
    context.logger.info("task", "[Engineering] Generating code...");
    return {
      success: true,
      output: "Code generation completed",
      artifacts: [],
    };
  }

  private async writeTests(context: SkillContext): Promise<SkillResult> {
    context.logger.info("task", "[Engineering] Writing tests...");
    return {
      success: true,
      output: "Test generation completed",
      artifacts: [],
    };
  }

  private async refactorCode(context: SkillContext): Promise<SkillResult> {
    context.logger.info("task", "[Engineering] Refactoring code...");
    return {
      success: true,
      output: "Code refactoring completed",
      artifacts: [],
    };
  }
}
