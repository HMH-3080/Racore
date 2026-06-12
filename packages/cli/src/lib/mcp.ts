import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ToolSet } from "ai";

export type McpServerConfig = {
  /** Stdio transport: executable to launch. */
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  /** SSE transport: server URL. Used when command is not set. */
  url?: string;
  /** Disable a server without deleting its config. */
  disabled?: boolean;
};

export type McpConfig = {
  mcpServers?: Record<string, McpServerConfig>;
};

export type McpServerStatus = {
  name: string;
  ok: boolean;
  toolCount: number;
  error?: string;
};

type McpState = {
  tools: ToolSet;
  statuses: McpServerStatus[];
  clients: Array<{ close: () => Promise<void> }>;
};

let statePromise: Promise<McpState> | null = null;

function readJsonConfig(path: string): McpConfig {
  try {
    if (!existsSync(path)) return {};
    return JSON.parse(readFileSync(path, "utf8")) as McpConfig;
  } catch {
    return {};
  }
}

/**
 * Load MCP server definitions. Project-level .racore/mcp.json wins over
 * the user-level ~/.racore/mcp.json on name conflicts.
 */
export function loadMcpServers(): Record<string, McpServerConfig> {
  const userConfig = readJsonConfig(join(homedir(), ".racore", "mcp.json"));
  const projectConfig = readJsonConfig(join(process.cwd(), ".racore", "mcp.json"));

  return {
    ...(userConfig.mcpServers ?? {}),
    ...(projectConfig.mcpServers ?? {}),
  };
}

function sanitizeToolName(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

async function connectServers(): Promise<McpState> {
  const servers = loadMcpServers();
  const state: McpState = { tools: {}, statuses: [], clients: [] };

  for (const [name, config] of Object.entries(servers)) {
    if (config.disabled) continue;

    try {
      const { experimental_createMCPClient } = await import("ai");

      let transport;
      if (config.command) {
        const { Experimental_StdioMCPTransport } = await import("ai/mcp-stdio");
        transport = new Experimental_StdioMCPTransport({
          command: config.command,
          args: config.args,
          env: config.env,
        });
      } else if (config.url) {
        transport = { type: "sse" as const, url: config.url };
      } else {
        throw new Error("Server config needs either a command or a url");
      }

      const client = await experimental_createMCPClient({ transport });
      const serverTools = await client.tools();

      let toolCount = 0;
      for (const [toolName, toolDefinition] of Object.entries(serverTools)) {
        state.tools[`mcp_${sanitizeToolName(name)}_${sanitizeToolName(toolName)}`] = toolDefinition;
        toolCount += 1;
      }

      state.clients.push(client);
      state.statuses.push({ name, ok: true, toolCount });
    } catch (error) {
      state.statuses.push({
        name,
        ok: false,
        toolCount: 0,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return state;
}

/**
 * Connect to all configured MCP servers (once per process) and return their
 * tools, namespaced as mcp_<server>_<tool>. Failures are isolated per server
 * and never break the agent loop.
 */
export async function getMcpTools(): Promise<ToolSet> {
  if (!statePromise) statePromise = connectServers();
  const state = await statePromise;
  return state.tools;
}

/** Connection status for each configured server, for display in the UI. */
export async function getMcpStatuses(): Promise<McpServerStatus[]> {
  if (!statePromise) statePromise = connectServers();
  const state = await statePromise;
  return state.statuses;
}

export function hasMcpServersConfigured(): boolean {
  return Object.values(loadMcpServers()).some((server) => !server.disabled);
}

/** Close all MCP connections (used on process exit). */
export async function closeMcpClients() {
  if (!statePromise) return;
  const state = await statePromise;
  await Promise.allSettled(state.clients.map((client) => client.close()));
  statePromise = null;
}
