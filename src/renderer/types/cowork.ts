/**
 * Cowork 类型定义
 * 用于协作会话、消息、配置、权限与流式事件结构
 */

/** 支持视觉模型的图片附件 */
export interface CoworkImageAttachment {
  /** 文件名 */
  name: string
  /** MIME 类型 */
  mimeType: string
  /** Base64 编码内容 */
  base64Data: string
}

/** 会话状态 */
export type CoworkSessionStatus = 'idle' | 'running' | 'completed' | 'error'

/** 消息类型 */
export type CoworkMessageType = 'user' | 'assistant' | 'tool_use' | 'tool_result' | 'system'

/** 执行模式 */
export type CoworkExecutionMode = 'auto' | 'local' | 'sandbox'

/** 消息元数据 */
export interface CoworkMessageMetadata {
  /** 工具名称 */
  toolName?: string
  /** 工具输入 */
  toolInput?: Record<string, unknown>
  /** 工具输出 */
  toolResult?: string
  /** 工具调用 ID */
  toolUseId?: string | null
  /** 错误信息 */
  error?: string
  /** 是否错误消息 */
  isError?: boolean
  /** 是否流式中 */
  isStreaming?: boolean
  /** 是否最终消息 */
  isFinal?: boolean
  /** 是否思考内容 */
  isThinking?: boolean
  skillIds?: string[] // 该消息使用的技能 ID 列表
  /** 其他扩展字段 */
  [key: string]: unknown
}

/** 会话消息 */
export interface CoworkMessage {
  /** 消息 ID */
  id: string
  /** 消息类型 */
  type: CoworkMessageType
  /** 消息内容 */
  content: string
  /** 消息时间戳 */
  timestamp: number
  /** 消息元数据 */
  metadata?: CoworkMessageMetadata
}

/** 会话详情 */
export interface CoworkSession {
  /** 会话 ID */
  id: string
  /** 会话标题 */
  title: string
  /** Claude 会话 ID */
  claudeSessionId: string | null
  /** 会话状态 */
  status: CoworkSessionStatus
  /** 是否置顶 */
  pinned: boolean
  /** 工作目录 */
  cwd: string
  /** 系统提示词 */
  systemPrompt: string
  /** 执行模式 */
  executionMode: CoworkExecutionMode
  /** 当前启用技能 ID 列表 */
  activeSkillIds: string[]
  /** 消息列表 */
  messages: CoworkMessage[]
  /** 创建时间戳 */
  createdAt: number
  /** 更新时间戳 */
  updatedAt: number
}

/** 协作配置 */
export interface CoworkConfig {
  /** 工作目录 */
  workingDirectory: string
  /** 系统提示词 */
  systemPrompt: string
  /** 执行模式 */
  executionMode: CoworkExecutionMode
  /** 是否启用记忆 */
  memoryEnabled: boolean
  /** 是否启用隐式记忆更新 */
  memoryImplicitUpdateEnabled: boolean
  /** 是否启用 LLM 记忆判定 */
  memoryLlmJudgeEnabled: boolean
  /** 记忆守卫等级 */
  memoryGuardLevel: 'strict' | 'standard' | 'relaxed'
  /** 用户记忆最大条数 */
  memoryUserMemoriesMaxItems: number
}

/** 协作配置的可更新子集 */
export type CoworkConfigUpdate = Partial<
  Pick<
    CoworkConfig,
    | 'workingDirectory'
    | 'executionMode'
    | 'memoryEnabled'
    | 'memoryImplicitUpdateEnabled'
    | 'memoryLlmJudgeEnabled'
    | 'memoryGuardLevel'
    | 'memoryUserMemoriesMaxItems'
  >
>

/** API 配置 */
export interface CoworkApiConfig {
  /** API Key */
  apiKey: string
  /** API 基础地址 */
  baseURL: string
  /** 模型名称 */
  model: string
  /** API 类型 */
  apiType?: 'anthropic' | 'openai'
}

/** 沙箱状态 */
export type CoworkSandboxStatus = {
  /** 当前平台是否支持沙箱 */
  supported: boolean
  /** 运行时是否就绪 */
  runtimeReady: boolean
  /** 镜像是否就绪 */
  imageReady: boolean
  /** 是否下载中 */
  downloading: boolean
  /** 下载进度 */
  progress?: CoworkSandboxProgress
  /** 错误信息 */
  error?: string | null
}

/** 沙箱下载进度 */
export type CoworkSandboxProgress = {
  /** 当前阶段 */
  stage: 'runtime' | 'image'
  /** 已接收字节 */
  received: number
  /** 总字节（可选） */
  total?: number
  /** 百分比（可选） */
  percent?: number
  /** 下载地址（可选） */
  url?: string
}

/** 用户记忆状态 */
export type CoworkUserMemoryStatus = 'created' | 'stale' | 'deleted'

/** 用户记忆条目 */
export interface CoworkUserMemoryEntry {
  /** 记忆 ID */
  id: string
  /** 记忆文本 */
  text: string
  /** 置信度 */
  confidence: number
  /** 是否显式记忆 */
  isExplicit: boolean
  /** 记忆状态 */
  status: CoworkUserMemoryStatus
  /** 创建时间戳 */
  createdAt: number
  /** 更新时间戳 */
  updatedAt: number
  /** 最近使用时间戳 */
  lastUsedAt: number | null
}

/** 用户记忆统计 */
export interface CoworkMemoryStats {
  /** 总数 */
  total: number
  /** created 数 */
  created: number
  /** stale 数 */
  stale: number
  /** deleted 数 */
  deleted: number
  /** 显式记忆数 */
  explicit: number
  /** 隐式记忆数 */
  implicit: number
}

/** 待处理工具权限请求 */
export interface CoworkPermissionRequest {
  /** 会话 ID */
  sessionId: string
  /** 工具名称 */
  toolName: string
  /** 工具输入 */
  toolInput: Record<string, unknown>
  /** 请求 ID */
  requestId: string
  /** 工具调用 ID */
  toolUseId?: string | null
}

/** 权限处理结果 */
export type CoworkPermissionResult =
  | {
      behavior: 'allow'
      updatedInput?: Record<string, unknown>
      updatedPermissions?: Record<string, unknown>[]
      toolUseID?: string
    }
  | {
      behavior: 'deny'
      message: string
      interrupt?: boolean
      toolUseID?: string
    }

/** 权限请求响应 */
export interface CoworkPermissionResponse {
  /** 请求 ID */
  requestId: string
  /** 处理结果 */
  result: CoworkPermissionResult
}

/** 会话摘要（列表展示，不含完整消息） */
export interface CoworkSessionSummary {
  /** 会话 ID */
  id: string
  /** 会话标题 */
  title: string
  /** 会话状态 */
  status: CoworkSessionStatus
  /** 是否置顶 */
  pinned: boolean
  /** 创建时间戳 */
  createdAt: number
  /** 更新时间戳 */
  updatedAt: number
}

/** 启动会话参数 */
export interface CoworkStartOptions {
  /** 用户输入 */
  prompt: string
  /** 工作目录 */
  cwd?: string
  /** 系统提示词 */
  systemPrompt?: string
  /** 会话标题 */
  title?: string
  /** 启用技能 ID 列表 */
  activeSkillIds?: string[]
  /** 图片附件 */
  imageAttachments?: CoworkImageAttachment[]
}

/** 续聊会话参数 */
export interface CoworkContinueOptions {
  /** 会话 ID */
  sessionId: string
  /** 用户输入 */
  prompt: string
  /** 系统提示词 */
  systemPrompt?: string
  /** 启用技能 ID 列表 */
  activeSkillIds?: string[]
  /** 图片附件 */
  imageAttachments?: CoworkImageAttachment[]
}

/** IPC：会话详情结果 */
export interface CoworkSessionResult {
  /** 是否成功 */
  success: boolean
  /** 会话详情 */
  session?: CoworkSession
  /** 错误信息 */
  error?: string
}

/** IPC：会话列表结果 */
export interface CoworkSessionListResult {
  /** 是否成功 */
  success: boolean
  /** 会话摘要列表 */
  sessions?: CoworkSessionSummary[]
  /** 错误信息 */
  error?: string
}

/** IPC：配置读取结果 */
export interface CoworkConfigResult {
  /** 是否成功 */
  success: boolean
  /** 配置对象 */
  config?: CoworkConfig
  /** 错误信息 */
  error?: string
}

/** IPC 流式事件类型 */
export type CoworkStreamEventType = 'message' | 'tool_use' | 'tool_result' | 'permission_request' | 'complete' | 'error'

/** IPC 流式事件 */
export interface CoworkStreamEvent {
  /** 事件类型 */
  type: CoworkStreamEventType
  /** 会话 ID */
  sessionId: string
  /** 事件数据 */
  data: {
    /** 消息实体 */
    message?: CoworkMessage
    /** 权限请求 */
    permission?: CoworkPermissionRequest
    /** 错误信息 */
    error?: string
    /** Claude 会话 ID */
    claudeSessionId?: string
  }
}
