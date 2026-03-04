// JMAX - Enterprise AI Engineering Agent
// CLI Entry Point

import { Command } from "commander";
import { loadConfig } from "./utils/config.js";
import { JMAXLogger } from "./logs/logger.js";
import { MemoryStoreImpl } from "./memory/memory-store.js";
import { AgentCore } from "./agent/agent-core.js";
import { MCPClient } from "./mcp/mcp-client.js";
import { GitAutomation } from "./git/git-automation.js";
import {
  EngineeringSkill,
  JiraSkill,
  MeetingSkill,
  DevOpsSkill,
  DocumentationSkill,
} from "./skills/index.js";

const VERSION = "0.1.0";

const program = new Command();

program
  .name("jmax")
  .description("JMAX - Enterprise AI Engineering Agent")
  .version(VERSION);

// ─── Main chat command ──────────────────────────────────────────────

program
  .command("chat")
  .description("Start interactive AI chat session")
  .option("-m, --model <model>", "AI model to use", "github-copilot")
  .action(async (options) => {
    const agent = await initAgent();

    console.log(`\nJMAX v${VERSION} - AI Engineering Agent`);
    console.log("Type your request and press Enter. Type 'exit' to quit.\n");

    const readline = await import("node:readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const prompt = () => {
      rl.question("jmax> ", async (input) => {
        const trimmed = input.trim();
        if (trimmed === "exit" || trimmed === "quit") {
          console.log("Goodbye!");
          rl.close();
          process.exit(0);
        }

        if (!trimmed) {
          prompt();
          return;
        }

        try {
          const task = await agent.processRequest(trimmed);
          console.log(
            `\nTask '${task.title}' ${task.status === "completed" ? "completed" : "failed"}\n`
          );
        } catch (err) {
          console.error(
            "Error:",
            err instanceof Error ? err.message : String(err)
          );
        }

        prompt();
      });
    };

    prompt();
  });

// ─── Run a single task ──────────────────────────────────────────────

program
  .command("run <request>")
  .description("Run a single task")
  .action(async (request: string) => {
    const agent = await initAgent();

    console.log(`\nJMAX v${VERSION} - Processing request...\n`);
    console.log(`Request: ${request}\n`);

    try {
      const task = await agent.processRequest(request);
      console.log(`\nTask '${task.title}' - Status: ${task.status}`);

      for (const step of task.steps) {
        const icon =
          step.status === "completed"
            ? "[done]"
            : step.status === "failed"
              ? "[FAIL]"
              : "[    ]";
        console.log(`  ${icon} ${step.name}`);
        if (step.error) console.log(`       Error: ${step.error}`);
      }
    } catch (err) {
      console.error("Error:", err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

// ─── Status command ─────────────────────────────────────────────────

program
  .command("status")
  .description("Show agent status and available skills")
  .action(async () => {
    const config = await loadConfig();
    const logger = new JMAXLogger(config.logging);

    console.log(`\nJMAX v${VERSION}`);
    console.log("─".repeat(40));
    console.log(`Model: ${config.model.primary}`);
    console.log(`Fallback: ${config.model.fallback.join(", ")}`);
    console.log(`\nMCP Servers:`);
    for (const server of config.mcp.servers) {
      const status = server.enabled ? "enabled" : "disabled";
      console.log(`  ${server.name}: ${status}`);
    }

    console.log(`\nGit Config:`);
    console.log(`  Auto Commit: ${config.git.autoCommit}`);
    console.log(`  Auto PR: ${config.git.autoPR}`);
    console.log(`  Auto Merge: ${config.git.autoMerge}`);
    console.log(`  Base Branch: ${config.git.baseBranch}`);

    console.log(`\nSkills:`);
    const skills = [
      "engineering",
      "jira",
      "meeting",
      "devops",
      "documentation",
    ];
    for (const skill of skills) {
      console.log(`  - ${skill}`);
    }
    console.log();
  });

// ─── Git status ─────────────────────────────────────────────────────

program
  .command("git-status")
  .description("Show git repository status")
  .action(async () => {
    const config = await loadConfig();
    const logger = new JMAXLogger(config.logging);
    const gitAuto = new GitAutomation(logger, config.git);

    try {
      const status = await gitAuto.status();
      console.log("\nGit Status:");
      console.log(`  Clean: ${status.isClean}`);
      if (status.modified.length) console.log(`  Modified: ${status.modified.join(", ")}`);
      if (status.created.length) console.log(`  Created: ${status.created.join(", ")}`);
      if (status.deleted.length) console.log(`  Deleted: ${status.deleted.join(", ")}`);
      if (status.staged.length) console.log(`  Staged: ${status.staged.join(", ")}`);

      const log = await gitAuto.log(5);
      console.log("\nRecent Commits:");
      for (const entry of log) {
        console.log(`  ${entry.hash} ${entry.message} (${entry.author})`);
      }
      console.log();
    } catch (err) {
      console.error("Error:", err instanceof Error ? err.message : String(err));
    }
  });

// ─── Init agent ─────────────────────────────────────────────────────

async function initAgent(): Promise<AgentCore> {
  const config = await loadConfig();
  const logger = new JMAXLogger(config.logging);
  const memory = new MemoryStoreImpl("./memory");
  await memory.initialize();

  const agent = new AgentCore({ config, logger, memory });

  // Register skills
  agent.skillEngine.register(new EngineeringSkill());
  agent.skillEngine.register(new JiraSkill());
  agent.skillEngine.register(new MeetingSkill());
  agent.skillEngine.register(new DevOpsSkill());
  agent.skillEngine.register(new DocumentationSkill());

  await agent.initialize();

  return agent;
}

// ─── Parse and run ──────────────────────────────────────────────────

program.parse();

// Default to chat if no command specified
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
