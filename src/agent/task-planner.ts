// TaskPlanner - 작업 계획 및 상태 관리
import { randomUUID } from "node:crypto";
import type { Task, TaskStatus, TaskStep } from "../types/index.js";
import { EventBus } from "./event-bus.js";

export class TaskPlanner {
  private tasks = new Map<string, Task>();

  constructor(private eventBus: EventBus) {}

  createTask(title: string, description: string, stepNames: string[]): Task {
    const task: Task = {
      id: randomUUID(),
      title,
      description,
      status: "pending",
      steps: stepNames.map((name) => ({
        id: randomUUID(),
        name,
        status: "pending" as TaskStatus,
      })),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.tasks.set(task.id, task);
    this.eventBus.emit({ type: "task:created", task });
    return task;
  }

  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  listTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  updateTaskStatus(taskId: string, status: TaskStatus): void {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task '${taskId}' not found`);

    task.status = status;
    task.updatedAt = new Date();
    this.eventBus.emit({ type: "task:updated", task });
  }

  startStep(taskId: string, stepIndex: number): TaskStep {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task '${taskId}' not found`);

    const step = task.steps[stepIndex];
    if (!step) throw new Error(`Step index ${stepIndex} not found`);

    step.status = "in_progress";
    step.startedAt = new Date();
    task.status = "in_progress";
    task.updatedAt = new Date();

    this.eventBus.emit({ type: "step:started", taskId, step });
    return step;
  }

  completeStep(taskId: string, stepIndex: number, result?: string): TaskStep {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task '${taskId}' not found`);

    const step = task.steps[stepIndex];
    if (!step) throw new Error(`Step index ${stepIndex} not found`);

    step.status = "completed";
    step.result = result;
    step.completedAt = new Date();
    task.updatedAt = new Date();

    // Check if all steps are completed
    const allDone = task.steps.every((s) => s.status === "completed");
    if (allDone) {
      task.status = "completed";
      this.eventBus.emit({ type: "task:completed", task });
    }

    this.eventBus.emit({ type: "step:completed", taskId, step });
    return step;
  }

  failStep(taskId: string, stepIndex: number, error: string): TaskStep {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task '${taskId}' not found`);

    const step = task.steps[stepIndex];
    if (!step) throw new Error(`Step index ${stepIndex} not found`);

    step.status = "failed";
    step.error = error;
    step.completedAt = new Date();
    task.status = "failed";
    task.updatedAt = new Date();

    this.eventBus.emit({ type: "step:completed", taskId, step });
    return step;
  }
}
