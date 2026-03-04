# Architecture Patterns

## Agent Pattern
The agent uses a pipeline pattern for task execution:
Task → Plan → Execute Steps → Complete

## Event-Driven
All components communicate through an EventBus, enabling loose coupling.

## Plugin/Skill Pattern
Skills are loaded from markdown definitions and executed through a uniform interface.

## MCP Integration
External tools are accessed through the Model Context Protocol, providing a standardized tool interface.
