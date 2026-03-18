/**
 * Scheduled Task 类型定义
 * 用于定时任务配置、运行状态与事件结构
 */

// 调度类型
export interface ScheduleAt {
  /** 调度类型：指定时刻 */
  type: 'at'
  /** 执行时间（ISO 8601） */
  datetime: string
}

export interface ScheduleInterval {
  /** 调度类型：固定间隔 */
  type: 'interval'
  /** 间隔毫秒数 */
  intervalMs: number
  /** 间隔单位 */
  unit: 'minutes' | 'hours' | 'days'
  /** 间隔数值 */
  value: number
}

export interface ScheduleCron {
  /** 调度类型：CRON */
  type: 'cron'
  /** 5 段 CRON 表达式 */
  expression: string
}

/** 调度配置联合类型 */
export type Schedule = ScheduleAt | ScheduleInterval | ScheduleCron

// 任务状态
export type TaskLastStatus = 'success' | 'error' | 'running' | null

export interface TaskState {
  /** 下次执行时间戳（毫秒） */
  nextRunAtMs: number | null
  /** 上次执行时间戳（毫秒） */
  lastRunAtMs: number | null
  /** 上次执行状态 */
  lastStatus: TaskLastStatus
  /** 上次错误信息 */
  lastError: string | null
  /** 上次执行耗时（毫秒） */
  lastDurationMs: number | null
  /** 运行中开始时间戳（毫秒） */
  runningAtMs: number | null
  /** 连续失败次数 */
  consecutiveErrors: number
}

// IM 通知平台类型
export type NotifyPlatform = 'dingtalk' | 'feishu' | 'qq' | 'telegram' | 'discord' | 'nim' | 'xiaomifeng' | 'wecom'

// 定时任务
export interface ScheduledTask {
  /** 任务 ID */
  id: string
  /** 任务名称 */
  name: string
  /** 任务描述 */
  description: string
  /** 是否启用 */
  enabled: boolean
  /** 调度配置 */
  schedule: Schedule
  /** 执行提示词 */
  prompt: string
  /** 工作目录 */
  workingDirectory: string
  /** 系统提示词 */
  systemPrompt: string
  /** 执行模式 */
  executionMode: 'auto' | 'local' | 'sandbox'
  /** 过期日期（ISO 8601，精确到天），null 表示不过期 */
  expiresAt: string | null
  /** 任务完成后通知的 IM 平台 */
  notifyPlatforms: NotifyPlatform[]
  /** 运行态信息 */
  state: TaskState
  /** 创建时间（ISO 字符串） */
  createdAt: string
  /** 更新时间（ISO 字符串） */
  updatedAt: string
}

// 运行记录
export interface ScheduledTaskRun {
  /** 运行记录 ID */
  id: string
  /** 所属任务 ID */
  taskId: string
  /** 关联会话 ID */
  sessionId: string | null
  /** 运行状态 */
  status: 'running' | 'success' | 'error'
  /** 开始时间（ISO 字符串） */
  startedAt: string
  /** 结束时间（ISO 字符串） */
  finishedAt: string | null
  /** 运行耗时（毫秒） */
  durationMs: number | null
  /** 错误信息 */
  error: string | null
  /** 触发来源 */
  trigger: 'scheduled' | 'manual'
}

// 带任务名称的运行记录（用于全局历史列表）
export interface ScheduledTaskRunWithName extends ScheduledTaskRun {
  /** 任务名称 */
  taskName: string
}

// 表单输入
export interface ScheduledTaskInput {
  /** 任务名称 */
  name: string
  /** 任务描述 */
  description: string
  /** 调度配置 */
  schedule: Schedule
  /** 执行提示词 */
  prompt: string
  /** 工作目录 */
  workingDirectory: string
  /** 系统提示词 */
  systemPrompt: string
  /** 执行模式 */
  executionMode: 'auto' | 'local' | 'sandbox'
  /** 过期日期（ISO 8601，精确到天），null 表示不过期 */
  expiresAt: string | null
  /** 任务完成后通知的 IM 平台 */
  notifyPlatforms: NotifyPlatform[]
  /** 是否启用 */
  enabled: boolean
}

// IPC 事件
export interface ScheduledTaskStatusEvent {
  /** 任务 ID */
  taskId: string
  /** 最新任务状态 */
  state: TaskState
}

export interface ScheduledTaskRunEvent {
  /** 运行记录 */
  run: ScheduledTaskRun
}

// UI 视图模式
export type ScheduledTaskViewMode = 'list' | 'create' | 'edit' | 'detail'
