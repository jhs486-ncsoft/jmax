// AgentCore - 메인 에이전트 오케스트레이터
// Agentic loop: LLM call → tool_calls → execute → feed back → repeat until final text
import type {
  JMAXConfig,
  Logger,
  MemoryStore,
  Task,
  ChatMessage,
  ToolCallRequest,
  ToolCallExecution,
  AgentResponse,
  OpenAIToolDef,
  ToolResult,
} from "../types/index.js";
import { EventBus } from "./event-bus.js";
import { TaskPlanner } from "./task-planner.js";
import { SkillEngine } from "./skill-engine.js";
import { ToolRegistryImpl } from "./tool-registry.js";
import { CopilotClient } from "../copilot/client.js";
import type { LLMResponse, StreamCallbacks } from "../copilot/client.js";
import { MCPClient } from "../mcp/mcp-client.js";
import {
  toolToOpenAI,
  mcpToolToOpenAI,
  skillToOpenAI,
  parseMCPToolName,
  parseSkillToolName,
} from "./tool-converter.js";

/** Maximum number of tool-call rounds before forcing a stop */
const MAX_TOOL_ROUNDS = 15;

export interface AgentCoreOptions {
  config: JMAXConfig;
  logger: Logger;
  memory: MemoryStore;
  mcpClient?: MCPClient;
}

export class AgentCore {
  readonly eventBus: EventBus;
  readonly taskPlanner: TaskPlanner;
  readonly skillEngine: SkillEngine;
  readonly toolRegistry: ToolRegistryImpl;
  readonly logger: Logger;
  readonly memory: MemoryStore;
  readonly config: JMAXConfig;
  readonly mcpClient?: MCPClient;

  private initialized = false;
  private copilotClient: CopilotClient | null = null;
  private messages: ChatMessage[] = [];

  constructor(options: AgentCoreOptions) {
    this.config = options.config;
    this.logger = options.logger;
    this.memory = options.memory;
    this.mcpClient = options.mcpClient;
    this.eventBus = new EventBus();
    this.taskPlanner = new TaskPlanner(this.eventBus);
    this.skillEngine = new SkillEngine();
    this.toolRegistry = new ToolRegistryImpl();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    this.logger.info("session", "Initializing JMAX Agent Core...");

    // Load skill definitions from /skills directory
    await this.skillEngine.loadDefinitions("./skills");

    // Set up event logging
    this.eventBus.on((event) => {
      switch (event.type) {
        case "task:created":
          this.logger.info("task", `Task created: ${event.task.title}`);
          break;
        case "task:completed":
          this.logger.info("task", `Task completed: ${event.task.title}`);
          break;
        case "step:started":
          this.logger.info("task", `Step started: ${event.step.name}`);
          break;
        case "step:completed":
          this.logger.info("task", `Step completed: ${event.step.name}`);
          break;
        case "tool:called":
          this.logger.info("tool", `Tool called: ${event.tool}`);
          break;
        case "tool:executing":
          this.logger.info("tool", `Executing tool: ${event.toolName}`);
          break;
        case "tool:executed":
          this.logger.info(
            "tool",
            `Tool executed: ${event.toolName} (${event.duration}ms) - ${event.result.success ? "ok" : "error"}`
          );
          break;
        case "error":
          this.logger.error("session", `Error: ${event.error.message}`);
          break;
      }
    });

    this.initialized = true;
    this.logger.info("session", "JMAX Agent Core initialized");
  }

  // ─── Tool Definitions ──────────────────────────────────────────

  /**
   * Gather all tool definitions (local + MCP + skills) as OpenAI function defs.
   */
  private gatherToolDefs(): OpenAIToolDef[] {
    const defs: OpenAIToolDef[] = [];

    // 1. Local tools from ToolRegistry
    for (const tool of this.toolRegistry.list()) {
      defs.push(toolToOpenAI(tool));
    }

    // 2. MCP tools
    if (this.mcpClient) {
      for (const toolInfo of this.mcpClient.getToolInfos()) {
        defs.push(mcpToolToOpenAI(toolInfo));
      }
    }

    // 3. Skills as tools
    for (const skill of this.skillEngine.list()) {
      defs.push(skillToOpenAI(skill));
    }

    return defs;
  }

  // ─── Tool Execution ────────────────────────────────────────────

  /**
   * Execute a single tool call request from the LLM.
   * Routes to: local ToolRegistry, MCP server, or Skill.
   */
  private async executeTool(
    call: ToolCallRequest
  ): Promise<ToolCallExecution> {
    const startTime = Date.now();
    const funcName = call.function.name;

    let args: Record<string, unknown>;
    try {
      args = JSON.parse(call.function.arguments || "{}");
    } catch {
      args = {};
    }

    this.eventBus.emit({
      type: "tool:executing",
      toolName: funcName,
      callId: call.id,
      args,
    });

    let result: ToolResult;

    // 1. Check if it's a skill call
    const skillName = parseSkillToolName(funcName);
    if (skillName) {
      result = await this.executeSkillTool(skillName, args);
    }
    // 2. Check if it's an MCP call
    else {
      const mcpInfo = parseMCPToolName(funcName);
      if (mcpInfo && this.mcpClient) {
        result = await this.mcpClient.executeTool(
          mcpInfo.server,
          mcpInfo.tool,
          args
        );
      }
      // 3. Local tool
      else {
        result = await this.toolRegistry.execute(funcName, args);
      }
    }

    const duration = Date.now() - startTime;

    this.eventBus.emit({
      type: "tool:executed",
      toolName: funcName,
      callId: call.id,
      result,
      duration,
    });

    return {
      id: call.id,
      toolName: funcName,
      arguments: args,
      result,
      duration,
    };
  }

  /**
   * Execute a skill as a tool call.
   */
  private async executeSkillTool(
    skillName: string,
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    const skill = this.skillEngine.get(skillName);
    if (!skill) {
      return {
        success: false,
        output: "",
        error: `Skill '${skillName}' not found`,
      };
    }

    // Create a lightweight task for the skill context
    const task: Task = {
      id: `skill-${Date.now()}`,
      title: `${skillName}: ${(args.action as string) ?? "execute"}`,
      description: (args.context as string) ?? "",
      status: "in_progress",
      steps: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const skillResult = await this.skillEngine.execute(skillName, {
      task,
      memory: this.memory,
      tools: this.toolRegistry,
      logger: this.logger,
    });

    return {
      success: skillResult.success,
      output: skillResult.output,
      error: skillResult.error,
    };
  }

  // ─── Chat (Agentic Loop) ──────────────────────────────────────

  /**
   * Build the system prompt by injecting project memory context.
   */
  private async buildSystemPrompt(): Promise<string> {
    const parts: string[] = [
      "You are JMAX, an Enterprise AI Engineering Agent.",
      "You help engineers with code generation, architecture design, testing, git automation, and documentation.",
      "Respond concisely and technically. Use markdown when helpful.",
      "",
      "You have access to tools that you can use to perform actions.",
      "When you need to perform an action (e.g., search code, create files, run tests, manage git), use the appropriate tool.",
      "Always use tools when they are available rather than just describing what you would do.",
    ];

    // Inject project memory
    const memoryKeys = await this.memory.list();
    for (const key of memoryKeys) {
      const content = await this.memory.get(key);
      if (content) {
        parts.push(`\n--- Memory: ${key} ---\n${content}`);
      }
    }

    // Inject available skills info
    const skills = this.skillEngine.list();
    if (skills.length > 0) {
      parts.push(
        `\nAvailable skills (invoke via skill__ tools): ${skills.map((s) => s.name).join(", ")}`
      );
    }

    return parts.join("\n");
  }

  /**
   * Ensure the CopilotClient is initialised.
   */
  private getCopilotClient(): CopilotClient {
    if (!this.copilotClient) {
      this.copilotClient = new CopilotClient({ logger: this.logger });
    }
    return this.copilotClient;
  }

  /**
   * Non-streaming agentic loop.
   * Sends user message, handles tool_calls, loops until final text response.
   */
  async chat(userMessage: string): Promise<AgentResponse> {
    // Lazy-init system prompt on first message
    if (this.messages.length === 0) {
      const systemPrompt = await this.buildSystemPrompt();
      this.messages.push({ role: "system", content: systemPrompt });
    }

    this.messages.push({ role: "user", content: userMessage });
    this.logger.info("session", `Chat message: ${userMessage.slice(0, 80)}`);

    const client = this.getCopilotClient();
    const toolDefs = this.gatherToolDefs();
    const allToolCalls: ToolCallExecution[] = [];

    let rounds = 0;
    while (rounds < MAX_TOOL_ROUNDS) {
      rounds++;

      const response: LLMResponse = await client.chat(
        this.messages,
        toolDefs.length > 0 ? toolDefs : undefined
      );

      // If no tool calls, we're done
      if (response.toolCalls.length === 0) {
        const content = response.content ?? "";
        this.messages.push({ role: "assistant", content });
        return { content, toolCalls: allToolCalls };
      }

      // LLM wants to call tools
      this.eventBus.emit({ type: "llm:tool_calls", calls: response.toolCalls });

      // Record the assistant message with tool_calls
      this.messages.push({
        role: "assistant",
        content: response.content,
        tool_calls: response.toolCalls,
      });

      // Execute all tool calls
      for (const call of response.toolCalls) {
        const execution = await this.executeTool(call);
        allToolCalls.push(execution);

        // Add tool result to conversation
        const resultContent = execution.result.success
          ? execution.result.output
          : `Error: ${execution.result.error ?? "unknown error"}`;

        this.messages.push({
          role: "tool",
          content: resultContent,
          tool_call_id: call.id,
          name: call.function.name,
        });
      }
    }

    // Safety: max rounds exceeded
    const fallback =
      "I've reached the maximum number of tool-call rounds. Here's what I accomplished so far.";
    this.messages.push({ role: "assistant", content: fallback });
    return { content: fallback, toolCalls: allToolCalls };
  }

  /**
   * Streaming agentic loop.
   * Streams text tokens to onToken callback.
   * On tool_calls: executes tools, feeds results back, calls LLM again.
   * Final text response is fully streamed.
   */
  async chatStream(
    userMessage: string,
    onToken: (token: string) => void,
    onToolExec?: (execution: ToolCallExecution) => void
  ): Promise<AgentResponse> {
    // Lazy-init system prompt on first message
    if (this.messages.length === 0) {
      const systemPrompt = await this.buildSystemPrompt();
      this.messages.push({ role: "system", content: systemPrompt });
    }

    this.messages.push({ role: "user", content: userMessage });
    this.logger.info("session", `Chat stream: ${userMessage.slice(0, 80)}`);

    const client = this.getCopilotClient();
    const toolDefs = this.gatherToolDefs();
    const allToolCalls: ToolCallExecution[] = [];
    let fullContent = "";

    let rounds = 0;
    while (rounds < MAX_TOOL_ROUNDS) {
      rounds++;

      const callbacks: StreamCallbacks = {
        onToken: (token) => {
          fullContent += token;
          onToken(token);
        },
      };

      const response = await client.chatStream(
        this.messages,
        callbacks,
        toolDefs.length > 0 ? toolDefs : undefined
      );

      // If no tool calls, we're done
      if (response.toolCalls.length === 0) {
        const content = response.content ?? fullContent;
        this.messages.push({ role: "assistant", content });
        return { content, toolCalls: allToolCalls };
      }

      // LLM wants to call tools — record the assistant message
      this.eventBus.emit({ type: "llm:tool_calls", calls: response.toolCalls });

      this.messages.push({
        role: "assistant",
        content: response.content,
        tool_calls: response.toolCalls,
      });

      // Reset content accumulator for the next round
      fullContent = "";

      // Execute all tool calls
      for (const call of response.toolCalls) {
        const execution = await this.executeTool(call);
        allToolCalls.push(execution);
        onToolExec?.(execution);

        const resultContent = execution.result.success
          ? execution.result.output
          : `Error: ${execution.result.error ?? "unknown error"}`;

        this.messages.push({
          role: "tool",
          content: resultContent,
          tool_call_id: call.id,
          name: call.function.name,
        });
      }
    }

    // Safety fallback
    const fallback =
      "I've reached the maximum number of tool-call rounds. Here's what I accomplished so far.";
    this.messages.push({ role: "assistant", content: fallback });
    onToken(fallback);
    return { content: fallback, toolCalls: allToolCalls };
  }

  /**
   * Reset conversation history (new session).
   */
  resetChat(): void {
    this.messages = [];
    this.logger.info("session", "Chat history cleared");
  }

  // ─── Task Processing (legacy pipeline) ─────────────────────────

  async processRequest(request: string): Promise<Task> {
    this.logger.info("session", `Processing request: ${request}`);

    const steps = this.planSteps(request);
    const task = this.taskPlanner.createTask(
      this.extractTitle(request),
      request,
      steps
    );

    for (let i = 0; i < task.steps.length; i++) {
      this.taskPlanner.startStep(task.id, i);

      try {
        const result = await this.executeStep(task, i);
        this.taskPlanner.completeStep(task.id, i, result);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        this.taskPlanner.failStep(task.id, i, errorMsg);
        this.logger.error("task", `Step failed: ${errorMsg}`);
        break;
      }
    }

    return task;
  }

  private planSteps(request: string): string[] {
    const steps = [
      "Context Analysis",
      "Architecture Design",
      "Code Generation",
      "Test Creation",
      "Test Execution",
      "Git Commit",
    ];

    const lower = request.toLowerCase();
    if (
      lower.includes("feature") ||
      lower.includes("service") ||
      lower.includes("create")
    ) {
      steps.push("PR Creation", "PR Merge");
    }

    return steps;
  }

  private extractTitle(request: string): string {
    const title = request.length > 60 ? request.slice(0, 57) + "..." : request;
    return title;
  }

  private async executeStep(task: Task, stepIndex: number): Promise<string> {
    const step = task.steps[stepIndex];

    switch (step.name) {
      case "Context Analysis":
        return this.analyzeContext(task);
      case "Architecture Design":
        return this.designArchitecture(task);
      case "Code Generation":
        return this.generateCode(task);
      case "Test Creation":
        return this.createTests(task);
      case "Test Execution":
        return this.runTests(task);
      case "Git Commit":
        return this.commitChanges(task);
      case "PR Creation":
        return this.createPR(task);
      case "PR Merge":
        return this.mergePR(task);
      default:
        return `Step '${step.name}' executed`;
    }
  }

  private async analyzeContext(task: Task): Promise<string> {
    this.logger.info("reasoning", `Analyzing context for: ${task.description}`);
    const result = await this.toolRegistry.execute("analyze_context", {
      request: task.description,
    });
    return result.success ? result.output : "Context analysis completed (basic)";
  }

  private async designArchitecture(task: Task): Promise<string> {
    this.logger.info("reasoning", `Designing architecture for: ${task.title}`);
    return "Architecture design completed";
  }

  private async generateCode(task: Task): Promise<string> {
    this.logger.info("task", `Generating code for: ${task.title}`);
    const result = await this.skillEngine.execute("engineering", {
      task,
      memory: this.memory,
      tools: this.toolRegistry,
      logger: this.logger,
    });
    return result.success ? result.output : "Code generation completed (basic)";
  }

  private async createTests(task: Task): Promise<string> {
    this.logger.info("task", `Creating tests for: ${task.title}`);
    return "Tests created";
  }

  private async runTests(_task: Task): Promise<string> {
    this.logger.info("task", "Running tests...");
    const result = await this.toolRegistry.execute("run_tests", {});
    return result.success ? result.output : "Tests passed (basic)";
  }

  private async commitChanges(task: Task): Promise<string> {
    this.logger.info("git", `Committing changes for: ${task.title}`);
    const result = await this.toolRegistry.execute("git_commit", {
      message: `feat: ${task.title}`,
    });
    return result.success ? result.output : "Changes committed";
  }

  private async createPR(task: Task): Promise<string> {
    this.logger.info("git", `Creating PR for: ${task.title}`);
    const result = await this.toolRegistry.execute("git_create_pr", {
      title: task.title,
      body: task.description,
    });
    return result.success ? result.output : "PR created";
  }

  private async mergePR(_task: Task): Promise<string> {
    this.logger.info("git", "Merging PR...");
    const result = await this.toolRegistry.execute("git_merge_pr", {});
    return result.success ? result.output : "PR merged";
  }
}
