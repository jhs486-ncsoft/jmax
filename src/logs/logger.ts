// Logging System - 모든 작업 기록
import { mkdirSync, appendFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type {
  Logger as ILogger,
  LogLevel,
  LogCategory,
  LoggingConfig,
} from "../types/index.js";

export class JMAXLogger implements ILogger {
  private logDir: string;
  /** When true, skip all console.log/warn/error output (file logging continues).
   *  Set to true when TUI is active to prevent Ink's patchConsole from
   *  intercepting log output and triggering full-screen clear+rewrite flicker. */
  private _suppressConsole = false;

  constructor(private config: LoggingConfig) {
    this.logDir = config.directory || "./logs";
    this.ensureLogDir();
  }

  /** Enable/disable console output (file logging is always active). */
  set suppressConsole(value: boolean) {
    this._suppressConsole = value;
  }

  private ensureLogDir(): void {
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true });
    }
  }

  log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    meta?: Record<string, unknown>
  ): void {
    if (!this.shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const entry = {
      timestamp,
      level,
      category,
      message,
      ...(meta ? { meta } : {}),
    };

    const line = JSON.stringify(entry) + "\n";

    // Write to category-specific log file
    const categoryFile = join(this.logDir, `${category}.log`);
    appendFileSync(categoryFile, line, "utf-8");

    // Write to session log (all entries)
    if (category !== "session") {
      const sessionFile = join(this.logDir, "session.log");
      appendFileSync(sessionFile, line, "utf-8");
    }

    // Console output (suppressed during TUI to avoid Ink flicker)
    if (!this._suppressConsole) {
      const prefix = `[${timestamp.slice(11, 19)}] [${level.toUpperCase()}] [${category}]`;
      if (level === "error") {
        console.error(`${prefix} ${message}`);
      } else if (level === "warn") {
        console.warn(`${prefix} ${message}`);
      } else if (level === "debug") {
        // Only show debug in debug mode
        if (this.config.level === "debug") {
          console.log(`${prefix} ${message}`);
        }
      } else {
        console.log(`${prefix} ${message}`);
      }
    }
  }

  info(category: LogCategory, message: string, meta?: Record<string, unknown>): void {
    this.log("info", category, message, meta);
  }

  error(category: LogCategory, message: string, meta?: Record<string, unknown>): void {
    this.log("error", category, message, meta);
  }

  debug(category: LogCategory, message: string, meta?: Record<string, unknown>): void {
    this.log("debug", category, message, meta);
  }

  warn(category: LogCategory, message: string, meta?: Record<string, unknown>): void {
    this.log("warn", category, message, meta);
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["debug", "info", "warn", "error"];
    const configIndex = levels.indexOf(this.config.level);
    const messageIndex = levels.indexOf(level);
    return messageIndex >= configIndex;
  }
}
