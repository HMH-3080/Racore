import { generateText } from "ai";
import { ProviderId, type ProviderIdType } from "./app-schema";
import { addTodos, getTodos } from "./todo-store";

/**
 * Intent controller: understands what the user actually needs and turns any
 * prompt into a real, parallel task plan - never a copy of the prompt.
 *
 * - Casual chat and simple questions get no task plan.
 * - Real work is decomposed by a fast model call into 2-6 actionable tasks.
 * - If the model is slow or unavailable, a heuristic splitter produces a
 *   genuine plan offline so the Tasks panel is never empty or fake.
 */

export type Intent = "chat" | "question" | "task";

const DECOMPOSE_TIMEOUT_MS = 12_000;

export function classifyIntent(prompt: string): Intent {
  const normalized = prompt.toLowerCase().trim();

  if (normalized.length <= 40 && /^(hi|hello|hey|yo|sup|thanks|thank you|ok|okay|test|ping|how are you)[.!? ]*$/.test(normalized)) {
    return "chat";
  }

  const actionWords = /(fix|add|create|build|implement|refactor|update|write|make|remove|delete|rename|migrate|install|setup|set up|optimi[sz]e|deploy|test|debug|convert|generate|integrate|configure)/;
  const questionShape = /^(what|why|how|when|where|who|which|is|are|does|do|can|could|should|explain|describe|tell me)\b/;

  if (questionShape.test(normalized) && !actionWords.test(normalized)) {
    return "question";
  }

  return actionWords.test(normalized) || normalized.length > 80 ? "task" : "question";
}

/** Offline decomposition: split on sentence/conjunction boundaries. */
export function heuristicTaskSplit(prompt: string): string[] {
  const parts = prompt
    .split(/(?<=[.!?])\s+|\r?\n+|;\s+|\s+and then\s+|\s+then\s+/i)
    .map((part) => part.trim().replace(/^[-*\d.)\s]+/, ""))
    .filter((part) => part.length > 8);

  if (parts.length >= 2) {
    return parts.slice(0, 6).map((part) => (part.length > 70 ? `${part.slice(0, 67)}...` : part));
  }

  // Single-clause request: produce a real engineering plan instead of echoing.
  const summary = prompt.trim().length > 50 ? `${prompt.trim().slice(0, 47)}...` : prompt.trim();
  return [
    `Locate the code relevant to: ${summary}`,
    `Implement: ${summary}`,
    "Verify with typecheck/tests and fix any failures",
    "Report what changed and why",
  ];
}

function parseTaskJson(text: string): string[] | null {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[0]) as unknown;
    if (!Array.isArray(parsed)) return null;
    const tasks = parsed
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.length > 3 && item.length < 120);
    return tasks.length >= 2 ? tasks.slice(0, 6) : null;
  } catch {
    return null;
  }
}

async function decomposeWithModel(
  prompt: string,
  model: Parameters<typeof generateText>[0]["model"],
): Promise<string[] | null> {
  const timeout = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), DECOMPOSE_TIMEOUT_MS).unref?.();
  });

  const request = generateText({
    model,
    system: [
      "You are a task planner for a coding agent.",
      "Split the user's request into 2-6 short, concrete, independently verifiable engineering tasks.",
      "Each task must be an action, not a restatement of the request.",
      'Reply with ONLY a JSON array of strings, e.g. ["Add X to Y", "Update tests"].',
    ].join(" "),
    prompt,
    maxRetries: 0,
  })
    .then((result) => parseTaskJson(result.text))
    .catch(() => null);

  return Promise.race([request, timeout]);
}

export type SeedResult = {
  intent: Intent;
  created: string[];
};

/**
 * Seed the Tasks panel with a real plan for the prompt. Runs concurrently
 * with the main agent turn so it never blocks first-token latency.
 */
export async function seedTasksFromPrompt(params: {
  prompt: string;
  model?: Parameters<typeof generateText>[0]["model"];
  provider?: ProviderIdType;
}): Promise<SeedResult> {
  const intent = classifyIntent(params.prompt);
  if (intent !== "task") {
    return { intent, created: [] };
  }

  // Avoid duplicate plans when the user iterates on the same request.
  const existingTitles = new Set(getTodos().map((todo) => todo.title.toLowerCase()));

  let tasks: string[] | null = null;
  if (params.model) {
    tasks = await decomposeWithModel(params.prompt, params.model);
  }
  tasks = tasks ?? heuristicTaskSplit(params.prompt);

  const fresh = tasks.filter((task) => !existingTitles.has(task.toLowerCase()));
  if (fresh.length === 0) {
    return { intent, created: [] };
  }

  addTodos(fresh.map((title) => ({ title })));
  return { intent, created: fresh };
}
