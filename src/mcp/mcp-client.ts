// MCP Client - Model Context Protocol 서버 연결 관리
// Now preserves full tool metadata (name, description, inputSchema) for function-calling
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type {
  MCPServerConfig,
  MCPToolCall,
  MCPToolResult,
  MCPToolInfo,
  ToolResult,
  Logger,
} from "../types/index.js";

interface ConnectedServer {
  name: string;
  client: Client;
  transport: StdioClientTransport;
  tools: MCPToolInfo[];
}

export class MCPClient {
  private servers = new Map<string, ConnectedServer>();
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async connect(config: MCPServerConfig): Promise<void> {
    if (!config.enabled) {
      this.logger.info("tool", `MCP server '${config.name}' is disabled, skipping`);
      return;
    }

    this.logger.info("tool", `Connecting to MCP server: ${config.name}`);

    try {
      const transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: config.env as Record<string, string> | undefined,
      });

      const client = new Client({
        name: "jmax-agent",
        version: "0.1.0",
      });

      await client.connect(transport);

      // List available tools — preserve full schema
      const toolsResponse = await client.listTools();
      const tools: MCPToolInfo[] = toolsResponse.tools.map((t) => ({
        server: config.name,
        name: t.name,
        description: t.description ?? "",
        inputSchema: (t.inputSchema ?? {}) as Record<string, unknown>,
      }));

      this.servers.set(config.name, {
        name: config.name,
        client,
        transport,
        tools,
      });

      this.logger.info(
        "tool",
        `Connected to '${config.name}' with ${tools.length} tools: ${tools.map((t) => t.name).join(", ")}`
      );
    } catch (err) {
      this.logger.error(
        "tool",
        `Failed to connect to '${config.name}': ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  async connectAll(configs: MCPServerConfig[]): Promise<void> {
    for (const config of configs) {
      await this.connect(config);
    }
  }

  async callTool(call: MCPToolCall): Promise<MCPToolResult> {
    const server = this.servers.get(call.server);
    if (!server) {
      return {
        success: false,
        content: null,
        error: `MCP server '${call.server}' not connected`,
      };
    }

    const toolExists = server.tools.some((t) => t.name === call.tool);
    if (!toolExists) {
      return {
        success: false,
        content: null,
        error: `Tool '${call.tool}' not available on server '${call.server}'`,
      };
    }

    this.logger.info("tool", `Calling ${call.server}/${call.tool}`);

    try {
      const result = await server.client.callTool({
        name: call.tool,
        arguments: call.arguments,
      });

      return {
        success: true,
        content: result.content,
      };
    } catch (err) {
      return {
        success: false,
        content: null,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Execute an MCP tool and return a ToolResult (compatible with agentic loop).
   */
  async executeTool(
    server: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    const result = await this.callTool({ server, tool: toolName, arguments: args });
    if (result.success) {
      // Serialize content for the LLM
      const output =
        typeof result.content === "string"
          ? result.content
          : JSON.stringify(result.content, null, 2);
      return { success: true, output };
    }
    return {
      success: false,
      output: "",
      error: result.error ?? "MCP tool call failed",
    };
  }

  /**
   * Get all available tools with full metadata (for function-calling).
   */
  getToolInfos(): MCPToolInfo[] {
    const tools: MCPToolInfo[] = [];
    for (const server of this.servers.values()) {
      tools.push(...server.tools);
    }
    return tools;
  }

  /**
   * Get simple tool list (legacy compat)
   */
  getAvailableTools(): Array<{ server: string; tool: string }> {
    const tools: Array<{ server: string; tool: string }> = [];
    for (const [serverName, server] of this.servers) {
      for (const tool of server.tools) {
        tools.push({ server: serverName, tool: tool.name });
      }
    }
    return tools;
  }

  async disconnect(name: string): Promise<void> {
    const server = this.servers.get(name);
    if (server) {
      await server.client.close();
      this.servers.delete(name);
      this.logger.info("tool", `Disconnected from '${name}'`);
    }
  }

  async disconnectAll(): Promise<void> {
    for (const name of this.servers.keys()) {
      await this.disconnect(name);
    }
  }

  isConnected(name: string): boolean {
    return this.servers.has(name);
  }
}
