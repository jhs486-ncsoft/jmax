// Copilot Chat Client - GitHub Copilot API를 통한 채팅
// OpenAI-호환 API를 openai 패키지로 호출
// Supports: non-streaming, streaming, function calling (tool_calls)

import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
  ChatCompletionChunk,
} from "openai/resources/chat/completions";
import type {
  ChatMessage,
  Logger,
  OpenAIToolDef,
  ToolCallRequest,
} from "../types/index.js";
import { AuthStore } from "./auth-store.js";

const COPILOT_API_BASE = "https://api.githubcopilot.com";
const USER_AGENT = "jmax/0.1.0";
const DEFAULT_MODEL = "gpt-4o";

export interface CopilotClientOptions {
  model?: string;
  logger?: Logger;
}

/** Result of a single LLM call (may contain tool_calls instead of content) */
export interface LLMResponse {
  content: string | null;
  toolCalls: ToolCallRequest[];
  finishReason: string;
}

/** Streaming callbacks */
export interface StreamCallbacks {
  onToken?: (token: string) => void;
  onToolCallStart?: (index: number, id: string, name: string) => void;
  onToolCallArgDelta?: (index: number, argsDelta: string) => void;
  onDone?: (response: LLMResponse) => void;
}

export class CopilotClient {
  private client: OpenAI | null = null;
  private authStore: AuthStore;
  private model: string;
  private logger?: Logger;

  constructor(options: CopilotClientOptions = {}) {
    this.authStore = new AuthStore();
    this.model = options.model || DEFAULT_MODEL;
    this.logger = options.logger;
  }

  /**
   * OpenAI 클라이언트를 초기화 (인증 토큰으로)
   */
  private async ensureClient(): Promise<OpenAI> {
    if (this.client) return this.client;

    const auth = await this.authStore.load();
    if (!auth || !auth.refresh) {
      throw new Error(
        "GitHub Copilot 인증이 필요합니다. 'jmax login'을 먼저 실행하세요."
      );
    }

    this.client = new OpenAI({
      baseURL: COPILOT_API_BASE,
      apiKey: auth.refresh,
      defaultHeaders: {
        "User-Agent": USER_AGENT,
        "Openai-Intent": "conversation-edits",
        "x-initiator": "user",
      },
    });

    return this.client;
  }

  /**
   * Convert JMAX ChatMessage[] to OpenAI SDK format
   */
  private toOpenAIMessages(messages: ChatMessage[]): ChatCompletionMessageParam[] {
    return messages.map((m): ChatCompletionMessageParam => {
      if (m.role === "tool") {
        return {
          role: "tool" as const,
          content: m.content ?? "",
          tool_call_id: m.tool_call_id!,
        };
      }
      if (m.role === "assistant" && m.tool_calls && m.tool_calls.length > 0) {
        return {
          role: "assistant" as const,
          content: m.content ?? null,
          tool_calls: m.tool_calls.map((tc) => ({
            id: tc.id,
            type: "function" as const,
            function: {
              name: tc.function.name,
              arguments: tc.function.arguments,
            },
          })),
        };
      }
      if (m.role === "system") {
        return { role: "system" as const, content: m.content ?? "" };
      }
      if (m.role === "user") {
        return { role: "user" as const, content: m.content ?? "" };
      }
      // default assistant (text only)
      return { role: "assistant" as const, content: m.content ?? "" };
    });
  }

  /**
   * Convert OpenAIToolDef[] to OpenAI SDK ChatCompletionTool[]
   */
  private toSDKTools(tools: OpenAIToolDef[]): ChatCompletionTool[] {
    return tools.map((t) => ({
      type: "function" as const,
      function: {
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters as Record<string, unknown>,
      },
    }));
  }

  /**
   * Non-streaming call with optional tools
   */
  async chat(
    messages: ChatMessage[],
    tools?: OpenAIToolDef[]
  ): Promise<LLMResponse> {
    const client = await this.ensureClient();
    this.logger?.debug(
      "tool",
      `Copilot API call: ${this.model}, ${messages.length} msgs, ${tools?.length ?? 0} tools`
    );

    const params: Record<string, unknown> = {
      model: this.model,
      messages: this.toOpenAIMessages(messages),
    };
    if (tools && tools.length > 0) {
      params.tools = this.toSDKTools(tools);
      params.tool_choice = "auto";
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await client.chat.completions.create(params as any);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const choice = (response as any).choices[0];
    if (!choice) throw new Error("Empty response from Copilot API");

    const rawToolCalls: Array<{
      id: string;
      type: string;
      function: { name: string; arguments: string };
    }> = choice.message.tool_calls ?? [];

    const toolCalls: ToolCallRequest[] = rawToolCalls.map((tc) => ({
      id: tc.id,
      type: "function" as const,
      function: {
        name: tc.function.name,
        arguments: tc.function.arguments,
      },
    }));

    return {
      content: choice.message.content,
      toolCalls,
      finishReason: choice.finish_reason ?? "stop",
    };
  }

  /**
   * Streaming call with optional tools.
   * Handles both text content deltas and tool_calls deltas.
   */
  async chatStream(
    messages: ChatMessage[],
    callbacks: StreamCallbacks,
    tools?: OpenAIToolDef[]
  ): Promise<LLMResponse> {
    const client = await this.ensureClient();
    this.logger?.debug(
      "tool",
      `Copilot API stream: ${this.model}, ${messages.length} msgs, ${tools?.length ?? 0} tools`
    );

    const params: Record<string, unknown> = {
      model: this.model,
      messages: this.toOpenAIMessages(messages),
      stream: true,
    };
    if (tools && tools.length > 0) {
      params.tools = this.toSDKTools(tools);
      params.tool_choice = "auto";
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stream = await client.chat.completions.create(params as any);

    let fullContent = "";
    let finishReason = "stop";

    // Accumulate tool_calls from streaming deltas
    const toolCallsMap = new Map<
      number,
      { id: string; name: string; arguments: string }
    >();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for await (const chunk of stream as any) {
      const typedChunk = chunk as ChatCompletionChunk;
      const delta = typedChunk.choices[0]?.delta;
      if (!delta) continue;

      // Update finish_reason
      const fr = typedChunk.choices[0]?.finish_reason;
      if (fr) finishReason = fr;

      // Text content delta
      if (delta.content) {
        fullContent += delta.content;
        callbacks.onToken?.(delta.content);
      }

      // Tool calls delta
      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index;
          const existing = toolCallsMap.get(idx);

          if (!existing) {
            // New tool call starting
            const id = tc.id ?? "";
            const name = tc.function?.name ?? "";
            toolCallsMap.set(idx, { id, name, arguments: tc.function?.arguments ?? "" });
            if (id && name) {
              callbacks.onToolCallStart?.(idx, id, name);
            }
          } else {
            // Append to existing
            if (tc.id) existing.id = tc.id;
            if (tc.function?.name) {
              existing.name += tc.function.name;
              callbacks.onToolCallStart?.(idx, existing.id, existing.name);
            }
            if (tc.function?.arguments) {
              existing.arguments += tc.function.arguments;
              callbacks.onToolCallArgDelta?.(idx, tc.function.arguments);
            }
          }
        }
      }
    }

    // Build final tool calls array
    const toolCalls: ToolCallRequest[] = [];
    for (const [, tc] of [...toolCallsMap.entries()].sort(
      (a, b) => a[0] - b[0]
    )) {
      toolCalls.push({
        id: tc.id,
        type: "function",
        function: {
          name: tc.name,
          arguments: tc.arguments,
        },
      });
    }

    const response: LLMResponse = {
      content: fullContent || null,
      toolCalls,
      finishReason,
    };

    callbacks.onDone?.(response);
    return response;
  }

  /** Change model */
  setModel(model: string): void {
    this.model = model;
  }

  /** Current model name */
  getModel(): string {
    return this.model;
  }

  /** Reset client (for re-auth) */
  reset(): void {
    this.client = null;
  }
}
