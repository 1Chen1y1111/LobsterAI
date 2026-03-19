import { app, BrowserWindow, dialog, ipcMain, nativeImage, session, shell, WebContents } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { APP_NAME } from './appConstants'
import { SkillManager } from './skillManager'
import { SqliteStore } from './sqliteStore'
import { CoworkStore } from './coworkStore'
import { ensureSandboxReady, getSandboxStatus } from './libs/coworkSandboxRuntime'
import { getLogFilePath } from './logger'
import { exportLogsZip } from './libs/logExport'
import { getCoworkLogPath } from './libs/coworkLogger'
import { getAutoLaunchEnabled, setAutoLaunchEnabled } from './autoLaunchManager'
import { McpStore } from './mcpStore'
import { getCurrentApiConfig, resolveCurrentApiConfig, setStoreGetter } from './libs/claudeSettings'
import { generateSessionTitle, probeCoworkModelReadiness } from './libs/coworkUtil'
import { saveCoworkApiConfig } from './libs/coworkConfigStore'
import { CoworkRunner } from './libs/coworkRunner'
import { IMGatewayManager } from './im/imGatewayManager'
import { IMGatewayConfig, IMPlatform } from './im/types'
import { cancelActiveDownload, downloadUpdate, installUpdate } from './libs/appUpdateInstaller'

// 设置应用程序名称
app.name = APP_NAME
app.setName(APP_NAME)

// 过滤文件名中的非法字符（含控制字符）。
const INVALID_FILE_NAME_PATTERN = /[<>:"/\\|?*\u0000-\u001F]/g
// 记忆条目上限的最小允许值。
const MIN_MEMORY_USER_MEMORIES_MAX_ITEMS = 1
// 记忆条目上限的最大允许值。
const MAX_MEMORY_USER_MEMORIES_MAX_ITEMS = 60
// IPC 转发的单条消息内容最大长度。
const IPC_MESSAGE_CONTENT_MAX_CHARS = 120_000
// IPC 转发的消息增量更新最大长度。
const IPC_UPDATE_CONTENT_MAX_CHARS = 120_000
// IPC 通用字符串字段最大长度。
const IPC_STRING_MAX_CHARS = 4_000
// IPC 负载递归清洗的最大深度。
const IPC_MAX_DEPTH = 5
// IPC 对象清洗时保留的最大键数量。
const IPC_MAX_KEYS = 80
// IPC 数组清洗时保留的最大元素数量。
const IPC_MAX_ITEMS = 40
// 内联附件允许的最大字节数。
const MAX_INLINE_ATTACHMENT_BYTES = 25 * 1024 * 1024
// 日志导出文件名的默认前缀。
const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/bmp': '.bmp',
  'application/pdf': '.pdf',
  'text/plain': '.txt',
  'text/markdown': '.md',
  'application/json': '.json',
  'text/csv': '.csv'
}

// 当前是否为开发环境。
const isDev = process.env.NODE_ENV === 'development'
// 当前是否为 Linux 平台。
const isLinux = process.platform === 'linux'
// 当前是否为 macOS 平台。
const isMac = process.platform === 'darwin'
// 当前是否为 Windows 平台。
const isWindows = process.platform === 'win32'
// 开发模式下的渲染进程地址。
const DEV_SERVER_URL = process.env.ELECTRON_START_URL || 'http://localhost:5176'

// 安全解码 URL 片段，解码失败时回退原值。
const safeDecodeURIComponent = (value: string): string => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

// 规范化 Windows shell 路径格式，兼容 file:// 与类 Unix 盘符写法。
const normalizeWindowsShellPath = (inputPath: string): string => {
  if (!isWindows) return inputPath

  const trimmed = inputPath.trim()
  if (!trimmed) return inputPath

  let normalized = trimmed
  if (/^file:\/\//i.test(normalized)) {
    normalized = safeDecodeURIComponent(normalized.replace(/^file:\/\//i, ''))
  }

  if (/^\/[A-Za-z]:/.test(normalized)) {
    normalized = normalized.slice(1)
  }

  const unixDriveMatch = normalized.match(/^[/\\]([A-Za-z])[/\\](.+)$/)
  if (unixDriveMatch) {
    const drive = unixDriveMatch[1].toUpperCase()
    const rest = unixDriveMatch[2].replace(/[/\\]+/g, '\\')
    return `${drive}:\\${rest}`
  }

  if (/^[A-Za-z]:[/\\]/.test(normalized)) {
    const drive = normalized[0].toUpperCase()
    const rest = normalized.slice(1).replace(/\//g, '\\')
    return `${drive}${rest}`
  }

  return normalized
}

// 补齐两位数字字符串。
const padTwoDigits = (value: number): string => value.toString().padStart(2, '0')

// 生成日志导出文件名（包含日期与时间戳）。
const buildLogExportFileName = (): string => {
  const now = new Date()
  const datePart = `${now.getFullYear()}${padTwoDigits(now.getMonth() + 1)}${padTwoDigits(now.getDate())}`
  const timePart = `${padTwoDigits(now.getHours())}${padTwoDigits(now.getMinutes())}${padTwoDigits(now.getSeconds())}`
  return `lobsterai-logs-${datePart}-${timePart}.zip`
}

// 裁剪 IPC 大文本，防止主进程转发超长字符串。
const truncateIpcString = (value: string, maxChars: number): string => {
  if (value.length <= maxChars) return value
  return `${value.slice(0, maxChars)}\n...[truncated in main IPC forwarding]`
}

// 递归清洗 IPC 负载：控制深度、键数、数组长度并处理循环引用。
const sanitizeIpcPayload = (value: unknown, depth = 0, seen?: WeakSet<object>): unknown => {
  const localSeen = seen ?? new WeakSet<object>()
  if (value === null || typeof value === 'number' || typeof value === 'boolean' || typeof value === 'undefined') {
    return value
  }
  if (typeof value === 'string') {
    return truncateIpcString(value, IPC_STRING_MAX_CHARS)
  }
  if (typeof value === 'bigint') {
    return value.toString()
  }
  if (typeof value === 'function') {
    return '[function]'
  }
  if (depth >= IPC_MAX_DEPTH) {
    return '[truncated-depth]'
  }
  if (Array.isArray(value)) {
    const result = value.slice(0, IPC_MAX_ITEMS).map((entry) => sanitizeIpcPayload(entry, depth + 1, localSeen))
    if (value.length > IPC_MAX_ITEMS) {
      result.push(`[truncated-items:${value.length - IPC_MAX_ITEMS}]`)
    }
    return result
  }
  if (typeof value === 'object') {
    if (localSeen.has(value as object)) {
      return '[circular]'
    }
    localSeen.add(value as object)
    const entries = Object.entries(value as Record<string, unknown>)
    const result: Record<string, unknown> = {}
    for (const [key, entry] of entries.slice(0, IPC_MAX_KEYS)) {
      result[key] = sanitizeIpcPayload(entry, depth + 1, localSeen)
    }
    if (entries.length > IPC_MAX_KEYS) {
      result.__truncated_keys__ = entries.length - IPC_MAX_KEYS
    }
    return result
  }
  return String(value)
}

// 清洗 cowork 消息用于 IPC 转发，保留图片附件并限制文本长度。
const sanitizeCoworkMessageForIpc = (message: any): any => {
  if (!message || typeof message !== 'object') {
    return message
  }

  // 原样保留 metadata.imageAttachments（base64 数据体积大，不应被通用清洗截断）。
  let sanitizedMetadata: unknown
  if (message.metadata && typeof message.metadata === 'object') {
    const { imageAttachments, ...rest } = message.metadata as Record<string, unknown>
    const sanitizedRest = sanitizeIpcPayload(rest) as Record<string, unknown> | undefined
    sanitizedMetadata = {
      ...(sanitizedRest && typeof sanitizedRest === 'object' ? sanitizedRest : {}),
      ...(Array.isArray(imageAttachments) && imageAttachments.length > 0 ? { imageAttachments } : {})
    }
  } else {
    sanitizedMetadata = undefined
  }

  return {
    ...message,
    content: typeof message.content === 'string' ? truncateIpcString(message.content, IPC_MESSAGE_CONTENT_MAX_CHARS) : '',
    metadata: sanitizedMetadata
  }
}

// 清洗权限请求中的 toolInput，避免复杂对象直接透传渲染进程。
const sanitizePermissionRequestForIpc = (request: any): any => {
  if (!request || typeof request !== 'object') {
    return request
  }
  return {
    ...request,
    toolInput: sanitizeIpcPayload(request.toolInput ?? {})
  }
}

type CaptureRect = { x: number; y: number; width: number; height: number }

// 规范化截图区域并做最小值校验。
const normalizeCaptureRect = (rect?: Partial<CaptureRect> | null): CaptureRect | null => {
  if (!rect) return null
  const normalized = {
    x: Math.max(0, Math.round(typeof rect.x === 'number' ? rect.x : 0)),
    y: Math.max(0, Math.round(typeof rect.y === 'number' ? rect.y : 0)),
    width: Math.max(0, Math.round(typeof rect.width === 'number' ? rect.width : 0)),
    height: Math.max(0, Math.round(typeof rect.height === 'number' ? rect.height : 0))
  }
  return normalized.width > 0 && normalized.height > 0 ? normalized : null
}

// 解析并确保任务工作目录存在且可用。
const resolveTaskWorkingDirectory = (workspaceRoot: string): string => {
  const resolvedWorkspaceRoot = path.resolve(workspaceRoot)
  fs.mkdirSync(resolvedWorkspaceRoot, { recursive: true })
  if (!fs.statSync(resolvedWorkspaceRoot).isDirectory()) {
    throw new Error(`Selected workspace is not a directory: ${resolvedWorkspaceRoot}`)
  }
  return resolvedWorkspaceRoot
}

// 解析并校验“已存在”的任务工作目录。
const resolveExistingTaskWorkingDirectory = (workspaceRoot: string): string => {
  const trimmed = workspaceRoot.trim()
  if (!trimmed) {
    throw new Error('Please select a task folder before submitting.')
  }
  const resolvedWorkspaceRoot = path.resolve(trimmed)
  if (!fs.existsSync(resolvedWorkspaceRoot) || !fs.statSync(resolvedWorkspaceRoot).isDirectory()) {
    throw new Error(`Task folder does not exist or is not a directory: ${resolvedWorkspaceRoot}`)
  }
  return resolvedWorkspaceRoot
}

// 生成导出图片默认文件名。
const getDefaultExportImageName = (defaultFileName?: string): string => {
  const normalized = typeof defaultFileName === 'string' && defaultFileName.trim() ? defaultFileName.trim() : `cowork-session-${Date.now()}`
  return ensurePngFileName(sanitizeExportFileName(normalized))
}

// 弹出保存对话框并写入 PNG 文件。
const savePngWithDialog = async (
  webContents: WebContents,
  pngData: Buffer,
  defaultFileName?: string
): Promise<{ success: boolean; canceled?: boolean; path?: string; error?: string }> => {
  const defaultName = getDefaultExportImageName(defaultFileName)
  const ownerWindow = BrowserWindow.fromWebContents(webContents)
  const saveOptions = {
    title: 'Export Session Image',
    defaultPath: path.join(app.getPath('downloads'), defaultName),
    filters: [{ name: 'PNG Image', extensions: ['png'] }]
  }
  const saveResult = ownerWindow ? await dialog.showSaveDialog(ownerWindow, saveOptions) : await dialog.showSaveDialog(saveOptions)

  if (saveResult.canceled || !saveResult.filePath) {
    return { success: true, canceled: true }
  }

  const outputPath = ensurePngFileName(saveResult.filePath)
  await fs.promises.writeFile(outputPath, pngData)
  return { success: true, canceled: false, path: outputPath }
}

// 统一配置 userData 目录路径。
const configureUserDataPath = (): void => {
  const appDataPath = app.getPath('appData')
  const preferredUserDataPath = path.join(appDataPath, APP_NAME)
  const currentUserDataPath = app.getPath('userData')

  if (currentUserDataPath !== preferredUserDataPath) {
    app.setPath('userData', preferredUserDataPath)
    console.log(`[Main] userData path updated: ${currentUserDataPath} -> ${preferredUserDataPath}`)
  }
}

// 确保文件名以 .png 结尾。
const ensurePngFileName = (value: string): string => {
  return value.toLowerCase().endsWith('.png') ? value : `${value}.png`
}

// 确保文件名以 .zip 结尾。
const ensureZipFileName = (value: string): string => {
  return value.toLowerCase().endsWith('.zip') ? value : `${value}.zip`
}

// 解析内联附件保存目录（优先工作目录下 .cowork-temp）。
const resolveInlineAttachmentDir = (cwd?: string): string => {
  const trimmed = typeof cwd === 'string' ? cwd.trim() : ''
  if (trimmed) {
    const resolved = path.resolve(trimmed)
    if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
      return path.join(resolved, '.cowork-temp', 'attachments', 'manual')
    }
  }
  return path.join(app.getPath('temp'), 'lobsterai', 'attachments')
}

// 清洗导出文件名中的非法字符。
const sanitizeExportFileName = (value: string): string => {
  const sanitized = value.replace(INVALID_FILE_NAME_PATTERN, ' ').replace(/\s+/g, ' ').trim()
  return sanitized || 'cowork-session'
}

// 清洗附件文件名并回退默认名称。
const sanitizeAttachmentFileName = (value?: string): string => {
  const raw = typeof value === 'string' ? value.trim() : ''
  if (!raw) return 'attachment'
  const fileName = path.basename(raw)
  const sanitized = fileName.replace(INVALID_FILE_NAME_PATTERN, ' ').replace(/\s+/g, ' ').trim()
  return sanitized || 'attachment'
}

// 根据文件名或 MIME 推断扩展名。
const inferAttachmentExtension = (fileName: string, mimeType?: string): string => {
  const fromName = path.extname(fileName).toLowerCase()
  if (fromName) {
    return fromName
  }
  if (typeof mimeType === 'string') {
    const normalized = mimeType.toLowerCase().split(';')[0].trim()
    return MIME_EXTENSION_MAP[normalized] ?? ''
  }
  return ''
}

// 预加载脚本路径：打包与开发环境分别指向不同位置。
const PRELOAD_PATH = app.isPackaged ? path.join(__dirname, 'preload.js') : path.join(__dirname, '../dist-electron/preload.js')

// 获取应用图标路径（Windows 使用 .ico，Linux 使用 .png）。
const getAppIconPath = (): string | undefined => {
  if (process.platform !== 'win32' && process.platform !== 'linux') return undefined
  const basePath = app.isPackaged ? path.join(process.resourcesPath, 'tray') : path.join(__dirname, '..', 'resources', 'tray')
  return process.platform === 'win32' ? path.join(basePath, 'tray-icon.ico') : path.join(basePath, 'tray-icon.png')
}

// 主窗口引用（用于窗口生命周期管理）。
let mainWindow: BrowserWindow | null = null

// 确保应用单实例运行（开发模式放宽为始终可启动）。
const gotTheLock = isDev ? true : app.requestSingleInstanceLock()

// 全局单例：数据库存储实例。
let store: SqliteStore | null = null
// 全局单例：协作会话存储实例。
let coworkStore: CoworkStore | null = null
// 全局单例：协作执行器实例。
let coworkRunner: CoworkRunner | null = null
// 全局单例：技能管理器实例。
let skillManager: SkillManager | null = null
// 全局单例：MCP 配置存储实例。
let mcpStore: McpStore | null = null
// 全局单例：IM 网关管理器实例。
let imGatewayManager: IMGatewayManager | null = null
// 存储初始化 Promise（避免并发重复初始化）。
let storeInitPromise: Promise<SqliteStore> | null = null

// 初始化 SQLite 存储（带超时保护）。
const initStore = async (): Promise<SqliteStore> => {
  if (!storeInitPromise) {
    if (!app.isReady()) {
      throw new Error('Store accessed before app is ready.')
    }
    storeInitPromise = Promise.race([
      SqliteStore.create(app.getPath('userData')),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Store initialization timed out after 15s')), 15_000))
    ])
  }
  return storeInitPromise
}

// 获取已初始化的存储实例。
const getStore = (): SqliteStore => {
  if (!store) {
    throw new Error('Store not initialized. Call initStore() first.')
  }
  return store
}

// 获取协作存储实例并执行启动期记忆清理。
const getCoworkStore = () => {
  if (!coworkStore) {
    const sqliteStore = getStore()
    coworkStore = new CoworkStore(sqliteStore.getDatabase(), sqliteStore.getSaveFunction())
    const cleaned = coworkStore.autoDeleteNonPersonalMemories()
    if (cleaned > 0) {
      console.info(`[cowork-memory] Auto-deleted ${cleaned} non-personal/procedural memories`)
    }
  }
  return coworkStore
}

// 获取协作运行器并绑定流式事件转发。
const getCoworkRunner = () => {
  if (!coworkRunner) {
    coworkRunner = new CoworkRunner(getCoworkStore())

    // 向运行器注入 MCP 服务器配置提供函数。
    coworkRunner.setMcpServerProvider(() => {
      return getMcpStore().getEnabledServers()
    })

    // 绑定事件监听并转发到渲染进程。
    coworkRunner.on('message', (sessionId: string, message: any) => {
      // 调试日志：跟踪用户消息中的图片附件元数据。
      if (message?.type === 'user') {
        const meta = message.metadata
        console.log('[main] coworkRunner message event (user)', {
          sessionId,
          messageId: message.id,
          hasMetadata: !!meta,
          metadataKeys: meta ? Object.keys(meta) : [],
          hasImageAttachments: !!meta?.imageAttachments,
          imageAttachmentsCount: Array.isArray(meta?.imageAttachments) ? meta.imageAttachments.length : 0,
          imageAttachmentsBase64Lengths: Array.isArray(meta?.imageAttachments)
            ? meta.imageAttachments.map((a: any) => a?.base64Data?.length ?? 0)
            : []
        })
      }
      const safeMessage = sanitizeCoworkMessageForIpc(message)
      // 调试日志：检查清洗后的消息结果。
      if (message?.type === 'user') {
        const safeMeta = safeMessage?.metadata
        console.log('[main] sanitized user message', {
          hasMetadata: !!safeMeta,
          metadataKeys: safeMeta ? Object.keys(safeMeta) : [],
          hasImageAttachments: !!safeMeta?.imageAttachments,
          imageAttachmentsCount: Array.isArray(safeMeta?.imageAttachments) ? safeMeta.imageAttachments.length : 0,
          imageAttachmentsBase64Lengths: Array.isArray(safeMeta?.imageAttachments)
            ? safeMeta.imageAttachments.map((a: any) => a?.base64Data?.length ?? 0)
            : []
        })
      }
      const windows = BrowserWindow.getAllWindows()
      windows.forEach((win) => {
        if (!win.isDestroyed()) {
          try {
            win.webContents.send('cowork:stream:message', { sessionId, message: safeMessage })
          } catch (error) {
            console.error('Failed to forward cowork message:', error)
          }
        }
      })
    })

    coworkRunner.on('messageUpdate', (sessionId: string, messageId: string, content: string) => {
      const safeContent = truncateIpcString(content, IPC_UPDATE_CONTENT_MAX_CHARS)
      const windows = BrowserWindow.getAllWindows()
      windows.forEach((win) => {
        if (!win.isDestroyed()) {
          try {
            win.webContents.send('cowork:stream:messageUpdate', { sessionId, messageId, content: safeContent })
          } catch (error) {
            console.error('Failed to forward cowork message update:', error)
          }
        }
      })
    })

    coworkRunner.on('permissionRequest', (sessionId: string, request: any) => {
      if (coworkRunner?.getSessionConfirmationMode(sessionId) === 'text') {
        return
      }
      const safeRequest = sanitizePermissionRequestForIpc(request)
      const windows = BrowserWindow.getAllWindows()
      windows.forEach((win) => {
        if (!win.isDestroyed()) {
          try {
            win.webContents.send('cowork:stream:permission', { sessionId, request: safeRequest })
          } catch (error) {
            console.error('Failed to forward cowork permission request:', error)
          }
        }
      })
    })

    coworkRunner.on('complete', (sessionId: string, claudeSessionId: string | null) => {
      const windows = BrowserWindow.getAllWindows()
      windows.forEach((win) => {
        if (!win.isDestroyed()) {
          win.webContents.send('cowork:stream:complete', { sessionId, claudeSessionId })
        }
      })
    })

    coworkRunner.on('error', (sessionId: string, error: string) => {
      const windows = BrowserWindow.getAllWindows()
      windows.forEach((win) => {
        if (!win.isDestroyed()) {
          win.webContents.send('cowork:stream:error', { sessionId, error })
        }
      })
    })
  }
  return coworkRunner
}

/* ------------------- MCP 模块 ------------------- */
// 获取 MCP 存储实例。
const getMcpStore = () => {
  if (!mcpStore) {
    const sqliteStore = getStore()
    mcpStore = new McpStore(sqliteStore.getDatabase(), sqliteStore.getSaveFunction())
  }
  return mcpStore
}

/* ------------------- 技能模块 ------------------- */
// 获取技能管理器实例。
const getSkillManager = () => {
  if (!skillManager) {
    skillManager = new SkillManager(getStore)
  }
  return skillManager
}

const getIMGatewayManager = () => {
  if (!imGatewayManager) {
    const sqliteStore = getStore()

    // Get Cowork dependencies for IM Cowork mode
    const runner = getCoworkRunner()
    const store = getCoworkStore()

    imGatewayManager = new IMGatewayManager(sqliteStore.getDatabase(), sqliteStore.getSaveFunction(), {
      coworkRunner: runner,
      coworkStore: store
    })

    // Initialize with LLM config provider
    imGatewayManager.initialize({
      getLLMConfig: async () => {
        const appConfig = sqliteStore.get<any>('app_config')
        if (!appConfig) return null

        // Find first enabled provider
        const providers = appConfig.providers || {}
        for (const [providerName, providerConfig] of Object.entries(providers) as [string, any][]) {
          if (providerConfig.enabled && providerConfig.apiKey) {
            const model = providerConfig.models?.[0]?.id
            return {
              apiKey: providerConfig.apiKey,
              baseUrl: providerConfig.baseUrl,
              model: model,
              provider: providerName
            }
          }
        }

        // Fallback to legacy api config
        if (appConfig.api?.key) {
          return {
            apiKey: appConfig.api.key,
            baseUrl: appConfig.api.baseUrl,
            model: appConfig.model?.defaultModel
          }
        }

        return null
      },
      getSkillsPrompt: async () => {
        return getSkillManager().buildAutoRoutingPrompt()
      }
    })

    // Forward IM events to renderer
    imGatewayManager.on('statusChange', (status) => {
      const windows = BrowserWindow.getAllWindows()
      windows.forEach((win) => {
        if (!win.isDestroyed()) {
          win.webContents.send('im:status:change', status)
        }
      })
    })

    imGatewayManager.on('message', (message) => {
      const windows = BrowserWindow.getAllWindows()
      windows.forEach((win) => {
        if (!win.isDestroyed()) {
          win.webContents.send('im:message:received', message)
        }
      })
    })

    imGatewayManager.on('error', ({ platform, error }) => {
      console.error(`[IM Gateway] ${platform} error:`, error)
    })
  }
  return imGatewayManager
}

/* ------------------- 定时任务模块 ------------------- */
// const getScheduledTaskStore = () => {
//   if (!scheduledTaskStore) {
//     const sqliteStore = getStore();
//     scheduledTaskStore = new ScheduledTaskStore(sqliteStore.getDatabase(), sqliteStore.getSaveFunction());
//   }
//   return scheduledTaskStore;
// };

if (!gotTheLock) {
  app.quit()
} else {
  /* ------------------- 存储 IPC 处理 ------------------- */
  // 读取通用键值存储。
  ipcMain.handle('store:get', (_event, key) => {
    return getStore().get(key)
  })

  // 写入通用键值存储。
  ipcMain.handle('store:set', (_event, key, value) => {
    getStore().set(key, value)
  })

  // 删除通用键值存储项。
  ipcMain.handle('store:remove', (_event, key) => {
    getStore().delete(key)
  })

  /* ------------------- Network status IPC 处理 ------------------- */
  // 先移除所有已存在的监听器，以避免重复注册。
  ipcMain.removeAllListeners('network:status-change')

  ipcMain.on('network:status-change', (_event, status: 'online' | 'offline') => {
    console.log(`[Main] Network status changed: ${status}`)

    if (status === 'online' && imGatewayManager) {
      console.log('[Main] Network restored, reconnecting IM gateways...')
      imGatewayManager.reconnectAllDisconnected()
    }
  })

  /* ------------------- 窗口控制 IPC 处理 ------------------- */
  // 最小化主窗口。
  ipcMain.on('window-minimize', () => {
    mainWindow?.minimize()
  })

  // 切换主窗口最大化状态。
  ipcMain.on('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })

  // 关闭主窗口。
  ipcMain.on('window-close', () => {
    mainWindow?.close()
  })

  // 查询主窗口是否处于最大化状态。
  ipcMain.handle('window:isMaximized', () => {
    return mainWindow?.isMaximized() ?? false
  })

  /* ------------------- MCP 服务 IPC 处理 ------------------- */

  // 新建 MCP 服务配置并返回最新列表。
  ipcMain.handle(
    'mcp:create',
    (
      _event,
      data: {
        name: string
        description: string
        transportType: string
        command?: string
        args?: string[]
        env?: Record<string, string>
        url?: string
        headers?: Record<string, string>
      }
    ) => {
      try {
        getMcpStore().createServer(data as any)
        const servers = getMcpStore().listServers()
        return { success: true, servers }
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to create MCP server' }
      }
    }
  )

  // 删除指定 MCP 服务配置并返回最新列表。
  ipcMain.handle('mcp:delete', (_event, id: string) => {
    try {
      getMcpStore().deleteServer(id)
      const servers = getMcpStore().listServers()
      return { success: true, servers }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to delete MCP server' }
    }
  })

  // 更新指定 MCP 服务配置并返回最新列表。
  ipcMain.handle(
    'mcp:update',
    (
      _event,
      id: string,
      data: {
        name?: string
        description?: string
        transportType?: string
        command?: string
        args?: string[]
        env?: Record<string, string>
        url?: string
        headers?: Record<string, string>
      }
    ) => {
      try {
        getMcpStore().updateServer(id, data as any)
        const servers = getMcpStore().listServers()
        return { success: true, servers }
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to update MCP server' }
      }
    }
  )

  // 获取 MCP 服务配置列表。
  ipcMain.handle('mcp:list', () => {
    try {
      const servers = getMcpStore().listServers()
      return { success: true, servers }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to list MCP servers' }
    }
  })

  // 启用或禁用 MCP 服务。
  ipcMain.handle('mcp:setEnabled', (_event, options: { id: string; enabled: boolean }) => {
    try {
      getMcpStore().setEnabled(options.id, options.enabled)
      const servers = getMcpStore().listServers()
      return { success: true, servers }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update MCP server' }
    }
  })

  // 拉取 MCP 市场配置数据（按环境切换接口地址）。
  ipcMain.handle('mcp:fetchMarketplace', async () => {
    const url = app.isPackaged
      ? 'https://api-overmind.youdao.com/openapi/get/luna/hardware/lobsterai/prod/mcp-marketplace'
      : 'https://api-overmind.youdao.com/openapi/get/luna/hardware/lobsterai/test/mcp-marketplace'
    try {
      const https = await import('https')
      const data = await new Promise<string>((resolve, reject) => {
        const req = https.get(url, { timeout: 10000 }, (res) => {
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}`))
            res.resume()
            return
          }
          let body = ''
          res.setEncoding('utf8')
          res.on('data', (chunk: string) => {
            body += chunk
          })
          res.on('end', () => resolve(body))
          res.on('error', reject)
        })
        req.on('error', reject)
        req.on('timeout', () => {
          req.destroy()
          reject(new Error('Request timeout'))
        })
      })
      const json = JSON.parse(data)
      const value = json?.data?.value
      if (!value) {
        return { success: false, error: 'Invalid response: missing data.value' }
      }
      const marketplace = typeof value === 'string' ? JSON.parse(value) : value
      return { success: true, data: marketplace }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch marketplace' }
    }
  })

  /* ------------------- 技能 IPC 处理 ------------------- */
  // 获取技能清单。
  ipcMain.handle('skills:list', () => {
    try {
      const skills = getSkillManager().listSkills()
      return { success: true, skills }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load skills'
      }
    }
  })

  // 获取指定技能的配置项。
  ipcMain.handle('skills:getConfig', (_event, skillId: string) => {
    return getSkillManager().getSkillConfig(skillId)
  })

  // 保存指定技能的配置项。
  ipcMain.handle('skills:setConfig', (_event, skillId: string, config: Record<string, string>) => {
    return getSkillManager().setSkillConfig(skillId, config)
  })

  // 测试邮件类技能的连通性。
  ipcMain.handle('skills:testEmailConnectivity', async (_event, skillId: string, config: Record<string, string>) => {
    return getSkillManager().testEmailConnectivity(skillId, config)
  })

  // 启用或禁用指定技能。
  ipcMain.handle('skills:setEnabled', (_event, options: { id: string; enabled: boolean }) => {
    try {
      const skills = getSkillManager().setSkillEnabled(options.id, options.enabled)
      return { success: true, skills }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update skill' }
    }
  })

  // 下载并安装技能。
  ipcMain.handle('skills:download', async (_event, source: string) => {
    return getSkillManager().downloadSkill(source)
  })

  // 删除指定技能。
  ipcMain.handle('skills:delete', (_event, id: string) => {
    try {
      const skills = getSkillManager().deleteSkill(id)
      return { success: true, skills }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to delete skill' }
    }
  })

  // 获取技能根目录。
  ipcMain.handle('skills:getRoot', () => {
    try {
      const root = getSkillManager().getSkillsRoot()
      return { success: true, path: root }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to resolve skills root' }
    }
  })

  // 构建技能自动路由提示词。
  ipcMain.handle('skills:autoRoutingPrompt', () => {
    try {
      const prompt = getSkillManager().buildAutoRoutingPrompt()
      return { success: true, prompt }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to build auto-routing prompt' }
    }
  })

  /* ------------------- 定时任务 IPC 处理 ------------------- */
  // 待补充：定时任务相关 IPC。

  /* ------------------- API IPC 处理 ------------------- */
  // API 代理处理：用于规避渲染进程 CORS 限制。
  // 代理网络请求，统一由主进程发起以规避渲染进程跨域限制。
  ipcMain.handle(
    'api:fetch',
    async (
      _event,
      options: {
        url: string
        method: string
        headers: Record<string, string>
        body?: string
      }
    ) => {
      try {
        const response = await session.defaultSession.fetch(options.url, {
          method: options.method,
          headers: options.headers,
          body: options.body
        })

        const contentType = response.headers.get('content-type') || ''
        let data: string | object

        if (contentType.includes('text/event-stream')) {
          // SSE 流式响应：返回完整文本。
          data = await response.text()
        } else if (contentType.includes('application/json')) {
          data = await response.json()
        } else {
          data = await response.text()
        }

        return {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          data
        }
      } catch (error) {
        return {
          ok: false,
          status: 0,
          statusText: error instanceof Error ? error.message : 'Network error',
          headers: {},
          data: null,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  )

  /* ------------------- 协作 IPC 处理 ------------------- */
  // 创建新协作会话并异步启动执行。
  ipcMain.handle(
    'cowork:session:start',
    async (
      _event,
      options: {
        prompt: string
        cwd?: string
        systemPrompt?: string
        title?: string
        activeSkillIds?: string[]
        imageAttachments?: Array<{ name: string; mimeType: string; base64Data: string }>
      }
    ) => {
      try {
        const coworkStoreInstance = getCoworkStore()
        const config = coworkStoreInstance.getConfig()
        const systemPrompt = options.systemPrompt ?? config.systemPrompt
        const selectedWorkspaceRoot = (options.cwd || config.workingDirectory || '').trim()

        if (!selectedWorkspaceRoot) {
          return {
            success: false,
            error: 'Please select a task folder before submitting.'
          }
        }

        // 从提示词首行生成兜底标题。
        const fallbackTitle = options.prompt.split('\n')[0].slice(0, 50) || 'New Session'
        const title = options.title?.trim() || fallbackTitle
        const taskWorkingDirectory = resolveTaskWorkingDirectory(selectedWorkspaceRoot)

        // 创建会话记录并写入首条用户消息（包含技能与图片附件元数据），确保前端能立即展示用户输入。
        const session = coworkStoreInstance.createSession(
          title,
          taskWorkingDirectory,
          systemPrompt,
          config.executionMode || 'local',
          options.activeSkillIds || []
        )
        // 构建首条消息 metadata（包含技能与图片附件信息）。
        const messageMetadata: Record<string, unknown> = {}
        if (options.activeSkillIds?.length) {
          messageMetadata.skillIds = options.activeSkillIds
        }
        // 注意：图片附件通常包含大体积的 base64 数据，不应被通用清洗函数截断，因此直接原样保留在 metadata 中。
        if (options.imageAttachments?.length) {
          messageMetadata.imageAttachments = options.imageAttachments
        }
        // 将用户输入作为首条消息写入存储，确保会话启动后前端能立即看到用户内容（即使模型尚未开始响应）。
        coworkStoreInstance.addMessage(session.id, {
          type: 'user',
          content: options.prompt,
          metadata: Object.keys(messageMetadata).length > 0 ? messageMetadata : undefined
        })

        // 启动前探测模型就绪状态，若不可用则更新会话状态并返回错误信息，确保前端能及时反馈问题。
        const probe = await probeCoworkModelReadiness()
        if (probe.ok === false) {
          coworkStoreInstance.updateSession(session.id, { status: 'error' })
          coworkStoreInstance.addMessage(session.id, {
            type: 'system',
            content: `Error: ${probe.error}`,
            metadata: { error: probe.error }
          })
          const failedSession = coworkStoreInstance.getSession(session.id) || {
            ...session,
            status: 'error' as const
          }
          return { success: true, session: failedSession }
        }

        // 获取运行器实例并启动会话（异步执行，立即返回结果）。
        const runner = getCoworkRunner()

        // 启动异步任务前先更新为 running，确保前端立即收到正确状态。
        coworkStoreInstance.updateSession(session.id, { status: 'running' })

        // 异步启动会话（首条用户消息已写入存储，因此跳过重复写入）。
        runner
          .startSession(session.id, options.prompt, {
            skipInitialUserMessage: true,
            skillIds: options.activeSkillIds,
            workspaceRoot: selectedWorkspaceRoot,
            confirmationMode: 'modal',
            imageAttachments: options.imageAttachments
          })
          .catch((error) => {
            console.error('Cowork session error:', error)
          })

        const sessionWithMessages = coworkStoreInstance.getSession(session.id) || {
          ...session,
          status: 'running' as const
        }
        return { success: true, session: sessionWithMessages }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to start session'
        }
      }
    }
  )

  // 向既有协作会话追加一轮对话。
  ipcMain.handle(
    'cowork:session:continue',
    async (
      _event,
      options: {
        sessionId: string
        prompt: string
        systemPrompt?: string
        activeSkillIds?: string[]
        imageAttachments?: Array<{ name: string; mimeType: string; base64Data: string }>
      }
    ) => {
      try {
        console.log('[main] cowork:session:continue handler', {
          sessionId: options.sessionId,
          hasImageAttachments: !!options.imageAttachments,
          imageAttachmentsCount: options.imageAttachments?.length ?? 0,
          imageAttachmentsNames: options.imageAttachments?.map((a) => a.name)
        })
        const runner = getCoworkRunner()
        runner
          .continueSession(options.sessionId, options.prompt, {
            systemPrompt: options.systemPrompt,
            skillIds: options.activeSkillIds,
            imageAttachments: options.imageAttachments
          })
          .catch((error) => {
            console.error('Cowork continue error:', error)
          })

        const session = getCoworkStore().getSession(options.sessionId)
        return { success: true, session }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to continue session'
        }
      }
    }
  )

  // 停止指定协作会话。
  ipcMain.handle('cowork:session:stop', async (_event, sessionId: string) => {
    try {
      const runner = getCoworkRunner()
      runner.stopSession(sessionId)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to stop session'
      }
    }
  })

  // 删除指定协作会话。
  ipcMain.handle('cowork:session:delete', async (_event, sessionId: string) => {
    try {
      const coworkStoreInstance = getCoworkStore()
      coworkStoreInstance.deleteSession(sessionId)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete session'
      }
    }
  })

  // 批量删除协作会话。
  ipcMain.handle('cowork:session:deleteBatch', async (_event, sessionIds: string[]) => {
    try {
      const coworkStoreInstance = getCoworkStore()
      coworkStoreInstance.deleteSessions(sessionIds)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to batch delete sessions'
      }
    }
  })

  // 设置会话置顶状态。
  ipcMain.handle('cowork:session:pin', async (_event, options: { sessionId: string; pinned: boolean }) => {
    try {
      const coworkStoreInstance = getCoworkStore()
      coworkStoreInstance.setSessionPinned(options.sessionId, options.pinned)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update session pin'
      }
    }
  })

  // 重命名协作会话标题。
  ipcMain.handle('cowork:session:rename', async (_event, options: { sessionId: string; title: string }) => {
    try {
      const title = options.title.trim()
      if (!title) {
        return { success: false, error: 'Title is required' }
      }
      const coworkStoreInstance = getCoworkStore()
      coworkStoreInstance.updateSession(options.sessionId, { title })
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to rename session'
      }
    }
  })

  // 获取单个协作会话详情。
  ipcMain.handle('cowork:session:get', async (_event, sessionId: string) => {
    try {
      const session = getCoworkStore().getSession(sessionId)
      return { success: true, session }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get session'
      }
    }
  })

  // 获取协作会话列表。
  ipcMain.handle('cowork:session:list', async () => {
    try {
      const sessions = getCoworkStore().listSessions()
      return { success: true, sessions }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list sessions'
      }
    }
  })

  // 截取会话区域并直接导出为本地图片。
  ipcMain.handle(
    'cowork:session:exportResultImage',
    async (
      event,
      options: {
        rect: { x: number; y: number; width: number; height: number }
        defaultFileName?: string
      }
    ) => {
      try {
        const { rect, defaultFileName } = options || {}
        const captureRect = normalizeCaptureRect(rect)
        if (!captureRect) {
          return { success: false, error: 'Capture rect is required' }
        }

        const image = await event.sender.capturePage(captureRect)
        return savePngWithDialog(event.sender, image.toPNG(), defaultFileName)
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to export session image'
        }
      }
    }
  )

  // 截取会话区域并返回分块图片数据（base64）。
  ipcMain.handle(
    'cowork:session:captureImageChunk',
    async (
      event,
      options: {
        rect: { x: number; y: number; width: number; height: number }
      }
    ) => {
      try {
        const captureRect = normalizeCaptureRect(options?.rect)
        if (!captureRect) {
          return { success: false, error: 'Capture rect is required' }
        }

        const image = await event.sender.capturePage(captureRect)
        const pngBuffer = image.toPNG()

        return {
          success: true,
          width: captureRect.width,
          height: captureRect.height,
          pngBase64: pngBuffer.toString('base64')
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to capture session image chunk'
        }
      }
    }
  )

  // 将前端生成的图片数据保存到本地文件。
  ipcMain.handle(
    'cowork:session:saveResultImage',
    async (
      event,
      options: {
        pngBase64: string
        defaultFileName?: string
      }
    ) => {
      try {
        const base64 = typeof options?.pngBase64 === 'string' ? options.pngBase64.trim() : ''
        if (!base64) {
          return { success: false, error: 'Image data is required' }
        }

        const pngBuffer = Buffer.from(base64, 'base64')
        if (pngBuffer.length <= 0) {
          return { success: false, error: 'Invalid image data' }
        }

        return savePngWithDialog(event.sender, pngBuffer, options?.defaultFileName)
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to save session image'
        }
      }
    }
  )

  // 新增用户记忆条目。
  ipcMain.handle(
    'cowork:memory:createEntry',
    async (
      _event,
      input: {
        text: string
        confidence?: number
        isExplicit?: boolean
      }
    ) => {
      try {
        const entry = getCoworkStore().createUserMemory({
          text: input.text,
          confidence: input.confidence,
          isExplicit: input?.isExplicit
        })
        return { success: true, entry }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create memory entry'
        }
      }
    }
  )

  // 更新用户记忆条目。
  ipcMain.handle(
    'cowork:memory:updateEntry',
    async (
      _event,
      input: {
        id: string
        text?: string
        confidence?: number
        status?: 'created' | 'stale' | 'deleted'
        isExplicit?: boolean
      }
    ) => {
      try {
        const entry = getCoworkStore().updateUserMemory({
          id: input.id,
          text: input.text,
          confidence: input.confidence,
          status: input.status,
          isExplicit: input.isExplicit
        })
        if (!entry) {
          return { success: false, error: 'Memory entry not found' }
        }
        return { success: true, entry }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update memory entry'
        }
      }
    }
  )

  // 按条件查询用户记忆条目。
  ipcMain.handle(
    'cowork:memory:listEntries',
    async (
      _event,
      input: {
        query?: string
        status?: 'created' | 'stale' | 'deleted' | 'all'
        includeDeleted?: boolean
        limit?: number
        offset?: number
      }
    ) => {
      try {
        const entries = getCoworkStore().listUserMemories({
          query: input?.query?.trim() || undefined,
          status: input?.status || 'all',
          includeDeleted: Boolean(input?.includeDeleted),
          limit: input?.limit,
          offset: input?.offset
        })
        return { success: true, entries }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to list memory entries'
        }
      }
    }
  )

  // 获取用户记忆统计信息。
  ipcMain.handle('cowork:memory:getStats', async () => {
    try {
      const stats = getCoworkStore().getUserMemoryStats()
      return { success: true, stats }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get memory stats'
      }
    }
  })

  // 删除指定用户记忆条目。
  ipcMain.handle(
    'cowork:memory:deleteEntry',
    async (
      _event,
      input: {
        id: string
      }
    ) => {
      try {
        const success = getCoworkStore().deleteUserMemory(input.id)
        return success ? { success: true } : { success: false, error: 'Memory entry not found' }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete memory entry'
        }
      }
    }
  )

  // 查询沙箱环境状态。
  ipcMain.handle('cowork:sandbox:status', async () => {
    return getSandboxStatus()
  })

  // 安装或修复沙箱环境，并返回最新状态。
  ipcMain.handle('cowork:sandbox:install', async () => {
    const result = await ensureSandboxReady()
    return {
      success: result.ok,
      status: getSandboxStatus(),
      error: result.ok ? undefined : 'error' in result ? result.error : undefined
    }
  })

  // 读取协作配置。
  ipcMain.handle('cowork:config:get', async () => {
    try {
      const config = getCoworkStore().getConfig()
      return { success: true, config }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get config'
      }
    }
  })

  // 保存协作配置（含必要的字段归一化与边界处理）。
  ipcMain.handle(
    'cowork:config:set',
    async (
      _event,
      config: {
        workingDirectory?: string
        executionMode?: 'auto' | 'local' | 'sandbox'
        memoryEnabled?: boolean
        memoryImplicitUpdateEnabled?: boolean
        memoryLlmJudgeEnabled?: boolean
        memoryGuardLevel?: 'strict' | 'standard' | 'relaxed'
        memoryUserMemoriesMaxItems?: number
      }
    ) => {
      try {
        const normalizedExecutionMode =
          config.executionMode && String(config.executionMode) === 'container' ? 'sandbox' : config.executionMode
        const normalizedMemoryEnabled = typeof config.memoryEnabled === 'boolean' ? config.memoryEnabled : undefined
        const normalizedMemoryImplicitUpdateEnabled =
          typeof config.memoryImplicitUpdateEnabled === 'boolean' ? config.memoryImplicitUpdateEnabled : undefined
        const normalizedMemoryLlmJudgeEnabled = typeof config.memoryLlmJudgeEnabled === 'boolean' ? config.memoryLlmJudgeEnabled : undefined
        const normalizedMemoryGuardLevel =
          config.memoryGuardLevel === 'strict' || config.memoryGuardLevel === 'standard' || config.memoryGuardLevel === 'relaxed'
            ? config.memoryGuardLevel
            : undefined
        const normalizedMemoryUserMemoriesMaxItems =
          typeof config.memoryUserMemoriesMaxItems === 'number' && Number.isFinite(config.memoryUserMemoriesMaxItems)
            ? Math.max(
                MIN_MEMORY_USER_MEMORIES_MAX_ITEMS,
                Math.min(MAX_MEMORY_USER_MEMORIES_MAX_ITEMS, Math.floor(config.memoryUserMemoriesMaxItems))
              )
            : undefined
        const normalizedConfig = {
          ...config,
          executionMode: normalizedExecutionMode,
          memoryEnabled: normalizedMemoryEnabled,
          memoryImplicitUpdateEnabled: normalizedMemoryImplicitUpdateEnabled,
          memoryLlmJudgeEnabled: normalizedMemoryLlmJudgeEnabled,
          memoryGuardLevel: normalizedMemoryGuardLevel,
          memoryUserMemoriesMaxItems: normalizedMemoryUserMemoriesMaxItems
        }
        const previousWorkingDir = getCoworkStore().getConfig().workingDirectory
        getCoworkStore().setConfig(normalizedConfig)
        if (normalizedConfig.workingDirectory !== undefined && normalizedConfig.workingDirectory !== previousWorkingDir) {
          getSkillManager().handleWorkingDirectoryChange()
        }
        return { success: true }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to set config'
        }
      }
    }
  )

  /* ------------------- IM Gateway IPC Handlers ------------------- */
  ipcMain.handle('im:config:get', async () => {
    try {
      const config = getIMGatewayManager().getConfig()
      return { success: true, config }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get IM config'
      }
    }
  })

  ipcMain.handle('im:config:set', async (_event, config: Partial<IMGatewayConfig>) => {
    try {
      getIMGatewayManager().setConfig(config)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set IM config'
      }
    }
  })

  ipcMain.handle('im:gateway:start', async (_event, platform: IMPlatform) => {
    try {
      // Persist enabled state
      const manager = getIMGatewayManager()
      manager.setConfig({ [platform]: { enabled: true } })
      await manager.startGateway(platform)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start gateway'
      }
    }
  })

  ipcMain.handle('im:gateway:stop', async (_event, platform: IMPlatform) => {
    try {
      // Persist disabled state
      const manager = getIMGatewayManager()
      manager.setConfig({ [platform]: { enabled: false } })
      await manager.stopGateway(platform)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to stop gateway'
      }
    }
  })

  ipcMain.handle('im:gateway:test', async (_event, platform: IMPlatform, configOverride?: Partial<IMGatewayConfig>) => {
    try {
      const result = await getIMGatewayManager().testGateway(platform, configOverride)
      return { success: true, result }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to test gateway connectivity'
      }
    }
  })

  ipcMain.handle('im:status:get', async () => {
    try {
      const status = getIMGatewayManager().getStatus()
      return { success: true, status }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get IM status'
      }
    }
  })

  /* ------------------- Shell IPC 处理 ------------------- */
  // 打开文件/文件夹。
  // 使用系统默认方式打开文件或目录。
  ipcMain.handle('shell:openPath', async (_event, filePath: string) => {
    try {
      const normalizedPath = normalizeWindowsShellPath(filePath)
      const result = await shell.openPath(normalizedPath)
      if (result) {
        // shell.openPath 返回非空字符串表示失败。
        return { success: false, error: result }
      }
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // 在文件管理器中定位文件。
  // 在文件管理器中定位并选中文件。
  ipcMain.handle('shell:showItemInFolder', async (_event, filePath: string) => {
    try {
      const normalizedPath = normalizeWindowsShellPath(filePath)
      shell.showItemInFolder(normalizedPath)
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // 打开外部链接。
  // 使用系统浏览器打开外部链接。
  ipcMain.handle('shell:openExternal', async (_event, url: string) => {
    try {
      await shell.openExternal(url)
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  /* ------------------- 日志 IPC 处理 ------------------- */

  // 获取主日志文件路径。
  ipcMain.handle('log:getPath', () => {
    return getLogFilePath()
  })

  // 在文件管理器中打开日志所在位置。
  ipcMain.handle('log:openFolder', () => {
    const logPath = getLogFilePath()
    if (logPath) {
      shell.showItemInFolder(logPath)
    }
  })

  // 导出日志压缩包。
  ipcMain.handle('log:exportZip', async (event) => {
    try {
      const ownerWindow = BrowserWindow.fromWebContents(event.sender)
      const saveOptions = {
        title: 'Export Logs',
        defaultPath: path.join(app.getPath('downloads'), buildLogExportFileName()),
        filters: [{ name: 'Zip Archive', extensions: ['zip'] }]
      }

      const saveResult = ownerWindow ? await dialog.showSaveDialog(ownerWindow, saveOptions) : await dialog.showSaveDialog(saveOptions)

      if (saveResult.canceled || !saveResult.filePath) {
        return { success: true, canceled: true }
      }

      const outputPath = ensureZipFileName(saveResult.filePath)
      const archiveResult = await exportLogsZip({
        outputPath,
        entries: [
          { archiveName: 'main.log', filePath: getLogFilePath() },
          { archiveName: 'cowork.log', filePath: getCoworkLogPath() }
        ]
      })

      return {
        success: true,
        canceled: false,
        path: outputPath,
        missingEntries: archiveResult.missingEntries
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export logs'
      }
    }
  })

  /* ------------------- 开机自启 IPC 处理 ------------------- */
  // 以 SQLite 为 UI 真值来源：
  // app.getLoginItemSettings 在 macOS 上结果不稳定，Windows 上又依赖参数完全匹配。
  // 获取开机自启状态（优先读取本地持久化状态）。
  ipcMain.handle('app:getAutoLaunch', () => {
    const stored = getStore().get<boolean>('auto_launch_enabled')
    // 若 SQLite 尚无记录（如旧版本升级），回退读取系统 API。
    const enabled = stored ?? getAutoLaunchEnabled()
    return { enabled }
  })

  // 设置开机自启状态并同步写入持久化。
  ipcMain.handle('app:setAutoLaunch', (_event, enabled: unknown) => {
    if (typeof enabled !== 'boolean') {
      return { success: false, error: 'Invalid parameter: enabled must be boolean' }
    }
    try {
      setAutoLaunchEnabled(enabled)
      getStore().set('auto_launch_enabled', enabled)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set auto-launch'
      }
    }
  })

  /* ------------------- 对话框 IPC 处理 ------------------- */
  // 读取本地文件并转换为 data URL（data:<mime>;base64,...）。
  // 读取本地文件转 data URL 时允许的最大文件大小。
  const MAX_READ_AS_DATA_URL_BYTES = 20 * 1024 * 1024
  // 基于扩展名推断 MIME 类型。
  const MIME_BY_EXT: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.svg': 'image/svg+xml'
  }
  // 读取本地文件并以 data URL 形式返回。
  ipcMain.handle(
    'dialog:readFileAsDataUrl',
    async (_event, filePath?: string): Promise<{ success: boolean; dataUrl?: string; error?: string }> => {
      try {
        if (typeof filePath !== 'string' || !filePath.trim()) {
          return { success: false, error: 'Missing file path' }
        }
        const resolvedPath = path.resolve(filePath.trim())
        const stat = await fs.promises.stat(resolvedPath)
        if (!stat.isFile()) {
          return { success: false, error: 'Not a file' }
        }
        if (stat.size > MAX_READ_AS_DATA_URL_BYTES) {
          return {
            success: false,
            error: `File too large (max ${Math.floor(MAX_READ_AS_DATA_URL_BYTES / (1024 * 1024))}MB)`
          }
        }
        const buffer = await fs.promises.readFile(resolvedPath)
        const ext = path.extname(resolvedPath).toLowerCase()
        const mimeType = MIME_BY_EXT[ext] || 'application/octet-stream'
        const base64 = buffer.toString('base64')
        return { success: true, dataUrl: `data:${mimeType};base64,${base64}` }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to read file'
        }
      }
    }
  )

  // 打开目录选择对话框。
  ipcMain.handle('dialog:selectDirectory', async (event) => {
    const ownerWindow = BrowserWindow.fromWebContents(event.sender)
    const dialogOptions = {
      properties: ['openDirectory', 'createDirectory'] as ('openDirectory' | 'createDirectory')[]
    }
    const result = ownerWindow ? await dialog.showOpenDialog(ownerWindow, dialogOptions) : await dialog.showOpenDialog(dialogOptions)
    if (result.canceled || result.filePaths.length === 0) {
      return { success: true, path: null }
    }
    return { success: true, path: result.filePaths[0] }
  })

  // 打开文件选择对话框。
  ipcMain.handle('dialog:selectFile', async (event, options?: { title?: string; filters?: { name: string; extensions: string[] }[] }) => {
    const ownerWindow = BrowserWindow.fromWebContents(event.sender)
    const dialogOptions = {
      properties: ['openFile'] as 'openFile'[],
      title: options?.title,
      filters: options?.filters
    }
    const result = ownerWindow ? await dialog.showOpenDialog(ownerWindow, dialogOptions) : await dialog.showOpenDialog(dialogOptions)
    if (result.canceled || result.filePaths.length === 0) {
      return { success: true, path: null }
    }
    return { success: true, path: result.filePaths[0] }
  })

  // 保存前端内联附件到本地临时目录。
  ipcMain.handle(
    'dialog:saveInlineFile',
    async (_event, options?: { dataBase64?: string; fileName?: string; mimeType?: string; cwd?: string }) => {
      try {
        const dataBase64 = typeof options?.dataBase64 === 'string' ? options.dataBase64.trim() : ''
        if (!dataBase64) {
          return { success: false, path: null, error: 'Missing file data' }
        }

        const buffer = Buffer.from(dataBase64, 'base64')
        if (!buffer.length) {
          return { success: false, path: null, error: 'Invalid file data' }
        }
        if (buffer.length > MAX_INLINE_ATTACHMENT_BYTES) {
          return {
            success: false,
            path: null,
            error: `File too large (max ${Math.floor(MAX_INLINE_ATTACHMENT_BYTES / (1024 * 1024))}MB)`
          }
        }

        const dir = resolveInlineAttachmentDir(options?.cwd)
        await fs.promises.mkdir(dir, { recursive: true })

        const safeFileName = sanitizeAttachmentFileName(options?.fileName)
        const extension = inferAttachmentExtension(safeFileName, options?.mimeType)
        const baseName = extension ? safeFileName.slice(0, -extension.length) : safeFileName
        const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        const finalName = `${baseName || 'attachment'}-${uniqueSuffix}${extension}`
        const outputPath = path.join(dir, finalName)

        await fs.promises.writeFile(outputPath, buffer)
        return { success: true, path: outputPath }
      } catch (error) {
        return {
          success: false,
          path: null,
          error: error instanceof Error ? error.message : 'Failed to save inline file'
        }
      }
    }
  )

  /* ------------------- 配置 IPC 处理 ------------------- */
  // 读取当前 API 配置。
  ipcMain.handle('get-api-config', async () => {
    return getCurrentApiConfig()
  })

  // 校验 API 配置可用性，并可选探测模型可用状态。
  ipcMain.handle('check-api-config', async (_event, options?: { probeModel?: boolean }) => {
    const { config, error } = resolveCurrentApiConfig()
    if (config && options?.probeModel) {
      const probe = await probeCoworkModelReadiness()
      if (probe.ok === false) {
        return { hasConfig: false, config: null, error: probe.error }
      }
    }
    return { hasConfig: config !== null, config, error }
  })

  // 保存 API 配置。
  ipcMain.handle(
    'save-api-config',
    async (
      _event,
      config: {
        apiKey: string
        baseURL: string
        model: string
        apiType?: 'anthropic' | 'openai'
      }
    ) => {
      try {
        saveCoworkApiConfig(config)
        return { success: true }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to save API config'
        }
      }
    }
  )

  /* ------------------- App update download & install IPC 处理 ------------------- */
  ipcMain.handle('appUpdate:download', async (event, url: string) => {
    try {
      const filePath = await downloadUpdate(url, (progress) => {
        if (!event.sender.isDestroyed()) {
          event.sender.send('appUpdate:downloadProgress', progress)
        }
      })
      return { success: true, filePath }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Download failed' }
    }
  })

  ipcMain.handle('appUpdate:cancelDownload', async () => {
    const cancelled = cancelActiveDownload()
    return { success: cancelled }
  })

  ipcMain.handle('appUpdate:install', async (_event, filePath: string) => {
    try {
      await installUpdate(filePath)
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Installation failed' }
    }
  })

  // 根据用户输入生成会话标题。
  ipcMain.handle('generate-session-title', async (_event, userInput: string | null) => {
    return generateSessionTitle(userInput)
  })

  // 获取最近使用的工作目录列表。
  ipcMain.handle('get-recent-cwds', async (_event, limit?: number) => {
    const boundedLimit = limit ? Math.min(Math.max(limit, 1), 20) : 8
    return getCoworkStore().listRecentCwds(boundedLimit)
  })

  // 获取应用版本号。
  ipcMain.handle('app:getVersion', () => app.getVersion())
  // 获取系统语言区域。
  ipcMain.handle('app:getSystemLocale', () => app.getLocale())

  app.on('second-instance', (_event, commandLine, workingDirectory) => {
    console.log('[Main] second-instance event', {
      commandLine,
      workingDirectory
    })
    // 第二实例启动时，将焦点切回主窗口。
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      if (!mainWindow.isVisible()) mainWindow.show()
      if (!mainWindow.isFocused()) mainWindow.focus()
    }
  })

  // 设置 Content Security Policy。
  const setContentSecurityPolicy = () => {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      const devPort = process.env.ELECTRON_START_URL?.match(/:(\d+)/)?.[1] || '5176'
      const cspDirectives = [
        "default-src 'self'",
        isDev ? `script-src 'self' 'unsafe-inline' http://localhost:${devPort} ws://localhost:${devPort}` : "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https: http:",
        // 允许连接到任意域名，不额外限制。
        'connect-src *',
        "font-src 'self' data:",
        "media-src 'self'",
        "worker-src 'self' blob:",
        "frame-src 'self'"
      ]

      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': cspDirectives.join('; ')
        }
      })
    })
  }

  // 创建主窗口。
  const createWindow = () => {
    // 若已有窗口实例，则直接恢复并聚焦。
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      if (!mainWindow.isVisible()) mainWindow.show()
      if (!mainWindow.isFocused()) mainWindow.focus()
      return
    }

    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      title: APP_NAME,
      icon: getAppIconPath(),
      ...(isMac
        ? {
            titleBarStyle: 'hiddenInset' as const,
            trafficLightPosition: { x: 12, y: 20 }
          }
        : isWindows
          ? {
              frame: false,
              titleBarStyle: 'hidden' as const
            }
          : {
              titleBarStyle: 'hidden' as const
              // titleBarOverlay: getTitleBarOverlayOptions(),
            }),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
        preload: PRELOAD_PATH,
        backgroundThrottling: false,
        devTools: isDev,
        spellcheck: false,
        enableWebSQL: false,
        autoplayPolicy: 'document-user-activation-required',
        disableDialogs: true,
        navigateOnDragDrop: false
      },
      backgroundColor: '#F8F9FB',
      show: false,
      autoHideMenuBar: true,
      enableLargerThanScreen: false
    })

    // 开发模式下主动设置 macOS Dock 图标。
    if (isMac && isDev) {
      const iconPath = path.join(__dirname, '../build/icons/png/512x512.png')
      if (fs.existsSync(iconPath)) {
        app.dock?.setIcon(nativeImage.createFromPath(iconPath))
      }
    }

    // 禁用窗口菜单。
    mainWindow.setMenu(null)

    // 设置窗口最小尺寸。
    mainWindow.setMinimumSize(800, 600)

    if (isDev) {
      // 开发环境。
      const maxRetries = 3
      let retryCount = 0

      const tryLoadURL = () => {
        mainWindow?.loadURL(DEV_SERVER_URL).catch((err) => {
          console.error('Failed to load URL:', err)
          retryCount++

          if (retryCount < maxRetries) {
            console.log(`Retrying to load URL (${retryCount}/${maxRetries})...`)
            setTimeout(tryLoadURL, 3000)
          } else {
            console.error('Failed to load URL after maximum retries')
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.loadFile(path.join(__dirname, '../resources/error.html'))
            }
          }
        })
      }

      tryLoadURL()

      // 自动打开开发者工具。
      mainWindow.webContents.openDevTools()
    } else {
      // 生产环境。
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
    }

    // 窗口关闭时清理引用。
    mainWindow.on('closed', () => {
      mainWindow = null
    })

    // 内容加载完成后再展示窗口。
    mainWindow.once('ready-to-show', () => {
      mainWindow?.show()
    })

    // macOS：点击 Dock 图标时恢复窗口或重新创建。
    app.on('activate', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (!mainWindow.isVisible()) mainWindow.show()
        if (!mainWindow.isFocused()) mainWindow.focus()
        return
      }
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      }
    })
  }

  const manager = getSkillManager()
  console.log('[Main] initApp: getSkillManager done')

  // 非关键流程：同步内置技能到 userData。
  // 失败不应阻塞窗口创建，因此使用 try-catch 包裹。
  try {
    manager.syncBundledSkillsToUserData()
    console.log('[Main] initApp: syncBundledSkillsToUserData done')
  } catch (error) {
    console.error('[Main] initApp: syncBundledSkillsToUserData failed:', error)
  }

  // 初始化应用主流程。
  const initApp = async () => {
    console.log('app.getPath("userData")', app.getPath('userData'))
    console.log('[Main] initApp: waiting for app.whenReady()')
    await app.whenReady()
    console.log('[Main] initApp: app is ready')

    // 日历权限按需检查：仅在实际访问日历时触发，避免启动弹窗打扰用户。

    // 确保默认工作目录存在。
    const defaultProjectDir = path.join(os.homedir(), 'lobsterai', 'project')
    if (!fs.existsSync(defaultProjectDir)) {
      fs.mkdirSync(defaultProjectDir, { recursive: true })
      console.log('Created default project directory:', defaultProjectDir)
    }
    console.log('[Main] initApp: default project dir ensured')

    console.log('[Main] initApp: starting initStore()')

    store = await initStore()
    console.log('[Main] initApp: store initialized')

    // 向 claudeSettings 注入 store getter。
    setStoreGetter(() => store)
    console.log('[Main] initApp: setStoreGetter done')
    // const manager = getSkillManager()
    // console.log('[Main] initApp: getSkillManager done')

    // 设置安全策略。
    setContentSecurityPolicy()

    // 创建窗口。
    console.log('[Main] initApp: creating window')
    createWindow()
    console.log('[Main] initApp: window created')

    // macOS：点击 Dock 图标时恢复窗口或重新创建。
    app.on('activate', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (!mainWindow.isVisible()) mainWindow.show()
        if (!mainWindow.isFocused()) mainWindow.focus()
        return
      }
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      }
    })
  }

  // 启动应用主流程。
  initApp().catch(console.error)

  // 所有窗口关闭后退出应用（macOS 例外）。
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}
