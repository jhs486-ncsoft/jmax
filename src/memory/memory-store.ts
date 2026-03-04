// Memory System - 프로젝트 컨텍스트 기억
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import type { MemoryStore as IMemoryStore, MemoryCategory } from "../types/index.js";

export class MemoryStoreImpl implements IMemoryStore {
  private baseDir: string;
  private cache = new Map<string, string>();

  constructor(baseDir: string = "./memory") {
    this.baseDir = baseDir;
  }

  async initialize(): Promise<void> {
    if (!existsSync(this.baseDir)) {
      await mkdir(this.baseDir, { recursive: true });
    }

    // Create default memory files if they don't exist
    const defaults: Record<string, string> = {
      "project.md": this.defaultProjectMemory(),
      "coding-style.md": this.defaultCodingStyleMemory(),
      "team-preference.md": this.defaultTeamPreferenceMemory(),
    };

    for (const [file, content] of Object.entries(defaults)) {
      const filePath = join(this.baseDir, file);
      if (!existsSync(filePath)) {
        await writeFile(filePath, content, "utf-8");
      }
    }

    // Load all memory files into cache
    await this.loadAll();
  }

  async get(key: string): Promise<string | undefined> {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const filePath = join(this.baseDir, `${key}.md`);
    if (existsSync(filePath)) {
      const content = await readFile(filePath, "utf-8");
      this.cache.set(key, content);
      return content;
    }

    return undefined;
  }

  async set(key: string, value: string): Promise<void> {
    this.cache.set(key, value);
    const filePath = join(this.baseDir, `${key}.md`);
    await writeFile(filePath, value, "utf-8");
  }

  async list(): Promise<string[]> {
    try {
      const files = await readdir(this.baseDir);
      return files
        .filter((f) => f.endsWith(".md"))
        .map((f) => f.replace(".md", ""));
    } catch {
      return [];
    }
  }

  async load(category: MemoryCategory): Promise<Record<string, string>> {
    const content = await this.get(category);
    if (!content) return {};

    return { [category]: content };
  }

  private async loadAll(): Promise<void> {
    const keys = await this.list();
    for (const key of keys) {
      await this.get(key);
    }
  }

  private defaultProjectMemory(): string {
    return `# Project Memory

## Project Name
JMAX - Enterprise AI Engineering Agent

## Tech Stack
- TypeScript
- Node.js
- MCP Protocol
- Ink (TUI)

## Architecture
- Agent Core: Orchestrates all operations
- Skill Engine: Manages capabilities
- MCP Client: External tool integration
- Memory System: Project context retention
`;
  }

  private defaultCodingStyleMemory(): string {
    return `# Coding Style

## Language
TypeScript (strict mode)

## Conventions
- Use ESM modules
- Prefer async/await over callbacks
- Use interfaces for contracts
- Use classes for stateful components
- Use functions for stateless utilities
- Error handling with try/catch and typed errors

## Naming
- camelCase for variables and functions
- PascalCase for classes and interfaces
- UPPER_SNAKE_CASE for constants
- kebab-case for file names
`;
  }

  private defaultTeamPreferenceMemory(): string {
    return `# Team Preferences

## Testing
- Unit tests: Vitest
- Integration tests: Jest
- E2E tests: Playwright

## Git
- Conventional commits
- Feature branches
- PR-based workflow

## Documentation
- Architecture docs in /architecture
- API docs auto-generated
- Decision records in /docs/decisions
`;
  }
}
