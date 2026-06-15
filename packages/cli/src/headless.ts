/**
 * Headless (non-interactive) runner: `racore -p "fix the failing test"`.
 * Runs the full agent loop without the TUI so racore can be scripted and
 * used in CI pipelines. Supports --json output and --continue to resume
 * the most recent session.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  Mode,
  ProviderId,
  type ChatMessage,
  type ModeType,
  type ProviderIdType,
} from "./lib/app-schema";
import { continueAgentLoop } from "./lib/agent-loop";
import { submitChat } from "./lib/chat-service";
import { loadConfig } from "./lib/config-store";
import { createSession, getSession, listSessions, saveSession } from "./lib/session-store";

function getMode(raw: string | undefined): ModeType {
  const normalized = raw?.toUpperCase();
  if (normalized === Mode.PLAN || normalized === Mode.ULTRA || normalized === Mode.BUILD) {
    return normalized;
  }
  return Mode.BUILD;
}

function getProvider(raw: string | undefined, fallback: ProviderIdType): ProviderIdType {
  if (!raw) return fallback;
  const normalized = raw?.toLowerCase();
  const providers = Object.values(ProviderId);
  if (providers.includes(normalized as ProviderIdType)) {
    return normalized as ProviderIdType;
  }
  throw new Error(`Invalid --provider value: ${raw}. Expected one of: ${providers.join(", ")}`);
}

function getMaxRounds(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Invalid --max-rounds value: ${raw}`);
  }
  return parsed;
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

function writeOutputFile(path: string, content: string) {
  const target = resolve(process.cwd(), path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content, "utf8");
}

async function main() {
  const prompt = process.env["RACORE_PROMPT"];
  if (!prompt) {
    console.error("Headless mode requires a prompt. Usage: racore -p \"your task\"");
    process.exit(1);
  }

  const json = process.env["RACORE_JSON"] === "1";
  const quiet = process.env["RACORE_QUIET"] === "1";
  const noStream = process.env["RACORE_NO_STREAM"] === "1";
  const continueSession = process.env["RACORE_CONTINUE"] === "1";
  const outputFile = process.env["RACORE_OUTPUT"];
  const startTime = Date.now();

  try {
  const config = loadConfig();
  const mode = getMode(process.env["RACORE_MODE"] ?? config.mode);
  const provider = getProvider(process.env["RACORE_PROVIDER"], config.activeProvider);
  const model = process.env["RACORE_MODEL"] ?? config.modelByProvider[provider];
  const maxContinuationRounds = getMaxRounds(process.env["RACORE_MAX_ROUNDS"]);
  const sessionTitle = process.env["RACORE_SESSION_TITLE"] ?? prompt.slice(0, 60);
  const sessionId = process.env["RACORE_SESSION_ID"];

  const session = sessionId
    ? getSession(sessionId)
    : continueSession
      ? listSessions()[0] ?? createSession(sessionTitle)
      : createSession(sessionTitle);

  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  const userMessage: ChatMessage = {
    id: crypto.randomUUID(),
    role: "user",
    parts: [{ type: "text", text: prompt }],
    metadata: { mode, provider, model },
  };
  const runStartIndex = session.messages.length;
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
    const assistantMessage = await submitChat({
      messages,
      mode,
      model,
      provider,
      onUpdate: json || quiet || noStream
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
      provider,
      submitChat,
      maxContinuationRounds,
      onContinuationStart: () => {
        if (!json && !quiet && !noStream) process.stdout.write("\n");
      },
      onUpdate: json || quiet || noStream ? undefined : printUpdate,
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
    const runMessages = currentMessages.slice(runStartIndex);
    const usage = sumUsage(runMessages);
    const ok = loopResult.stopReason === "completed";
    const payload = {
      ok,
      sessionId: session.id,
      mode,
      provider,
      model: finalAssistantMessage.metadata?.model ?? model,
      cwd: process.cwd(),
      durationMs: Date.now() - startTime,
      continuationRounds: loopResult.continuationRounds,
      stopReason: loopResult.stopReason,
      toolCalls: countToolCallsInMessages(runMessages),
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
      text: finalText,
    };

    if (json) {
      const serialized = JSON.stringify(payload, null, 2);
      if (outputFile) writeOutputFile(outputFile, serialized);
      if (!quiet) console.log(serialized);
    } else {
      if (outputFile) writeOutputFile(outputFile, finalText);
      if (!quiet) {
        if (noStream) {
          process.stdout.write(finalText);
        } else {
          printUpdate(finalAssistantMessage);
        }
      }
      if (!ok) {
        console.error(`Headless loop stopped before completion: ${loopResult.stopReason}`);
      }
      if (!quiet) process.stdout.write("\n");
    }

    process.exit(ok ? 0 : 2);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    if (json) {
      const serialized = JSON.stringify({ ok: false, error: message, stack }, null, 2);
      if (process.env["RACORE_OUTPUT"]) writeOutputFile(process.env["RACORE_OUTPUT"], serialized);
      if (!quiet) console.log(serialized);
    } else {
      console.error(`\nError: ${message}`);
      if (stack) console.error(stack);
    }
    process.exit(1);
  }
}

await main();
