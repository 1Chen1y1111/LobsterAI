import { app, BrowserWindow, dialog, ipcMain, nativeImage, session, shell } from 'electron'
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
import { Scheduler } from 'node:timers/promises'

// 设置应用程序名称
app.name = APP_NAME
app.setName(APP_NAME)

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
const INVALID_FILE_NAME_PATTERN = /[<>:"/\\|?*\u0000-\u001F]/g
const isDev = process.env.NODE_ENV === 'development'
const isLinux = process.platform === 'linux'
const isMac = process.platform === 'darwin'
const isWindows = process.platform === 'win32'
const DEV_SERVER_URL = process.env.ELECTRON_START_URL || 'http://localhost:5176'
const MAX_INLINE_ATTACHMENT_BYTES = 25 * 1024 * 1024
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

const safeDecodeURIComponent = (value: string): string => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

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

const padTwoDigits = (value: number): string => value.toString().padStart(2, '0')

const buildLogExportFileName = (): string => {
  const now = new Date()
  const datePart = `${now.getFullYear()}${padTwoDigits(now.getMonth() + 1)}${padTwoDigits(now.getDate())}`
  const timePart = `${padTwoDigits(now.getHours())}${padTwoDigits(now.getMinutes())}${padTwoDigits(now.getSeconds())}`
  return `lobsterai-logs-${datePart}-${timePart}.zip`
}

const ensureZipFileName = (value: string): string => {
  return value.toLowerCase().endsWith('.zip') ? value : `${value}.zip`
}

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

const sanitizeExportFileName = (value: string): string => {
  const sanitized = value.replace(INVALID_FILE_NAME_PATTERN, ' ').replace(/\s+/g, ' ').trim()
  return sanitized || 'cowork-session'
}

const sanitizeAttachmentFileName = (value?: string): string => {
  const raw = typeof value === 'string' ? value.trim() : ''
  if (!raw) return 'attachment'
  const fileName = path.basename(raw)
  const sanitized = fileName.replace(INVALID_FILE_NAME_PATTERN, ' ').replace(/\s+/g, ' ').trim()
  return sanitized || 'attachment'
}

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

// 获取正确的预加载脚本路径
const PRELOAD_PATH = app.isPackaged ? path.join(__dirname, 'preload.js') : path.join(__dirname, '../dist-electron/preload.js')

// 获取应用图标路径（Windows 使用 .ico，其他平台使用 .png）
const getAppIconPath = (): string | undefined => {
  if (process.platform !== 'win32' && process.platform !== 'linux') return undefined
  const basePath = app.isPackaged ? path.join(process.resourcesPath, 'tray') : path.join(__dirname, '..', 'resources', 'tray')
  return process.platform === 'win32' ? path.join(basePath, 'tray-icon.ico') : path.join(basePath, 'tray-icon.png')
}

// 保存对主窗口的引用
let mainWindow: BrowserWindow | null = null

// 确保应用程序只有一个实例
const gotTheLock = isDev ? true : app.requestSingleInstanceLock()

let store: SqliteStore | null = null
let mcpStore: McpStore | null = null
let coworkStore: CoworkStore | null = null
let skillManager: SkillManager | null = null
// let scheduler: Scheduler | null = null;
// let scheduledTaskStore: ScheduledTaskStore | null = null;
let storeInitPromise: Promise<SqliteStore> | null = null

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

const getStore = (): SqliteStore => {
  if (!store) {
    throw new Error('Store not initialized. Call initStore() first.')
  }
  return store
}

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

/* ------------------- MCP ------------------- */
const getMcpStore = () => {
  if (!mcpStore) {
    const sqliteStore = getStore()
    mcpStore = new McpStore(sqliteStore.getDatabase(), sqliteStore.getSaveFunction())
  }
  return mcpStore
}

/* ------------------- Skills ------------------- */
const getSkillManager = () => {
  if (!skillManager) {
    skillManager = new SkillManager(getStore)
  }
  return skillManager
}

/* ------------------- ScheduledTask ------------------- */
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
  /* ------------------- store IPC handlers ------------------- */
  ipcMain.handle('store:get', (_event, key) => {
    return getStore().get(key)
  })

  ipcMain.handle('store:set', (_event, key, value) => {
    getStore().set(key, value)
  })

  ipcMain.handle('store:remove', (_event, key) => {
    getStore().delete(key)
  })

  /* ------------------- Window control IPC handlers ------------------- */
  ipcMain.on('window-minimize', () => {
    mainWindow?.minimize()
  })

  ipcMain.on('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })

  ipcMain.on('window-close', () => {
    mainWindow?.close()
  })

  ipcMain.handle('window:isMaximized', () => {
    return mainWindow?.isMaximized() ?? false
  })

  /* ------------------- MCP Server IPC handlers ------------------- */

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

  ipcMain.handle('mcp:delete', (_event, id: string) => {
    try {
      getMcpStore().deleteServer(id)
      const servers = getMcpStore().listServers()
      return { success: true, servers }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to delete MCP server' }
    }
  })

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

  ipcMain.handle('mcp:list', () => {
    try {
      const servers = getMcpStore().listServers()
      return { success: true, servers }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to list MCP servers' }
    }
  })

  ipcMain.handle('mcp:setEnabled', (_event, options: { id: string; enabled: boolean }) => {
    try {
      getMcpStore().setEnabled(options.id, options.enabled)
      const servers = getMcpStore().listServers()
      return { success: true, servers }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update MCP server' }
    }
  })

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

  /* ------------------- Skills IPC handlers ------------------- */
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

  ipcMain.handle('skills:getConfig', (_event, skillId: string) => {
    return getSkillManager().getSkillConfig(skillId)
  })

  ipcMain.handle('skills:setConfig', (_event, skillId: string, config: Record<string, string>) => {
    return getSkillManager().setSkillConfig(skillId, config)
  })

  ipcMain.handle('skills:testEmailConnectivity', async (_event, skillId: string, config: Record<string, string>) => {
    return getSkillManager().testEmailConnectivity(skillId, config)
  })

  ipcMain.handle('skills:setEnabled', (_event, options: { id: string; enabled: boolean }) => {
    try {
      const skills = getSkillManager().setSkillEnabled(options.id, options.enabled)
      return { success: true, skills }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update skill' }
    }
  })

  ipcMain.handle('skills:download', async (_event, source: string) => {
    return getSkillManager().downloadSkill(source)
  })

  ipcMain.handle('skills:delete', (_event, id: string) => {
    try {
      const skills = getSkillManager().deleteSkill(id)
      return { success: true, skills }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to delete skill' }
    }
  })

  /* ------------------- Scheduled Task IPC Handlers ------------------- */
  // TODO:

  /* ------------------- api IPC handlers ------------------- */
  // API 代理处理程序 - 解决 CORS 问题
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
          // SSE 流式响应，返回完整的文本
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

  /* ------------------- cowork IPC handlers ------------------- */
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

  ipcMain.handle('cowork:sandbox:status', async () => {
    return getSandboxStatus()
  })

  ipcMain.handle('cowork:sandbox:install', async () => {
    const result = await ensureSandboxReady()
    return {
      success: result.ok,
      status: getSandboxStatus(),
      error: result.ok ? undefined : 'error' in result ? result.error : undefined
    }
  })

  /* ------------------- Shell IPC handlers ------------------- */
  // 打开文件/文件夹
  ipcMain.handle('shell:openPath', async (_event, filePath: string) => {
    try {
      const normalizedPath = normalizeWindowsShellPath(filePath)
      const result = await shell.openPath(normalizedPath)
      if (result) {
        // 如果返回非空字符串，表示打开失败
        return { success: false, error: result }
      }
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // 在文件管理器中显示
  ipcMain.handle('shell:showItemInFolder', async (_event, filePath: string) => {
    try {
      const normalizedPath = normalizeWindowsShellPath(filePath)
      shell.showItemInFolder(normalizedPath)
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // 打开外部链接
  ipcMain.handle('shell:openExternal', async (_event, url: string) => {
    try {
      await shell.openExternal(url)
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  /* ------------------- log IPC handlers ------------------- */

  ipcMain.handle('log:getPath', () => {
    return getLogFilePath()
  })

  ipcMain.handle('log:openFolder', () => {
    const logPath = getLogFilePath()
    if (logPath) {
      shell.showItemInFolder(logPath)
    }
  })

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

  /* ------------------- Auto-launch IPC handlers ------------------- */
  // Use SQLite store as the source of truth for UI state, because
  // app.getLoginItemSettings() returns unreliable values on macOS and
  // requires matching args on Windows.
  ipcMain.handle('app:getAutoLaunch', () => {
    const stored = getStore().get<boolean>('auto_launch_enabled')
    // Fall back to OS API if SQLite has no record yet (e.g. upgraded from older version)
    const enabled = stored ?? getAutoLaunchEnabled()
    return { enabled }
  })

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

  /* ------------------- Dialog IPC handlers ------------------- */
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

  ipcMain.handle('app:getVersion', () => app.getVersion())
  ipcMain.handle('app:getSystemLocale', () => app.getLocale())

  app.on('second-instance', (_event, commandLine, workingDirectory) => {
    console.log('[Main] second-instance event', {
      commandLine,
      workingDirectory
    })
    // 如果尝试启动第二个实例，则聚焦到主窗口
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      if (!mainWindow.isVisible()) mainWindow.show()
      if (!mainWindow.isFocused()) mainWindow.focus()
    }
  })

  // 设置 Content Security Policy
  const setContentSecurityPolicy = () => {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      const devPort = process.env.ELECTRON_START_URL?.match(/:(\d+)/)?.[1] || '5176'
      const cspDirectives = [
        "default-src 'self'",
        isDev ? `script-src 'self' 'unsafe-inline' http://localhost:${devPort} ws://localhost:${devPort}` : "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https: http:",
        // 允许连接到所有域名，不做限制
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

  // 创建主窗口
  const createWindow = () => {
    // 如果窗口已经存在，就不再创建新窗口
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

    // 设置 macOS Dock 图标（开发模式下 Electron 默认图标不是应用 Logo）
    if (isMac && isDev) {
      const iconPath = path.join(__dirname, '../build/icons/png/512x512.png')
      if (fs.existsSync(iconPath)) {
        app.dock.setIcon(nativeImage.createFromPath(iconPath))
      }
    }

    // 禁用窗口菜单
    mainWindow.setMenu(null)

    // 设置窗口的最小尺寸
    mainWindow.setMinimumSize(800, 600)

    if (isDev) {
      // 开发环境
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

      // 打开开发者工具
      mainWindow.webContents.openDevTools()
    } else {
      // 生产环境
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
    }

    // 当窗口关闭时，清除引用
    mainWindow.on('closed', () => {
      mainWindow = null
    })

    // 等待内容加载完成后再显示窗口
    mainWindow.once('ready-to-show', () => {
      mainWindow?.show()
    })

    // 在 macOS 上，当点击 dock 图标时显示已有窗口或重新创建
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

  // Non-critical: sync bundled skills to user data.
  // Wrapped in try-catch so a failure here does not block window creation.
  try {
    manager.syncBundledSkillsToUserData()
    console.log('[Main] initApp: syncBundledSkillsToUserData done')
  } catch (error) {
    console.error('[Main] initApp: syncBundledSkillsToUserData failed:', error)
  }

  // 初始化应用
  const initApp = async () => {
    console.log('app.getPath("userData")', app.getPath('userData'))
    console.log('[Main] initApp: waiting for app.whenReady()')
    await app.whenReady()
    console.log('[Main] initApp: app is ready')

    // Note: Calendar permission is checked on-demand when calendar operations are requested
    // We don't trigger permission dialogs at startup to avoid annoying users

    // Ensure default working directory exists
    const defaultProjectDir = path.join(os.homedir(), 'lobsterai', 'project')
    if (!fs.existsSync(defaultProjectDir)) {
      fs.mkdirSync(defaultProjectDir, { recursive: true })
      console.log('Created default project directory:', defaultProjectDir)
    }
    console.log('[Main] initApp: default project dir ensured')

    console.log('[Main] initApp: starting initStore()')

    store = await initStore()
    console.log('[Main] initApp: store initialized')

    // 设置安全策略
    setContentSecurityPolicy()

    // 创建窗口
    console.log('[Main] initApp: creating window')
    createWindow()
    console.log('[Main] initApp: window created')

    // 在 macOS 上，当点击 dock 图标时显示已有窗口或重新创建
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

  // 启动应用
  initApp().catch(console.error)

  // 当所有窗口关闭时退出应用
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}
