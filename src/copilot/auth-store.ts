// Copilot Auth Store - 토큰 저장/로드 (~/.local/share/jmax/auth.json)
// OpenCode와 동일한 저장 방식

import { readFile, writeFile, mkdir, chmod } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir, platform } from "node:os";
import type { CopilotAuth } from "../types/index.js";

function getDataDir(): string {
  const os = platform();
  const home = homedir();

  if (os === "win32") {
    return join(process.env.APPDATA || join(home, "AppData", "Roaming"), "jmax");
  }
  if (os === "darwin") {
    return join(home, "Library", "Application Support", "jmax");
  }
  // Linux / others
  return join(process.env.XDG_DATA_HOME || join(home, ".local", "share"), "jmax");
}

const AUTH_FILE = "auth.json";

export class AuthStore {
  private dataDir: string;
  private filePath: string;

  constructor() {
    this.dataDir = getDataDir();
    this.filePath = join(this.dataDir, AUTH_FILE);
  }

  async save(auth: CopilotAuth): Promise<void> {
    if (!existsSync(this.dataDir)) {
      await mkdir(this.dataDir, { recursive: true });
    }

    const data = {
      "github-copilot": auth,
    };

    await writeFile(this.filePath, JSON.stringify(data, null, 2), "utf-8");

    // 파일 권한 600 (owner read/write only) - Windows에서는 무시됨
    try {
      await chmod(this.filePath, 0o600);
    } catch {
      // Windows에서는 chmod가 동작하지 않을 수 있음
    }
  }

  async load(): Promise<CopilotAuth | null> {
    if (!existsSync(this.filePath)) {
      return null;
    }

    try {
      const raw = await readFile(this.filePath, "utf-8");
      const data = JSON.parse(raw);
      const auth = data["github-copilot"] as CopilotAuth | undefined;

      if (!auth || !auth.refresh) {
        return null;
      }

      return auth;
    } catch {
      return null;
    }
  }

  async clear(): Promise<void> {
    if (existsSync(this.filePath)) {
      await writeFile(this.filePath, "{}", "utf-8");
    }
  }

  async hasToken(): Promise<boolean> {
    const auth = await this.load();
    return auth !== null && !!auth.refresh;
  }

  getFilePath(): string {
    return this.filePath;
  }
}
