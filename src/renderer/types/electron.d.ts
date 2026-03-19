/**
 * Electron 预加载 API 类型定义
 * 描述 window.electron 在渲染进程可用的能力边界
 */

/** 窗口状态 */
interface WindowState {
  /** 是否最大化 */
  isMaximized: boolean
  /** 是否全屏 */
  isFullscreen: boolean
  /** 是否聚焦 */
  isFocused: boolean
}

/** 渲染进程可访问的 Electron API 聚合接口 */
interface IElectronAPI {
  /** 当前平台 */
  platform: string
  /** 当前架构 */
  arch: string

  /** 通用 KV 存储 API */
  store: {
    get: (key: string) => Promise<any>
    set: (key: string, value: any) => Promise<void>
    remove: (key: string) => Promise<void>
  }

  /** 应用更新 */
  appUpdate: {
    download: (url: string) => Promise<{ success: boolean; filePath?: string; error?: string }>
    cancelDownload: () => Promise<{ success: boolean }>
    install: (filePath: string) => Promise<{ success: boolean; error?: string }>
    onDownloadProgress: (callback: (data: AppUpdateDownloadProgress) => void) => () => void
  }

  /** MCP 服务管理 API */
  mcp: {
    list: () => Promise<{ success: boolean; servers?: McpServerConfigIPC[]; error?: string }>
    create: (data: any) => Promise<{ success: boolean; servers?: McpServerConfigIPC[]; error?: string }>
    update: (id: string, data: any) => Promise<{ success: boolean; servers?: McpServerConfigIPC[]; error?: string }>
    delete: (id: string) => Promise<{ success: boolean; servers?: McpServerConfigIPC[]; error?: string }>
    setEnabled: (options: { id: string; enabled: boolean }) => Promise<{ success: boolean; servers?: McpServerConfigIPC[]; error?: string }>
    fetchMarketplace: () => Promise<{ success: boolean; data?: McpMarketplaceData; error?: string }>
  }

  /** 技能管理 API */
  skills: {
    list: () => Promise<{ success: boolean; skills?: Skill[]; error?: string }>
    setEnabled: (options: { id: string; enabled: boolean }) => Promise<{ success: boolean; skills?: Skill[]; error?: string }>
    delete: (id: string) => Promise<{ success: boolean; skills?: Skill[]; error?: string }>
    download: (source: string) => Promise<{ success: boolean; skills?: Skill[]; error?: string }>
    getRoot: () => Promise<{ success: boolean; path?: string; error?: string }>
    autoRoutingPrompt: () => Promise<{
      success: boolean
      prompt?: string | null
      error?: string
    }>
    getConfig: (skillId: string) => Promise<{
      success: boolean
      config?: Record<string, string>
      error?: string
    }>
    setConfig: (skillId: string, config: Record<string, string>) => Promise<{ success: boolean; error?: string }>
    testEmailConnectivity: (
      skillId: string,
      config: Record<string, string>
    ) => Promise<{
      success: boolean
      result?: EmailConnectivityTestResult
      error?: string
    }>
    onChanged: (callback: () => void) => () => void
  }

  /** HTTP 与流式请求 API */
  api: {
    fetch: (options: { url: string; method: string; headers: Record<string, string>; body?: string }) => Promise<ApiResponse>
    stream: (options: {
      url: string
      method: string
      headers: Record<string, string>
      body?: string
      requestId: string
    }) => Promise<ApiStreamResponse>
    cancelStream: (requestId: string) => Promise<boolean>
    onStreamData: (requestId: string, callback: (chunk: string) => void) => () => void
    onStreamDone: (requestId: string, callback: () => void) => () => void
    onStreamError: (requestId: string, callback: (error: string) => void) => () => void
    onStreamAbort: (requestId: string, callback: () => void) => () => void
  }

  /** 窗口控制 API */
  window: {
    minimize: () => void
    toggleMaximize: () => void
    close: () => void
    isMaximized: () => Promise<boolean>
    showSystemMenu: (position: { x: number; y: number }) => void
    onStateChanged: (callback: (state: WindowState) => void) => () => void
  }

  /** 协作会话 API */
  cowork: {
    startSession: (options: {
      prompt: string
      cwd?: string
      systemPrompt?: string
      title?: string
      activeSkillIds?: string[]
      imageAttachments?: Array<{ name: string; mimeType: string; base64Data: string }>
    }) => Promise<{ success: boolean; session?: CoworkSession; error?: string }>
    continueSession: (options: {
      sessionId: string
      prompt: string
      systemPrompt?: string
      activeSkillIds?: string[]
      imageAttachments?: Array<{ name: string; mimeType: string; base64Data: string }>
    }) => Promise<{ success: boolean; session?: CoworkSession; error?: string }>
    stopSession: (sessionId: string) => Promise<{ success: boolean; error?: string }>
    deleteSession: (sessionId: string) => Promise<{ success: boolean; error?: string }>
    deleteSessions: (sessionIds: string[]) => Promise<{ success: boolean; error?: string }>
    setSessionPinned: (options: { sessionId: string; pinned: boolean }) => Promise<{ success: boolean; error?: string }>
    renameSession: (options: { sessionId: string; title: string }) => Promise<{ success: boolean; error?: string }>
    getSession: (sessionId: string) => Promise<{ success: boolean; session?: CoworkSession; error?: string }>
    listSessions: () => Promise<{ success: boolean; sessions?: CoworkSessionSummary[]; error?: string }>
    exportResultImage: (options: {
      rect: { x: number; y: number; width: number; height: number }
      defaultFileName?: string
    }) => Promise<{ success: boolean; canceled?: boolean; path?: string; error?: string }>
    captureImageChunk: (options: {
      rect: { x: number; y: number; width: number; height: number }
    }) => Promise<{ success: boolean; width?: number; height?: number; pngBase64?: string; error?: string }>
    saveResultImage: (options: {
      pngBase64: string
      defaultFileName?: string
    }) => Promise<{ success: boolean; canceled?: boolean; path?: string; error?: string }>
    respondToPermission: (options: { requestId: string; result: CoworkPermissionResult }) => Promise<{ success: boolean; error?: string }>
    getConfig: () => Promise<{ success: boolean; config?: CoworkConfig; error?: string }>
    setConfig: (config: CoworkConfigUpdate) => Promise<{ success: boolean; error?: string }>
    listMemoryEntries: (input: {
      query?: string
      status?: 'created' | 'stale' | 'deleted' | 'all'
      includeDeleted?: boolean
      limit?: number
      offset?: number
    }) => Promise<{ success: boolean; entries?: CoworkUserMemoryEntry[]; error?: string }>
    createMemoryEntry: (input: {
      text: string
      confidence?: number
      isExplicit?: boolean
    }) => Promise<{ success: boolean; entry?: CoworkUserMemoryEntry; error?: string }>
    updateMemoryEntry: (input: {
      id: string
      text?: string
      confidence?: number
      status?: 'created' | 'stale' | 'deleted'
      isExplicit?: boolean
    }) => Promise<{ success: boolean; entry?: CoworkUserMemoryEntry; error?: string }>
    deleteMemoryEntry: (input: { id: string }) => Promise<{ success: boolean; error?: string }>
    getMemoryStats: () => Promise<{ success: boolean; stats?: CoworkMemoryStats; error?: string }>
    getSandboxStatus: () => Promise<CoworkSandboxStatus>
    installSandbox: () => Promise<{ success: boolean; status: CoworkSandboxStatus; error?: string }>
    onSandboxDownloadProgress: (callback: (data: CoworkSandboxProgress) => void) => () => void
    onStreamMessage: (callback: (data: { sessionId: string; message: CoworkMessage }) => void) => () => void
    onStreamMessageUpdate: (callback: (data: { sessionId: string; messageId: string; content: string }) => void) => () => void
    onStreamPermission: (callback: (data: { sessionId: string; request: CoworkPermissionRequest }) => void) => () => void
    onStreamComplete: (callback: (data: { sessionId: string; claudeSessionId: string | null }) => void) => () => void
    onStreamError: (callback: (data: { sessionId: string; error: string }) => void) => () => void
  }

  /** 应用基础信息 API */
  appInfo: {
    getVersion: () => Promise<string>
    getSystemLocale: () => Promise<string>
  }

  /** 开机自启 API */
  autoLaunch: {
    get: () => Promise<{ enabled: boolean }>
    set: (enabled: boolean) => Promise<{ success: boolean; error?: string }>
  }

  /** 文件/目录选择与保存对话框 API */
  dialog: {
    selectDirectory: () => Promise<{ success: boolean; path: string | null }>
    selectFile: (options?: {
      title?: string
      filters?: { name: string; extensions: string[] }[]
    }) => Promise<{ success: boolean; path: string | null }>
    saveInlineFile: (options: {
      dataBase64: string
      fileName?: string
      mimeType?: string
      cwd?: string
    }) => Promise<{ success: boolean; path: string | null; error?: string }>
    readFileAsDataUrl: (filePath: string) => Promise<{ success: boolean; dataUrl?: string; error?: string }>
  }

  /** 系统 Shell 操作 API */
  shell: {
    openPath: (filePath: string) => Promise<{ success: boolean; error?: string }>
    showItemInFolder: (filePath: string) => Promise<{ success: boolean; error?: string }>
    openExternal: (url: string) => Promise<{ success: boolean; error?: string }>
  }

  /** 日志管理 API */
  log: {
    getPath: () => Promise<string>
    openFolder: () => Promise<void>
    exportZip: () => Promise<{
      success: boolean
      canceled?: boolean
      path?: string
      missingEntries?: string[]
      error?: string
    }>
  }

  /** 定时任务 API */
  scheduledTasks: {
    list: () => Promise<any>
    get: (id: string) => Promise<any>
    create: (input: any) => Promise<any>
    update: (id: string, input: any) => Promise<any>
    delete: (id: string) => Promise<any>
    toggle: (id: string, enabled: boolean) => Promise<any>
    runManually: (id: string) => Promise<any>
    stop: (id: string) => Promise<any>
    listRuns: (taskId: string, limit?: number, offset?: number) => Promise<any>
    countRuns: (taskId: string) => Promise<any>
    listAllRuns: (limit?: number, offset?: number) => Promise<any>
    onStatusUpdate: (callback: (data: any) => void) => () => void
    onRunUpdate: (callback: (data: any) => void) => () => void
  }

  /* 即时通讯 API */
  im: {
    getConfig: () => Promise<{ success: boolean; config?: IMGatewayConfig; error?: string }>
    setConfig: (config: Partial<IMGatewayConfig>) => Promise<{ success: boolean; error?: string }>
    startGateway: (
      platform: 'dingtalk' | 'feishu' | 'qq' | 'telegram' | 'discord' | 'nim' | 'xiaomifeng' | 'wecom'
    ) => Promise<{ success: boolean; error?: string }>
    stopGateway: (
      platform: 'dingtalk' | 'feishu' | 'qq' | 'telegram' | 'discord' | 'nim' | 'xiaomifeng' | 'wecom'
    ) => Promise<{ success: boolean; error?: string }>
    testGateway: (
      platform: 'dingtalk' | 'feishu' | 'qq' | 'telegram' | 'discord' | 'nim' | 'xiaomifeng' | 'wecom',
      configOverride?: Partial<IMGatewayConfig>
    ) => Promise<{ success: boolean; result?: IMConnectivityTestResult; error?: string }>
    getStatus: () => Promise<{ success: boolean; status?: IMGatewayStatus; error?: string }>
    onStatusChange: (callback: (status: IMGatewayStatus) => void) => () => void
    onMessageReceived: (callback: (message: IMMessage) => void) => () => void
  }

  /** 读取 API 配置 */
  getApiConfig: () => Promise<CoworkApiConfig | null>
  /** 校验 API 配置可用性 */
  checkApiConfig: (options?: { probeModel?: boolean }) => Promise<{ hasConfig: boolean; config: CoworkApiConfig | null; error?: string }>
  /** 保存 API 配置 */
  saveApiConfig: (config: CoworkApiConfig) => Promise<{ success: boolean; error?: string }>
  /** 生成会话标题 */
  generateSessionTitle: (userInput: string | null) => Promise<string>
  /** 获取最近工作目录 */
  getRecentCwds: (limit?: number) => Promise<string[]>
}

/** 全局 window 扩展声明 */
declare global {
  interface Window {
    electron: IElectronAPI
  }
}

export {}
