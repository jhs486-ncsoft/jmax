# Service Map

## Internal Services

| Service | Module | Description |
|---------|--------|-------------|
| Agent Core | src/agent/agent-core.ts | Main orchestrator |
| Task Planner | src/agent/task-planner.ts | Task lifecycle management |
| Skill Engine | src/agent/skill-engine.ts | Skill loading and execution |
| Tool Registry | src/agent/tool-registry.ts | Tool registration and dispatch |
| Event Bus | src/agent/event-bus.ts | Internal event system |

## External Services

| Service | Protocol | Description |
|---------|----------|-------------|
| Context7 | MCP | Code search, dependency analysis |
| Playwright | MCP | UI/E2E testing |
| Atlassian | MCP | JIRA + Confluence |
| GitHub | CLI (gh) | PR, merge, release |
