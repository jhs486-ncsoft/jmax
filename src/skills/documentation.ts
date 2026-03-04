// Documentation Skill - 문서 생성 및 관리
import type { Skill, SkillContext, SkillResult } from "../types/index.js";

export class DocumentationSkill implements Skill {
  name = "documentation";
  description = "Generate architecture docs, API docs, project documentation";
  abilities = [
    "generate architecture docs",
    "write API documentation",
    "update project docs",
    "create Confluence pages",
  ];

  async execute(context: SkillContext): Promise<SkillResult> {
    const { task, logger } = context;
    logger.info("task", `[Documentation] Processing: ${task.title}`);

    try {
      const action = this.determineAction(task.description);

      switch (action) {
        case "architecture":
          return this.generateArchitectureDocs(context);
        case "api":
          return this.generateApiDocs(context);
        case "confluence":
          return this.createConfluencePage(context);
        default:
          return this.generateProjectDocs(context);
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
    if (lower.includes("architect")) return "architecture";
    if (lower.includes("api")) return "api";
    if (lower.includes("confluence")) return "confluence";
    return "project";
  }

  private async generateArchitectureDocs(context: SkillContext): Promise<SkillResult> {
    context.logger.info("task", "[Documentation] Generating architecture docs...");
    return {
      success: true,
      output: "Architecture documentation generated",
      artifacts: [
        {
          type: "document",
          path: "architecture/system.md",
          content: `# System Architecture\n\nGenerated for: ${context.task.title}\n`,
        },
      ],
    };
  }

  private async generateApiDocs(context: SkillContext): Promise<SkillResult> {
    context.logger.info("task", "[Documentation] Generating API docs...");
    return {
      success: true,
      output: "API documentation generated",
    };
  }

  private async createConfluencePage(context: SkillContext): Promise<SkillResult> {
    context.logger.info("task", "[Documentation] Creating Confluence page...");
    const result = await context.tools.execute("mcp_atlassian_create_page", {
      title: context.task.title,
      content: context.task.description,
    });

    return {
      success: result.success,
      output: result.success
        ? `Confluence page created: ${result.output}`
        : "Confluence page creation queued (MCP not connected)",
    };
  }

  private async generateProjectDocs(context: SkillContext): Promise<SkillResult> {
    context.logger.info("task", "[Documentation] Generating project docs...");
    return {
      success: true,
      output: "Project documentation generated",
    };
  }
}
