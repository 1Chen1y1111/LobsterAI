interface WindowState {
  isMaximized: boolean
  isFullscreen: boolean
  isFocused: boolean
}

interface IElectronAPI {
  platform: string
  arch: string
  store: {
    get: (key: string) => Promise<any>
    set: (key: string, value: any) => Promise<void>
    remove: (key: string) => Promise<void>
  }
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
  window: {
    minimize: () => void
    toggleMaximize: () => void
    close: () => void
    isMaximized: () => Promise<boolean>
    showSystemMenu: (position: { x: number; y: number }) => void
    onStateChanged: (callback: (state: WindowState) => void) => () => void
  }
  cowork: {
    getMemoryStats: () => Promise<{ success: boolean; stats?: CoworkMemoryStats; error?: string }>
    deleteMemoryEntry: (input: { id: string }) => Promise<{ success: boolean; error?: string }>
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
    listMemoryEntries: (input: {
      query?: string
      status?: 'created' | 'stale' | 'deleted' | 'all'
      includeDeleted?: boolean
      limit?: number
      offset?: number
    }) => Promise<{ success: boolean; entries?: CoworkUserMemoryEntry[]; error?: string }>
    installSandbox: () => Promise<{ success: boolean; status: CoworkSandboxStatus; error?: string }>
  }
  appInfo: {
    getVersion: () => Promise<string>
    getSystemLocale: () => Promise<string>
  }
  autoLaunch: {
    get: () => Promise<{ enabled: boolean }>
    set: (enabled: boolean) => Promise<{ success: boolean; error?: string }>
  }
}

declare global {
  interface Window {
    electron: IElectronAPI
  }
}

export {}
