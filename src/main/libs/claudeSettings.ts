/**
 * 这个文件负责把应用层的模型配置解析成 Claude/Cowork 运行时可直接使用的 API 配置。
 *
 * 主要职责：
 * 1. 根据当前 Electron 运行环境定位 Claude Agent SDK 的 CLI 入口文件。
 * 2. 从应用配置中解析当前启用的 provider、model、base URL、API 格式与密钥。
 * 3. 对支持 coding plan 的 provider 自动切换到对应的专用网关地址。
 * 4. 对 OpenAI 兼容 provider 统一接入内部代理，对外暴露 Anthropic/OpenAI 两种运行时配置。
 * 5. 把解析后的配置转换成子进程可复用的环境变量。
 */

import { join } from 'path'
import { app } from 'electron'
import type { SqliteStore } from '../sqliteStore'
import type { CoworkApiConfig } from './coworkConfigStore'
import {
  configureCoworkOpenAICompatProxy,
  getCoworkOpenAICompatProxyBaseURL,
  getCoworkOpenAICompatProxyStatus,
  type OpenAICompatProxyTarget
} from './coworkOpenAICompatProxy'
import { normalizeProviderApiFormat, type AnthropicApiFormat } from './coworkFormatTransform'

// 智谱 coding plan 专用 OpenAI 兼容入口。
const ZHIPU_CODING_PLAN_BASE_URL = 'https://open.bigmodel.cn/api/coding/paas/v4'

// 通义 coding plan 的 OpenAI 兼容入口。
const QWEN_CODING_PLAN_OPENAI_BASE_URL = 'https://coding.dashscope.aliyuncs.com/v1'

// 通义 coding plan 的 Anthropic 兼容入口。
const QWEN_CODING_PLAN_ANTHROPIC_BASE_URL = 'https://coding.dashscope.aliyuncs.com/apps/anthropic'

// 火山引擎 coding plan 的 OpenAI 兼容入口。
const VOLCENGINE_CODING_PLAN_OPENAI_BASE_URL = 'https://ark.cn-beijing.volces.com/api/coding/v3'

// 火山引擎 coding plan 的 Anthropic 兼容入口。
const VOLCENGINE_CODING_PLAN_ANTHROPIC_BASE_URL = 'https://ark.cn-beijing.volces.com/api/coding'

// Moonshot coding plan 的 OpenAI 兼容入口。
const MOONSHOT_CODING_PLAN_OPENAI_BASE_URL = 'https://api.kimi.com/coding/v1'

// Moonshot coding plan 的 Anthropic 兼容入口。
const MOONSHOT_CODING_PLAN_ANTHROPIC_BASE_URL = 'https://api.kimi.com/coding'

// provider 下模型列表中的最小结构。
type ProviderModel = {
  id: string
}

// 单个 provider 的可持久化配置。
type ProviderConfig = {
  enabled: boolean
  apiKey: string
  baseUrl: string
  apiFormat?: 'anthropic' | 'openai' | 'native'
  codingPlanEnabled?: boolean
  models?: ProviderModel[]
}

// 应用主配置里与模型选择相关的结构。
type AppConfig = {
  model?: {
    defaultModel?: string
    defaultModelProvider?: string
  }
  providers?: Record<string, ProviderConfig>
}

// 对外暴露的解析结果；失败时只返回错误描述。
export type ApiConfigResolution = {
  config: CoworkApiConfig | null
  error?: string
}

// 解析出的 provider 命中结果，供后续生成最终运行时配置。
type MatchedProvider = {
  providerName: string
  providerConfig: ProviderConfig
  modelId: string
  apiFormat: AnthropicApiFormat
  baseURL: string
}

// 由主进程在初始化后注入 sqlite store 获取器，避免这个模块直接依赖启动顺序。
let storeGetter: (() => SqliteStore | null) | null = null

// 注册 sqlite store 获取函数。
export function setStoreGetter(getter: () => SqliteStore | null): void {
  storeGetter = getter
}

// 安全读取当前 sqlite store；未注入时返回 null。
const getStore = (): SqliteStore | null => {
  if (!storeGetter) {
    return null
  }
  return storeGetter()
}

// 解析 Claude Agent SDK CLI 的实际文件路径，兼容开发态与打包态。
export function getClaudeCodePath(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'app.asar.unpacked/node_modules/@anthropic-ai/claude-agent-sdk/cli.js')
  }

  const appPath = app.getAppPath()
  const rootDir = appPath.endsWith('dist-electron') ? join(appPath, '..') : appPath
  return join(rootDir, 'node_modules/@anthropic-ai/claude-agent-sdk/cli.js')
}

// 根据 provider 名称和原始格式字段推导 Claude 侧实际要使用的 API 格式。
function getEffectiveProviderApiFormat(providerName: string, apiFormat: unknown): AnthropicApiFormat {
  const normalizedProviderName = providerName.trim().toLowerCase()

  if (
    normalizedProviderName === 'openai' ||
    normalizedProviderName === 'gemini' ||
    normalizedProviderName === 'stepfun' ||
    normalizedProviderName === 'youdaozhiyun'
  ) {
    return 'openai'
  }

  if (normalizedProviderName === 'anthropic') {
    return 'anthropic'
  }

  return normalizeProviderApiFormat(apiFormat)
}

// 只有本地 Ollama 这类 provider 允许在兼容模式下缺省 API key。
function providerRequiresApiKey(providerName: string): boolean {
  return providerName !== 'ollama'
}

// 从应用配置里选出当前真正生效的 provider/model/base URL/apiFormat。
function resolveMatchedProvider(appConfig: AppConfig): { matched: MatchedProvider | null; error?: string } {
  const providers = appConfig.providers ?? {}

  // 当默认模型未设置时，从第一个启用 provider 的模型列表里兜底选择。
  const resolveFallbackModel = (): string => {
    for (const providerConfig of Object.values(providers)) {
      if (!providerConfig?.enabled) {
        continue
      }

      const firstModelId = providerConfig.models?.find((model) => model?.id)?.id?.trim()
      if (firstModelId) {
        return firstModelId
      }
    }
    return ''
  }

  const modelId = appConfig.model?.defaultModel?.trim() || resolveFallbackModel()
  if (!modelId) {
    return {
      matched: null,
      error: 'No available model configured in enabled providers.'
    }
  }

  const preferredProviderName = appConfig.model?.defaultModelProvider?.trim()
  if (preferredProviderName) {
    const preferredProviderConfig = providers[preferredProviderName]
    const hasPreferredModel = preferredProviderConfig?.models?.some((model) => model?.id === modelId)

    if (preferredProviderConfig?.enabled && hasPreferredModel) {
      let apiFormat = getEffectiveProviderApiFormat(preferredProviderName, preferredProviderConfig.apiFormat)
      let baseURL = preferredProviderConfig.baseUrl?.trim() || ''

      if (preferredProviderName === 'zhipu' && preferredProviderConfig.codingPlanEnabled) {
        baseURL = ZHIPU_CODING_PLAN_BASE_URL
        apiFormat = 'openai'
      } else if (preferredProviderName === 'qwen' && preferredProviderConfig.codingPlanEnabled) {
        baseURL = apiFormat === 'anthropic' ? QWEN_CODING_PLAN_ANTHROPIC_BASE_URL : QWEN_CODING_PLAN_OPENAI_BASE_URL
      } else if (preferredProviderName === 'volcengine' && preferredProviderConfig.codingPlanEnabled) {
        baseURL = apiFormat === 'anthropic' ? VOLCENGINE_CODING_PLAN_ANTHROPIC_BASE_URL : VOLCENGINE_CODING_PLAN_OPENAI_BASE_URL
      } else if (preferredProviderName === 'moonshot' && preferredProviderConfig.codingPlanEnabled) {
        baseURL = apiFormat === 'anthropic' ? MOONSHOT_CODING_PLAN_ANTHROPIC_BASE_URL : MOONSHOT_CODING_PLAN_OPENAI_BASE_URL
      }

      if (!baseURL) {
        return {
          matched: null,
          error: `Provider ${preferredProviderName} is missing base URL.`
        }
      }

      if (apiFormat === 'anthropic' && providerRequiresApiKey(preferredProviderName) && !preferredProviderConfig.apiKey?.trim()) {
        return {
          matched: null,
          error: `Provider ${preferredProviderName} requires API key for Anthropic-compatible mode.`
        }
      }

      return {
        matched: {
          providerName: preferredProviderName,
          providerConfig: preferredProviderConfig,
          modelId,
          apiFormat,
          baseURL
        }
      }
    }
  }

  for (const [providerName, providerConfig] of Object.entries(providers)) {
    if (!providerConfig?.enabled) {
      continue
    }

    const hasModel = providerConfig.models?.some((model) => model?.id === modelId)
    if (!hasModel) {
      continue
    }

    let apiFormat = getEffectiveProviderApiFormat(providerName, providerConfig.apiFormat)
    let baseURL = providerConfig.baseUrl?.trim() || ''

    if (providerName === 'zhipu' && providerConfig.codingPlanEnabled) {
      baseURL = ZHIPU_CODING_PLAN_BASE_URL
      apiFormat = 'openai'
    } else if (providerName === 'qwen' && providerConfig.codingPlanEnabled) {
      baseURL = apiFormat === 'anthropic' ? QWEN_CODING_PLAN_ANTHROPIC_BASE_URL : QWEN_CODING_PLAN_OPENAI_BASE_URL
    } else if (providerName === 'volcengine' && providerConfig.codingPlanEnabled) {
      baseURL = apiFormat === 'anthropic' ? VOLCENGINE_CODING_PLAN_ANTHROPIC_BASE_URL : VOLCENGINE_CODING_PLAN_OPENAI_BASE_URL
    } else if (providerName === 'moonshot' && providerConfig.codingPlanEnabled) {
      baseURL = apiFormat === 'anthropic' ? MOONSHOT_CODING_PLAN_ANTHROPIC_BASE_URL : MOONSHOT_CODING_PLAN_OPENAI_BASE_URL
    }

    if (!baseURL) {
      return {
        matched: null,
        error: `Provider ${providerName} is missing base URL.`
      }
    }

    if (apiFormat === 'anthropic' && providerRequiresApiKey(providerName) && !providerConfig.apiKey?.trim()) {
      return {
        matched: null,
        error: `Provider ${providerName} requires API key for Anthropic-compatible mode.`
      }
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

  return {
    matched: null,
    error: `No enabled provider found for model: ${modelId}`
  }
}

// 解析当前有效 API 配置；对 OpenAI 兼容 provider 会先配置内部代理再返回代理地址。
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
  if (!matched) {
    return {
      config: null,
      error: error ?? 'Failed to resolve provider configuration.'
    }
  }

  const resolvedBaseURL = matched.baseURL
  const resolvedApiKey = matched.providerConfig.apiKey?.trim() || ''

  // Ollama 的 Anthropic 兼容模式允许本地无 key，给一个占位值避免下游校验失败。
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

// 只返回成功配置；调用方不关心错误原因时使用这个简化入口。
export function getCurrentApiConfig(target: OpenAICompatProxyTarget = 'local'): CoworkApiConfig | null {
  return resolveCurrentApiConfig(target).config
}

// 把 API 配置映射成 Claude 子进程依赖的环境变量。
export function buildEnvForConfig(config: CoworkApiConfig): Record<string, string> {
  const baseEnv = { ...process.env } as Record<string, string>

  baseEnv.ANTHROPIC_AUTH_TOKEN = config.apiKey
  baseEnv.ANTHROPIC_API_KEY = config.apiKey
  baseEnv.ANTHROPIC_BASE_URL = config.baseURL
  baseEnv.ANTHROPIC_MODEL = config.model

  return baseEnv
}
