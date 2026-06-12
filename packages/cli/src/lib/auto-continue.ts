import { getTodos, type TodoItem } from "./todo-store";

/**
 * Auto-continue engine: after each agent turn, if tasks remain unfinished
 * the system immediately sends itself a continuation instruction instead of
 * stopping - the agent never quits until everything is done and reported.
 */

export const MAX_AUTO_CONTINUES = 3;

export function getUnfinishedTasks(): TodoItem[] {
  return getTodos().filter(
    (todo) => todo.status === "pending" || todo.status === "in_progress",
  );
}

export function buildContinuationPrompt(): string {
  const remaining = getUnfinishedTasks();

  return [
    "Continue working - do not stop until every task below is finished.",
    "Unfinished tasks:",
    ...remaining.map((todo) => `- [${todo.status}] ${todo.title} (id: ${todo.id})`),
    "",
    "For each task: mark it in_progress with updateTodoList, complete the work,",
    "verify it, then mark it completed. When ALL tasks are completed, finish with",
    "a '## Final Report' section summarizing what was done, files changed, and verification results.",
  ].join("\n");
}
