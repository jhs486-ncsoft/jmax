// Copilot Auth Store Tests
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AuthStore } from "../src/copilot/auth-store.js";
import type { CopilotAuth } from "../src/types/index.js";

// Mock node:fs/promises and node:fs
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  chmod: vi.fn(),
}));

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
}));

import { readFile, writeFile, mkdir, chmod } from "node:fs/promises";
import { existsSync } from "node:fs";

const mockReadFile = vi.mocked(readFile);
const mockWriteFile = vi.mocked(writeFile);
const mockMkdir = vi.mocked(mkdir);
const mockChmod = vi.mocked(chmod);
const mockExistsSync = vi.mocked(existsSync);

describe("AuthStore", () => {
  let store: AuthStore;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new AuthStore();
  });

  it("should return null when no auth file exists", async () => {
    mockExistsSync.mockReturnValue(false);

    const result = await store.load();
    expect(result).toBeNull();
  });

  it("should load auth from file", async () => {
    const authData: CopilotAuth = {
      type: "oauth",
      refresh: "ghu_test_token_12345",
      access: "ghu_test_token_12345",
      expires: 0,
    };

    mockExistsSync.mockReturnValue(true);
    mockReadFile.mockResolvedValue(
      JSON.stringify({ "github-copilot": authData })
    );

    const result = await store.load();
    expect(result).not.toBeNull();
    expect(result?.refresh).toBe("ghu_test_token_12345");
    expect(result?.type).toBe("oauth");
  });

  it("should save auth to file with correct structure", async () => {
    mockExistsSync.mockReturnValue(true);
    mockWriteFile.mockResolvedValue(undefined);
    mockChmod.mockResolvedValue(undefined);

    const auth: CopilotAuth = {
      type: "oauth",
      refresh: "ghu_abc123",
      access: "ghu_abc123",
      expires: 0,
    };

    await store.save(auth);

    expect(mockWriteFile).toHaveBeenCalledOnce();
    const writtenData = JSON.parse(
      (mockWriteFile.mock.calls[0] as unknown[])[1] as string
    );
    expect(writtenData["github-copilot"]).toEqual(auth);
  });

  it("should create directory if it does not exist on save", async () => {
    mockExistsSync.mockReturnValue(false);
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockChmod.mockResolvedValue(undefined);

    const auth: CopilotAuth = {
      type: "oauth",
      refresh: "ghu_abc123",
      access: "ghu_abc123",
      expires: 0,
    };

    await store.save(auth);

    expect(mockMkdir).toHaveBeenCalledOnce();
    expect(mockWriteFile).toHaveBeenCalledOnce();
  });

  it("should set file permissions to 0o600", async () => {
    mockExistsSync.mockReturnValue(true);
    mockWriteFile.mockResolvedValue(undefined);
    mockChmod.mockResolvedValue(undefined);

    const auth: CopilotAuth = {
      type: "oauth",
      refresh: "ghu_abc123",
      access: "ghu_abc123",
      expires: 0,
    };

    await store.save(auth);

    expect(mockChmod).toHaveBeenCalledWith(expect.any(String), 0o600);
  });

  it("should handle chmod failure gracefully (Windows)", async () => {
    mockExistsSync.mockReturnValue(true);
    mockWriteFile.mockResolvedValue(undefined);
    mockChmod.mockRejectedValue(new Error("chmod not supported"));

    const auth: CopilotAuth = {
      type: "oauth",
      refresh: "ghu_abc123",
      access: "ghu_abc123",
      expires: 0,
    };

    // Should not throw
    await expect(store.save(auth)).resolves.toBeUndefined();
  });

  it("should return false for hasToken when no file exists", async () => {
    mockExistsSync.mockReturnValue(false);
    expect(await store.hasToken()).toBe(false);
  });

  it("should return true for hasToken when valid token exists", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFile.mockResolvedValue(
      JSON.stringify({
        "github-copilot": {
          type: "oauth",
          refresh: "ghu_abc123",
          access: "ghu_abc123",
          expires: 0,
        },
      })
    );

    expect(await store.hasToken()).toBe(true);
  });

  it("should clear auth by writing empty object", async () => {
    mockExistsSync.mockReturnValue(true);
    mockWriteFile.mockResolvedValue(undefined);

    await store.clear();

    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.any(String),
      "{}",
      "utf-8"
    );
  });

  it("should return null for corrupted auth file", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFile.mockResolvedValue("not valid json{{{");

    const result = await store.load();
    expect(result).toBeNull();
  });

  it("should return null when auth file has no refresh token", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFile.mockResolvedValue(
      JSON.stringify({
        "github-copilot": { type: "oauth", refresh: "", access: "", expires: 0 },
      })
    );

    const result = await store.load();
    expect(result).toBeNull();
  });

  it("should expose file path", () => {
    const filePath = store.getFilePath();
    expect(filePath).toContain("jmax");
    expect(filePath).toContain("auth.json");
  });
});
