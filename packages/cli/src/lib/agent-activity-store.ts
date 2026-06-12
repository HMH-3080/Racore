/**
 * Live agent activity feed: what the agent is doing right now.
 * The chat service and tool executor report phases; the TUI status line
 * subscribes so users always see real progress instead of a bare spinner.
 */

export type AgentPhase = "idle" | "thinking" | "tool" | "responding";

export type AgentActivity = {
  phase: AgentPhase;
  /** Human-readable detail, e.g. the running tool name. */
  detail?: string;
  startedAt: number;
};

type Listener = (activity: AgentActivity) => void;

let activity: AgentActivity = { phase: "idle", startedAt: Date.now() };
let listeners: Listener[] = [];

export function reportAgentActivity(phase: AgentPhase, detail?: string) {
  if (activity.phase === phase && activity.detail === detail) return;
  activity = {
    phase,
    detail,
    startedAt: phase === activity.phase ? activity.startedAt : Date.now(),
  };
  for (const listener of listeners) {
    listener(activity);
  }
}

export function getAgentActivity(): AgentActivity {
  return activity;
}

export function subscribeAgentActivity(listener: Listener) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((candidate) => candidate !== listener);
  };
}

/** Display label for the current activity, e.g. "running grep". */
export function formatAgentActivity(current: AgentActivity): string {
  if (current.phase === "tool") {
    return current.detail ? `running ${current.detail}` : "running tool";
  }
  if (current.phase === "responding") return "responding";
  if (current.phase === "thinking") return "thinking";
  return "";
}
