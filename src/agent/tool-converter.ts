// Tool Converter - Convert between JMAX Tool, MCP tool, and OpenAI function-calling formats
// Bridges the gap between local tools, MCP tools, and the OpenAI-compatible API

import type {
  Tool,
  ToolParameter,
  OpenAIToolDef,
  OpenAIParamSchema,
  MCPToolInfo,
  ToolResult,
} from "../types/index.js";

/**
 * Convert a JMAX Tool to OpenAI function definition.
 */
export function toolToOpenAI(tool: Tool): OpenAIToolDef {
  const properties: Record<string, OpenAIParamSchema> = {};
  const required: string[] = [];

  for (const [name, param] of Object.entries(tool.parameters)) {
    const schema: OpenAIParamSchema = {
      type: param.type,
      description: param.description,
    };
    if (param.enum) {
      schema.enum = param.enum;
    }
    properties[name] = schema;
    if (param.required) {
      required.push(name);
    }
  }

  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: "object",
        properties,
        required,
      },
    },
  };
}

/**
 * Convert an MCP tool (with full schema) to OpenAI function definition.
 * MCP tools already return JSON Schema in `inputSchema`, which maps almost
 * directly to OpenAI's `function.parameters`.
 */
export function mcpToolToOpenAI(tool: MCPToolInfo): OpenAIToolDef {
  const inputSchema = tool.inputSchema ?? {};
  // MCP inputSchema is typically { type: "object", properties: {...}, required: [...] }
  const properties: Record<string, OpenAIParamSchema> = {};
  const required: string[] = [];

  const schemaProps = (inputSchema as Record<string, unknown>).properties as
    | Record<string, Record<string, unknown>>
    | undefined;
  const schemaRequired = (inputSchema as Record<string, unknown>).required as
    | string[]
    | undefined;

  if (schemaProps) {
    for (const [name, prop] of Object.entries(schemaProps)) {
      properties[name] = {
        type: (prop.type as string) ?? "string",
        description: (prop.description as string) ?? "",
      };
      if (prop.enum) {
        properties[name].enum = prop.enum as string[];
      }
    }
  }

  if (schemaRequired) {
    required.push(...schemaRequired);
  }

  return {
    type: "function",
    function: {
      name: `mcp__${tool.server}__${tool.name}`,
      description: `[MCP:${tool.server}] ${tool.description}`,
      parameters: {
        type: "object",
        properties,
        required,
      },
    },
  };
}

/**
 * Parse an MCP-prefixed tool name back to server + tool name.
 * Returns null if the name doesn't match the mcp__ prefix pattern.
 */
export function parseMCPToolName(
  name: string
): { server: string; tool: string } | null {
  const match = name.match(/^mcp__([^_]+(?:__[^_]+)*)__(.+)$/);
  if (!match) return null;
  // Handle the case where server name might not contain double underscores
  const parts = name.split("__");
  if (parts.length < 3 || parts[0] !== "mcp") return null;
  return {
    server: parts[1],
    tool: parts.slice(2).join("__"),
  };
}

/**
 * Convert a Skill to an OpenAI tool definition so the LLM can invoke skills.
 * Skills get a special prefix `skill__` to distinguish from regular tools.
 */
export function skillToOpenAI(skill: {
  name: string;
  description: string;
  abilities: string[];
}): OpenAIToolDef {
  return {
    type: "function",
    function: {
      name: `skill__${skill.name}`,
      description: `[Skill] ${skill.description}. Abilities: ${skill.abilities.join(", ")}`,
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            description: `The specific action to perform. Available: ${skill.abilities.join(", ")}`,
          },
          context: {
            type: "string",
            description: "Additional context or instructions for the skill",
          },
        },
        required: ["action"],
      },
    },
  };
}

/**
 * Parse a skill-prefixed tool name back to skill name.
 */
export function parseSkillToolName(name: string): string | null {
  if (!name.startsWith("skill__")) return null;
  return name.slice("skill__".length);
}

/**
 * Create a Tool wrapper around an MCP tool so it can be used in ToolRegistry.
 */
export function createMCPToolAdapter(
  tool: MCPToolInfo,
  callTool: (server: string, toolName: string, args: Record<string, unknown>) => Promise<ToolResult>
): Tool {
  const params: Record<string, ToolParameter> = {};
  const inputSchema = tool.inputSchema ?? {};
  const schemaProps = (inputSchema as Record<string, unknown>).properties as
    | Record<string, Record<string, unknown>>
    | undefined;
  const schemaRequired = ((inputSchema as Record<string, unknown>).required as string[]) ?? [];

  if (schemaProps) {
    for (const [name, prop] of Object.entries(schemaProps)) {
      params[name] = {
        type: (prop.type as ToolParameter["type"]) ?? "string",
        description: (prop.description as string) ?? "",
        required: schemaRequired.includes(name),
      };
    }
  }

  return {
    name: `mcp__${tool.server}__${tool.name}`,
    description: `[MCP:${tool.server}] ${tool.description}`,
    parameters: params,
    execute: async (args: Record<string, unknown>) => {
      return callTool(tool.server, tool.name, args);
    },
  };
}
