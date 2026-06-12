import { describe, expect, test } from "bun:test";
import type { ChatMessage } from "./app-schema";
import { compactMessages, estimateMessageTokens } from "./context-compactor";

function textMessage(role: "user" | "assistant", text: string): ChatMessage {
  return { id: crypto.randomUUID(), role, parts: [{ type: "text", text }] };
}

function toolMessage(output: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    parts: [
      {
        type: "tool-readFile",
        toolCallId: crypto.randomUUID(),
        input: { path: "src/index.ts" },
        output,
        state: "output-available",
      },
    ],
  };
}

describe("estimateMessageTokens", () => {
  test("estimates tokens from character counts", () => {
    const messages = [textMessage("user", "a".repeat(400))];
    expect(estimateMessageTokens(messages)).toBe(100);
  });
});

describe("compactMessages", () => {
  test("returns messages unchanged when under budget", () => {
    const messages = [textMessage("user", "hello"), textMessage("assistant", "hi")];
    const result = compactMessages(messages, { maxTokens: 1_000 });
    expect(result.compacted).toBe(false);
    expect(result.messages).toBe(messages);
  });

  test("compacts old tool outputs but keeps recent messages intact", () => {
    const bigOutput = "x".repeat(8_000);
    const messages: ChatMessage[] = [
      textMessage("user", "original task"),
      toolMessage(bigOutput),
      toolMessage(bigOutput),
      textMessage("assistant", "progress"),
      textMessage("user", "latest question"),
      textMessage("assistant", "latest answer"),
    ];

    const result = compactMessages(messages, { maxTokens: 1_000, keepRecent: 2 });
    expect(result.compacted).toBe(true);

    const recent = result.messages.slice(-2);
    expect(recent[0]!.parts[0]).toEqual({ type: "text", text: "latest question" });
    expect(recent[1]!.parts[0]).toEqual({ type: "text", text: "latest answer" });

    const compactedTool = result.messages.find((message) =>
      message.parts.some((part) => part.type === "tool-readFile"),
    );
    if (compactedTool) {
      const part = compactedTool.parts.find((candidate) => candidate.type === "tool-readFile");
      const output = part && "output" in part ? String(part.output) : "";
      expect(output.length).toBeLessThan(bigOutput.length);
    }
  });

  test("preserves the first user message when dropping history", () => {
    const messages: ChatMessage[] = [
      textMessage("user", "THE ORIGINAL TASK"),
      ...Array.from({ length: 30 }, (_, index) => textMessage("assistant", `step ${index}: ${"y".repeat(2_000)}`)),
      textMessage("user", "latest"),
    ];

    const result = compactMessages(messages, { maxTokens: 500, keepRecent: 1 });
    expect(result.compacted).toBe(true);
    const texts = result.messages.flatMap((message) =>
      message.parts.filter((part) => part.type === "text").map((part) => (part as { text: string }).text),
    );
    expect(texts.some((text) => text.includes("THE ORIGINAL TASK"))).toBe(true);
    expect(texts.at(-1)).toBe("latest");
  });
});
