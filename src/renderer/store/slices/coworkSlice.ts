import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type {
  CoworkSession,
  CoworkSessionSummary,
  CoworkMessage,
  CoworkConfig,
  CoworkPermissionRequest,
  CoworkSessionStatus
} from '@/types/cowork'

interface CoworkState {
  sessions: CoworkSessionSummary[]
  currentSessionId: string | null
  currentSession: CoworkSession | null
  draftPrompt: string
  unreadSessionIds: string[]
  isCoworkActive: boolean
  isStreaming: boolean
  pendingPermissions: CoworkPermissionRequest[]
  config: CoworkConfig
}

const initialState: CoworkState = {
  sessions: [],
  currentSessionId: null,
  currentSession: null,
  draftPrompt: '',
  unreadSessionIds: [],
  isCoworkActive: false,
  isStreaming: false,
  pendingPermissions: [],
  config: {
    workingDirectory: '',
    systemPrompt: '',
    executionMode: 'local',
    memoryEnabled: true,
    memoryImplicitUpdateEnabled: true,
    memoryLlmJudgeEnabled: false,
    memoryGuardLevel: 'strict',
    memoryUserMemoriesMaxItems: 12
  }
}

// 将指定会话标记为已读（从未读列表中移除）。
const markSessionRead = (state: CoworkState, sessionId: string | null) => {
  if (!sessionId) return
  state.unreadSessionIds = state.unreadSessionIds.filter((id) => id !== sessionId)
}

// 将指定会话标记为未读（当前会话与已存在项不重复添加）。
const markSessionUnread = (state: CoworkState, sessionId: string) => {
  if (state.currentSessionId === sessionId) return
  if (state.unreadSessionIds.includes(sessionId)) return
  state.unreadSessionIds.push(sessionId)
}

const coworkSlice = createSlice({
  name: 'cowork',
  initialState,
  reducers: {
    // 设置协作功能是否处于激活状态。
    setCoworkActive(state, action: PayloadAction<boolean>) {
      state.isCoworkActive = action.payload
    },

    // 批量设置会话列表，并清理已失效的未读会话标记。
    setSessions(state, action: PayloadAction<CoworkSessionSummary[]>) {
      state.sessions = action.payload
      const validSessionIds = new Set(action.payload.map((session) => session.id))
      state.unreadSessionIds = state.unreadSessionIds.filter((id) => {
        return validSessionIds.has(id) && id !== state.currentSessionId
      })
    },

    // 设置当前会话 ID，并将其标记为已读。
    setCurrentSessionId(state, action: PayloadAction<string | null>) {
      state.currentSessionId = action.payload
      markSessionRead(state, action.payload)
    },

    // 设置当前会话详情，并同步更新会话摘要列表。
    setCurrentSession(state, action: PayloadAction<CoworkSession | null>) {
      state.currentSession = action.payload
      if (action.payload) {
        state.currentSessionId = action.payload.id
        if (!action.payload.id.startsWith('temp-')) {
          const { id, title, status, pinned, createdAt, updatedAt } = action.payload
          const summary: CoworkSessionSummary = {
            id,
            title,
            status,
            pinned: pinned ?? false,
            createdAt,
            updatedAt
          }
          const sessionIndex = state.sessions.findIndex((session) => session.id === id)
          if (sessionIndex !== -1) {
            state.sessions[sessionIndex] = {
              ...state.sessions[sessionIndex],
              ...summary
            }
          } else {
            state.sessions.unshift(summary)
          }
        }
        markSessionRead(state, action.payload.id)
      }
    },

    // 更新输入草稿内容。
    setDraftPrompt(state, action: PayloadAction<string>) {
      state.draftPrompt = action.payload
    },

    // 新增会话并切换为当前会话。
    addSession(state, action: PayloadAction<CoworkSession>) {
      const summary: CoworkSessionSummary = {
        id: action.payload.id,
        title: action.payload.title,
        status: action.payload.status,
        pinned: action.payload.pinned ?? false,
        createdAt: action.payload.createdAt,
        updatedAt: action.payload.updatedAt
      }
      state.sessions.unshift(summary)
      state.currentSession = action.payload
      state.currentSessionId = action.payload.id
      markSessionRead(state, action.payload.id)
    },

    // 更新会话状态，并在必要时同步流式状态。
    updateSessionStatus(state, action: PayloadAction<{ sessionId: string; status: CoworkSessionStatus }>) {
      const { sessionId, status } = action.payload

      // 更新会话列表中的状态与更新时间。
      const sessionIndex = state.sessions.findIndex((s) => s.id === sessionId)
      if (sessionIndex !== -1) {
        state.sessions[sessionIndex].status = status
        state.sessions[sessionIndex].updatedAt = Date.now()
      }

      // 如果是当前会话，同时更新详情区状态。
      if (state.currentSession?.id === sessionId) {
        state.currentSession.status = status
        state.currentSession.updatedAt = Date.now()
        // 流式状态仅跟随当前打开的会话。
        state.isStreaming = status === 'running'
      }
    },

    // 删除单个会话，并在命中当前会话时清空详情。
    deleteSession(state, action: PayloadAction<string>) {
      const sessionId = action.payload
      state.sessions = state.sessions.filter((s) => s.id !== sessionId)
      state.unreadSessionIds = state.unreadSessionIds.filter((id) => id !== sessionId)

      if (state.currentSessionId === sessionId) {
        state.currentSessionId = null
        state.currentSession = null
      }
    },

    // 批量删除会话，并处理当前会话与未读标记。
    deleteSessions(state, action: PayloadAction<string[]>) {
      const sessionIds = new Set(action.payload)
      state.sessions = state.sessions.filter((s) => !sessionIds.has(s.id))
      state.unreadSessionIds = state.unreadSessionIds.filter((id) => !sessionIds.has(id))

      if (state.currentSessionId && sessionIds.has(state.currentSessionId)) {
        state.currentSessionId = null
        state.currentSession = null
      }
    },

    // 向指定会话追加消息，并刷新会话更新时间与未读状态。
    addMessage(state, action: PayloadAction<{ sessionId: string; message: CoworkMessage }>) {
      const { sessionId, message } = action.payload

      if (state.currentSession?.id === sessionId) {
        const exists = state.currentSession.messages.some((item) => item.id === message.id)
        if (!exists) {
          state.currentSession.messages.push(message)
          state.currentSession.updatedAt = message.timestamp
        }
      }

      // 更新会话列表中的最后活跃时间。
      const sessionIndex = state.sessions.findIndex((s) => s.id === sessionId)
      if (sessionIndex !== -1) {
        state.sessions[sessionIndex].updatedAt = message.timestamp
      }

      markSessionUnread(state, sessionId)
    },

    // 更新指定消息内容（用于流式增量内容覆盖）。
    updateMessageContent(state, action: PayloadAction<{ sessionId: string; messageId: string; content: string }>) {
      const { sessionId, messageId, content } = action.payload

      if (state.currentSession?.id === sessionId) {
        const messageIndex = state.currentSession.messages.findIndex((m) => m.id === messageId)
        if (messageIndex !== -1) {
          state.currentSession.messages[messageIndex].content = content
        }
      }

      markSessionUnread(state, sessionId)
    },

    // 显式设置全局流式输出状态。
    setStreaming(state, action: PayloadAction<boolean>) {
      state.isStreaming = action.payload
    },

    // 更新会话置顶状态（列表与当前详情保持一致）。
    updateSessionPinned(state, action: PayloadAction<{ sessionId: string; pinned: boolean }>) {
      const { sessionId, pinned } = action.payload
      const sessionIndex = state.sessions.findIndex((s) => s.id === sessionId)
      if (sessionIndex !== -1) {
        state.sessions[sessionIndex].pinned = pinned
      }
      if (state.currentSession?.id === sessionId) {
        state.currentSession.pinned = pinned
      }
    },

    // 更新会话标题，并同步更新时间。
    updateSessionTitle(state, action: PayloadAction<{ sessionId: string; title: string }>) {
      const { sessionId, title } = action.payload
      const sessionIndex = state.sessions.findIndex((s) => s.id === sessionId)
      if (sessionIndex !== -1) {
        state.sessions[sessionIndex].title = title
        state.sessions[sessionIndex].updatedAt = Date.now()
      }
      if (state.currentSession?.id === sessionId) {
        state.currentSession.title = title
        state.currentSession.updatedAt = Date.now()
      }
    },

    // 入队权限请求，避免同一 requestId 重复入队。
    enqueuePendingPermission(state, action: PayloadAction<CoworkPermissionRequest>) {
      const alreadyQueued = state.pendingPermissions.some((permission) => permission.requestId === action.payload.requestId)
      if (alreadyQueued) return
      state.pendingPermissions.push(action.payload)
    },

    // 出队权限请求；未指定 requestId 时默认移除队首。
    dequeuePendingPermission(state, action: PayloadAction<{ requestId?: string } | undefined>) {
      const requestId = action.payload?.requestId
      if (!requestId) {
        state.pendingPermissions.shift()
        return
      }
      state.pendingPermissions = state.pendingPermissions.filter((permission) => permission.requestId !== requestId)
    },

    // 清空所有待处理权限请求。
    clearPendingPermissions(state) {
      state.pendingPermissions = []
    },

    // 整体替换协作配置。
    setConfig(state, action: PayloadAction<CoworkConfig>) {
      state.config = action.payload
    },

    // 局部更新协作配置。
    updateConfig(state, action: PayloadAction<Partial<CoworkConfig>>) {
      state.config = { ...state.config, ...action.payload }
    },

    // 清空当前会话上下文并关闭流式状态。
    clearCurrentSession(state) {
      state.currentSessionId = null
      state.currentSession = null
      state.isStreaming = false
    }
  }
})

export const {
  setCoworkActive,
  setSessions,
  setCurrentSessionId,
  setCurrentSession,
  setDraftPrompt,
  addSession,
  updateSessionStatus,
  deleteSession,
  deleteSessions,
  addMessage,
  updateMessageContent,
  setStreaming,
  updateSessionPinned,
  updateSessionTitle,
  enqueuePendingPermission,
  dequeuePendingPermission,
  clearPendingPermissions,
  setConfig,
  updateConfig,
  clearCurrentSession
} = coworkSlice.actions

export const coworkReducer = coworkSlice.reducer
