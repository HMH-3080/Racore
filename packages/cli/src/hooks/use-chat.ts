import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { submitChat } from "../lib/chat-service";
import { compactMessages, estimateMessageTokens } from "../lib/context-compactor";
import { reportContextUsage } from "../lib/context-usage-store";
import { onSessionAction } from "../lib/session-actions";
import {
  type ChatMessage as Message,
  type ModeType,
  type ProviderIdType,
} from "../lib/app-schema";
import { appendMessages } from "../lib/session-store";

export type { Message };

/** Max auto-continue iterations to prevent runaway loops. */
const MAX_AUTO_CONTINUE_ROUNDS = 12;

/**
 * Detect whether the latest assistant message indicates unfinished tasks.
 * The agent signals this via getTodoList/updateTodoList tool calls that
 * still have pending or in_progress items.
 */
function hasPendingTasks(messages: Message[]): boolean {
  const last = [...messages].reverse().find((m) => m.role === "assistant");
  if (!last) return false;

  // Look for tool parts that are todo-related
  const todoParts = last.parts.filter(
    (p) => p.type === "tool-getTodoList" || p.type === "tool-updateTodoList",
  );

  if (todoParts.length === 0) return false;

  // Check the last getTodoList output for pending/in_progress tasks
  for (const part of todoParts) {
    if (part.type === "tool-getTodoList" && part.output && typeof part.output === "object") {
      const output = part.output as { todos?: Array<{ status: string }> };
      if (output.todos?.some((t) => t.status === "pending" || t.status === "in_progress")) {
        return true;
      }
    }
  }

  // Also check if the assistant text contains completion markers
  const textParts = last.parts.filter((p) => p.type === "text");
  const fullText = textParts.map((p) => p.text).join(" ").toLowerCase();

  // If the text ends with a final report, all tasks are done
  if (/^#\s*(final report|summary|completed|done)/m.test(fullText)) {
    return false;
  }

  // If text mentions continuing or more tasks
  if (/continuing|next task|still pending|in progress/.test(fullText)) {
    return true;
  }

  return false;
}

export function useChat(sessionId: string, initialMessages: Message[]) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [status, setStatus] = useState<"ready" | "submitted" | "streaming" | "error">("ready");
  const [error, setError] = useState<Error | null>(null);
  const autoContinueRoundRef = useRef(0);
  const abortRef = useRef(false);

  // Core submission logic extracted for reuse by auto-continue.
  const submitRaw = useCallback(async (params: {
    userText: string;
    mode: ModeType;
    model: string;
    provider: ProviderIdType;
    currentMessages: Message[];
  }) => {
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      parts: [{ type: "text", text: params.userText }],
      metadata: {
        mode: params.mode,
        provider: params.provider,
        model: params.model,
      },
    };

    const pendingMessages = [...params.currentMessages, userMessage];
    setMessages(pendingMessages);
    setStatus("streaming");
    setError(null);

    let streamingAssistantId: string | null = null;
    const assistantMessage = await submitChat({
      messages: pendingMessages,
      mode: params.mode,
      model: params.model,
      provider: params.provider,
      onUpdate: (partialMessage) => {
        streamingAssistantId = partialMessage.id;
        setMessages((currentMessages) => {
          const existingIndex = currentMessages.findIndex((message) => message.id === partialMessage.id);
          if (existingIndex === -1) {
            return [...pendingMessages, partialMessage];
          }

          const nextMessages = [...currentMessages];
          nextMessages[existingIndex] = partialMessage;
          return nextMessages;
        });
      },
    });

    const nextMessages = streamingAssistantId
      ? [...pendingMessages, { ...assistantMessage, id: streamingAssistantId }]
      : [...pendingMessages, assistantMessage];
    setMessages(nextMessages);
    appendMessages(sessionId, nextMessages);
    return nextMessages;
  }, [sessionId]);

  const submit = useCallback(async (params: {
    userText: string;
    mode: ModeType;
    model: string;
    provider: ProviderIdType;
  }) => {
    abortRef.current = false;
    autoContinueRoundRef.current = 0;
    setError(null);

    try {
      let currentMessages = await submitRaw({ ...params, currentMessages: messages });

      // Auto-continue loop: keep going while tasks remain pending
      while (!abortRef.current && autoContinueRoundRef.current < MAX_AUTO_CONTINUE_ROUNDS) {
        if (!hasPendingTasks(currentMessages)) break;

        autoContinueRoundRef.current += 1;
        const continuation: Message = {
          id: crypto.randomUUID(),
          role: "user",
          parts: [{ type: "text", text: "Continue. Check getTodoList and work through any remaining pending or in_progress tasks. Do not ask for permission — keep going until all tasks are completed, then write the Final Report." }],
          metadata: {
            mode: params.mode,
            provider: params.provider,
            model: params.model,
          },
        };

        const withContinuation = [...currentMessages, continuation];
        setMessages(withContinuation);
        setStatus("streaming");

        let streamId: string | null = null;
        const nextAssistant = await submitChat({
          messages: withContinuation,
          mode: params.mode,
          model: params.model,
          provider: params.provider,
          onUpdate: (partialMessage) => {
            streamId = partialMessage.id;
            setMessages((cur) => {
              const idx = cur.findIndex((m) => m.id === partialMessage.id);
              if (idx === -1) return [...withContinuation, partialMessage];
              const next = [...cur];
              next[idx] = partialMessage;
              return next;
            });
          },
        });

        currentMessages = streamId
          ? [...withContinuation, { ...nextAssistant, id: streamId }]
          : [...withContinuation, nextAssistant];
        setMessages(currentMessages);
        appendMessages(sessionId, currentMessages);
      }

      setStatus("ready");
    } catch (submitError) {
      const resolved = submitError instanceof Error ? submitError : new Error(String(submitError));
      setError(resolved);
      setStatus("error");
    }
  }, [messages, sessionId, submitRaw]);

  const abort = useCallback(async () => {
    setStatus("ready");
  }, []);

  // Respond to the global /compact command for the active session.
  useEffect(() => onSessionAction((action) => {
    if (action !== "compact") return;

    setMessages((currentMessages) => {
      const result = compactMessages(currentMessages, { maxTokens: 1, keepRecent: 6 });
      reportContextUsage({
        estimatedTokens: estimateMessageTokens(result.messages),
        compacted: true,
      });
      try {
        appendMessages(sessionId, result.messages);
      } catch {
        // Session may not be persisted yet; in-memory compaction still applies.
      }
      return result.messages;
    });
  }), [sessionId]);

  return useMemo(() => ({
    messages,
    status,
    error,
    submit,
    abort,
    interrupt: abort,
  }), [abort, error, messages, status, submit]);
}
