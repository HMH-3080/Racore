import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { CONFIG_FILE, ensureAppDirectories } from "./app-paths";
import { Mode, ProviderId, type AppConfig } from "./app-schema";
import { getDefaultModel, getProviderModels } from "./models";

export function getDefaultConfig(): AppConfig {
  return {
    activeProvider: ProviderId.OPENAI,
    modelByProvider: {
      [ProviderId.OPENAI]: getDefaultModel(ProviderId.OPENAI).id,
      [ProviderId.OPENROUTER]: getDefaultModel(ProviderId.OPENROUTER).id,
      [ProviderId.GROQ]: getDefaultModel(ProviderId.GROQ).id,
      [ProviderId.XAI]: getDefaultModel(ProviderId.XAI).id,
      [ProviderId.DEEPSEEK]: getDefaultModel(ProviderId.DEEPSEEK).id,
    },
    mode: Mode.BUILD,
  };
}

export function loadConfig(): AppConfig {
  try {
    if (!existsSync(CONFIG_FILE)) {
      const defaults = getDefaultConfig();
      saveConfig(defaults);
      return defaults;
    }

    const parsed = JSON.parse(readFileSync(CONFIG_FILE, "utf8")) as Partial<AppConfig>;
    const defaults = getDefaultConfig();

    const modelByProvider = {
      ...defaults.modelByProvider,
      ...parsed.modelByProvider,
    };

    for (const provider of Object.values(ProviderId)) {
      const availableModels = getProviderModels(provider);
      if (!availableModels.some((model) => model.id === modelByProvider[provider])) {
        modelByProvider[provider] = getDefaultModel(provider).id;
      }
    }

    const config = {
      activeProvider: parsed.activeProvider ?? defaults.activeProvider,
      modelByProvider,
      mode: parsed.mode ?? defaults.mode,
    };

    saveConfig(config);
    return config;
  } catch {
    const defaults = getDefaultConfig();
    saveConfig(defaults);
    return defaults;
  }
}

export function saveConfig(config: AppConfig) {
  ensureAppDirectories();
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { encoding: "utf8", mode: 0o600 });
}
