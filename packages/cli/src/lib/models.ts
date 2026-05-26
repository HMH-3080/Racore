import { ProviderId, type ProviderIdType, type ProviderModel } from "./app-schema";

export const PROVIDER_MODELS: ProviderModel[] = [
  {
    id: "gpt-5.4",
    provider: ProviderId.OPENAI,
    label: "GPT-5.4",
    capability: "Strong coding and planning",
    recommended: true,
  },
  {
    id: "gpt-5.4-mini",
    provider: ProviderId.OPENAI,
    label: "GPT-5.4 Mini",
    capability: "Faster lower-cost coding",
  },
  {
    id: "openai/gpt-5",
    provider: ProviderId.OPENROUTER,
    label: "GPT-5 via OpenRouter",
    capability: "Broad routing and unified billing",
    recommended: true,
  },
  {
    id: "anthropic/claude-sonnet-4",
    provider: ProviderId.OPENROUTER,
    label: "Claude Sonnet 4 via OpenRouter",
    capability: "Reliable code editing and analysis",
  },
];

export function getProviderModels(provider: ProviderIdType) {
  return PROVIDER_MODELS.filter((model) => model.provider === provider);
}

export function getDefaultModel(provider: ProviderIdType) {
  return getProviderModels(provider).find((model) => model.recommended) ?? getProviderModels(provider)[0]!;
}

export function getModelById(modelId: string) {
  return PROVIDER_MODELS.find((model) => model.id === modelId);
}
