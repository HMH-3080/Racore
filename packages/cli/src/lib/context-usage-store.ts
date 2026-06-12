export type ContextUsage = {
  estimatedTokens: number;
  compacted: boolean;
};

type Listener = (usage: ContextUsage) => void;

let usage: ContextUsage = { estimatedTokens: 0, compacted: false };
let listeners: Listener[] = [];

export function reportContextUsage(next: ContextUsage) {
  usage = next;
  for (const listener of listeners) {
    listener(usage);
  }
}

export function getContextUsage(): ContextUsage {
  return usage;
}

export function subscribeContextUsage(listener: Listener) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((candidate) => candidate !== listener);
  };
}

export function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}k`;
  return `${tokens}`;
}
