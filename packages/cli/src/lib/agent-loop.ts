import {
  type ChatMessage,
  type ModeType,
  type ProviderIdType,
} from "./app-schema";

export const DEFAULT_MAX_AUTO_CONTINUE_ROUNDS = 12;

export const CONTINUATION_PROMPT =
  "Continue. Check getTodoList and work through any remaining pending or in_progress tasks. Do not ask for permission - keep going until all tasks are completed, then write the Final Report.";

export type AgentLoopSubmit = (params: {
  messages: ChatMessage[];
  mode: ModeType;
  model: string;
  provider: ProviderIdType;
  onUpdate?: (message: ChatMessage) => void;
}) => Promise<ChatMessage>;

export type AgentLoopStopReason = "completed" | "max-rounds" | "aborted" | "error";

export type AgentLoopResult = {
  messages: ChatMessage[];
  continuationRounds: number;
  stopReason: AgentLoopStopReason;
  error?: unknown;
};

function readTodos(output: unknown): Array<{ status?: string }> | null {
  if (!output || typeof output !== "object") return null;

  const maybeTodos = "todos" in output ? output.todos : null;
  if (Array.isArray(maybeTodos)) {
    return maybeTodos as Array<{ status?: string }>;
  }

  return null;
}

/**
 * Detect whether the latest assistant message says the agent still has work.
 * Tool output is authoritative; text markers are only a fallback for partial
 * responses where the model has not fetched the todo list yet.
 */
export function hasPendingTasks(messages: ChatMessage[]): boolean {
  const last = [...messages].reverse().find((message) => message.role === "assistant");
  if (!last) return false;

  const todoParts = last.parts.filter(
    (part) => part.type === "tool-getTodoList" || part.type === "tool-updateTodoList",
  );

  for (const part of [...todoParts].reverse()) {
    const todos = readTodos(part.output);
    if (!todos) continue;

    return todos.some((todo) => todo.status === "pending" || todo.status === "in_progress");
  }

  const textParts = last.parts.filter((part) => part.type === "text");
  const fullText = textParts.map((part) => part.text).join("\n").toLowerCase();

  const hasFinalReport = /^#{1,6}\s*(final report|summary|completed|done)/m.test(fullText);
  const allTasksExplicitlyDone = /\ball tasks (are|have been) (completed|done|finished)\b/.test(fullText);

  if (hasFinalReport || allTasksExplicitlyDone) {
    return false;
  }

  const lastTextPart = textParts[textParts.length - 1];
  const lastText = lastTextPart ? lastTextPart.text.toLowerCase() : "";

  return (
    /\b(continuing|continue)\b/i.test(lastText) &&
    /\b(pending|in_progress|more tasks?)\b/i.test(lastText)
  );
}

export function createContinuationMessage(params: {
  mode: ModeType;
  model: string;
  provider: ProviderIdType;
}): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role: "user",
    parts: [{ type: "text", text: CONTINUATION_PROMPT }],
    metadata: {
      mode: params.mode,
      provider: params.provider,
      model: params.model,
    },
  };
}

function delay(ms: number) {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function continueAgentLoop(params: {
  messages: ChatMessage[];
  mode: ModeType;
  model: string;
  provider: ProviderIdType;
  submitChat: AgentLoopSubmit;
  maxContinuationRounds?: number;
  delayMs?: number;
  shouldAbort?: () => boolean;
  onContinuationStart?: (context: { round: number; messages: ChatMessage[] }) => void;
  onRoundComplete?: (context: { round: number; messages: ChatMessage[] }) => void;
  onRoundError?: (context: { round: number; messages: ChatMessage[]; error: unknown }) => void;
  onUpdate?: (message: ChatMessage, context: { round: number; messages: ChatMessage[] }) => void;
}): Promise<AgentLoopResult> {
  let currentMessages = params.messages;
  let continuationRounds = 0;
  const maxContinuationRounds = params.maxContinuationRounds ?? DEFAULT_MAX_AUTO_CONTINUE_ROUNDS;

  while (hasPendingTasks(currentMessages)) {
    if (params.shouldAbort?.()) {
      return { messages: currentMessages, continuationRounds, stopReason: "aborted" };
    }

    if (continuationRounds >= maxContinuationRounds) {
      return { messages: currentMessages, continuationRounds, stopReason: "max-rounds" };
    }

    await delay(params.delayMs ?? 0);

    if (params.shouldAbort?.()) {
      return { messages: currentMessages, continuationRounds, stopReason: "aborted" };
    }

    continuationRounds += 1;
    const continuation = createContinuationMessage({
      mode: params.mode,
      model: params.model,
      provider: params.provider,
    });
    const withContinuation = [...currentMessages, continuation];
    params.onContinuationStart?.({ round: continuationRounds, messages: withContinuation });

    let streamingAssistantId: string | null = null;

    try {
      const assistantMessage = await params.submitChat({
        messages: withContinuation,
        mode: params.mode,
        model: params.model,
        provider: params.provider,
        onUpdate: (partialMessage) => {
          streamingAssistantId = partialMessage.id;
          params.onUpdate?.(partialMessage, {
            round: continuationRounds,
            messages: withContinuation,
          });
        },
      });

      currentMessages = streamingAssistantId
        ? [...withContinuation, { ...assistantMessage, id: streamingAssistantId }]
        : [...withContinuation, assistantMessage];
      params.onRoundComplete?.({ round: continuationRounds, messages: currentMessages });
    } catch (error) {
      params.onRoundError?.({ round: continuationRounds, messages: withContinuation, error });
      return { messages: currentMessages, continuationRounds, stopReason: "error", error };
    }
  }

  return { messages: currentMessages, continuationRounds, stopReason: "completed" };
}
