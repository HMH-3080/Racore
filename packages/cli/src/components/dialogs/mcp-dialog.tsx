import { useState, useEffect } from "react";
import { getMcpStatuses, loadMcpServers, type McpServerStatus } from "../../lib/mcp";
import { useTheme } from "../../providers/theme";

export function McpDialogContent() {
  const { colors } = useTheme();
  const [statuses, setStatuses] = useState<McpServerStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const servers = loadMcpServers();
  const serverNames = Object.keys(servers);

  useEffect(() => {
    getMcpStatuses()
      .then(setStatuses)
      .finally(() => setLoading(false));
  }, []);

  if (serverNames.length === 0) {
    return (
      <box flexDirection="column" gap={1} padding={1}>
        <text fg={colors.dimSeparator}>
          No MCP servers configured. Add servers to .racore/mcp.json or ~/.racore/mcp.json
        </text>
        <text fg={colors.dimSeparator} wrapMode="word">
          Format: {"{"} "mcpServers": {"{"} "name": {"{"} "command": "...", "args": [] {"}"} {"}"} {"}"}
        </text>
      </box>
    );
  }

  return (
    <box flexDirection="column" gap={1} padding={1}>
      <text attributes={{ bold: true }}>MCP Servers ({serverNames.length})</text>
      {loading ? (
        <text fg={colors.dimSeparator}>Connecting...</text>
      ) : (
        serverNames.map((name) => {
          const config = servers[name]!;
          const status = statuses.find((s) => s.name === name);
          const isDisabled = config.disabled;

          return (
            <box key={name} flexDirection="column" gap={0}>
              <box flexDirection="row" gap={1}>
                <text attributes={{ bold: true }}>{name}</text>
                {isDisabled ? (
                  <text fg={colors.dimSeparator}>[disabled]</text>
                ) : status?.ok ? (
                  <text fg="green">[connected] {status.toolCount} tools</text>
                ) : status ? (
                  <text fg="red">[error] {status.error}</text>
                ) : (
                  <text fg={colors.dimSeparator}>[pending]</text>
                )}
              </box>
              {config.command ? (
                <text fg={colors.dimSeparator}>cmd: {config.command} {config.args?.join(" ")}</text>
              ) : config.url ? (
                <text fg={colors.dimSeparator}>url: {config.url}</text>
              ) : null}
            </box>
          );
        })
      )}
      <text fg={colors.dimSeparator}>Press Escape to close</text>
    </box>
  );
}
