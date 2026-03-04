// EventBus - Agent 내부 이벤트 시스템
import type { AgentEvent, AgentEventHandler } from "../types/index.js";

export class EventBus {
  private handlers: AgentEventHandler[] = [];

  on(handler: AgentEventHandler): () => void {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  emit(event: AgentEvent): void {
    for (const handler of this.handlers) {
      try {
        handler(event);
      } catch (err) {
        console.error("[EventBus] handler error:", err);
      }
    }
  }
}
