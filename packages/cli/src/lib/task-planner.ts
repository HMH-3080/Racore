import { generateText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { getProviderAuth } from "./provider-auth";
import { ProviderId } from "./app-schema";

const DECOMPOSITION_PROMPT = `You are a task decomposition expert. Break down the user's request into the smallest possible actionable steps.

Rules:
- Each step must be self-contained and actionable
- Steps should be granular (1 step = 1 file or 1 concept)
- No step should be larger than what takes 1-2 tool calls to complete
- Aim for many small steps rather than few large ones
- Return ONLY a JSON array of strings, nothing else
- Example: ["Create file structure for kernel", "Implement memory manager", "Write bootloader entry point", "Create process scheduler", "Set up interrupt handlers"]
- Be specific about what file or component each step targets`;

type DecomposedTask = {
  title: string;
  description?: string;
};

function parseDecomposition(text: string): DecomposedTask[] {
  const cleaned = text
    .replace(/```(?:json)?\s*/gi, "")
    .replace(/```\s*$/g, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return parsed.map((item) =>
        typeof item === "string" ? { title: item } : { title: item.title ?? String(item), description: item.description },
      );
    }
  } catch {
    // fallback: line-by-line parsing
  }

  return cleaned
    .split("\n")
    .map((line) => line.replace(/^[\d*.+\-)\s]+/, "").trim())
    .filter((line) => line.length > 5)
    .map((title) => ({ title }));
}

export async function decomposeTask(task: string, model = "openai/gpt-4o-mini"): Promise<DecomposedTask[]> {
  const auth = getProviderAuth(ProviderId.OPENROUTER);
  if (!auth.apiKey) {
    return [{ title: task, description: "No API key available" }];
  }

  const openrouter = createOpenRouter({ apiKey: auth.apiKey });

  try {
    const result = await generateText({
      model: openrouter.chat(model),
      system: DECOMPOSITION_PROMPT,
      messages: [{ role: "user", content: task }],
      maxRetries: 1,
    });

    const items = parseDecomposition(result.text);

    if (items.length === 0) {
      return [{ title: task }];
    }

    return items;
  } catch {
    return [{ title: task }];
  }
}
