import { ipcRenderer, contextBridge } from 'electron'

// --------- 暴露安全的 API 到渲染进程 ---------
contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  arch: process.arch,
  store: {
    get: (key: string) => ipcRenderer.invoke('store:get', key),
    set: (key: string, value: any) => ipcRenderer.invoke('store:set', key, value),
    remove: (key: string) => ipcRenderer.invoke('store:remove', key)
  },
  skills: {
    list: () => ipcRenderer.invoke('skills:list'),
    setEnabled: (options: { id: string; enabled: boolean }) => ipcRenderer.invoke('skills:setEnabled', options),
    delete: (id: string) => ipcRenderer.invoke('skills:delete', id),
    download: (source: string) => ipcRenderer.invoke('skills:download', source),
    getRoot: () => ipcRenderer.invoke('skills:getRoot'),
    autoRoutingPrompt: () => ipcRenderer.invoke('skills:autoRoutingPrompt'),
    getConfig: (skillId: string) => ipcRenderer.invoke('skills:getConfig', skillId),
    setConfig: (skillId: string, config: Record<string, string>) => ipcRenderer.invoke('skills:setConfig', skillId, config),
    testEmailConnectivity: (skillId: string, config: Record<string, string>) =>
      ipcRenderer.invoke('skills:testEmailConnectivity', skillId, config),
    onChanged: (callback: () => void) => {
      const handler = () => callback()
      ipcRenderer.on('skills:changed', handler)
      return () => ipcRenderer.removeListener('skills:changed', handler)
    }
  },
  api: {
    // 普通 API 请求（非流式）
    fetch: (options: { url: string; method: string; headers: Record<string, string>; body?: string }) =>
      ipcRenderer.invoke('api:fetch', options),

    // 流式 API 请求
    stream: (options: { url: string; method: string; headers: Record<string, string>; body?: string; requestId: string }) =>
      ipcRenderer.invoke('api:stream', options),

    // 取消流式请求
    cancelStream: (requestId: string) => ipcRenderer.invoke('api:stream:cancel', requestId),

    // 监听流式数据
    onStreamData: (requestId: string, callback: (chunk: string) => void) => {
      const handler = (_event: any, chunk: string) => callback(chunk)
      ipcRenderer.on(`api:stream:${requestId}:data`, handler)
      return () => ipcRenderer.removeListener(`api:stream:${requestId}:data`, handler)
    },

    // 监听流式完成
    onStreamDone: (requestId: string, callback: () => void) => {
      const handler = () => callback()
      ipcRenderer.on(`api:stream:${requestId}:done`, handler)
      return () => ipcRenderer.removeListener(`api:stream:${requestId}:done`, handler)
    },

    // 监听流式错误
    onStreamError: (requestId: string, callback: (error: string) => void) => {
      const handler = (_event: any, error: string) => callback(error)
      ipcRenderer.on(`api:stream:${requestId}:error`, handler)
      return () => ipcRenderer.removeListener(`api:stream:${requestId}:error`, handler)
    },

    // 监听流式取消
    onStreamAbort: (requestId: string, callback: () => void) => {
      const handler = () => callback()
      ipcRenderer.on(`api:stream:${requestId}:abort`, handler)
      return () => ipcRenderer.removeListener(`api:stream:${requestId}:abort`, handler)
    }
  },
  ipcRenderer: {
    send: (channel: string, ...args: any[]) => {
      ipcRenderer.send(channel, ...args)
    },
    on: (channel: string, func: (...args: any[]) => void) => {
      const handler = (_event: any, ...args: any[]) => func(...args)
      ipcRenderer.on(channel, handler)
      return () => ipcRenderer.removeListener(channel, handler)
    }
  },
  window: {
    minimize: () => ipcRenderer.send('window-minimize'),
    toggleMaximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    showSystemMenu: (position: { x: number; y: number }) => ipcRenderer.send('window:showSystemMenu', position),
    onStateChanged: (callback: (state: { isMaximized: boolean; isFullscreen: boolean; isFocused: boolean }) => void) => {
      const handler = (
        _event: any,
        state: {
          isMaximized: boolean
          isFullscreen: boolean
          isFocused: boolean
        }
      ) => callback(state)
      ipcRenderer.on('window:state-changed', handler)
      return () => ipcRenderer.removeListener('window:state-changed', handler)
    }
  },
  cowork: {
    getMemoryStats: () => ipcRenderer.invoke('cowork:memory:getStats'),
    deleteMemoryEntry: (input: { id: string }) => ipcRenderer.invoke('cowork:memory:deleteEntry', input),
    createMemoryEntry: (input: { text: string; confidence?: number; isExplicit?: boolean }) =>
      ipcRenderer.invoke('cowork:memory:createEntry', input),
    updateMemoryEntry: (input: {
      id: string
      text?: string
      confidence?: number
      status?: 'created' | 'stale' | 'deleted'
      isExplicit?: boolean
    }) => ipcRenderer.invoke('cowork:memory:updateEntry', input),
    listMemoryEntries: (input: {
      query?: string
      status?: 'created' | 'stale' | 'deleted' | 'all'
      includeDeleted?: boolean
      limit?: number
      offset?: number
    }) => ipcRenderer.invoke('cowork:memory:listEntries', input),
    getSandboxStatus: () => ipcRenderer.invoke('cowork:sandbox:status'),
    installSandbox: () => ipcRenderer.invoke('cowork:sandbox:install')
  },
  appInfo: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getSystemLocale: () => ipcRenderer.invoke('app:getSystemLocale')
  },
  autoLaunch: {
    get: () => ipcRenderer.invoke('app:getAutoLaunch'),
    set: (enabled: boolean) => ipcRenderer.invoke('app:setAutoLaunch', enabled)
  },
  shell: {
    openPath: (filePath: string) => ipcRenderer.invoke('shell:openPath', filePath),
    showItemInFolder: (filePath: string) => ipcRenderer.invoke('shell:showItemInFolder', filePath),
    openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url)
  },
  log: {
    getPath: () => ipcRenderer.invoke('log:getPath'),
    openFolder: () => ipcRenderer.invoke('log:openFolder'),
    exportZip: () => ipcRenderer.invoke('log:exportZip')
  }
})
