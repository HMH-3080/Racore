/**
 * Headless (non-interactive) runner: `racore -p "fix the failing test"`.
 * Runs the full agent loop without the TUI so racore can be scripted and
 * used in CI pipelines. Supports --json output and --continue to resume
 * the most recent session.
 */
import { Mode, type ChatMessage, type ModeType } from "./lib/app-schema";
import { continueAgentLoop } from "./lib/agent-loop";
import { submitChat } from "./lib/chat-service";
import { loadConfig } from "./lib/config-store";
import { createSession, listSessions, saveSession } from "./lib/session-store";

function getMode(raw: string | undefined): ModeType {
  const normalized = raw?.toUpperCase();
  if (normalized === Mode.PLAN || normalized === Mode.ULTRA || normalized === Mode.BUILD) {
    return normalized;
  }
  return Mode.BUILD;
}

function extractText(message: ChatMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => (part as { text: string }).text)
    .join("\n")
    .trim();
}

function countToolCalls(message: ChatMessage): number {
  return message.parts.filter((part) => part.type.startsWith("tool-")).length;
}

function getLatestAssistantMessage(messages: ChatMessage[]) {
  return [...messages].reverse().find((message) => message.role === "assistant") ?? null;
}

function countToolCallsInMessages(messages: ChatMessage[]): number {
  return messages
    .filter((message) => message.role === "assistant")
    .reduce((sum, message) => sum + countToolCalls(message), 0);
}

function sumUsage(messages: ChatMessage[]) {
  return messages
    .filter((message) => message.role === "assistant")
    .reduce(
      (totals, message) => ({
        inputTokens: totals.inputTokens + (message.metadata?.inputTokens ?? 0),
        outputTokens: totals.outputTokens + (message.metadata?.outputTokens ?? 0),
        totalTokens: totals.totalTokens + (message.metadata?.totalTokens ?? 0),
      }),
      { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    );
}

async function main() {
  const prompt = process.env["RACORE_PROMPT"];
  if (!prompt) {
    console.error("Headless mode requires a prompt. Usage: racore -p \"your task\"");
    process.exit(1);
  }

  const json = process.env["RACORE_JSON"] === "1";
  const continueSession = process.env["RACORE_CONTINUE"] === "1";
  const config = loadConfig();
  const mode = getMode(process.env["RACORE_MODE"] ?? config.mode);
  const model = process.env["RACORE_MODEL"] ?? config.modelByProvider[config.activeProvider];

  const session = continueSession
    ? listSessions()[0] ?? createSession(prompt.slice(0, 60))
    : createSession(prompt.slice(0, 60));

  const userMessage: ChatMessage = {
    id: crypto.randomUUID(),
    role: "user",
    parts: [{ type: "text", text: prompt }],
  };
  const messages = [...session.messages, userMessage];

  const printedLengths = new Map<string, number>();
  const printUpdate = (message: ChatMessage) => {
    const text = extractText(message);
    const lastPrinted = printedLengths.get(message.id) ?? 0;
    if (text.length > lastPrinted) {
      process.stdout.write(text.slice(lastPrinted));
      printedLengths.set(message.id, text.length);
    }
  };
  const startTime = Date.now();

  try {
    const assistantMessage = await submitChat({
      messages,
      mode,
      model,
      provider: config.activeProvider,
      onUpdate: json
        ? undefined
        : printUpdate,
    });

    let currentMessages = [...messages, assistantMessage];
    session.messages = currentMessages;
    saveSession(session);

    const loopResult = await continueAgentLoop({
      messages: currentMessages,
      mode,
      model,
      provider: config.activeProvider,
      submitChat,
      onContinuationStart: () => {
        if (!json) process.stdout.write("\n");
      },
      onUpdate: json ? undefined : printUpdate,
      onRoundComplete: ({ messages: nextMessages }) => {
        currentMessages = nextMessages;
        session.messages = currentMessages;
        saveSession(session);
      },
    });

    currentMessages = loopResult.messages;
    session.messages = currentMessages;
    saveSession(session);

    if (loopResult.stopReason === "error") {
      throw loopResult.error;
    }

    const finalAssistantMessage = getLatestAssistantMessage(currentMessages) ?? assistantMessage;
    const finalText = extractText(finalAssistantMessage);
    const usage = sumUsage(currentMessages);
    const ok = loopResult.stopReason === "completed";

    if (json) {
      console.log(JSON.stringify({
        ok,
        sessionId: session.id,
        mode,
        model: finalAssistantMessage.metadata?.model ?? model,
        durationMs: Date.now() - startTime,
        continuationRounds: loopResult.continuationRounds,
        stopReason: loopResult.stopReason,
        toolCalls: countToolCallsInMessages(currentMessages),
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
        text: finalText,
      }, null, 2));
    } else {
      printUpdate(finalAssistantMessage);
      if (!ok) {
        console.error(`Headless loop stopped before completion: ${loopResult.stopReason}`);
      }
      process.stdout.write("\n");
    }

    process.exit(ok ? 0 : 2);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (json) {
      console.log(JSON.stringify({ ok: false, error: message }, null, 2));
    } else {
      console.error(`\nError: ${message}`);
    }
    process.exit(1);
  }
}

await main();
