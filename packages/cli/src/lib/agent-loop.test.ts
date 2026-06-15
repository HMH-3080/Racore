import { describe, expect, it } from "bun:test";
import {
  CONTINUATION_PROMPT,
  continueAgentLoop,
  hasPendingTasks,
} from "./agent-loop";
import { Mode, ProviderId, type ChatMessage } from "./app-schema";

function assistant(parts: ChatMessage["parts"], id = crypto.randomUUID()): ChatMessage {
  return { id, role: "assistant", parts };
}

function text(value: string): ChatMessage["parts"][number] {
  return { type: "text", text: value };
}

function todoTool(statuses: string[]): ChatMessage["parts"][number] {
  return {
    type: "tool-getTodoList",
    toolCallId: crypto.randomUUID(),
    output: {
      todos: statuses.map((status, index) => ({
        id: `todo-${index}`,
        title: `Task ${index + 1}`,
        status,
      })),
    },
    state: "output-available",
  };
}

describe("agent loop", () => {
  it("continues when the latest todo output has pending work", () => {
    expect(hasPendingTasks([assistant([todoTool(["completed", "pending"])])])).toBe(true);
    expect(hasPendingTasks([assistant([todoTool(["in_progress"])])])).toBe(true);
  });

  it("stops when todo output is complete", () => {
    expect(hasPendingTasks([assistant([todoTool(["completed", "completed"])])])).toBe(false);
    expect(hasPendingTasks([assistant([todoTool([])])])).toBe(false);
  });

  it("treats Final Report text as completion even when it mentions prior progress", () => {
    const message = assistant([
      text("## Final Report\nAll tasks are completed. The previous in progress item is done."),
    ]);

    expect(hasPendingTasks([message])).toBe(false);
  });

  it("uses text continuation signals as a fallback", () => {
    const message = assistant([text("Continuing because there are more tasks pending.")]);

    expect(hasPendingTasks([message])).toBe(true);
  });

  it("submits continuation rounds until tasks are completed", async () => {
    const submittedMessages: ChatMessage[][] = [];
    const start = [assistant([todoTool(["pending"])], "start")];

    const result = await continueAgentLoop({
      messages: start,
      mode: Mode.BUILD,
      model: "test-model",
      provider: ProviderId.OPENROUTER,
      submitChat: async ({ messages, onUpdate }) => {
        submittedMessages.push(messages);
        const completed = assistant([todoTool(["completed"]), text("## Final Report\nDone.")], "final");
        onUpdate?.({ ...completed, id: "streamed-final" });
        return completed;
      },
    });

    expect(result.stopReason).toBe("completed");
    expect(result.continuationRounds).toBe(1);
    expect(submittedMessages).toHaveLength(1);
    expect(submittedMessages[0]?.at(-1)?.role).toBe("user");
    expect((submittedMessages[0]?.at(-1)?.parts[0] as { text: string }).text).toBe(CONTINUATION_PROMPT);
    expect(result.messages.at(-1)?.id).toBe("streamed-final");
  });

  it("stops at the configured max continuation rounds", async () => {
    const start = [assistant([todoTool(["pending"])], "start")];

    const result = await continueAgentLoop({
      messages: start,
      mode: Mode.BUILD,
      model: "test-model",
      provider: ProviderId.OPENROUTER,
      maxContinuationRounds: 2,
      submitChat: async () => assistant([todoTool(["pending"])]),
    });

    expect(result.stopReason).toBe("max-rounds");
    expect(result.continuationRounds).toBe(2);
  });
});
