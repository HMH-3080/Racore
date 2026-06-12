/**
 * Headless (non-interactive) runner: `racore -p "fix the failing test"`.
 * Runs the full agent loop without the TUI so racore can be scripted and
 * used in CI pipelines. Supports --json output and --continue to resume
 * the most recent session.
 */
import { Mode, type ChatMessage, type ModeType } from "./lib/app-schema";
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

  let lastPrinted = 0;
  const startTime = Date.now();

  try {
    const assistantMessage = await submitChat({
      messages,
      mode,
      model,
      provider: config.activeProvider,
      onUpdate: json
        ? undefined
        : (message) => {
            const text = extractText(message);
            if (text.length > lastPrinted) {
              process.stdout.write(text.slice(lastPrinted));
              lastPrinted = text.length;
            }
          },
    });

    session.messages = [...messages, assistantMessage];
    saveSession(session);

    const finalText = extractText(assistantMessage);

    if (json) {
      console.log(JSON.stringify({
        ok: true,
        sessionId: session.id,
        mode,
        model: assistantMessage.metadata?.model ?? model,
        durationMs: Date.now() - startTime,
        toolCalls: countToolCalls(assistantMessage),
        text: finalText,
      }, null, 2));
    } else {
      if (finalText.length > lastPrinted) {
        process.stdout.write(finalText.slice(lastPrinted));
      }
      process.stdout.write("\n");
    }

    process.exit(0);
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
