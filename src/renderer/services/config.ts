import { AppConfig, CONFIG_KEYS, defaultConfig } from "@/config";
import { localStore } from "./store";

class ConfigService {
  private config: AppConfig = defaultConfig;

  async init() {
    try {
      const storedConfig = await localStore.getItem<AppConfig>(
        CONFIG_KEYS.APP_CONFIG,
      );

      if (storedConfig) {
        this.config = {
          ...defaultConfig,
          ...storedConfig,
        };
      }
    } catch (error) {
      console.error("Failed to load config:", error);
    }
  }

  getConfig(): AppConfig {
    return this.config;
  }

  async updateConfig(newConfig: Partial<AppConfig>) {
    // const normalizedProviders = normalizeProvidersConfig(
    //   newConfig.providers as AppConfig["providers"] | undefined,
    // );
    this.config = {
      ...this.config,
      ...newConfig,
      // ...(normalizedProviders ? { providers: normalizedProviders } : {}),
    };
    await localStore.setItem(CONFIG_KEYS.APP_CONFIG, this.config);
  }
}

export const configService = new ConfigService();
