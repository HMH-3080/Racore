import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router";
import { CenteredPage } from "../components/centered-page";
import { APP_NAME } from "../lib/app-info";
import { getUsageSnapshot, clearUsage, subscribe } from "../lib/usage-store";
import { useTheme } from "../providers/theme";
import prettyMs from "pretty-ms";

export function UsageScreen() {
  const navigate = useNavigate();
  const { colors } = useTheme();
  const [refresh, setRefresh] = useState(0);
  const stats = getUsageSnapshot();

  useEffect(() => {
    const unsub = subscribe(() => setRefresh((v) => v + 1));
    return unsub;
  }, []);

  const handleClear = useCallback(() => {
    clearUsage();
    setRefresh((v) => v + 1);
  }, []);

  function formatCost(cost: number): string {
    if (cost <= 0) return "$0.00";
    if (cost < 0.01) return `$${cost.toFixed(6)}`;
    return `$${cost.toFixed(4)}`;
  }

  function formatNumber(n: number): string {
    return n.toLocaleString();
  }

  return (
    <CenteredPage
      title={`${APP_NAME} Usage`}
      actions={[
        { label: "Home", onSelect: () => navigate("/") },
        { label: "Config", onSelect: () => navigate("/config") },
        { label: "Clear", onSelect: handleClear, tone: "muted" },
      ]}
    >
      <box flexDirection="column" gap={1}>
        <text wrapMode="word" attributes={{ bold: true }}>Token Usage</text>
        <box flexDirection="column" gap={0} paddingX={1}>
          <text wrapMode="word">Total Tokens:   {formatNumber(stats.totalTokens)}</text>
          <text wrapMode="word">Input Tokens:   {formatNumber(stats.inputTokens)}</text>
          <text wrapMode="word">Output Tokens:  {formatNumber(stats.outputTokens)}</text>
        </box>
      </box>

      <box flexDirection="column" gap={1}>
        <text wrapMode="word" attributes={{ bold: true }}>Cost</text>
        <box flexDirection="column" gap={0} paddingX={1}>
          <text wrapMode="word">Total Cost: {formatCost(stats.totalCost)}</text>
        </box>
      </box>

      <box flexDirection="column" gap={1}>
        <text wrapMode="word" attributes={{ bold: true }}>Activity</text>
        <box flexDirection="column" gap={0} paddingX={1}>
          <text wrapMode="word">Sessions:     {formatNumber(stats.sessionCount)}</text>
          <text wrapMode="word">Tool Calls:   {formatNumber(stats.totalToolCalls)}</text>
          <text wrapMode="word">Total Time:   {prettyMs(stats.totalDurationMs)}</text>
        </box>
      </box>

      {stats.lastUpdated ? (
        <text wrapMode="word" fg={colors.dimSeparator}>
          Last updated: {stats.lastUpdated.toLocaleString()}
        </text>
      ) : null}
    </CenteredPage>
  );
}
