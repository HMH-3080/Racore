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

let entries: UsageEntry[] = [];
let listeners: Array<() => void> = [];

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribe(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function recordUsage(entry: Omit<UsageEntry, "timestamp">) {
  entries.push({ ...entry, timestamp: new Date() });
  notify();
}

export function getUsageHistory(): UsageEntry[] {
  return [...entries];
}

export function getUsageSnapshot(): UsageSnapshot {
  const totalTokens = entries.reduce((sum, e) => sum + e.totalTokens, 0);
  const inputTokens = entries.reduce((sum, e) => sum + e.inputTokens, 0);
  const outputTokens = entries.reduce((sum, e) => sum + e.outputTokens, 0);
  const totalCost = entries.reduce((sum, e) => sum + e.cost, 0);

  return {
    totalTokens,
    inputTokens,
    outputTokens,
    totalCost,
    sessionCount: entries.length,
    totalMessages: entries.length,
    totalToolCalls: entries.reduce((sum, e) => sum + e.toolCalls, 0),
    totalDurationMs: entries.reduce((sum, e) => sum + e.durationMs, 0),
    lastUpdated: entries.length > 0 ? entries[entries.length - 1].timestamp : new Date(),
  };
}

export function clearUsage() {
  entries = [];
  notify();
}
