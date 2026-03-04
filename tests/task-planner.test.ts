// TaskPlanner Tests
import { describe, it, expect, vi } from "vitest";
import { TaskPlanner } from "../src/agent/task-planner.js";
import { EventBus } from "../src/agent/event-bus.js";

describe("TaskPlanner", () => {
  function createPlanner() {
    const eventBus = new EventBus();
    const planner = new TaskPlanner(eventBus);
    return { planner, eventBus };
  }

  it("should create a task with steps", () => {
    const { planner } = createPlanner();

    const task = planner.createTask("Test Task", "Description", [
      "Step 1",
      "Step 2",
      "Step 3",
    ]);

    expect(task.title).toBe("Test Task");
    expect(task.description).toBe("Description");
    expect(task.status).toBe("pending");
    expect(task.steps).toHaveLength(3);
    expect(task.steps[0].name).toBe("Step 1");
  });

  it("should emit task:created event", () => {
    const { planner, eventBus } = createPlanner();
    const handler = vi.fn();
    eventBus.on(handler);

    planner.createTask("Test", "Desc", ["Step 1"]);

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ type: "task:created" })
    );
  });

  it("should start a step", () => {
    const { planner } = createPlanner();
    const task = planner.createTask("Test", "Desc", ["Step 1", "Step 2"]);

    const step = planner.startStep(task.id, 0);

    expect(step.status).toBe("in_progress");
    expect(step.startedAt).toBeDefined();

    const updatedTask = planner.getTask(task.id);
    expect(updatedTask?.status).toBe("in_progress");
  });

  it("should complete a step", () => {
    const { planner } = createPlanner();
    const task = planner.createTask("Test", "Desc", ["Step 1"]);

    planner.startStep(task.id, 0);
    const step = planner.completeStep(task.id, 0, "done");

    expect(step.status).toBe("completed");
    expect(step.result).toBe("done");
    expect(step.completedAt).toBeDefined();
  });

  it("should complete task when all steps done", () => {
    const { planner, eventBus } = createPlanner();
    const handler = vi.fn();
    eventBus.on(handler);

    const task = planner.createTask("Test", "Desc", ["Step 1", "Step 2"]);

    planner.startStep(task.id, 0);
    planner.completeStep(task.id, 0, "done");
    planner.startStep(task.id, 1);
    planner.completeStep(task.id, 1, "done");

    const updatedTask = planner.getTask(task.id);
    expect(updatedTask?.status).toBe("completed");

    const completedEvents = handler.mock.calls.filter(
      ([e]: [{ type: string }]) => e.type === "task:completed"
    );
    expect(completedEvents).toHaveLength(1);
  });

  it("should fail a step and mark task as failed", () => {
    const { planner } = createPlanner();
    const task = planner.createTask("Test", "Desc", ["Step 1", "Step 2"]);

    planner.startStep(task.id, 0);
    const step = planner.failStep(task.id, 0, "error occurred");

    expect(step.status).toBe("failed");
    expect(step.error).toBe("error occurred");

    const updatedTask = planner.getTask(task.id);
    expect(updatedTask?.status).toBe("failed");
  });

  it("should list all tasks", () => {
    const { planner } = createPlanner();

    planner.createTask("Task 1", "Desc 1", ["Step"]);
    planner.createTask("Task 2", "Desc 2", ["Step"]);

    const tasks = planner.listTasks();
    expect(tasks).toHaveLength(2);
  });

  it("should throw for invalid task ID", () => {
    const { planner } = createPlanner();

    expect(() => planner.startStep("invalid-id", 0)).toThrow("not found");
  });

  it("should throw for invalid step index", () => {
    const { planner } = createPlanner();
    const task = planner.createTask("Test", "Desc", ["Step 1"]);

    expect(() => planner.startStep(task.id, 99)).toThrow("not found");
  });
});
