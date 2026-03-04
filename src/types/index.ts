// JMAX - Enterprise AI Engineering Agent
// Core type definitions

// ─── Task ───────────────────────────────────────────────────────────

export type TaskStatus =
  | "pending"
  | "planning"
  | "in_progress"
  | "testing"
  | "committing"
  | "completed"
  | "failed"
  | "cancelled";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  steps: TaskStep[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface TaskStep {
  id: string;
  name: string;
  status: TaskStatus;
  tool?: string;
  result?: string;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

// ─── Skill ──────────────────────────────────────────────────────────

export interface Skill {
  name: string;
  description: string;
  abilities: string[];
  execute(context: SkillContext): Promise<SkillResult>;
}

export interface SkillContext {
  task: Task;
  memory: MemoryStore;
  tools: ToolRegistry;
  logger: Logger;
}

export interface SkillResult {
  success: boolean;
  output: string;
  artifacts?: Artifact[];
  error?: string;
}

export interface Artifact {
  type: "code" | "document" | "test" | "config";
  path: string;
  content: string;
}

// ─── MCP ────────────────────────────────────────────────────────────

export interface MCPServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  enabled: boolean;
}

export interface MCPToolCall {
  server: string;
  tool: string;
  arguments: Record<string, unknown>;
}

export interface MCPToolResult {
  success: boolean;
  content: unknown;
  error?: string;
}

// ─── Memory ─────────────────────────────────────────────────────────

export interface MemoryStore {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string): Promise<void>;
  list(): Promise<string[]>;
  load(category: MemoryCategory): Promise<Record<string, string>>;
}

export type MemoryCategory =
  | "project"
  | "coding-style"
  | "team-preference"
  | "architecture";

// ─── Git ────────────────────────────────────────────────────────────

export interface GitOperation {
  type: "branch" | "commit" | "push" | "pr" | "merge" | "tag";
  params: Record<string, string>;
}

export interface PRInfo {
  title: string;
  body: string;
  branch: string;
  baseBranch: string;
  labels?: string[];
}

// ─── Logging ────────────────────────────────────────────────────────

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogCategory =
  | "session"
  | "task"
  | "tool"
  | "git"
  | "reasoning";

export interface Logger {
  log(level: LogLevel, category: LogCategory, message: string, meta?: Record<string, unknown>): void;
  info(category: LogCategory, message: string, meta?: Record<string, unknown>): void;
  error(category: LogCategory, message: string, meta?: Record<string, unknown>): void;
  debug(category: LogCategory, message: string, meta?: Record<string, unknown>): void;
  warn(category: LogCategory, message: string, meta?: Record<string, unknown>): void;
}

// ─── Tool ───────────────────────────────────────────────────────────

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, ToolParameter>;
  execute(args: Record<string, unknown>): Promise<ToolResult>;
}

export interface ToolParameter {
  type: "string" | "number" | "boolean" | "object" | "array";
  description: string;
  required?: boolean;
}

export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
}

export interface ToolRegistry {
  register(tool: Tool): void;
  get(name: string): Tool | undefined;
  list(): Tool[];
  execute(name: string, args: Record<string, unknown>): Promise<ToolResult>;
}

// ─── Config ─────────────────────────────────────────────────────────

export interface JMAXConfig {
  model: ModelConfig;
  mcp: MCPConfig;
  git: GitConfig;
  logging: LoggingConfig;
}

export interface ModelConfig {
  primary: string;
  fallback: string[];
  apiKey?: string;
}

export interface MCPConfig {
  servers: MCPServerConfig[];
}

export interface GitConfig {
  autoCommit: boolean;
  autoPR: boolean;
  autoMerge: boolean;
  prTemplate: string;
  baseBranch: string;
}

export interface LoggingConfig {
  level: LogLevel;
  directory: string;
  categories: LogCategory[];
}

// ─── Events ─────────────────────────────────────────────────────────

export type AgentEvent =
  | { type: "task:created"; task: Task }
  | { type: "task:updated"; task: Task }
  | { type: "task:completed"; task: Task }
  | { type: "step:started"; taskId: string; step: TaskStep }
  | { type: "step:completed"; taskId: string; step: TaskStep }
  | { type: "tool:called"; tool: string; args: Record<string, unknown> }
  | { type: "tool:result"; tool: string; result: ToolResult }
  | { type: "git:operation"; operation: GitOperation }
  | { type: "log"; level: LogLevel; category: LogCategory; message: string }
  | { type: "error"; error: Error };

export type AgentEventHandler = (event: AgentEvent) => void;
