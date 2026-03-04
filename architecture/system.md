# System Architecture

## Overview
JMAX is an Enterprise AI Engineering Agent built on top of OpenCode.

## Components

### TUI Console
Terminal-based interactive console using Ink (React for CLI).

### Agent Core
Central orchestrator that manages task planning, skill execution, and event coordination.

### Skill Engine
Loads and manages skill definitions from markdown files. Executes skills with proper context.

### MCP Client
Model Context Protocol client that connects to external tool servers:
- Context7: Code search, dependency analysis
- Playwright: UI/E2E testing
- Atlassian: JIRA and Confluence integration

### Memory System
Persistent project context storage. Maintains coding style, team preferences, and project knowledge.

### Git Automation
Full Git workflow automation: branch, commit, push, PR, merge, release.

### Logging System
Comprehensive logging across categories: session, task, tool, git, reasoning.

## Data Flow
```
User Request → Agent Core → Task Planner → Skill Engine → MCP Client → External Tools
                                                       → Git Automation
                                                       → Memory System
```
