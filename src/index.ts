// JMAX - Enterprise AI Engineering Agent
// CLI Entry Point

import { Command } from "commander";
import { loadConfig } from "./utils/config.js";
import { JMAXLogger } from "./logs/logger.js";
import { MemoryStoreImpl } from "./memory/memory-store.js";
import { AgentCore } from "./agent/agent-core.js";
import { MCPClient } from "./mcp/mcp-client.js";
import { GitAutomation } from "./git/git-automation.js";
import { CopilotAuth_ } from "./copilot/auth.js";
import { renderApp } from "./ui/index.js";
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

// ─── Login command (GitHub Copilot OAuth Device Flow) ───────────────

program
  .command("login")
  .description("Authenticate with GitHub Copilot via Device Flow")
  .action(async () => {
    const auth = new CopilotAuth_();

    // Check if already logged in
    if (await auth.isAuthenticated()) {
      console.log("\nAlready authenticated with GitHub Copilot.");
      console.log("Run 'jmax logout' first to re-authenticate.\n");
      return;
    }

    console.log("\nJMAX - GitHub Copilot Authentication\n");

    try {
      const success = await auth.login(
        (verificationUri, userCode) => {
          console.log("Open this URL in your browser:");
          console.log(`  ${verificationUri}\n`);
          console.log("Enter this code:");
          console.log(`  ${userCode}\n`);
          console.log("Waiting for authorization...");
        },
        () => {
          process.stdout.write(".");
        }
      );

      if (success) {
        console.log("\n\nAuthentication successful! You can now use 'jmax chat'.\n");
      } else {
        console.error("\nAuthentication failed. Please try again.\n");
        process.exit(1);
      }
    } catch (err) {
      console.error(
        "\nAuthentication error:",
        err instanceof Error ? err.message : String(err)
      );
      process.exit(1);
    }
  });

// ─── Logout command ─────────────────────────────────────────────────

program
  .command("logout")
  .description("Remove stored GitHub Copilot credentials")
  .action(async () => {
    const auth = new CopilotAuth_();
    await auth.logout();
    console.log("\nLogged out. Stored credentials removed.\n");
  });

// ─── Main chat command (Copilot streaming) ──────────────────────────

program
  .command("chat")
  .description("Start interactive AI chat session (requires login)")
  .option("-m, --model <model>", "AI model to use", "gpt-4o")
  .action(async (options) => {
    const auth = new CopilotAuth_();
    const isAuthenticated = await auth.isAuthenticated();

    if (!isAuthenticated) {
      console.error("\nNot authenticated. Run 'jmax login' first.\n");
      process.exit(1);
    }

    const agent = await initAgent();

    // Launch full-screen Ink TUI
    renderApp({
      agent,
      model: options.model,
      isAuthenticated,
    });
  });

// ─── Run a single task ──────────────────────────────────────────────

program
  .command("run <request>")
  .description("Run a single task through the agent pipeline")
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
  .description("Show agent status, auth, and available skills")
  .action(async () => {
    const config = await loadConfig();
    const auth = new CopilotAuth_();
    const isAuth = await auth.isAuthenticated();

    console.log(`\nJMAX v${VERSION}`);
    console.log("─".repeat(40));
    console.log(`Auth: ${isAuth ? "Authenticated (GitHub Copilot)" : "Not authenticated"}`);
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

  // Create MCP client and connect to configured servers
  const mcpClient = new MCPClient(logger);
  for (const serverCfg of config.mcp.servers) {
    try {
      await mcpClient.connect(serverCfg);
    } catch (err) {
      logger.warn(
        "tool",
        `Failed to connect MCP server '${serverCfg.name}': ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  const agent = new AgentCore({ config, logger, memory, mcpClient });

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

// Default to help if no command specified
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
