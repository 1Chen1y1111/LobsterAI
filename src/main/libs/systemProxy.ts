import { app, session } from 'electron'

const PROXY_ENV_KEYS = ['http_proxy', 'https_proxy', 'HTTP_PROXY', 'HTTPS_PROXY', 'no_proxy', 'NO_PROXY'] as const

type ProxyEnvKey = (typeof PROXY_ENV_KEYS)[number]
type ProxyEnvSnapshot = Record<ProxyEnvKey, string | undefined>

const originalProxyEnv: ProxyEnvSnapshot = PROXY_ENV_KEYS.reduce((acc, key) => {
  acc[key] = process.env[key]
  return acc
}, {} as ProxyEnvSnapshot)

let systemProxyEnabled = false

// 设置或移除单个代理环境变量。
function setEnvValue(key: ProxyEnvKey, value: string | undefined): void {
  if (typeof value === 'string' && value.length > 0) {
    process.env[key] = value
    return
  }
  delete process.env[key]
}

// 解析 Electron 返回的代理规则为标准代理 URL。
function parseProxyRule(rule: string): string | null {
  const normalizedRule = rule.trim()
  if (!normalizedRule || normalizedRule.toUpperCase() === 'DIRECT') {
    return null
  }

  // 匹配标准 PAC 规则格式：TYPE host:port。
  // 严格限定 host:port，避免贪婪匹配到 ";SOCKS5 ..." 等尾部内容。
  const match = normalizedRule.match(/^(PROXY|HTTPS?|SOCKS5?|SOCKS4?)\s+([\w.\-]+:\d+)$/i)
  if (!match) {
    // 兼容直接返回 URL 的情况（如 http://host:port）。
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

// 获取系统代理开关状态。
export function isSystemProxyEnabled(): boolean {
  return systemProxyEnabled
}

// 设置系统代理开关状态。
export function setSystemProxyEnabled(enabled: boolean): void {
  systemProxyEnabled = enabled
}

// 恢复启动时保存的原始代理环境变量快照。
export function restoreOriginalProxyEnv(): void {
  PROXY_ENV_KEYS.forEach((key) => {
    setEnvValue(key, originalProxyEnv[key])
  })
}

// 将解析出的系统代理写入当前进程环境变量。
export function applySystemProxyEnv(proxyUrl: string | null): void {
  // 每次先回到原始环境，确保开关过程可逆且结果可预测。
  restoreOriginalProxyEnv()
  if (!proxyUrl) {
    return
  }

  setEnvValue('http_proxy', proxyUrl)
  setEnvValue('https_proxy', proxyUrl)
  setEnvValue('HTTP_PROXY', proxyUrl)
  setEnvValue('HTTPS_PROXY', proxyUrl)
}

// 从系统代理设置中解析目标地址应使用的代理 URL。
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
