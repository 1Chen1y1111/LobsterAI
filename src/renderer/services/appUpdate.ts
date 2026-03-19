import { getUpdateCheckUrl, getFallbackDownloadUrl } from './endpoints'

// 自动检查更新的轮询间隔（12 小时）
export const UPDATE_POLL_INTERVAL_MS = 12 * 60 * 60 * 1000
// 更新下载过程中心跳上报间隔（30 分钟）
export const UPDATE_HEARTBEAT_INTERVAL_MS = 30 * 60 * 1000

// 版本更新接口响应
type ChangeLogLang = {
  title?: string
  content?: string[]
}

// 每个平台的下载信息，当前仅包含下载 URL，未来可扩展其他字段（如文件大小、校验和等）
type PlatformDownload = {
  url?: string
}

// 更新接口的完整响应结构，包含状态码和数据字段；data.value 包含版本信息和下载链接等
type UpdateApiResponse = {
  code?: number
  data?: {
    value?: {
      version?: string
      date?: string
      changeLog?: {
        ch?: ChangeLogLang
        en?: ChangeLogLang
      }
      macIntel?: PlatformDownload
      macArm?: PlatformDownload
      windowsX64?: PlatformDownload
    }
  }
}

// 应用更新信息，包含最新版本号、发布日期、更新日志（中英文）和下载 URL
export type ChangeLogEntry = { title: string; content: string[] }

// 下载进度信息，包含已接收字节数、总字节数、下载百分比和下载速度（字节/秒）
export interface AppUpdateDownloadProgress {
  received: number
  total: number | undefined
  percent: number | undefined
  speed: number | undefined
}

// 应用更新信息，包含最新版本号、发布日期、更新日志（中英文）和下载 URL
export interface AppUpdateInfo {
  latestVersion: string
  date: string
  changeLog: { zh: ChangeLogEntry; en: ChangeLogEntry }
  url: string
}

// 将版本号按点分段并转为数字，忽略每段中的非数字尾缀
const toVersionParts = (version: string): number[] =>
  version.split('.').map((part) => {
    const match = part.trim().match(/^\d+/)
    return match ? Number.parseInt(match[0], 10) : 0
  })

// 逐段比较版本号：a>b 返回 1，a<b 返回 -1，相等返回 0
const compareVersions = (a: string, b: string): number => {
  const aParts = toVersionParts(a)
  const bParts = toVersionParts(b)
  const maxLength = Math.max(aParts.length, bParts.length)

  for (let i = 0; i < maxLength; i += 1) {
    const left = aParts[i] ?? 0
    const right = bParts[i] ?? 0
    if (left > right) return 1
    if (left < right) return -1
  }

  return 0
}

const isNewerVersion = (latestVersion: string, currentVersion: string): boolean => compareVersions(latestVersion, currentVersion) > 0

type UpdateValue = NonNullable<NonNullable<UpdateApiResponse['data']>['value']>

// 按当前平台选择下载地址，不可用时回退到默认地址
const getPlatformDownloadUrl = (value: UpdateValue | undefined): string => {
  const { platform, arch } = window.electron

  if (platform === 'darwin') {
    const download = arch === 'arm64' ? value?.macArm : value?.macIntel
    return download?.url?.trim() || getFallbackDownloadUrl()
  }

  if (platform === 'win32') {
    return value?.windowsX64?.url?.trim() || getFallbackDownloadUrl()
  }

  return getFallbackDownloadUrl()
}

// 请求更新接口并返回可用更新信息；若无更新或响应无效则返回 null
export const checkForAppUpdate = async (currentVersion: string): Promise<AppUpdateInfo | null> => {
  const response = await window.electron.api.fetch({
    url: getUpdateCheckUrl(),
    method: 'GET',
    headers: {
      Accept: 'application/json'
    }
  })

  if (!response.ok || typeof response.data !== 'object' || response.data === null) {
    return null
  }

  const payload = response.data as UpdateApiResponse
  if (payload.code !== 0) {
    return null
  }

  const value = payload.data?.value
  const latestVersion = value?.version?.trim()
  if (!latestVersion || !isNewerVersion(latestVersion, currentVersion)) {
    return null
  }

  const toEntry = (log?: ChangeLogLang): ChangeLogEntry => ({
    title: typeof log?.title === 'string' ? log.title : '',
    content: Array.isArray(log?.content) ? log.content : []
  })

  return {
    latestVersion,
    date: value?.date?.trim() || '',
    changeLog: {
      zh: toEntry(value?.changeLog?.ch),
      en: toEntry(value?.changeLog?.en)
    },
    url: getPlatformDownloadUrl(value)
  }
}
