import { store } from '../store'
import {
  setSessions,
  setCurrentSession,
  addSession,
  updateSessionStatus,
  deleteSession as deleteSessionAction,
  deleteSessions as deleteSessionsAction,
  addMessage,
  updateMessageContent,
  setStreaming,
  updateSessionPinned,
  updateSessionTitle,
  enqueuePendingPermission,
  dequeuePendingPermission,
  setConfig,
  clearCurrentSession
} from '../store/slices/coworkSlice'
import type {
  CoworkSession,
  CoworkConfigUpdate,
  CoworkApiConfig,
  CoworkSandboxStatus,
  CoworkSandboxProgress,
  CoworkUserMemoryEntry,
  CoworkMemoryStats,
  CoworkPermissionResult,
  CoworkStartOptions,
  CoworkContinueOptions
} from '../types/cowork'

class CoworkService {
  private streamListenerCleanups: Array<() => void> = []
  private initialized = false

  // 初始化协作服务：加载配置、会话列表并绑定流式事件。
  async init(): Promise<void> {
    if (this.initialized) return

    // 加载初始配置。
    await this.loadConfig()

    // 加载会话列表。
    await this.loadSessions()

    // 绑定流式监听器。
    this.setupStreamListeners()

    this.initialized = true
  }

  // 绑定来自主进程的流式事件，并同步到 Redux 状态。
  private setupStreamListeners(): void {
    const cowork = window.electron?.cowork
    if (!cowork) return

    // 先清理旧监听器，避免重复绑定。
    this.cleanupListeners()

    // 监听消息事件；并兼容 IM 等外部来源创建的会话。
    const messageCleanup = cowork.onStreamMessage(async ({ sessionId, message }) => {
      // 调试日志：用于确认用户消息中的图片附件元数据是否保留。
      if (message.type === 'user') {
        const meta = message.metadata as Record<string, unknown> | undefined
        console.log('[CoworkService] onStreamMessage received user message', {
          sessionId,
          messageId: message.id,
          hasMetadata: !!meta,
          metadataKeys: meta ? Object.keys(meta) : [],
          hasImageAttachments: !!meta?.imageAttachments,
          imageAttachmentsCount: Array.isArray(meta?.imageAttachments) ? (meta.imageAttachments as unknown[]).length : 0
        })
      }
      // 检查会话是否已存在于当前列表。
      const state = store.getState().cowork
      const sessionExists = state.sessions.some((s) => s.id === sessionId)

      if (!sessionExists) {
        // 会话可能来自 IM 或其他来源，主动刷新列表。
        await this.loadSessions()
      }

      // 用户新一轮输入意味着会话重新进入运行态。
      // 这对未经过渲染层 continueSession 的 IM 触发场景尤为重要。
      if (message.type === 'user') {
        store.dispatch(updateSessionStatus({ sessionId, status: 'running' }))
      }

      // 不对任意消息强制回写 running。
      // 错误/完成之后仍可能收到迟到的流分片。
      store.dispatch(addMessage({ sessionId, message }))
    })
    this.streamListenerCleanups.push(messageCleanup)

    // 监听消息增量更新（流式内容拼接）。
    const messageUpdateCleanup = cowork.onStreamMessageUpdate(({ sessionId, messageId, content }) => {
      store.dispatch(updateMessageContent({ sessionId, messageId, content }))
    })
    this.streamListenerCleanups.push(messageUpdateCleanup)

    // 监听工具权限请求。
    const permissionCleanup = cowork.onStreamPermission(({ sessionId, request }) => {
      store.dispatch(
        enqueuePendingPermission({
          sessionId,
          toolName: request.toolName,
          toolInput: request.toolInput,
          requestId: request.requestId,
          toolUseId: request.toolUseId ?? null
        })
      )
    })
    this.streamListenerCleanups.push(permissionCleanup)

    // 监听会话完成事件。
    const completeCleanup = cowork.onStreamComplete(({ sessionId }) => {
      store.dispatch(updateSessionStatus({ sessionId, status: 'completed' }))
    })
    this.streamListenerCleanups.push(completeCleanup)

    // 监听会话错误事件。
    const errorCleanup = cowork.onStreamError(({ sessionId }) => {
      store.dispatch(updateSessionStatus({ sessionId, status: 'error' }))
    })
    this.streamListenerCleanups.push(errorCleanup)
  }

  // 执行并清空已注册的流式监听器清理函数。
  private cleanupListeners(): void {
    this.streamListenerCleanups.forEach((cleanup) => cleanup())
    this.streamListenerCleanups = []
  }

  // 从主进程加载会话摘要列表并写入状态。
  async loadSessions(): Promise<void> {
    const result = await window.electron?.cowork?.listSessions()
    if (result?.success && result.sessions) {
      store.dispatch(setSessions(result.sessions))
    }
  }

  // 从主进程加载协作配置并写入状态。
  async loadConfig(): Promise<void> {
    const result = await window.electron?.cowork?.getConfig()
    if (result?.success && result.config) {
      store.dispatch(setConfig(result.config))
    }
  }

  // 启动新会话并同步流式状态。
  async startSession(options: CoworkStartOptions): Promise<CoworkSession | null> {
    const cowork = window.electron?.cowork
    if (!cowork) {
      console.error('Cowork API not available')
      return null
    }

    store.dispatch(setStreaming(true))

    const result = await cowork.startSession(options)
    if (result.success && result.session) {
      store.dispatch(addSession(result.session))
      if (result.session.status !== 'running') {
        store.dispatch(setStreaming(false))
      }
      return result.session
    }

    store.dispatch(setStreaming(false))
    console.error('Failed to start session:', result.error)
    return null
  }

  // 向现有会话继续发送消息并切换为运行态。
  async continueSession(options: CoworkContinueOptions): Promise<boolean> {
    const cowork = window.electron?.cowork
    if (!cowork) {
      console.error('Cowork API not available')
      return false
    }

    store.dispatch(setStreaming(true))
    store.dispatch(updateSessionStatus({ sessionId: options.sessionId, status: 'running' }))

    const result = await cowork.continueSession({
      sessionId: options.sessionId,
      prompt: options.prompt,
      systemPrompt: options.systemPrompt,
      activeSkillIds: options.activeSkillIds,
      imageAttachments: options.imageAttachments
    })
    if (!result.success) {
      store.dispatch(setStreaming(false))
      store.dispatch(updateSessionStatus({ sessionId: options.sessionId, status: 'error' }))
      console.error('Failed to continue session:', result.error)
      return false
    }

    return true
  }

  // 停止指定会话并更新本地状态为 idle。
  async stopSession(sessionId: string): Promise<boolean> {
    const cowork = window.electron?.cowork
    if (!cowork) return false

    const result = await cowork.stopSession(sessionId)
    if (result.success) {
      store.dispatch(setStreaming(false))
      store.dispatch(updateSessionStatus({ sessionId, status: 'idle' }))
      return true
    }

    console.error('Failed to stop session:', result.error)
    return false
  }

  // 删除单个会话并同步本地会话列表。
  async deleteSession(sessionId: string): Promise<boolean> {
    const cowork = window.electron?.cowork
    if (!cowork) return false

    const result = await cowork.deleteSession(sessionId)
    if (result.success) {
      store.dispatch(deleteSessionAction(sessionId))
      return true
    }

    console.error('Failed to delete session:', result.error)
    return false
  }

  // 批量删除会话并同步本地会话列表。
  async deleteSessions(sessionIds: string[]): Promise<boolean> {
    const cowork = window.electron?.cowork
    if (!cowork) return false

    const result = await cowork.deleteSessions(sessionIds)
    if (result.success) {
      store.dispatch(deleteSessionsAction(sessionIds))
      return true
    }

    console.error('Failed to batch delete sessions:', result.error)
    return false
  }

  // 设置会话置顶状态。
  async setSessionPinned(sessionId: string, pinned: boolean): Promise<boolean> {
    const cowork = window.electron?.cowork
    if (!cowork?.setSessionPinned) return false

    const result = await cowork.setSessionPinned({ sessionId, pinned })
    if (result.success) {
      store.dispatch(updateSessionPinned({ sessionId, pinned }))
      return true
    }

    console.error('Failed to update session pin:', result.error)
    return false
  }

  // 重命名会话标题，并在前端状态中同步更新。
  async renameSession(sessionId: string, title: string): Promise<boolean> {
    const cowork = window.electron?.cowork
    if (!cowork?.renameSession) return false

    const normalizedTitle = title.trim()
    if (!normalizedTitle) return false

    const result = await cowork.renameSession({ sessionId, title: normalizedTitle })
    if (result.success) {
      store.dispatch(updateSessionTitle({ sessionId, title: normalizedTitle }))
      return true
    }

    console.error('Failed to rename session:', result.error)
    return false
  }

  // 导出会话结果区域为图片文件（完整流程）。
  async exportSessionResultImage(options: {
    rect: { x: number; y: number; width: number; height: number }
    defaultFileName?: string
  }): Promise<{ success: boolean; canceled?: boolean; path?: string; error?: string }> {
    const cowork = window.electron?.cowork
    if (!cowork?.exportResultImage) {
      return { success: false, error: 'Cowork export API not available' }
    }

    try {
      const result = await cowork.exportResultImage(options)
      return result ?? { success: false, error: 'Failed to export session image' }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export session image'
      }
    }
  }

  // 截取会话结果区域图片分片（用于分块导出或拼接）。
  async captureSessionImageChunk(options: {
    rect: { x: number; y: number; width: number; height: number }
  }): Promise<{ success: boolean; width?: number; height?: number; pngBase64?: string; error?: string }> {
    const cowork = window.electron?.cowork
    if (!cowork?.captureImageChunk) {
      return { success: false, error: 'Cowork capture API not available' }
    }

    try {
      const result = await cowork.captureImageChunk(options)
      return result ?? { success: false, error: 'Failed to capture session image chunk' }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to capture session image chunk'
      }
    }
  }

  // 保存已有 Base64 PNG 内容到本地文件。
  async saveSessionResultImage(options: {
    pngBase64: string
    defaultFileName?: string
  }): Promise<{ success: boolean; canceled?: boolean; path?: string; error?: string }> {
    const cowork = window.electron?.cowork
    if (!cowork?.saveResultImage) {
      return { success: false, error: 'Cowork save image API not available' }
    }

    try {
      const result = await cowork.saveResultImage(options)
      return result ?? { success: false, error: 'Failed to save session image' }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save session image'
      }
    }
  }

  // 加载指定会话详情并设置为当前会话。
  async loadSession(sessionId: string): Promise<CoworkSession | null> {
    const cowork = window.electron?.cowork
    if (!cowork) return null

    const result = await cowork.getSession(sessionId)
    if (result.success && result.session) {
      store.dispatch(setCurrentSession(result.session))
      store.dispatch(setStreaming(result.session.status === 'running'))
      return result.session
    }

    console.error('Failed to load session:', result.error)
    return null
  }

  // 回应工具权限请求，并在成功后将请求出队。
  async respondToPermission(requestId: string, result: CoworkPermissionResult): Promise<boolean> {
    const cowork = window.electron?.cowork
    if (!cowork) return false

    const response = await cowork.respondToPermission({ requestId, result })
    if (response.success) {
      store.dispatch(dequeuePendingPermission({ requestId }))
      return true
    }

    console.error('Failed to respond to permission:', response.error)
    return false
  }

  // 更新协作配置并合并到当前本地配置。
  async updateConfig(config: CoworkConfigUpdate): Promise<boolean> {
    const cowork = window.electron?.cowork
    if (!cowork) return false

    const result = await cowork.setConfig(config)
    if (result.success) {
      const currentConfig = store.getState().cowork.config
      store.dispatch(setConfig({ ...currentConfig, ...config }))
      return true
    }

    console.error('Failed to update config:', result.error)
    return false
  }

  // 获取当前 API 配置。
  async getApiConfig(): Promise<CoworkApiConfig | null> {
    if (!window.electron?.getApiConfig) {
      return null
    }
    return window.electron.getApiConfig()
  }

  // 检查 API 配置可用性，可选探测模型连通性。
  async checkApiConfig(options?: {
    probeModel?: boolean
  }): Promise<{ hasConfig: boolean; config: CoworkApiConfig | null; error?: string } | null> {
    if (!window.electron?.checkApiConfig) {
      return null
    }
    return window.electron.checkApiConfig(options)
  }

  // 保存 API 配置。
  async saveApiConfig(config: CoworkApiConfig): Promise<{ success: boolean; error?: string } | null> {
    if (!window.electron?.saveApiConfig) {
      return null
    }
    return window.electron.saveApiConfig(config)
  }

  // 获取沙箱安装状态。
  async getSandboxStatus(): Promise<CoworkSandboxStatus | null> {
    if (!window.electron?.cowork?.getSandboxStatus) {
      return null
    }
    return window.electron.cowork.getSandboxStatus()
  }

  // 安装或修复沙箱环境。
  async installSandbox(): Promise<{ success: boolean; status: CoworkSandboxStatus; error?: string } | null> {
    if (!window.electron?.cowork?.installSandbox) {
      return null
    }
    return window.electron.cowork.installSandbox()
  }

  // 查询用户记忆条目列表。
  async listMemoryEntries(input: {
    query?: string
    status?: 'created' | 'stale' | 'deleted' | 'all'
    includeDeleted?: boolean
    limit?: number
    offset?: number
  }): Promise<CoworkUserMemoryEntry[]> {
    const api = window.electron?.cowork?.listMemoryEntries
    if (!api) return []
    const result = await api(input)
    if (!result?.success || !result.entries) return []
    return result.entries
  }

  // 创建一条用户记忆。
  async createMemoryEntry(input: { text: string; confidence?: number; isExplicit?: boolean }): Promise<CoworkUserMemoryEntry | null> {
    const api = window.electron?.cowork?.createMemoryEntry
    if (!api) return null
    const result = await api(input)
    if (!result?.success || !result.entry) return null
    return result.entry
  }

  // 更新一条用户记忆。
  async updateMemoryEntry(input: {
    id: string
    text?: string
    confidence?: number
    status?: 'created' | 'stale' | 'deleted'
    isExplicit?: boolean
  }): Promise<CoworkUserMemoryEntry | null> {
    const api = window.electron?.cowork?.updateMemoryEntry
    if (!api) return null
    const result = await api(input)
    if (!result?.success || !result.entry) return null
    return result.entry
  }

  // 删除一条用户记忆。
  async deleteMemoryEntry(input: { id: string }): Promise<boolean> {
    const api = window.electron?.cowork?.deleteMemoryEntry
    if (!api) return false
    const result = await api(input)
    return Boolean(result?.success)
  }

  // 获取用户记忆统计信息。
  async getMemoryStats(): Promise<CoworkMemoryStats | null> {
    const api = window.electron?.cowork?.getMemoryStats
    if (!api) return null
    const result = await api()
    if (!result?.success || !result.stats) return null
    return result.stats
  }

  // 订阅沙箱下载进度事件。
  onSandboxDownloadProgress(callback: (progress: CoworkSandboxProgress) => void): () => void {
    if (!window.electron?.cowork?.onSandboxDownloadProgress) {
      return () => {}
    }
    return window.electron.cowork.onSandboxDownloadProgress(callback)
  }

  // 基于提示词生成会话标题。
  async generateSessionTitle(prompt: string | null): Promise<string | null> {
    if (!window.electron?.generateSessionTitle) {
      return null
    }
    return window.electron.generateSessionTitle(prompt)
  }

  // 获取最近使用过的工作目录列表。
  async getRecentCwds(limit?: number): Promise<string[]> {
    if (!window.electron?.getRecentCwds) {
      return []
    }
    return window.electron.getRecentCwds(limit)
  }

  // 清空当前会话上下文。
  clearSession(): void {
    store.dispatch(clearCurrentSession())
  }

  // 销毁服务并释放监听器资源。
  destroy(): void {
    this.cleanupListeners()
    this.initialized = false
  }
}

export const coworkService = new CoworkService()
