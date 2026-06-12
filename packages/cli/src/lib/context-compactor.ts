import type { ChatMessage, MessagePart } from "./app-schema";

/** Rough chars-per-token heuristic; good enough for budget decisions. */
const CHARS_PER_TOKEN = 4;

const DEFAULT_MAX_TOKENS = 60_000;
const DEFAULT_KEEP_RECENT = 8;
const COMPACTED_TEXT_LIMIT = 600;
const COMPACTED_TOOL_OUTPUT_LIMIT = 300;

function partLength(part: MessagePart): number {
  if (part.type === "text" || part.type === "reasoning") {
    return part.text.length;
  }
  const input = part.input ? JSON.stringify(part.input).length : 0;
  const output = part.output
    ? typeof part.output === "string"
      ? part.output.length
      : JSON.stringify(part.output).length
    : 0;
  return input + output;
}

export function estimateMessageTokens(messages: ChatMessage[]): number {
  const chars = messages.reduce(
    (sum, message) => sum + message.parts.reduce((inner, part) => inner + partLength(part), 0),
    0,
  );
  return Math.ceil(chars / CHARS_PER_TOKEN);
}

function compactPart(part: MessagePart): MessagePart {
  if (part.type === "reasoning") {
    return { type: "text", text: "" };
  }

  if (part.type === "text") {
    return part.text.length > COMPACTED_TEXT_LIMIT
      ? { type: "text", text: `${part.text.slice(0, COMPACTED_TEXT_LIMIT)}\n[...compacted]` }
      : part;
  }

  const output = part.output
    ? typeof part.output === "string"
      ? part.output
      : JSON.stringify(part.output)
    : "";

  return {
    ...part,
    output:
      output.length > COMPACTED_TOOL_OUTPUT_LIMIT
        ? `${output.slice(0, COMPACTED_TOOL_OUTPUT_LIMIT)} [...tool output compacted]`
        : part.output,
  };
}

export type CompactionResult = {
  messages: ChatMessage[];
  compacted: boolean;
  estimatedTokens: number;
};

/**
 * Keep the conversation inside the model's context budget.
 *
 * Strategy:
 * 1. If under budget, return as-is.
 * 2. Compact older messages (drop reasoning, truncate text and tool outputs)
 *    while keeping the most recent messages untouched.
 * 3. If still over budget, drop oldest messages entirely, always preserving
 *    the first user message (the original task) and recent context.
 */
export function compactMessages(
  messages: ChatMessage[],
  options: { maxTokens?: number; keepRecent?: number } = {},
): CompactionResult {
  const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
  const keepRecent = options.keepRecent ?? DEFAULT_KEEP_RECENT;

  let estimatedTokens = estimateMessageTokens(messages);
  if (estimatedTokens <= maxTokens || messages.length <= keepRecent) {
    return { messages, compacted: false, estimatedTokens };
  }

  const recent = messages.slice(-keepRecent);
  const older = messages.slice(0, -keepRecent).map((message) => ({
    ...message,
    parts: message.parts.map(compactPart).filter((part) => !(part.type === "text" && part.text === "")),
  }));

  let result = [...older, ...recent];
  estimatedTokens = estimateMessageTokens(result);

  if (estimatedTokens > maxTokens && older.length > 1) {
    const firstUser = older.find((message) => message.role === "user");
    const kept: ChatMessage[] = firstUser ? [firstUser] : [];
    let dropIndex = older.length;

    while (estimatedTokens > maxTokens && dropIndex > 1) {
      dropIndex -= 1;
      result = [...kept, ...older.slice(dropIndex).filter((m) => m !== firstUser), ...recent];
      estimatedTokens = estimateMessageTokens(result);
    }
  }

  return { messages: result, compacted: true, estimatedTokens };
}
