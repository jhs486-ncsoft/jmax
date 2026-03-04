// TUI Console - Ink 기반 터미널 UI
import React, { useState, useEffect } from "react";
import { render, Box, Text } from "ink";
import type { Task, AgentEvent } from "../types/index.js";
import type { AgentCore } from "../agent/agent-core.js";

// ─── Header Component ──────────────────────────────────────────────

interface HeaderProps {
  version: string;
}

export const Header: React.FC<HeaderProps> = ({ version }) => (
  <Box borderStyle="round" borderColor="cyan" paddingX={1}>
    <Text bold color="cyan">
      JMAX - AI Engineering Agent v{version}
    </Text>
  </Box>
);

// ─── Task Progress Component ────────────────────────────────────────

interface TaskProgressProps {
  tasks: Task[];
}

export const TaskProgress: React.FC<TaskProgressProps> = ({ tasks }) => {
  if (tasks.length === 0) {
    return (
      <Box paddingX={1}>
        <Text dimColor>No active tasks</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold underline>
        Task Progress
      </Text>
      {tasks.map((task) => (
        <Box key={task.id} flexDirection="column" marginTop={1}>
          <Text>
            {getStatusIcon(task.status)} {task.title}
          </Text>
          {task.steps.map((step, i) => (
            <Text key={step.id} dimColor={step.status === "pending"}>
              {"  "}
              {getStatusIcon(step.status)} {step.name}
              {step.result ? ` - ${step.result}` : ""}
              {step.error ? ` - ERROR: ${step.error}` : ""}
            </Text>
          ))}
        </Box>
      ))}
    </Box>
  );
};

// ─── Log Panel Component ────────────────────────────────────────────

interface LogEntry {
  timestamp: string;
  level: string;
  category: string;
  message: string;
}

interface LogPanelProps {
  logs: LogEntry[];
  maxLines?: number;
}

export const LogPanel: React.FC<LogPanelProps> = ({
  logs,
  maxLines = 10,
}) => {
  const visibleLogs = logs.slice(-maxLines);

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold underline>
        Logs
      </Text>
      {visibleLogs.length === 0 ? (
        <Text dimColor>No logs yet</Text>
      ) : (
        visibleLogs.map((log, i) => (
          <Text key={i} color={getLogColor(log.level)}>
            [{log.timestamp}] [{log.category}] {log.message}
          </Text>
        ))
      )}
    </Box>
  );
};

// ─── Git Activity Component ─────────────────────────────────────────

interface GitActivityProps {
  activities: string[];
}

export const GitActivity: React.FC<GitActivityProps> = ({ activities }) => (
  <Box flexDirection="column" paddingX={1}>
    <Text bold underline>
      Git Activity
    </Text>
    {activities.length === 0 ? (
      <Text dimColor>No git activity</Text>
    ) : (
      activities.slice(-5).map((activity, i) => (
        <Text key={i} color="green">
          {activity}
        </Text>
      ))
    )}
  </Box>
);

// ─── Main App Component ─────────────────────────────────────────────

interface AppProps {
  agent: AgentCore;
}

export const App: React.FC<AppProps> = ({ agent }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [gitActivities, setGitActivities] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = agent.eventBus.on((event: AgentEvent) => {
      switch (event.type) {
        case "task:created":
        case "task:updated":
        case "task:completed":
          setTasks(agent.taskPlanner.listTasks());
          break;
        case "step:started":
        case "step:completed":
          setTasks(agent.taskPlanner.listTasks());
          break;
        case "log":
          setLogs((prev) => [
            ...prev,
            {
              timestamp: new Date().toISOString().slice(11, 19),
              level: event.level,
              category: event.category,
              message: event.message,
            },
          ]);
          break;
        case "git:operation":
          setGitActivities((prev) => [
            ...prev,
            `${event.operation.type}: ${JSON.stringify(event.operation.params)}`,
          ]);
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [agent]);

  return (
    <Box flexDirection="column" width="100%">
      <Header version="0.1.0" />
      <Box flexDirection="column" borderStyle="single" borderColor="gray">
        <TaskProgress tasks={tasks} />
      </Box>
      <Box flexDirection="row">
        <Box
          flexDirection="column"
          flexGrow={1}
          borderStyle="single"
          borderColor="gray"
        >
          <LogPanel logs={logs} />
        </Box>
        <Box
          flexDirection="column"
          width={40}
          borderStyle="single"
          borderColor="gray"
        >
          <GitActivity activities={gitActivities} />
        </Box>
      </Box>
    </Box>
  );
};

// ─── Helpers ────────────────────────────────────────────────────────

function getStatusIcon(status: string): string {
  switch (status) {
    case "completed":
      return "[done]";
    case "in_progress":
      return "[....]";
    case "failed":
      return "[FAIL]";
    case "pending":
      return "[    ]";
    case "cancelled":
      return "[skip]";
    default:
      return "[    ]";
  }
}

function getLogColor(level: string): string {
  switch (level) {
    case "error":
      return "red";
    case "warn":
      return "yellow";
    case "info":
      return "blue";
    case "debug":
      return "gray";
    default:
      return "white";
  }
}

// ─── Render Function ────────────────────────────────────────────────

export function renderTUI(agent: AgentCore): void {
  render(React.createElement(App, { agent }));
}
