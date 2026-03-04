// Copilot Chat Client - GitHub Copilot API를 통한 채팅
// OpenAI-호환 API를 openai 패키지로 호출

import OpenAI from "openai";
import type { ChatMessage, Logger } from "../types/index.js";
import { AuthStore } from "./auth-store.js";

const COPILOT_API_BASE = "https://api.githubcopilot.com";
const USER_AGENT = "jmax/0.1.0";
const DEFAULT_MODEL = "gpt-4o";

export interface CopilotClientOptions {
  model?: string;
  logger?: Logger;
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
   * 단일 메시지에 대한 응답 (non-streaming)
   */
  async chat(messages: ChatMessage[]): Promise<string> {
    const client = await this.ensureClient();

    this.logger?.debug("tool", `Copilot API call: ${this.model}, ${messages.length} messages`);

    const response = await client.chat.completions.create({
      model: this.model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from Copilot API");
    }

    return content;
  }

  /**
   * 스트리밍 응답 - 토큰 단위로 콜백 호출
   */
  async chatStream(
    messages: ChatMessage[],
    onToken: (token: string) => void,
    onDone?: (fullResponse: string) => void
  ): Promise<string> {
    const client = await this.ensureClient();

    this.logger?.debug("tool", `Copilot API stream: ${this.model}, ${messages.length} messages`);

    const stream = await client.chat.completions.create({
      model: this.model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      stream: true,
    });

    let fullResponse = "";

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullResponse += delta;
        onToken(delta);
      }
    }

    if (onDone) {
      onDone(fullResponse);
    }

    return fullResponse;
  }

  /**
   * 모델 변경
   */
  setModel(model: string): void {
    this.model = model;
  }

  /**
   * 현재 모델 이름
   */
  getModel(): string {
    return this.model;
  }

  /**
   * 클라이언트 리셋 (재인증 시)
   */
  reset(): void {
    this.client = null;
  }
}
