# Data Flow

## Request Processing Flow

```
1. User Input (TUI Chat)
       │
       ▼
2. Agent Core (processRequest)
       │
       ▼
3. Task Planning (createTask + steps)
       │
       ▼
4. Step Execution Loop
       │
       ├─► Context Analysis   → MCP Context7
       ├─► Architecture Design → Skill Engine (engineering)
       ├─► Code Generation    → Skill Engine (engineering)
       ├─► Test Creation      → Skill Engine (engineering)
       ├─► Test Execution     → Tool Registry (vitest/playwright)
       ├─► Git Commit         → Git Automation
       ├─► PR Creation        → Git Automation (gh CLI)
       └─► PR Merge           → Git Automation (gh CLI)
       │
       ▼
5. Task Completion + Logging
```

## Event Flow

```
Agent Core ──emit──► Event Bus ──notify──► Logger
                                        ──notify──► TUI (status update)
                                        ──notify──► Memory (context save)
```
