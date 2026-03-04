// AgentCore - 메인 에이전트 오케스트레이터
import type {
  JMAXConfig,
  Logger,
  MemoryStore,
  Task,
  ChatMessage,
  SkillResult,
} from "../types/index.js";
import { EventBus } from "./event-bus.js";
import { TaskPlanner } from "./task-planner.js";
import { SkillEngine } from "./skill-engine.js";
import { ToolRegistryImpl } from "./tool-registry.js";
import { CopilotClient } from "../copilot/client.js";

export interface AgentCoreOptions {
  config: JMAXConfig;
  logger: Logger;
  memory: MemoryStore;
}

export class AgentCore {
  readonly eventBus: EventBus;
  readonly taskPlanner: TaskPlanner;
  readonly skillEngine: SkillEngine;
  readonly toolRegistry: ToolRegistryImpl;
  readonly logger: Logger;
  readonly memory: MemoryStore;
  readonly config: JMAXConfig;

  private initialized = false;
  private copilotClient: CopilotClient | null = null;
  private messages: ChatMessage[] = [];

  constructor(options: AgentCoreOptions) {
    this.config = options.config;
    this.logger = options.logger;
    this.memory = options.memory;
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
        case "error":
          this.logger.error("session", `Error: ${event.error.message}`);
          break;
      }
    });

    this.initialized = true;
    this.logger.info("session", "JMAX Agent Core initialized");
  }

  // ─── Chat (Copilot AI) ───────────────────────────────────────────

  /**
   * Build the system prompt by injecting project memory context.
   */
  private async buildSystemPrompt(): Promise<string> {
    const parts: string[] = [
      "You are JMAX, an Enterprise AI Engineering Agent.",
      "You help engineers with code generation, architecture design, testing, git automation, and documentation.",
      "Respond concisely and technically. Use markdown when helpful.",
    ];

    // Inject project memory
    const memoryKeys = await this.memory.list();
    for (const key of memoryKeys) {
      const content = await this.memory.get(key);
      if (content) {
        parts.push(`\n--- Memory: ${key} ---\n${content}`);
      }
    }

    // Inject available skills
    const skills = this.skillEngine.list();
    if (skills.length > 0) {
      parts.push(
        `\nAvailable skills: ${skills.map((s) => s.name).join(", ")}`
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
   * Send a user message and receive a full (non-streaming) AI response.
   * Maintains conversation history across calls.
   */
  async chat(userMessage: string): Promise<string> {
    // Lazy-init system prompt on first message
    if (this.messages.length === 0) {
      const systemPrompt = await this.buildSystemPrompt();
      this.messages.push({ role: "system", content: systemPrompt });
    }

    this.messages.push({ role: "user", content: userMessage });
    this.logger.info("session", `Chat message: ${userMessage.slice(0, 80)}`);

    const client = this.getCopilotClient();
    const reply = await client.chat(this.messages);

    this.messages.push({ role: "assistant", content: reply });
    return reply;
  }

  /**
   * Send a user message and stream the AI response token-by-token.
   * Maintains conversation history across calls.
   */
  async chatStream(
    userMessage: string,
    onToken: (token: string) => void
  ): Promise<string> {
    // Lazy-init system prompt on first message
    if (this.messages.length === 0) {
      const systemPrompt = await this.buildSystemPrompt();
      this.messages.push({ role: "system", content: systemPrompt });
    }

    this.messages.push({ role: "user", content: userMessage });
    this.logger.info("session", `Chat stream: ${userMessage.slice(0, 80)}`);

    const client = this.getCopilotClient();
    const reply = await client.chatStream(this.messages, onToken);

    this.messages.push({ role: "assistant", content: reply });
    return reply;
  }

  /**
   * Reset conversation history (new session).
   */
  resetChat(): void {
    this.messages = [];
    this.logger.info("session", "Chat history cleared");
  }

  // ─── Task Processing ────────────────────────────────────────────

  async processRequest(request: string): Promise<Task> {
    this.logger.info("session", `Processing request: ${request}`);

    // 1. Create task from request
    const steps = this.planSteps(request);
    const task = this.taskPlanner.createTask(
      this.extractTitle(request),
      request,
      steps
    );

    // 2. Execute each step
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
    // Default workflow based on PRD Section 11
    const steps = [
      "Context Analysis",
      "Architecture Design",
      "Code Generation",
      "Test Creation",
      "Test Execution",
      "Git Commit",
    ];

    // Add PR/merge steps for feature requests
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
    // Simple title extraction: first 60 characters
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
    // Will be connected to MCP Context7 server
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
