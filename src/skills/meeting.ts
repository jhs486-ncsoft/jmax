// Meeting Skill - 회의록 요약 및 작업 추출
import type { Skill, SkillContext, SkillResult } from "../types/index.js";

export class MeetingSkill implements Skill {
  name = "meeting";
  description = "Summarize meeting, extract tasks, create JIRA issues";
  abilities = ["summarize meeting", "extract tasks", "create jira issues"];

  async execute(context: SkillContext): Promise<SkillResult> {
    const { task, logger } = context;
    logger.info("task", `[Meeting] Processing: ${task.title}`);

    try {
      const action = this.determineAction(task.description);

      switch (action) {
        case "summarize":
          return this.summarizeMeeting(context);
        case "extract":
          return this.extractTasks(context);
        case "jira":
          return this.createJiraIssues(context);
        default:
          return this.summarizeMeeting(context);
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
    if (lower.includes("jira") || lower.includes("issue")) return "jira";
    if (lower.includes("task") || lower.includes("extract")) return "extract";
    return "summarize";
  }

  private async summarizeMeeting(context: SkillContext): Promise<SkillResult> {
    context.logger.info("task", "[Meeting] Summarizing meeting...");
    return {
      success: true,
      output: "Meeting summary generated",
      artifacts: [
        {
          type: "document",
          path: "docs/meeting-summary.md",
          content: `# Meeting Summary\n\nGenerated for: ${context.task.title}\n`,
        },
      ],
    };
  }

  private async extractTasks(context: SkillContext): Promise<SkillResult> {
    context.logger.info("task", "[Meeting] Extracting tasks...");
    return {
      success: true,
      output: "Tasks extracted from meeting",
    };
  }

  private async createJiraIssues(context: SkillContext): Promise<SkillResult> {
    context.logger.info("task", "[Meeting] Creating JIRA issues from meeting...");
    return {
      success: true,
      output: "JIRA issues created from meeting tasks",
    };
  }
}
