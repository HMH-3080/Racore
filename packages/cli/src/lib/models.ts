import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { ensureAppDirectories, MODELS_FILE } from "./app-paths";
import { ProviderId, type ProviderIdType, type ProviderModel } from "./app-schema";

type StoredModelsState = Partial<Record<ProviderIdType, ProviderModel[]>>;

export const DEFAULT_OPENROUTER_MODEL_ID = "qwen/qwen3-coder:free";

export const BUILTIN_PROVIDER_MODELS: ProviderModel[] = [
  {
    id: DEFAULT_OPENROUTER_MODEL_ID,
    provider: ProviderId.OPENROUTER,
    label: "Qwen3 Coder Free via OpenRouter",
    capability: "Free default coding model for first-run setup",
    recommended: true,
    supportedParameters: ["tools"],
    supportsStreaming: true,
    supportsTools: true,
  },
  {
    id: "google/gemini-2.5-flash",
    provider: ProviderId.OPENROUTER,
    label: "Gemini 2.5 Flash via OpenRouter",
    capability: "Fast default for low-latency coding turns",
    supportedParameters: ["tools"],
    supportsStreaming: true,
    supportsTools: true,
  },
  {
    id: "openai/gpt-4o-mini",
    provider: ProviderId.OPENROUTER,
    label: "GPT-4o Mini via OpenRouter",
    capability: "Very fast routing for simple edits and chat",
    supportedParameters: ["tools"],
    supportsStreaming: true,
    supportsTools: true,
  },
  {
    id: "openai/gpt-5",
    provider: ProviderId.OPENROUTER,
    label: "GPT-5 via OpenRouter",
    capability: "Broad routing and unified billing",
    supportedParameters: ["tools", "reasoning"],
    supportsReasoning: true,
    supportsStreaming: true,
    supportsTools: true,
  },
  {
    id: "anthropic/claude-sonnet-4",
    provider: ProviderId.OPENROUTER,
    label: "Claude Sonnet 4 via OpenRouter",
    capability: "Reliable code editing and analysis",
    supportedParameters: ["tools", "reasoning"],
    supportsReasoning: true,
    supportsStreaming: true,
    supportsTools: true,
  },
  {
    id: "gpt-4o-mini",
    provider: ProviderId.OPENAI,
    label: "GPT-4o Mini",
    capability: "Fast, low-cost direct OpenAI model",
    recommended: true,
    supportedParameters: ["tools"],
    supportsStreaming: true,
    supportsTools: true,
  },
  {
    id: "gpt-4o",
    provider: ProviderId.OPENAI,
    label: "GPT-4o",
    capability: "Strong general coding via direct OpenAI",
    supportedParameters: ["tools"],
    supportsStreaming: true,
    supportsTools: true,
  },
  {
    id: "gpt-4.1",
    provider: ProviderId.OPENAI,
    label: "GPT-4.1",
    capability: "Long-context coding via direct OpenAI",
    supportedParameters: ["tools"],
    supportsStreaming: true,
    supportsTools: true,
  },
  {
    id: "claude-sonnet-4-20250514",
    provider: ProviderId.ANTHROPIC,
    label: "Claude Sonnet 4",
    capability: "Reliable code editing via direct Anthropic",
    recommended: true,
    supportedParameters: ["tools", "reasoning"],
    supportsReasoning: true,
    supportsStreaming: true,
    supportsTools: true,
  },
  {
    id: "claude-3-5-haiku-20241022",
    provider: ProviderId.ANTHROPIC,
    label: "Claude 3.5 Haiku",
    capability: "Fast, low-cost direct Anthropic model",
    supportedParameters: ["tools"],
    supportsStreaming: true,
    supportsTools: true,
  },
  {
    id: "gemini-2.5-flash",
    provider: ProviderId.GEMINI,
    label: "Gemini 2.5 Flash",
    capability: "Fast direct Gemini model for coding turns",
    recommended: true,
    supportedParameters: ["tools"],
    supportsStreaming: true,
    supportsTools: true,
  },
  {
    id: "gemini-2.5-pro",
    provider: ProviderId.GEMINI,
    label: "Gemini 2.5 Pro",
    capability: "Strong reasoning via direct Gemini",
    supportedParameters: ["tools", "reasoning"],
    supportsReasoning: true,
    supportsStreaming: true,
    supportsTools: true,
  },
  {
    id: "qwen2.5-coder:7b",
    provider: ProviderId.OLLAMA,
    label: "Qwen2.5 Coder 7B (local)",
    capability: "Local coding model via Ollama",
    recommended: true,
    supportedParameters: ["tools"],
    supportsStreaming: true,
    supportsTools: true,
  },
  {
    id: "llama3.1:8b",
    provider: ProviderId.OLLAMA,
    label: "Llama 3.1 8B (local)",
    capability: "Local general model via Ollama",
    supportedParameters: ["tools"],
    supportsStreaming: true,
    supportsTools: true,
  },
];

function loadStoredModelsState(): StoredModelsState {
  try {
    if (!existsSync(MODELS_FILE)) {
      return {};
    }

    return JSON.parse(readFileSync(MODELS_FILE, "utf8")) as StoredModelsState;
  } catch {
    return {};
  }
}

function saveStoredModelsState(state: StoredModelsState) {
  ensureAppDirectories();
  writeFileSync(MODELS_FILE, JSON.stringify(state, null, 2), "utf8");
}

export function mergeProviderModels(
  builtinModels: ProviderModel[],
  fetchedModels: ProviderModel[],
) {
  const byId = new Map<string, ProviderModel>();

  for (const model of builtinModels) {
    byId.set(model.id, model);
  }

  for (const model of fetchedModels) {
    const existing = byId.get(model.id);
    byId.set(model.id, {
      ...existing,
      ...model,
      recommended: existing?.recommended ?? model.recommended,
    });
  }

  return [...byId.values()];
}

export function getProviderModels(provider: ProviderIdType) {
  const builtinModels = BUILTIN_PROVIDER_MODELS.filter((model) => model.provider === provider);
  const storedModels = loadStoredModelsState()[provider] ?? [];
  return mergeProviderModels(builtinModels, storedModels);
}

export function getDefaultModel(provider: ProviderIdType) {
  const models = getProviderModels(provider);
  const preferredModel = models.find((model) => model.id === DEFAULT_OPENROUTER_MODEL_ID);
  if (preferredModel) return preferredModel;

  return models.find((model) => model.recommended) ?? models[0]!;
}

export function getModelById(modelId: string) {
  return [...BUILTIN_PROVIDER_MODELS, ...Object.values(loadStoredModelsState()).flat()].find(
    (model) => model.id === modelId,
  );
}

function hasReasoningSupport(parameters: string[] = []) {
  return parameters.some((parameter) =>
    ["include_reasoning", "reasoning", "reasoning_effort", "thinking"].includes(parameter),
  );
}

function hasStreamingSupport(modelId: string, parameters: string[] = []) {
  if (parameters.includes("stream")) return true;
  return true;
}

export function getModelCapabilities(modelId: string) {
  const model = getModelById(modelId);
  const supportedParameters = model?.supportedParameters ?? [];

  return {
    supportsReasoning: model?.supportsReasoning ?? hasReasoningSupport(supportedParameters),
    supportsStreaming: model?.supportsStreaming ?? hasStreamingSupport(modelId, supportedParameters),
    supportsTools: model?.supportsTools ?? supportedParameters.includes("tools"),
    supportedParameters,
  };
}

export function toOpenRouterToolModels(
  models: Array<{
    id: string;
    name?: string;
    description?: string;
    supported_parameters?: string[];
  }>,
) {
  return models
    .filter((item) => !!item.id && item.supported_parameters?.includes("tools"))
    .map((item, index) => ({
      id: item.id,
      provider: ProviderId.OPENROUTER,
      label: item.name?.trim() || item.id,
      capability: item.description?.trim() || "OpenRouter available model",
      recommended: index === 0 ? undefined : undefined,
      supportedParameters: item.supported_parameters,
      supportsReasoning: hasReasoningSupport(item.supported_parameters),
      supportsStreaming: hasStreamingSupport(item.id, item.supported_parameters),
      supportsTools: item.supported_parameters.includes("tools"),
    } satisfies ProviderModel));
}

export async function refreshOpenRouterModels(apiKey: string) {
  const response = await fetch("https://openrouter.ai/api/v1/models?supported_parameters=tools", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch OpenRouter models: ${response.status}`);
  }

  const payload = (await response.json()) as {
    data?: Array<{
      id: string;
      name?: string;
      description?: string;
      supported_parameters?: string[];
    }>;
  };

  const fetchedModels = toOpenRouterToolModels(payload.data ?? []);

  const currentState = loadStoredModelsState();
  currentState[ProviderId.OPENROUTER] = fetchedModels;
  saveStoredModelsState(currentState);

  return mergeProviderModels(
    BUILTIN_PROVIDER_MODELS.filter((model) => model.provider === ProviderId.OPENROUTER),
    fetchedModels,
  );
}
