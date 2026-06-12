import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { CONFIG_FILE, ensureAppDirectories } from "./app-paths";
import { Mode, ProviderId, type AppConfig } from "./app-schema";
import { getDefaultModel, getProviderModels } from "./models";

export function hasSavedConfig() {
  return existsSync(CONFIG_FILE);
}

export function getDefaultConfig(): AppConfig {
  const modelByProvider = {} as AppConfig["modelByProvider"];
  for (const provider of Object.values(ProviderId)) {
    modelByProvider[provider] = getDefaultModel(provider).id;
  }

  return {
    activeProvider: ProviderId.OPENROUTER,
    modelByProvider,
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

    const modelByProvider = {} as AppConfig["modelByProvider"];
    for (const provider of Object.values(ProviderId)) {
      modelByProvider[provider] =
        parsed.modelByProvider?.[provider] ?? defaults.modelByProvider[provider];
    }

    for (const provider of Object.values(ProviderId)) {
      const availableModels = getProviderModels(provider);
      if (!availableModels.some((model) => model.id === modelByProvider[provider])) {
        modelByProvider[provider] = getDefaultModel(provider).id;
      }
    }

    const isValidProvider =
      parsed.activeProvider != null
      && Object.values(ProviderId).includes(parsed.activeProvider);

    const config = {
      activeProvider: isValidProvider ? parsed.activeProvider! : defaults.activeProvider,
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
