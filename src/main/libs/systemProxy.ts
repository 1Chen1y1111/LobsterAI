/**
 * 这个文件负责把系统代理设置转换成 Cowork 子进程可使用的代理环境变量。
 *
 * 主要职责：
 * 1. 记录进程启动时原始的代理环境变量，便于开关切换时恢复。
 * 2. 提供“是否启用系统代理”的运行时开关。
 * 3. 解析 Electron `resolveProxy` 返回的代理规则，转换成标准代理 URL。
 * 4. 把解析出的代理地址写回 `http_proxy/https_proxy` 等环境变量。
 */

import { app, session } from 'electron'

// 需要管理的代理相关环境变量键。
const PROXY_ENV_KEYS = ['http_proxy', 'https_proxy', 'HTTP_PROXY', 'HTTPS_PROXY', 'no_proxy', 'NO_PROXY'] as const

// 代理环境变量键的联合类型。
type ProxyEnvKey = (typeof PROXY_ENV_KEYS)[number]

// 原始代理环境变量快照，用于恢复进程初始状态。
type ProxyEnvSnapshot = Record<ProxyEnvKey, string | undefined>

// 记录应用启动时的代理环境变量，保证后续开关切换可逆。
const originalProxyEnv: ProxyEnvSnapshot = PROXY_ENV_KEYS.reduce((acc, key) => {
  acc[key] = process.env[key]
  return acc
}, {} as ProxyEnvSnapshot)

// 是否允许 Cowork 继承系统代理的运行时开关。
let systemProxyEnabled = false

// 设置或删除单个代理环境变量键。
function setEnvValue(key: ProxyEnvKey, value: string | undefined): void {
  if (typeof value === 'string' && value.length > 0) {
    process.env[key] = value
    return
  }
  delete process.env[key]
}

// 解析 Electron `resolveProxy()` 返回的一条代理规则，并转换成标准 URL。
function parseProxyRule(rule: string): string | null {
  const normalizedRule = rule.trim()
  if (!normalizedRule || normalizedRule.toUpperCase() === 'DIRECT') {
    return null
  }

  // Match standard PAC format: TYPE host:port
  // Strictly match host:port to avoid greedy capture of trailing content like ";SOCKS5 ..."
  const match = normalizedRule.match(/^(PROXY|HTTPS?|SOCKS5?|SOCKS4?)\s+([\w.\-]+:\d+)$/i)
  if (!match) {
    // Also try matching URL format: http://host:port (some proxy tools return URLs directly)
    const urlMatch = normalizedRule.match(/^(https?|socks5?|socks4?):\/\/([\w.\-]+:\d+)\/?$/i)
    if (urlMatch) {
      return `${urlMatch[1].toLowerCase()}://${urlMatch[2]}`
    }
    return null
  }

  const type = match[1].toUpperCase()
  const hostPort = match[2]

  if (type === 'HTTPS') {
    return `https://${hostPort}`
  }
  if (type.startsWith('SOCKS4')) {
    return `socks4://${hostPort}`
  }
  if (type.startsWith('SOCKS')) {
    return `socks5://${hostPort}`
  }
  return `http://${hostPort}`
}

// 返回当前是否启用了“跟随系统代理”。
export function isSystemProxyEnabled(): boolean {
  return systemProxyEnabled
}

// 设置“是否启用系统代理”的运行时开关。
export function setSystemProxyEnabled(enabled: boolean): void {
  systemProxyEnabled = enabled
}

// 恢复进程启动时的原始代理环境变量快照。
export function restoreOriginalProxyEnv(): void {
  PROXY_ENV_KEYS.forEach((key) => {
    setEnvValue(key, originalProxyEnv[key])
  })
}

// 把解析出的系统代理地址写入标准代理环境变量；传 null 时恢复为原始状态。
export function applySystemProxyEnv(proxyUrl: string | null): void {
  // Always start from original env so toggling is reversible and predictable.
  restoreOriginalProxyEnv()
  if (!proxyUrl) {
    return
  }

  setEnvValue('http_proxy', proxyUrl)
  setEnvValue('https_proxy', proxyUrl)
  setEnvValue('HTTP_PROXY', proxyUrl)
  setEnvValue('HTTPS_PROXY', proxyUrl)
}

// 调用 Electron 的代理解析能力，为目标 URL 找到当前系统代理地址。
export async function resolveSystemProxyUrl(targetUrl: string): Promise<string | null> {
  if (!app.isReady()) {
    return null
  }

  try {
    const proxyResult = await session.defaultSession.resolveProxy(targetUrl)
    if (!proxyResult) {
      return null
    }

    const rules = proxyResult.split(';')
    for (const rule of rules) {
      const proxyUrl = parseProxyRule(rule)
      if (proxyUrl) {
        return proxyUrl
      }
    }
  } catch (error) {
    console.error('Failed to resolve system proxy:', error)
  }

  return null
}
