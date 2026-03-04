// Copilot Client Tests
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CopilotClient } from "../src/copilot/client.js";
import type { ChatMessage, Logger } from "../src/types/index.js";

// Mock the AuthStore to avoid real filesystem access
vi.mock("../src/copilot/auth-store.js", () => ({
  AuthStore: vi.fn().mockImplementation(() => ({
    load: vi.fn().mockResolvedValue({
      type: "oauth",
      refresh: "ghu_mock_token",
      access: "ghu_mock_token",
      expires: 0,
    }),
    hasToken: vi.fn().mockResolvedValue(true),
  })),
}));

// Mock the openai package
const mockCreate = vi.fn();
vi.mock("openai", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    })),
  };
});

describe("CopilotClient", () => {
  let client: CopilotClient;
  const mockLogger: Logger = {
    log: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    client = new CopilotClient({ logger: mockLogger });
  });

  it("should initialize with default model", () => {
    expect(client.getModel()).toBe("gpt-4o");
  });

  it("should accept custom model", () => {
    const customClient = new CopilotClient({ model: "claude-sonnet-4" });
    expect(customClient.getModel()).toBe("claude-sonnet-4");
  });

  it("should change model via setModel", () => {
    client.setModel("gpt-3.5-turbo");
    expect(client.getModel()).toBe("gpt-3.5-turbo");
  });

  it("should call chat completions API for non-streaming", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "Hello from Copilot!" } }],
    });

    const messages: ChatMessage[] = [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "Hello" },
    ];

    const result = await client.chat(messages);

    expect(result).toBe("Hello from Copilot!");
    expect(mockCreate).toHaveBeenCalledWith({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Hello" },
      ],
    });
  });

  it("should throw on empty response", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: null } }],
    });

    const messages: ChatMessage[] = [
      { role: "user", content: "Hello" },
    ];

    await expect(client.chat(messages)).rejects.toThrow(
      "Empty response from Copilot API"
    );
  });

  it("should stream tokens via chatStream", async () => {
    // Create an async iterable that yields chunks
    const chunks = [
      { choices: [{ delta: { content: "Hello" } }] },
      { choices: [{ delta: { content: " world" } }] },
      { choices: [{ delta: { content: "!" } }] },
    ];

    const asyncIterable = {
      [Symbol.asyncIterator]: () => {
        let i = 0;
        return {
          next: () => {
            if (i < chunks.length) {
              return Promise.resolve({ value: chunks[i++], done: false });
            }
            return Promise.resolve({ value: undefined, done: true });
          },
        };
      },
    };

    mockCreate.mockResolvedValue(asyncIterable);

    const tokens: string[] = [];
    const messages: ChatMessage[] = [
      { role: "user", content: "Hello" },
    ];

    const result = await client.chatStream(messages, (token) => {
      tokens.push(token);
    });

    expect(result).toBe("Hello world!");
    expect(tokens).toEqual(["Hello", " world", "!"]);
    expect(mockCreate).toHaveBeenCalledWith({
      model: "gpt-4o",
      messages: [{ role: "user", content: "Hello" }],
      stream: true,
    });
  });

  it("should call onDone callback in chatStream", async () => {
    const chunks = [
      { choices: [{ delta: { content: "Done" } }] },
    ];

    const asyncIterable = {
      [Symbol.asyncIterator]: () => {
        let i = 0;
        return {
          next: () => {
            if (i < chunks.length) {
              return Promise.resolve({ value: chunks[i++], done: false });
            }
            return Promise.resolve({ value: undefined, done: true });
          },
        };
      },
    };

    mockCreate.mockResolvedValue(asyncIterable);

    const onDone = vi.fn();
    const messages: ChatMessage[] = [{ role: "user", content: "test" }];

    await client.chatStream(messages, vi.fn(), onDone);

    expect(onDone).toHaveBeenCalledWith("Done");
  });

  it("should reset client on reset()", () => {
    client.reset();
    // After reset, next call should re-create the OpenAI client
    // This is internal state; we verify it doesn't throw
    expect(() => client.reset()).not.toThrow();
  });

  it("should log debug messages when logger is provided", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "ok" } }],
    });

    const messages: ChatMessage[] = [{ role: "user", content: "test" }];
    await client.chat(messages);

    expect(mockLogger.debug).toHaveBeenCalledWith(
      "tool",
      expect.stringContaining("Copilot API call")
    );
  });
});
