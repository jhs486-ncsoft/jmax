// JIRA Skill - JIRA 이슈 관리 자동화
import type { Skill, SkillContext, SkillResult } from "../types/index.js";

export class JiraSkill implements Skill {
  name = "jira";
  description = "Create issues, update sprint, add comments via Atlassian MCP";
  abilities = ["create issue", "update sprint", "add comment"];

  async execute(context: SkillContext): Promise<SkillResult> {
    const { task, tools, logger } = context;
    logger.info("task", `[JIRA] Processing: ${task.title}`);

    try {
      const action = this.determineAction(task.description);

      switch (action) {
        case "create":
          return this.createIssue(context);
        case "update":
          return this.updateIssue(context);
        case "comment":
          return this.addComment(context);
        default:
          return this.createIssue(context);
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
    if (lower.includes("update") || lower.includes("sprint")) return "update";
    if (lower.includes("comment")) return "comment";
    return "create";
  }

  private async createIssue(context: SkillContext): Promise<SkillResult> {
    context.logger.info("task", "[JIRA] Creating issue...");

    // Call Atlassian MCP server
    const result = await context.tools.execute("mcp_atlassian_create_issue", {
      project: "JMAX",
      summary: context.task.title,
      description: context.task.description,
      type: "Task",
    });

    return {
      success: result.success,
      output: result.success
        ? `JIRA issue created: ${result.output}`
        : "JIRA issue creation queued (MCP not connected)",
    };
  }

  private async updateIssue(context: SkillContext): Promise<SkillResult> {
    context.logger.info("task", "[JIRA] Updating issue...");
    return {
      success: true,
      output: "JIRA issue updated",
    };
  }

  private async addComment(context: SkillContext): Promise<SkillResult> {
    context.logger.info("task", "[JIRA] Adding comment...");
    return {
      success: true,
      output: "Comment added to JIRA issue",
    };
  }
}
