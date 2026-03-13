import { join } from 'path'
import { app } from 'electron'
import type { SqliteStore } from '../sqliteStore'
import type { CoworkApiConfig } from './coworkConfigStore'
import {
  configureCoworkOpenAICompatProxy,
  type OpenAICompatProxyTarget,
  getCoworkOpenAICompatProxyBaseURL,
  getCoworkOpenAICompatProxyStatus
} from './coworkOpenAICompatProxy'
import { normalizeProviderApiFormat, type AnthropicApiFormat } from './coworkFormatTransform'

const ZHIPU_CODING_PLAN_BASE_URL = 'https://open.bigmodel.cn/api/coding/paas/v4'
// Qwen Coding Plan 专属端点 (OpenAI 兼容和 Anthropic 兼容)
const QWEN_CODING_PLAN_OPENAI_BASE_URL = 'https://coding.dashscope.aliyuncs.com/v1'
const QWEN_CODING_PLAN_ANTHROPIC_BASE_URL = 'https://coding.dashscope.aliyuncs.com/apps/anthropic'
// Volcengine Coding Plan 专属端点 (OpenAI 兼容和 Anthropic 兼容)
const VOLCENGINE_CODING_PLAN_OPENAI_BASE_URL = 'https://ark.cn-beijing.volces.com/api/coding/v3'
const VOLCENGINE_CODING_PLAN_ANTHROPIC_BASE_URL = 'https://ark.cn-beijing.volces.com/api/coding'
// Moonshot/Kimi Coding Plan 专属端点 (OpenAI 兼容和 Anthropic 兼容)
const MOONSHOT_CODING_PLAN_OPENAI_BASE_URL = 'https://api.kimi.com/coding/v1'
const MOONSHOT_CODING_PLAN_ANTHROPIC_BASE_URL = 'https://api.kimi.com/coding'

type ProviderModel = {
  id: string
}

type ProviderConfig = {
  enabled: boolean
  apiKey: string
  baseUrl: string
  apiFormat?: 'anthropic' | 'openai' | 'native'
  codingPlanEnabled?: boolean
  models?: ProviderModel[]
}

type AppConfig = {
  model?: {
    defaultModel?: string
    defaultModelProvider?: string
  }
  providers?: Record<string, ProviderConfig>
}

export type ApiConfigResolution = {
  config: CoworkApiConfig | null
  error?: string
}

// 由 main.ts 注入的存储实例获取器。
let storeGetter: (() => SqliteStore | null) | null = null

// 注册存储获取器，供当前模块读取配置。
export function setStoreGetter(getter: () => SqliteStore | null): void {
  storeGetter = getter
}

// 获取当前可用的存储实例。
const getStore = (): SqliteStore | null => {
  if (!storeGetter) {
    return null
  }
  return storeGetter()
}

// 获取 Claude Agent SDK CLI 入口路径（区分开发/生产环境）。
export function getClaudeCodePath(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'app.asar.unpacked/node_modules/@anthropic-ai/claude-agent-sdk/cli.js')
  }

  // 开发环境下优先从项目根目录的 node_modules 查找 SDK。
  // app.getAppPath() 可能指向 dist-electron 等构建目录，因此需要回溯到根目录。
  const appPath = app.getAppPath()
  // 若当前路径落在 dist-electron，则回退一级到项目根目录。
  const rootDir = appPath.endsWith('dist-electron') ? join(appPath, '..') : appPath

  return join(rootDir, 'node_modules/@anthropic-ai/claude-agent-sdk/cli.js')
}

type MatchedProvider = {
  providerName: string
  providerConfig: ProviderConfig
  modelId: string
  apiFormat: AnthropicApiFormat
  baseURL: string
}

// 计算 provider 的最终 API 协议类型。
function getEffectiveProviderApiFormat(providerName: string, apiFormat: unknown): AnthropicApiFormat {
  if (providerName === 'openai' || providerName === 'gemini' || providerName === 'stepfun' || providerName === 'youdaozhiyun') {
    return 'openai'
  }
  if (providerName === 'anthropic') {
    return 'anthropic'
  }
  return normalizeProviderApiFormat(apiFormat)
}

// 判断指定 provider 是否必须提供 API Key。
function providerRequiresApiKey(providerName: string): boolean {
  return providerName !== 'ollama'
}

// 根据应用配置解析当前应使用的 provider/model 及其连接参数。
function resolveMatchedProvider(appConfig: AppConfig): { matched: MatchedProvider | null; error?: string } {
  const providers = appConfig.providers ?? {}

  const resolveFallbackModel = (): string | undefined => {
    for (const provider of Object.values(providers)) {
      if (!provider?.enabled || !provider.models || provider.models.length === 0) {
        continue
      }
      return provider.models[0].id
    }
    return undefined
  }

  const modelId = appConfig.model?.defaultModel || resolveFallbackModel()
  if (!modelId) {
    return { matched: null, error: 'No available model configured in enabled providers.' }
  }

  let providerEntry: [string, ProviderConfig] | undefined
  const preferredProviderName = appConfig.model?.defaultModelProvider?.trim()
  if (preferredProviderName) {
    const preferredProvider = providers[preferredProviderName]
    if (preferredProvider?.enabled && preferredProvider.models?.some((model) => model.id === modelId)) {
      providerEntry = [preferredProviderName, preferredProvider]
    }
  }

  if (!providerEntry) {
    providerEntry = Object.entries(providers).find(([, provider]) => {
      if (!provider?.enabled || !provider.models) {
        return false
      }
      return provider.models.some((model) => model.id === modelId)
    })
  }

  if (!providerEntry) {
    return { matched: null, error: `No enabled provider found for model: ${modelId}` }
  }

  const [providerName, providerConfig] = providerEntry
  let apiFormat = getEffectiveProviderApiFormat(providerName, providerConfig.apiFormat)
  let baseURL = providerConfig.baseUrl?.trim()

  // 处理智谱 Coding Plan 端点切换。
  if (providerName === 'zhipu' && providerConfig.codingPlanEnabled) {
    baseURL = ZHIPU_CODING_PLAN_BASE_URL
    apiFormat = 'openai'
  }

  // 处理千问 Coding Plan 端点切换（支持 OpenAI/Anthropic 双兼容格式）。
  if (providerName === 'qwen' && providerConfig.codingPlanEnabled) {
    if (apiFormat === 'anthropic') {
      baseURL = QWEN_CODING_PLAN_ANTHROPIC_BASE_URL
    } else {
      baseURL = QWEN_CODING_PLAN_OPENAI_BASE_URL
      apiFormat = 'openai'
    }
  }

  // 处理火山引擎 Coding Plan 端点切换（支持 OpenAI/Anthropic 双兼容格式）。
  if (providerName === 'volcengine' && providerConfig.codingPlanEnabled) {
    if (apiFormat === 'anthropic') {
      baseURL = VOLCENGINE_CODING_PLAN_ANTHROPIC_BASE_URL
    } else {
      baseURL = VOLCENGINE_CODING_PLAN_OPENAI_BASE_URL
      apiFormat = 'openai'
    }
  }

  // 处理 Moonshot/Kimi Coding Plan 端点切换（支持 OpenAI/Anthropic 双兼容格式）。
  if (providerName === 'moonshot' && providerConfig.codingPlanEnabled) {
    if (apiFormat === 'anthropic') {
      baseURL = MOONSHOT_CODING_PLAN_ANTHROPIC_BASE_URL
    } else {
      baseURL = MOONSHOT_CODING_PLAN_OPENAI_BASE_URL
      apiFormat = 'openai'
    }
  }

  if (!baseURL) {
    return { matched: null, error: `Provider ${providerName} is missing base URL.` }
  }

  if (apiFormat === 'anthropic' && providerRequiresApiKey(providerName) && !providerConfig.apiKey?.trim()) {
    return { matched: null, error: `Provider ${providerName} requires API key for Anthropic-compatible mode.` }
  }

  return {
    matched: {
      providerName,
      providerConfig,
      modelId,
      apiFormat,
      baseURL
    }
  }
}

// 解析当前生效的 API 配置；必要时接入 OpenAI 兼容代理。
export function resolveCurrentApiConfig(target: OpenAICompatProxyTarget = 'local'): ApiConfigResolution {
  const sqliteStore = getStore()
  if (!sqliteStore) {
    return {
      config: null,
      error: 'Store is not initialized.'
    }
  }

  const appConfig = sqliteStore.get<AppConfig>('app_config')
  if (!appConfig) {
    return {
      config: null,
      error: 'Application config not found.'
    }
  }

  const { matched, error } = resolveMatchedProvider(appConfig)
  console.log('🚀 ~ resolveCurrentApiConfig ~ appConfig:', appConfig)
  if (!matched) {
    return {
      config: null,
      error
    }
  }

  const resolvedBaseURL = matched.baseURL
  const resolvedApiKey = matched.providerConfig.apiKey?.trim() || ''
  const effectiveApiKey =
    matched.providerName === 'ollama' && matched.apiFormat === 'anthropic' && !resolvedApiKey ? 'sk-ollama-local' : resolvedApiKey

  if (matched.apiFormat === 'anthropic') {
    return {
      config: {
        apiKey: effectiveApiKey,
        baseURL: resolvedBaseURL,
        model: matched.modelId,
        apiType: 'anthropic'
      }
    }
  }

  const proxyStatus = getCoworkOpenAICompatProxyStatus()
  if (!proxyStatus.running) {
    return {
      config: null,
      error: 'OpenAI compatibility proxy is not running.'
    }
  }

  configureCoworkOpenAICompatProxy({
    baseURL: resolvedBaseURL,
    apiKey: resolvedApiKey || undefined,
    model: matched.modelId,
    provider: matched.providerName
  })

  const proxyBaseURL = getCoworkOpenAICompatProxyBaseURL(target)
  if (!proxyBaseURL) {
    return {
      config: null,
      error: 'OpenAI compatibility proxy base URL is unavailable.'
    }
  }

  return {
    config: {
      apiKey: resolvedApiKey || 'lobsterai-openai-compat',
      baseURL: proxyBaseURL,
      model: matched.modelId,
      apiType: 'openai'
    }
  }
}

// 获取当前 API 配置（仅返回配置本体）。
export function getCurrentApiConfig(target: OpenAICompatProxyTarget = 'local'): CoworkApiConfig | null {
  return resolveCurrentApiConfig(target).config
}

// 按 API 配置构造子进程环境变量。
export function buildEnvForConfig(config: CoworkApiConfig): Record<string, string> {
  const baseEnv = { ...process.env } as Record<string, string>

  baseEnv.ANTHROPIC_AUTH_TOKEN = config.apiKey
  baseEnv.ANTHROPIC_API_KEY = config.apiKey
  baseEnv.ANTHROPIC_BASE_URL = config.baseURL
  baseEnv.ANTHROPIC_MODEL = config.model

  return baseEnv
}
