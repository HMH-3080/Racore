import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { ensureAppDirectories, USAGE_FILE } from "./app-paths";

type UsageSnapshot = {
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  sessionCount: number;
  totalMessages: number;
  totalToolCalls: number;
  totalDurationMs: number;
  lastUpdated: Date;
};

type UsageEntry = {
  timestamp: Date;
  model: string;
  mode: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  durationMs: number;
  toolCalls: number;
};

let entries: UsageEntry[] | null = null;
let listeners: Array<() => void> = [];

function loadEntries(): UsageEntry[] {
  try {
    if (!existsSync(USAGE_FILE)) return [];
    const raw = JSON.parse(readFileSync(USAGE_FILE, "utf8")) as Array<UsageEntry & { timestamp: string }>;
    return raw.map((e) => ({ ...e, timestamp: new Date(e.timestamp) }));
  } catch {
    return [];
  }
}

function getEntries(): UsageEntry[] {
  if (entries === null) entries = loadEntries();
  return entries;
}

function persist() {
  try {
    ensureAppDirectories();
    writeFileSync(USAGE_FILE, JSON.stringify(getEntries(), null, 2), "utf8");
  } catch {
    // non-fatal
  }
}

function notify() {
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function recordUsage(entry: Omit<UsageEntry, "timestamp">) {
  getEntries().push({ ...entry, timestamp: new Date() });
  persist();
  notify();
}

export function getUsageHistory(): UsageEntry[] {
  return [...getEntries()];
}

export function getUsageSnapshot(): UsageSnapshot {
  const all = getEntries();
  const totalTokens = all.reduce((sum, e) => sum + e.totalTokens, 0);
  const inputTokens = all.reduce((sum, e) => sum + e.inputTokens, 0);
  const outputTokens = all.reduce((sum, e) => sum + e.outputTokens, 0);
  const totalCost = all.reduce((sum, e) => sum + e.cost, 0);

  return {
    totalTokens,
    inputTokens,
    outputTokens,
    totalCost,
    sessionCount: all.length,
    totalMessages: all.length,
    totalToolCalls: all.reduce((sum, e) => sum + e.toolCalls, 0),
    totalDurationMs: all.reduce((sum, e) => sum + e.durationMs, 0),
    lastUpdated: all.length > 0 ? all[all.length - 1]!.timestamp : new Date(),
  };
}

export function clearUsage() {
  entries = [];
  persist();
  notify();
}
