export type TodoStatus = "pending" | "in_progress" | "completed" | "cancelled";

export type TodoItem = {
  id: string;
  title: string;
  description?: string;
  status: TodoStatus;
  createdAt: Date;
  updatedAt: Date;
};

type Listener = (todos: TodoItem[]) => void;

let todos: TodoItem[] = [];
let listeners: Listener[] = [];

function notify() {
  const snapshot = [...todos];
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

export function getTodos(): TodoItem[] {
  return [...todos];
}

export function addTodo(title: string, description?: string): TodoItem {
  const item: TodoItem = {
    id: crypto.randomUUID(),
    title,
    description,
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  todos.push(item);
  notify();
  return item;
}

export function updateTodoStatus(id: string, status: TodoStatus) {
  const item = todos.find((t) => t.id === id);
  if (!item) return;
  item.status = status;
  item.updatedAt = new Date();
  notify();
}

export function cancelTodo(id: string) {
  updateTodoStatus(id, "cancelled");
}

export function completeTodo(id: string) {
  updateTodoStatus(id, "completed");
}

export function removeTodo(id: string) {
  todos = todos.filter((t) => t.id !== id);
  notify();
}

export function clearTodos() {
  todos = [];
  notify();
}

export function autoCreateTodos(text: string) {
  const lines = text.split("\n");
  let count = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^[-*]\s+/.test(trimmed) || /^\d+[.)]\s+/.test(trimmed)) {
      addTodo(trimmed.replace(/^[-*\d+.)\s]+/, "").trim());
      count++;
    }
  }
  if (count === 0 && text.length > 10) {
    addTodo(text.length > 80 ? text.slice(0, 77) + "..." : text);
    count++;
  }
  return count;
}
