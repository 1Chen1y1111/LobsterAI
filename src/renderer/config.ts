// 配置类型定义
export interface AppConfig {
  theme: "light" | "dark" | "system";
  // 语言配置
  language: "zh" | "en";
  // 语言初始化标记 (用于判断是否是首次启动)
  language_initialized?: boolean;
}

// 默认配置
export const defaultConfig: AppConfig = {
  theme: "system",
  language: "zh",
};

// 配置存储键
export const CONFIG_KEYS = {
  APP_CONFIG: "app_config",
};
