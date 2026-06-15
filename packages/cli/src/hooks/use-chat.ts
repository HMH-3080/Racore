import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_MAX_AUTO_CONTINUE_ROUNDS,
} from "../lib/agent-loop";
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
const MAX_AUTO_CONTINUE_ROUNDS = DEFAULT_MAX_AUTO_CONTINUE_ROUNDS;

/**
 * Detect whether the latest assistant message indicates unfinished tasks.
 * The agent signals this via getTodoList/updateTodoList tool calls that
 * still have pending or in_progress items.
 *
 * Detection priority:
 * 1. If the last message has a getTodoList output showing 0 pending tasks → stop
 * 2. If the last message has a getTodoList output showing >0 pending tasks → continue
 * 3. If the text contains a Final Report heading (##, ###, etc.) → stop
 * 4. If the text explicitly says all tasks are done → stop
 * 5. Look for continuation signals only as last resort
 */
function hasPendingTasks(messages: Message[]): boolean {
  const last = [...messages].reverse().find((m) => m.role === "assistant");
  if (!last) return false;

  // Look for tool parts that are todo-related
  const todoParts = last.parts.filter(
    (p) => p.type === "tool-getTodoList" || p.type === "tool-updateTodoList",
  );

  // --- PRIORITY 1: Check getTodoList output for definitive task status ---
  for (const part of todoParts) {
    if (part.type === "tool-getTodoList" && part.output && typeof part.output === "object") {
      const output = part.output as { todos?: Array<{ status: string }> };
      // Empty todos list means all tasks are done
      if (output.todos && output.todos.length === 0) {
        return false;
      }
      // Non-empty: check if any are still open
      if (output.todos && output.todos.length > 0) {
        if (output.todos.some((t) => t.status === "pending" || t.status === "in_progress")) {
          return true;
        }
        // All tasks are completed — no auto-continue needed
        return false;
      }
    }
  }

  // --- PRIORITY 2: Check text for completion markers (Final Report) ---
  const textParts = last.parts.filter((p) => p.type === "text");
  const fullText = textParts.map((p) => p.text).join(" ").toLowerCase();

  // Match any level of markdown heading (##, ###, etc.) for Final Report completion markers
  // The system prompt instructs the model to write "## Final Report" (level 2 heading)
  // IMPORTANT: This check MUST come before the continuation signal check below,
  // because a Final Report may mention "in progress" in past-tense context.
  const hasFinalReport = /^#{1,6}\s*(final report|summary|completed|done)/m.test(fullText);
  const allTasksExplicitlyDone = /\ball tasks (are|have been) (completed|done|finished)\b/.test(fullText);

  if (hasFinalReport || allTasksExplicitlyDone) {
    return false;
  }

  // --- PRIORITY 3: Check for continuation signals ---
  // Only check for these if the above checks didn't find a Final Report.
  // Use more precise boundaries to avoid false positives:
  // - "continuing" should be a standalone action, not part of other words
  // - "in progress" should not match past-tense mentions inside a Final Report
  // - Only look at the LAST text block (the most recent thinking), not accumulated text
  const lastTextPart = textParts[textParts.length - 1];
  const lastText = lastTextPart ? lastTextPart.text.toLowerCase() : "";

  // If text mentions continuing or more tasks (only check the most recent text part)
  if (/\b(continuing|continue)\b/i.test(lastText) &&
      /\bpending|in_progress|more tasks?\b/i.test(lastText)) {
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
        // Small delay between rounds to let the UI settle and avoid rendering conflicts
        await new Promise((resolve) => setTimeout(resolve, 100));

        if (abortRef.current) break;
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
        try {
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
        } catch (continuationError) {
          const resolved = continuationError instanceof Error
            ? continuationError
            : new Error(String(continuationError));
          setError(resolved);
          // If a continuation round fails, stop auto-continue but keep what we have
          break;
        }
      }

      setStatus("ready");
    } catch (submitError) {
      const resolved = submitError instanceof Error ? submitError : new Error(String(submitError));
      setError(resolved);
      setStatus("error");
    }
  }, [messages, sessionId, submitRaw]);

  const abort = useCallback(async () => {
    abortRef.current = true;
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
