import type { DiffLine } from "./diff-utils";

export type FileActivity = {
  id: string;
  filePath: string;
  action: "write" | "edit" | "patch" | "delete";
  status: "pending" | "in_progress" | "completed" | "error";
  diff?: DiffLine[];
  error?: string;
  content?: string;
  timestamp: Date;
};

type Listener = (activity: FileActivity[]) => void;

let activities: FileActivity[] = [];
let listeners: Listener[] = [];

function notify() {
  const snapshot = [...activities];
  for (const listener of listeners) {
    listener(snapshot);
  }
}

export function subscribe(listener: Listener) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function getActivities(): FileActivity[] {
  return [...activities];
}

export function addActivity(filePath: string, action: FileActivity["action"]): string {
  const id = crypto.randomUUID();
  activities.push({
    id,
    filePath,
    action,
    status: "pending",
    timestamp: new Date(),
  });
  notify();
  return id;
}

export function updateActivity(id: string, updates: Partial<FileActivity>) {
  const activity = activities.find((a) => a.id === id);
  if (!activity) return;
  Object.assign(activity, updates, { timestamp: new Date() });
  notify();
}

export function clearActivities() {
  activities = [];
  notify();
}
