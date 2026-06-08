export type TodoStatus = "pending" | "in_progress" | "completed" | "cancelled";

export type TodoItem = {
  id: string;
  title: string;
  description?: string;
  status: TodoStatus;
  error?: string;
  result?: string;
  parentId?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
};

type Listener = (todos: TodoItem[]) => void;

let todos: TodoItem[] = [];
let listeners: Listener[] = [];
let batchDepth = 0;
let pendingNotify = false;

function notify() {
  if (batchDepth > 0) {
    pendingNotify = true;
    return;
  }
  const snapshot = [...todos];
  for (const listener of listeners) {
    listener(snapshot);
  }
}

export function batchUpdate<T>(fn: () => T): T {
  batchDepth++;
  try {
    return fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0 && pendingNotify) {
      pendingNotify = false;
      notify();
    }
  }
}

export function subscribe(listener: Listener) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function getTodos(): TodoItem[] {
  return [...todos];
}

export function getPendingTodos(): TodoItem[] {
  return todos.filter((t) => t.status === "pending").sort((a, b) => a.order - b.order);
}

export function getInProgressTodos(): TodoItem[] {
  return todos.filter((t) => t.status === "in_progress");
}

export function addTodo(title: string, description?: string, parentId?: string): TodoItem {
  const order = todos.length > 0 ? Math.max(...todos.map((t) => t.order)) + 1 : 0;
  const item: TodoItem = {
    id: crypto.randomUUID(),
    title,
    description,
    status: "pending",
    order,
    parentId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  todos.push(item);
  notify();
  return item;
}

export function addTodos(items: Array<{ title: string; description?: string }>): TodoItem[] {
  return batchUpdate(() => items.map((item) => addTodo(item.title, item.description)));
}

export function updateTodoStatus(id: string, status: TodoStatus, extra?: { error?: string; result?: string }) {
  const item = todos.find((t) => t.id === id);
  if (!item) return;
  item.status = status;
  item.updatedAt = new Date();
  if (extra?.error) item.error = extra.error;
  if (extra?.result) item.result = extra.result;
  notify();
}

export function setTodoError(id: string, error: string) {
  updateTodoStatus(id, "cancelled", { error });
}

export function completeTodoWithResult(id: string, result: string) {
  updateTodoStatus(id, "completed", { result });
}

export function cancelTodo(id: string) {
  updateTodoStatus(id, "cancelled");
}

export function removeTodo(id: string) {
  todos = todos.filter((t) => t.id !== id);
  notify();
}

export function clearTodos() {
  todos = [];
  notify();
}

export function getTodoStats() {
  const total = todos.length;
  const pending = todos.filter((t) => t.status === "pending").length;
  const inProgress = todos.filter((t) => t.status === "in_progress").length;
  const completed = todos.filter((t) => t.status === "completed").length;
  const cancelled = todos.filter((t) => t.status === "cancelled").length;
  return { total, pending, inProgress, completed, cancelled };
}
