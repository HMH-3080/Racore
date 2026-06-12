import { ProviderId, type ProviderIdType } from "./app-schema";

export type ProviderDefinition = {
  id: ProviderIdType;
  label: string;
  shortLabel: string;
  description: string;
  browserLabel: string;
  browserUrl: string;
  envVar: string;
  supportsOAuth: boolean;
  supportsDirectApiKey: boolean;
  runtime: "openai-compatible";
  authHint: string;
};

export const PROVIDERS: ProviderDefinition[] = [
  {
    id: ProviderId.OPENROUTER,
    label: "OpenRouter",
    shortLabel: "OpenRouter",
    description: "Unified routing for OpenAI, Anthropic, and more through one key.",
    browserLabel: "Open OpenRouter dashboard",
    browserUrl: "https://openrouter.ai/settings/keys",
    envVar: "OPENROUTER_API_KEY",
    supportsOAuth: true,
    supportsDirectApiKey: true,
    runtime: "openai-compatible",
    authHint: "OAuth can create a local key automatically, or you can paste a key yourself.",
  },
  {
    id: ProviderId.OPENAI,
    label: "OpenAI",
    shortLabel: "OpenAI",
    description: "Direct OpenAI API access with prompt caching for agentic loops.",
    browserLabel: "Open OpenAI API keys",
    browserUrl: "https://platform.openai.com/api-keys",
    envVar: "OPENAI_API_KEY",
    supportsOAuth: false,
    supportsDirectApiKey: true,
    runtime: "openai-compatible",
    authHint: "Paste an API key from platform.openai.com, or set OPENAI_API_KEY.",
  },
  {
    id: ProviderId.ANTHROPIC,
    label: "Anthropic",
    shortLabel: "Anthropic",
    description: "Direct Claude API access via Anthropic's OpenAI-compatible endpoint.",
    browserLabel: "Open Anthropic console",
    browserUrl: "https://console.anthropic.com/settings/keys",
    envVar: "ANTHROPIC_API_KEY",
    supportsOAuth: false,
    supportsDirectApiKey: true,
    runtime: "openai-compatible",
    authHint: "Paste an API key from console.anthropic.com, or set ANTHROPIC_API_KEY.",
  },
  {
    id: ProviderId.GEMINI,
    label: "Google Gemini",
    shortLabel: "Gemini",
    description: "Direct Gemini API access via Google's OpenAI-compatible endpoint.",
    browserLabel: "Open Google AI Studio",
    browserUrl: "https://aistudio.google.com/apikey",
    envVar: "GEMINI_API_KEY",
    supportsOAuth: false,
    supportsDirectApiKey: true,
    runtime: "openai-compatible",
    authHint: "Paste an API key from aistudio.google.com, or set GEMINI_API_KEY.",
  },
  {
    id: ProviderId.OLLAMA,
    label: "Ollama (local)",
    shortLabel: "Ollama",
    description: "Local models via Ollama or LM Studio. No API key required.",
    browserLabel: "Open Ollama docs",
    browserUrl: "https://ollama.com/download",
    envVar: "OLLAMA_HOST",
    supportsOAuth: false,
    supportsDirectApiKey: false,
    runtime: "openai-compatible",
    authHint: "Run `ollama serve` locally. Set OLLAMA_HOST to use a custom endpoint (default http://localhost:11434).",
  },
];

export function getProviderDefinition(provider: ProviderIdType) {
  return PROVIDERS.find((item) => item.id === provider) ?? PROVIDERS[0]!;
}
