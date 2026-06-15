import { APICallError, generateText, streamText, stepCountIs, type ModelMessage, type StepResult, type ToolSet } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createOpenAI } from "@ai-sdk/openai";
import {
  Mode,
  ProviderId,
  type ChatMessage,
  type MessageMetadata,
  type ModeType,
  type ProviderIdType,
} from "./app-schema";
import { formatAgentAccelerationContext, getAgentAccelerationContext } from "./agent-accelerator";
import { beginCheckpoint } from "./checkpoint-store";
import { compactMessages } from "./context-compactor";
import { reportContextUsage } from "./context-usage-store";
import { reportAgentActivity } from "./agent-activity-store";
import { getMcpTools, hasMcpServersConfigured } from "./mcp";
import { buildToolRegistry } from "./tool-registry";
import { getModelCapabilities, getProviderModels } from "./models";
import { getProviderAuth } from "./provider-auth";
import { recordUsage } from "./usage-store";
import { formatSkillsContext } from "./skills";

const FAST_OPENROUTER_MODELS = [
  "google/gemini-2.5-flash",
  "openai/gpt-4o-mini",
  "anthropic/claude-3.5-haiku",
  "meta-llama/llama-3.1-8b-instruct:free",
];

function buildSystemPrompt(mode: ModeType, useTools: boolean, accelerationContext?: string | null, latestUserText?: string) {
  if (!useTools) {
    return "You are R'a Core. Reply briefly and directly.";
  }

  const speedProtocol = [
    "Speed protocol:",
    "Use the fast workspace context before broad exploration.",
    "Prefer readManyFiles, grepManyPatterns, affectedTests, and patchFile for compact parallel progress.",
    "Run focused verification before wider commands when tests are inferred.",
    "After completing edits, call verifyChanges to typecheck and lint, then fix any reported errors before finishing.",
    "Use gitStatus and gitDiff to ground yourself in the working tree before and after changes.",
  ].join(" ");

  const todoProtocol = [
    "Task plan protocol:",
    "An intent controller may have already seeded a task plan. YOUR FIRST ACTION: call getTodoList.",
    "If the plan is missing or incomplete, add the missing tasks with updateTodoList - never duplicate existing ones, and never restate the prompt as a task.",
    "Keep each task focused on one verifiable deliverable.",
    "Mark a task in_progress the moment you start it, and completed with a one-line result the moment it is done - this is the user-visible live progress signal.",
    "Batch independent reads and checks in parallel to move through tasks fast.",
  ].join(" ");

  const completionProtocol = [
    "Completion protocol:",
    "NEVER stop while any task is pending or in_progress - keep working through getTodoList until everything is completed.",
    "When ALL tasks are completed, end with a Final Report section (markdown heading): what was done, files changed, verification results, and anything the user should know.",
    "Do not ask for permission to continue; continue.",
  ].join(" ");

  const skillsProtocol = [
    "Skills:",
    "Relevant skills may be injected below - apply them immediately when they match the task.",
    "If a task matches a known domain, call listSkills/useSkill before improvising.",
    "After solving a novel, repeatable problem, save it with createSkill so future runs are faster.",
    "Tools prefixed mcp_ come from user-configured MCP servers - prefer them for their domains (databases, browsers, issue trackers).",
  ].join(" ");

  // Auto-inject relevant skills for the current task
  const skillsContext = latestUserText ? formatSkillsContext(latestUserText) : null;

  const contextParts: string[] = [];
  if (accelerationContext) contextParts.push(accelerationContext);
  if (skillsContext) contextParts.push(skillsContext);
  const context = contextParts.length > 0 ? `\n\n${contextParts.join("\n\n")}` : "";

  if (mode === Mode.PLAN) {
    return [
      "You are R'a Core in Plan mode. Inspect carefully. Use only read-only tools. Keep answers concise.",
      speedProtocol,
      todoProtocol,
      completionProtocol,
      skillsProtocol,
    ].join(" ") + context;
  }

  if (mode === Mode.ULTRA) {
    return [
      "You are R'a Core in Ultra mode.",
      "Use parallel and batch tools when work spans files.",
      "Treat the repo index as your first map, then launch only the missing reads or checks.",
      "Route small subtasks to invokeAI only when they can run independently.",
      "Keep results coordinated and concise.",
      speedProtocol,
      todoProtocol,
      completionProtocol,
      skillsProtocol,
    ].join(" ") + context;
  }

  return [
    "You are R'a Core, a local coding assistant. Use tools only when useful. Prefer precise edits and concise progress.",
    speedProtocol,
    todoProtocol,
    completionProtocol,
    skillsProtocol,
  ].join(" ") + context;
}

const PROVIDER_BASE_URLS: Partial<Record<ProviderIdType, string>> = {
  [ProviderId.ANTHROPIC]: "https://api.anthropic.com/v1",
  [ProviderId.GEMINI]: "https://generativelanguage.googleapis.com/v1beta/openai",
};

function getOllamaBaseUrl() {
  const host = process.env["OLLAMA_HOST"] ?? "http://localhost:11434";
  return host.endsWith("/v1") ? host : `${host.replace(/\/$/, "")}/v1`;
}

function getModel(modelId: string, provider: ProviderIdType = ProviderId.OPENROUTER) {
  const auth = getProviderAuth(provider);
  if (!auth.apiKey) {
    throw new Error(`${provider} is not connected. Connect it in /config or set its API key environment variable.`);
  }

  if (provider === ProviderId.OPENROUTER) {
    const openrouter = createOpenRouter({
      apiKey: auth.apiKey,
      appUrl: "https://github.com/loayabdalslam/racore",
      appName: "R'a Core",
    });
    return openrouter.chat(modelId);
  }

  // Direct providers all speak the OpenAI-compatible protocol.
  const client = createOpenAI({
    apiKey: auth.apiKey,
    baseURL: provider === ProviderId.OLLAMA ? getOllamaBaseUrl() : PROVIDER_BASE_URLS[provider],
  });
  return client.chat(modelId);
}

function readProviderError(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;

  const error = "error" in data ? data.error : data;
  if (typeof error === "string") return error;
  if (!error || typeof error !== "object") return null;

  const message = "message" in error ? error.message : undefined;
  const code = "code" in error ? error.code : undefined;
  const metadata = "metadata" in error ? error.metadata : undefined;
  const raw =
    metadata && typeof metadata === "object" && "raw" in metadata
      ? metadata.raw
      : undefined;
  const retryAfter =
    metadata && typeof metadata === "object" && "retry_after_seconds" in metadata
      ? metadata.retry_after_seconds
      : undefined;

  return [
    typeof code === "string" || typeof code === "number" ? `${code}` : "",
    typeof message === "string" ? message : "",
    typeof raw === "string" ? raw : "",
    typeof retryAfter === "number" ? `Retry after ${Math.ceil(retryAfter)}s.` : "",
  ].filter(Boolean).join(": ") || null;
}

function parseProviderErrorBody(responseBody?: string): string | null {
  if (!responseBody) return null;

  try {
    return readProviderError(JSON.parse(responseBody));
  } catch {
    return responseBody.length > 240 ? `${responseBody.slice(0, 240)}...` : responseBody;
  }
}

function formatChatError(error: unknown, model: string) {
  if (APICallError.isInstance(error)) {
    const providerMessage =
      readProviderError(error.data) ?? parseProviderErrorBody(error.responseBody) ?? error.message;
    const status = error.statusCode ? `HTTP ${error.statusCode}` : "provider error";
    return new Error(`openrouter ${status} for ${model}: ${providerMessage}`);
  }

  if (error instanceof Error && APICallError.isInstance(error.cause)) {
    return formatChatError(error.cause, model);
  }

  if (error instanceof Error) return error;
  return new Error(String(error));
}

function getApiCallError(error: unknown): APICallError | null {
  if (APICallError.isInstance(error)) return error;
  if (error instanceof Error && error.cause) return getApiCallError(error.cause);
  return null;
}

function shouldTryOpenRouterFallback(error: unknown) {
  const apiError = getApiCallError(error);
  return apiError?.statusCode === 429 || (apiError?.statusCode != null && apiError.statusCode >= 500);
}

function shouldTryNextAutoRoutedModel(error: unknown, modelId: string, selectedModel: string) {
  if (modelId === selectedModel) return false;

  const apiError = getApiCallError(error);
  return apiError?.statusCode === 400 || apiError?.statusCode === 404 || apiError?.statusCode === 422;
}

function isNoOutputGeneratedError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /no output generated/i.test(message) || /check the stream for errors/i.test(message);
}

function shouldRetryWithoutTools(error: unknown) {
  const apiError = getApiCallError(error);
  if (!apiError || apiError.statusCode !== 400) return false;

  const message = [
    readProviderError(apiError.data),
    parseProviderErrorBody(apiError.responseBody),
    apiError.message,
  ].filter(Boolean).join("\n");

  return /invalid_prompt|invalid responses api request|tool|tools|function/i.test(message);
}

function getLatestUserText(messages: ChatMessage[]) {
  const latest = [...messages].reverse().find((message) => message.role === "user");
  return latest?.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim() ?? "";
}

function isCasualPrompt(text: string) {
  const normalized = text.toLowerCase().trim();
  if (normalized.length > 40) return false;

  return /^(hi|hello|hey|yo|sup|thanks|thank you|ok|okay|i|test|ping|how are you)[.!? ]*$/.test(normalized);
}

function getOpenRouterCandidateModels(selectedModel: string): string[] {
  const modelPrefix = selectedModel.split("/")[0];
  if (!modelPrefix) return [selectedModel].filter(Boolean);

  const models = getProviderModels(ProviderId.OPENROUTER).map((m) => m.id);
  const sameFamily = models.filter((id) => id.startsWith(modelPrefix + "/") || id === selectedModel);

  const candidates = [...new Set([selectedModel, ...sameFamily])].filter(Boolean);
  return candidates.slice(0, 3);
}

function getRoutedOpenRouterCandidateModels(selectedModel: string, _mode: ModeType, _text: string): string[] {
  // Use exactly the selected model — no automatic routing to other models.
  // This ensures the model shown in the input bar is the one actually used.
  return [selectedModel];
}

function toModelMessages(messages: ChatMessage[]): ModelMessage[] {
  const modelMessages: ModelMessage[] = [];

  for (const message of messages) {
    const text = message.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n")
      .trim();

    if (message.role === "user") {
      if (text) {
        modelMessages.push({ role: "user", content: text });
      }
      continue;
    }

    const toolParts = message.parts.filter((part) => part.type.startsWith("tool-"));
    if (toolParts.length === 0) {
      if (text) {
        modelMessages.push({ role: "assistant", content: text });
      }
      continue;
    }

    modelMessages.push({
      role: "assistant",
      content: [
        ...(text ? [{ type: "text" as const, text }] : []),
        ...toolParts.map((part) => ({
          type: "tool-call" as const,
          toolCallId: part.toolCallId,
          toolName: part.type.slice("tool-".length),
          input: part.input ?? {},
        })),
      ],
    });

    modelMessages.push({
      role: "tool",
      content: toolParts.map((part) => {
        const rawOutput = part.output ?? part.errorText ?? "";
        const isError = part.state === "output-error";
        return {
          type: "tool-result" as const,
          toolCallId: part.toolCallId,
          toolName: part.type.slice("tool-".length),
          output: typeof rawOutput === "string"
            ? { type: isError ? "error-text" as const : "text" as const, value: rawOutput }
            : { type: isError ? "error-json" as const : "json" as const, value: rawOutput },
          isError,
        };
      }),
    });
  }

  return modelMessages;
}

function buildStreamingParts(reasoningText: string, text: string): ChatMessage["parts"] {
  return [
    reasoningText ? { type: "reasoning" as const, text: reasoningText } : null,
    { type: "text" as const, text },
  ].filter((part): part is ChatMessage["parts"][number] => part !== null);
}

async function streamModelText(params: {
  model: ReturnType<typeof getModel>;
  system: string;
  messages: ModelMessage[];
  maxSteps: number;
  tools?: ToolSet;
  supportsStreaming: boolean;
  supportsReasoning: boolean;
  startTime: number;
  streamingMessage: ChatMessage;
  onUpdate?: (message: ChatMessage) => void;
}) {
  let streamedText = "";
  let reasoningText = "";
  let steps: StepResult<ToolSet>[] | null = null;

  if (!params.supportsStreaming) {
    const result = await generateText({
      model: params.model,
      system: params.system,
      messages: params.messages,
      tools: params.tools,
      maxSteps: params.maxSteps,
      maxRetries: 0,
    });

    streamedText = result.text;
    if (streamedText) {
      params.streamingMessage.parts = buildStreamingParts("", streamedText);
      params.streamingMessage.metadata = {
        ...params.streamingMessage.metadata,
        durationMs: Date.now() - params.startTime,
      };
      params.onUpdate?.(params.streamingMessage);
    }

    steps = result.steps as StepResult<ToolSet>[];
    return { streamedText, reasoningText, steps };
  }

  const result = streamText({
    model: params.model,
    system: params.system,
    messages: params.messages,
    tools: params.tools,
    stopWhen: stepCountIs(params.maxSteps),
    maxRetries: 0,
  });

  for await (const part of result.fullStream) {
    if (part.type === "text-delta") {
      reportAgentActivity("responding");
      streamedText += part.text;
      params.streamingMessage.parts = buildStreamingParts(reasoningText, streamedText);
      params.streamingMessage.metadata = {
        ...params.streamingMessage.metadata,
        durationMs: Date.now() - params.startTime,
      };
      params.onUpdate?.(params.streamingMessage);
    } else if (params.supportsReasoning && part.type === "reasoning-delta") {
      reportAgentActivity("thinking");
      reasoningText += part.text;
      params.streamingMessage.parts = buildStreamingParts(reasoningText, streamedText);
      params.streamingMessage.metadata = {
        ...params.streamingMessage.metadata,
        durationMs: Date.now() - params.startTime,
      };
      params.onUpdate?.(params.streamingMessage);
    } else if (part.type === "error") {
      throw part.error;
    }
  }

  steps = await result.steps;
  return { streamedText, reasoningText, steps };
}

export async function submitChat(params: {
  messages: ChatMessage[];
  mode: ModeType;
  model: string;
  provider?: ProviderIdType;
  onUpdate?: (message: ChatMessage) => void;
}) {
  const provider = params.provider ?? ProviderId.OPENROUTER;
  reportAgentActivity("thinking");
  const startTime = Date.now();
  const { messages: compactedMessages, compacted, estimatedTokens } = compactMessages(params.messages);
  reportContextUsage({ estimatedTokens, compacted });
  const coreMessages = toModelMessages(compactedMessages);
  const latestUserText = getLatestUserText(params.messages);
  const useTools = !isCasualPrompt(latestUserText);
  const maxSteps = !useTools
    ? 1
    : params.mode === Mode.PLAN
      ? 3
      : params.mode === Mode.ULTRA
        ? 10
        : 4;
  const accelerationContext = useTools
    ? await getAgentAccelerationContext({ task: latestUserText, mode: params.mode })
      .then(formatAgentAccelerationContext)
      .catch(() => null)
    : null;
  if (useTools && params.mode !== Mode.PLAN) {
    beginCheckpoint(latestUserText || "agent turn");
  }
  const mcpTools: ToolSet =
    useTools && params.mode !== Mode.PLAN && hasMcpServersConfigured()
      ? await getMcpTools().catch(() => ({}))
      : {};

  const modelIds = provider === ProviderId.OPENROUTER
    ? getRoutedOpenRouterCandidateModels(params.model, params.mode, latestUserText)
    : [params.model];

  let usedModelId = params.model;
  let usedSupportsReasoning = false;
  let steps: StepResult<ToolSet>[] | null = null;
  let streamedText = "";
  let reasoningText = "";
  const errors: Error[] = [];
  const streamingMessage: ChatMessage = {
    id: crypto.randomUUID(),
    role: "assistant",
    parts: [{ type: "text", text: "" }],
    metadata: {
      mode: params.mode,
      provider,
      model: usedModelId,
    },
  };

  for (const modelId of modelIds) {
    usedModelId = modelId;
    const model = getModel(modelId, provider);
    const capabilities = getModelCapabilities(modelId);
    const useModelTools = useTools && capabilities.supportsTools;
    usedSupportsReasoning = capabilities.supportsReasoning;
    streamedText = "";
    reasoningText = "";

    const tools = useModelTools
      ? buildToolRegistry({ mode: params.mode, model, coreMessages, mcpTools })
      : undefined;

    try {
      streamingMessage.metadata = {
        ...streamingMessage.metadata,
        model: modelId,
      };

      const result = await streamModelText({
        model,
        system: buildSystemPrompt(params.mode, useModelTools, accelerationContext, latestUserText),
        messages: coreMessages,
        maxSteps,
        tools,
        supportsStreaming: capabilities.supportsStreaming,
        supportsReasoning: capabilities.supportsReasoning,
        startTime,
        streamingMessage,
        onUpdate: params.onUpdate,
      });

      streamedText = result.streamedText;
      reasoningText = result.reasoningText;
      steps = result.steps;
      break;
    } catch (error) {
      if (useModelTools && shouldRetryWithoutTools(error)) {
        try {
          const retry = await streamModelText({
            model,
            system: buildSystemPrompt(params.mode, false, accelerationContext, latestUserText),
            messages: coreMessages,
            maxSteps: 1,
            supportsStreaming: capabilities.supportsStreaming,
            supportsReasoning: capabilities.supportsReasoning,
            startTime,
            streamingMessage,
            onUpdate: params.onUpdate,
          });

          streamedText = retry.streamedText;
          reasoningText = retry.reasoningText;
          steps = retry.steps;
          break;
        } catch (retryError) {
          const formattedRetry = formatChatError(retryError, modelId);
          errors.push(formattedRetry);

          if (!shouldTryOpenRouterFallback(retryError) && !shouldTryNextAutoRoutedModel(retryError, modelId, params.model)) {
            throw formattedRetry;
          }

          continue;
        }
      }

      if (isNoOutputGeneratedError(error)) {
        try {
          const fallback = await generateText({
            model,
            system: buildSystemPrompt(params.mode, useModelTools, accelerationContext, latestUserText),
            messages: coreMessages,
            tools,
            maxSteps,
            maxRetries: 0,
          });

          streamedText = fallback.text;
          if (streamedText) {
            streamingMessage.parts = buildStreamingParts("", streamedText);
            streamingMessage.metadata = {
              ...streamingMessage.metadata,
              durationMs: Date.now() - startTime,
            };
            params.onUpdate?.(streamingMessage);
          }

          steps = fallback.steps as StepResult<ToolSet>[];
          break;
        } catch (fallbackError) {
          const formattedFallback = formatChatError(fallbackError, modelId);
          errors.push(formattedFallback);

          if (!shouldTryOpenRouterFallback(fallbackError) && !shouldTryNextAutoRoutedModel(fallbackError, modelId, params.model)) {
            throw formattedFallback;
          }

          continue;
        }
      }

      const formatted = formatChatError(error, modelId);
      errors.push(formatted);

      if (!shouldTryOpenRouterFallback(error) && !shouldTryNextAutoRoutedModel(error, modelId, params.model)) {
        throw formatted;
      }
    }
  }

  if (!steps) {
    throw new Error(
      [
        "All OpenRouter fallback models failed.",
        ...errors.map((error, index) => `${index + 1}. ${error.message}`),
      ].join("\n"),
    );
  }

  const assistantParts: ChatMessage["parts"] = [];

  for (const [stepIndex, step] of steps.entries()) {
    if (usedSupportsReasoning && typeof step.reasoning === "string" && step.reasoning.length > 0) {
      assistantParts.push({ type: "reasoning", text: step.reasoning });
    }

    for (const toolCall of step.toolCalls ?? []) {
      const toolResult = step.toolResults?.find((resultItem) => resultItem.toolCallId === toolCall.toolCallId);
      assistantParts.push({
        type: `tool-${toolCall.toolName}`,
        toolCallId: toolCall.toolCallId ?? `tool-${stepIndex}-${toolCall.toolName}`,
        input: typeof toolCall.input === "object" && toolCall.input ? toolCall.input as Record<string, unknown> : undefined,
        output: toolResult?.output,
        state: toolResult?.isError ? "output-error" : "output-available",
        errorText: toolResult?.isError ? String(toolResult.output) : undefined,
      });
    }

    if (step.text) {
      assistantParts.push({ type: "text", text: step.text });
    }
  }

  if (assistantParts.length === 0 && streamedText) {
    assistantParts.push({ type: "text", text: streamedText });
  }

  const metadata: MessageMetadata = {
    mode: params.mode,
    provider,
    model: usedModelId,
    durationMs: Date.now() - startTime,
  };

  const assistantMessage: ChatMessage = {
    id: crypto.randomUUID(),
    role: "assistant",
    parts: assistantParts.length > 0 ? assistantParts : [{ type: "text", text: "No response." }],
    metadata,
  };

  const toolCallCount = steps.reduce((sum, step) => sum + (step.toolCalls?.length ?? 0), 0);
  const totalTextLength = steps.reduce((sum, step) => sum + (step.text?.length ?? 0), 0);

  let totalTokens = 0;
  let inputTokens = 0;
  let outputTokens = 0;

  for (const step of steps) {
    const u = step.usage as Record<string, number> | undefined;
    totalTokens += u?.totalTokens ?? u?.total_tokens ?? 0;
    inputTokens += u?.promptTokens ?? u?.prompt_tokens ?? 0;
    outputTokens += u?.completionTokens ?? u?.completion_tokens ?? u?.outputTokens ?? u?.output_tokens ?? 0;
  }

  if (totalTokens === 0 && totalTextLength > 0) {
    const estimated = Math.ceil(totalTextLength / 4);
    outputTokens = estimated;
    inputTokens = Math.round(estimated * 2.5);
    totalTokens = inputTokens + outputTokens;
  }

  if (inputTokens === 0 && outputTokens > 0) {
    inputTokens = Math.round(outputTokens * 2);
    totalTokens = inputTokens + outputTokens;
  }

  const durationMs = Date.now() - startTime;
  assistantMessage.metadata = {
    ...assistantMessage.metadata,
    durationMs,
    inputTokens,
    outputTokens,
    totalTokens,
    toolCalls: toolCallCount,
  };

  recordUsage({
    model: usedModelId,
    mode: params.mode,
    inputTokens,
    outputTokens,
    totalTokens,
    cost: 0,
    durationMs,
    toolCalls: toolCallCount,
  });

  reportAgentActivity("idle");
  return assistantMessage;
}
