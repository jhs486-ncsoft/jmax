// EventBus Tests
import { describe, it, expect, vi } from "vitest";
import { EventBus } from "../src/agent/event-bus.js";
import type { AgentEvent } from "../src/types/index.js";

describe("EventBus", () => {
  it("should emit events to handlers", () => {
    const bus = new EventBus();
    const handler = vi.fn();

    bus.on(handler);
    const event: AgentEvent = {
      type: "log",
      level: "info",
      category: "session",
      message: "test message",
    };
    bus.emit(event);

    expect(handler).toHaveBeenCalledWith(event);
  });

  it("should support multiple handlers", () => {
    const bus = new EventBus();
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    bus.on(handler1);
    bus.on(handler2);

    const event: AgentEvent = {
      type: "log",
      level: "info",
      category: "session",
      message: "test",
    };
    bus.emit(event);

    expect(handler1).toHaveBeenCalledOnce();
    expect(handler2).toHaveBeenCalledOnce();
  });

  it("should unsubscribe handlers", () => {
    const bus = new EventBus();
    const handler = vi.fn();

    const unsubscribe = bus.on(handler);
    unsubscribe();

    bus.emit({
      type: "log",
      level: "info",
      category: "session",
      message: "test",
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it("should not crash if handler throws", () => {
    const bus = new EventBus();
    const errorHandler = vi.fn(() => {
      throw new Error("handler error");
    });
    const goodHandler = vi.fn();

    bus.on(errorHandler);
    bus.on(goodHandler);

    bus.emit({
      type: "log",
      level: "info",
      category: "session",
      message: "test",
    });

    expect(errorHandler).toHaveBeenCalledOnce();
    expect(goodHandler).toHaveBeenCalledOnce();
  });
});
