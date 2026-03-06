import { app, BrowserWindow, ipcMain, nativeImage, session } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { APP_NAME } from './appConstants'
import { SkillManager } from './skillManager'
import { SqliteStore } from './sqliteStore'
import { CoworkStore } from './coworkStore'

// 设置应用程序名称
app.name = APP_NAME
app.setName(APP_NAME)

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
const isDev = process.env.NODE_ENV === 'development'
const isLinux = process.platform === 'linux'
const isMac = process.platform === 'darwin'
const isWindows = process.platform === 'win32'
const DEV_SERVER_URL = process.env.ELECTRON_START_URL || 'http://localhost:5176'

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
let coworkStore: CoworkStore | null = null
let skillManager: SkillManager | null = null
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

/* ------------------- Skills ------------------- */
const getSkillManager = () => {
  if (!skillManager) {
    skillManager = new SkillManager(getStore)
  }
  return skillManager
}

if (!gotTheLock) {
  app.quit()
} else {
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

  ipcMain.handle('cowork:sandbox:install', async () => {
    // const result = await ensureSandboxReady()
    // return {
    //   success: result.ok,
    //   status: getSandboxStatus(),
    //   error: result.ok ? undefined : 'error' in result ? result.error : undefined
    // }
  })

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
