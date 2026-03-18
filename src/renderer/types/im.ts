/**
 * IM 网关类型定义（渲染进程）
 * 与 src/main/im/types.ts 保持结构镜像，供 React 组件使用
 */

// ==================== 钉钉类型 ====================

export interface DingTalkConfig {
  /** 是否启用 */
  enabled: boolean
  /** 应用 Client ID */
  clientId: string
  /** 应用 Client Secret */
  clientSecret: string
  /** 机器人编码 */
  robotCode?: string
  /** 企业 ID */
  corpId?: string
  /** 应用 Agent ID */
  agentId?: string
  /** 发送消息类型 */
  messageType: 'markdown' | 'card'
  /** 卡片模板 ID */
  cardTemplateId?: string
  /** 是否开启调试 */
  debug?: boolean
}

export interface DingTalkGatewayStatus {
  /** 是否已连接 */
  connected: boolean
  /** 启动时间戳 */
  startedAt: number | null
  /** 最近错误 */
  lastError: string | null
  /** 最近入站时间戳 */
  lastInboundAt: number | null
  /** 最近出站时间戳 */
  lastOutboundAt: number | null
}

// ==================== 飞书类型 ====================

export interface FeishuConfig {
  /** 是否启用 */
  enabled: boolean
  /** 应用 App ID */
  appId: string
  /** 应用 App Secret */
  appSecret: string
  /** 飞书/Lark 域名类型 */
  domain: 'feishu' | 'lark' | string
  /** 加密密钥 */
  encryptKey?: string
  /** 事件校验 Token */
  verificationToken?: string
  /** 渲染模式 */
  renderMode: 'text' | 'card'
  /** 是否开启调试 */
  debug?: boolean
}

export interface FeishuGatewayStatus {
  /** 是否已连接 */
  connected: boolean
  /** 启动时间 */
  startedAt: string | null
  /** 机器人 open_id */
  botOpenId: string | null
  /** 最近错误 */
  error: string | null
  /** 最近入站时间戳 */
  lastInboundAt: number | null
  /** 最近出站时间戳 */
  lastOutboundAt: number | null
}

// ==================== Telegram 类型 ====================

export interface TelegramConfig {
  /** 是否启用 */
  enabled: boolean
  /** 机器人 Token */
  botToken: string
  /** 允许的用户 ID 列表 */
  allowedUserIds?: string[]
  /** 是否开启调试 */
  debug?: boolean
}

export interface TelegramGatewayStatus {
  /** 是否已连接 */
  connected: boolean
  /** 启动时间戳 */
  startedAt: number | null
  /** 最近错误 */
  lastError: string | null
  /** 机器人用户名 */
  botUsername: string | null
  /** 最近入站时间戳 */
  lastInboundAt: number | null
  /** 最近出站时间戳 */
  lastOutboundAt: number | null
}

// ==================== Discord 类型 ====================

export interface DiscordConfig {
  /** 是否启用 */
  enabled: boolean
  /** 机器人 Token */
  botToken: string
  /** 是否开启调试 */
  debug?: boolean
}

export interface DiscordGatewayStatus {
  /** 是否已连接 */
  connected: boolean
  /** 是否正在启动 */
  starting: boolean
  /** 启动时间戳 */
  startedAt: number | null
  /** 最近错误 */
  lastError: string | null
  /** 机器人用户名 */
  botUsername: string | null
  /** 最近入站时间戳 */
  lastInboundAt: number | null
  /** 最近出站时间戳 */
  lastOutboundAt: number | null
}

// ==================== NIM（网易云信）类型 ====================

/** NIM 群消息策略 */
export type NimTeamPolicy = 'open' | 'allowlist' | 'disabled'

export interface NimConfig {
  /** 是否启用 */
  enabled: boolean
  /** 应用 AppKey */
  appKey: string
  /** 机器人账号 */
  account: string
  /** 机器人 Token */
  token: string
  /** 账号白名单（逗号分隔） */
  accountWhitelist: string
  /** 是否开启调试 */
  debug?: boolean
  /** 群消息策略，默认 disabled */
  teamPolicy?: NimTeamPolicy
  /** 群 ID 白名单（逗号分隔） */
  teamAllowlist?: string
  /** 是否启用 QChat 圈组 */
  qchatEnabled?: boolean
  /** QChat 服务器 ID（逗号分隔，空则自动发现） */
  qchatServerIds?: string
}

export interface NimGatewayStatus {
  /** 是否已连接 */
  connected: boolean
  /** 启动时间戳 */
  startedAt: number | null
  /** 最近错误 */
  lastError: string | null
  /** 机器人账号 */
  botAccount: string | null
  /** 最近入站时间戳 */
  lastInboundAt: number | null
  /** 最近出站时间戳 */
  lastOutboundAt: number | null
}

// ==================== 小蜜蜂类型 ====================

export interface XiaomifengConfig {
  /** 是否启用 */
  enabled: boolean
  /** 小蜜蜂平台的 NIM 账号 ID */
  clientId: string
  /** 用于 token 中继的密钥 */
  secret: string
  /** 是否开启调试 */
  debug?: boolean
}

export interface XiaomifengGatewayStatus {
  /** 是否已连接 */
  connected: boolean
  /** 启动时间戳 */
  startedAt: number | null
  /** 最近错误 */
  lastError: string | null
  /** 机器人账号 */
  botAccount: string | null
  /** 最近入站时间戳 */
  lastInboundAt: number | null
  /** 最近出站时间戳 */
  lastOutboundAt: number | null
}

// ==================== QQ 类型 ====================

export interface QQConfig {
  /** 是否启用 */
  enabled: boolean
  /** 应用 App ID */
  appId: string
  /** 应用 App Secret */
  appSecret: string
  /** 是否开启调试 */
  debug?: boolean
}

export interface QQGatewayStatus {
  /** 是否已连接 */
  connected: boolean
  /** 启动时间戳 */
  startedAt: number | null
  /** 最近错误 */
  lastError: string | null
  /** 最近入站时间戳 */
  lastInboundAt: number | null
  /** 最近出站时间戳 */
  lastOutboundAt: number | null
}

// ==================== 企业微信类型 ====================

export interface WecomConfig {
  /** 是否启用 */
  enabled: boolean
  /** 机器人 ID */
  botId: string
  /** 机器人密钥 */
  secret: string
  /** 是否开启调试 */
  debug?: boolean
}

export interface WecomGatewayStatus {
  /** 是否已连接 */
  connected: boolean
  /** 启动时间戳 */
  startedAt: number | null
  /** 最近错误 */
  lastError: string | null
  /** 机器人 ID */
  botId: string | null
  /** 最近入站时间戳 */
  lastInboundAt: number | null
  /** 最近出站时间戳 */
  lastOutboundAt: number | null
}

// ==================== 通用 IM 类型 ====================

/** IM 平台类型 */
export type IMPlatform = 'dingtalk' | 'feishu' | 'qq' | 'telegram' | 'discord' | 'nim' | 'xiaomifeng' | 'wecom'

export interface IMGatewayConfig {
  /** 钉钉配置 */
  dingtalk: DingTalkConfig
  /** 飞书配置 */
  feishu: FeishuConfig
  /** QQ 配置 */
  qq: QQConfig
  /** Telegram 配置 */
  telegram: TelegramConfig
  /** Discord 配置 */
  discord: DiscordConfig
  /** NIM 配置 */
  nim: NimConfig
  /** 小蜜蜂配置 */
  xiaomifeng: XiaomifengConfig
  /** 企业微信配置 */
  wecom: WecomConfig
  /** 全局 IM 设置 */
  settings: IMSettings
}

export interface IMSettings {
  /** 系统提示词 */
  systemPrompt?: string
  /** 是否启用技能 */
  skillsEnabled: boolean
}

export interface IMGatewayStatus {
  /** 钉钉状态 */
  dingtalk: DingTalkGatewayStatus
  /** 飞书状态 */
  feishu: FeishuGatewayStatus
  /** QQ 状态 */
  qq: QQGatewayStatus
  /** Telegram 状态 */
  telegram: TelegramGatewayStatus
  /** Discord 状态 */
  discord: DiscordGatewayStatus
  /** NIM 状态 */
  nim: NimGatewayStatus
  /** 小蜜蜂状态 */
  xiaomifeng: XiaomifengGatewayStatus
  /** 企业微信状态 */
  wecom: WecomGatewayStatus
}

// ==================== 媒体附件类型 ====================

/** 媒体附件类型 */
export type IMMediaType = 'image' | 'video' | 'audio' | 'voice' | 'document' | 'sticker'

export interface IMMediaAttachment {
  /** 媒体类型 */
  type: IMMediaType
  /** 下载后的本地路径 */
  localPath: string
  /** MIME 类型 */
  mimeType: string
  /** 原始文件名 */
  fileName?: string
  /** 文件大小（字节） */
  fileSize?: number
  /** 图片/视频宽度 */
  width?: number
  /** 图片/视频高度 */
  height?: number
  /** 音视频时长（秒） */
  duration?: number
}

export interface IMMessage {
  /** 平台类型 */
  platform: IMPlatform
  /** 消息 ID */
  messageId: string
  /** 会话 ID */
  conversationId: string
  /** 发送者 ID */
  senderId: string
  /** 发送者名称 */
  senderName?: string
  /** 文本内容 */
  content: string
  /** 聊天类型 */
  chatType: 'direct' | 'group'
  /** 时间戳 */
  timestamp: number
  /** 附件列表 */
  attachments?: IMMediaAttachment[]
  /** 媒体组 ID（用于合并多张图片） */
  mediaGroupId?: string
}

// ==================== IPC 结果类型 ====================

export interface IMConfigResult {
  /** 是否成功 */
  success: boolean
  /** 配置结果 */
  config?: IMGatewayConfig
  /** 错误信息 */
  error?: string
}

export interface IMStatusResult {
  /** 是否成功 */
  success: boolean
  /** 状态结果 */
  status?: IMGatewayStatus
  /** 错误信息 */
  error?: string
}

export interface IMGatewayResult {
  /** 是否成功 */
  success: boolean
  /** 错误信息 */
  error?: string
}

// ==================== 连通性测试类型 ====================

export type IMConnectivityVerdict = 'pass' | 'warn' | 'fail'

export type IMConnectivityCheckLevel = 'pass' | 'info' | 'warn' | 'fail'

export type IMConnectivityCheckCode =
  | 'missing_credentials'
  | 'auth_check'
  | 'gateway_running'
  | 'inbound_activity'
  | 'outbound_activity'
  | 'platform_last_error'
  | 'feishu_group_requires_mention'
  | 'feishu_event_subscription_required'
  | 'discord_group_requires_mention'
  | 'telegram_privacy_mode_hint'
  | 'dingtalk_bot_membership_hint'
  | 'nim_p2p_only_hint'
  | 'qq_guild_mention_hint'

export interface IMConnectivityCheck {
  /** 检查项编码 */
  code: IMConnectivityCheckCode
  /** 检查级别 */
  level: IMConnectivityCheckLevel
  /** 检查说明 */
  message: string
  /** 修复建议 */
  suggestion?: string
}

export interface IMConnectivityTestResult {
  /** 平台 */
  platform: IMPlatform
  /** 测试时间戳 */
  testedAt: number
  /** 总结结论 */
  verdict: IMConnectivityVerdict
  /** 检查明细 */
  checks: IMConnectivityCheck[]
}

export interface IMConnectivityTestResponse {
  /** 是否成功 */
  success: boolean
  /** 测试结果 */
  result?: IMConnectivityTestResult
  /** 错误信息 */
  error?: string
}

// ==================== 默认配置 ====================

/** 钉钉默认配置 */
export const DEFAULT_DINGTALK_CONFIG: DingTalkConfig = {
  enabled: false,
  clientId: '',
  clientSecret: '',
  messageType: 'markdown',
  debug: true
}

/** 飞书默认配置 */
export const DEFAULT_FEISHU_CONFIG: FeishuConfig = {
  enabled: false,
  appId: '',
  appSecret: '',
  domain: 'feishu',
  renderMode: 'card',
  debug: true
}

/** Telegram 默认配置 */
export const DEFAULT_TELEGRAM_CONFIG: TelegramConfig = {
  enabled: false,
  botToken: '',
  allowedUserIds: [],
  debug: true
}

/** Discord 默认配置 */
export const DEFAULT_DISCORD_CONFIG: DiscordConfig = {
  enabled: false,
  botToken: '',
  debug: true
}

/** NIM 默认配置 */
export const DEFAULT_NIM_CONFIG: NimConfig = {
  enabled: false,
  appKey: '',
  account: '',
  token: '',
  accountWhitelist: '',
  debug: true
}

/** 小蜜蜂默认配置 */
export const DEFAULT_XIAOMIFENG_CONFIG: XiaomifengConfig = {
  enabled: false,
  clientId: '',
  secret: '',
  debug: true
}

/** QQ 默认配置 */
export const DEFAULT_QQ_CONFIG: QQConfig = {
  enabled: false,
  appId: '',
  appSecret: '',
  debug: true
}

/** 企业微信默认配置 */
export const DEFAULT_WECOM_CONFIG: WecomConfig = {
  enabled: false,
  botId: '',
  secret: '',
  debug: true
}

/** IM 全局设置默认值 */
export const DEFAULT_IM_SETTINGS: IMSettings = {
  systemPrompt: '',
  skillsEnabled: true
}

/** IM 网关聚合默认配置 */
export const DEFAULT_IM_CONFIG: IMGatewayConfig = {
  dingtalk: DEFAULT_DINGTALK_CONFIG,
  feishu: DEFAULT_FEISHU_CONFIG,
  qq: DEFAULT_QQ_CONFIG,
  telegram: DEFAULT_TELEGRAM_CONFIG,
  discord: DEFAULT_DISCORD_CONFIG,
  nim: DEFAULT_NIM_CONFIG,
  xiaomifeng: DEFAULT_XIAOMIFENG_CONFIG,
  wecom: DEFAULT_WECOM_CONFIG,
  settings: DEFAULT_IM_SETTINGS
}

/** IM 网关聚合默认状态 */
export const DEFAULT_IM_STATUS: IMGatewayStatus = {
  dingtalk: {
    connected: false,
    startedAt: null,
    lastError: null,
    lastInboundAt: null,
    lastOutboundAt: null
  },
  feishu: {
    connected: false,
    startedAt: null,
    botOpenId: null,
    error: null,
    lastInboundAt: null,
    lastOutboundAt: null
  },
  telegram: {
    connected: false,
    startedAt: null,
    lastError: null,
    botUsername: null,
    lastInboundAt: null,
    lastOutboundAt: null
  },
  discord: {
    connected: false,
    starting: false,
    startedAt: null,
    lastError: null,
    botUsername: null,
    lastInboundAt: null,
    lastOutboundAt: null
  },
  nim: {
    connected: false,
    startedAt: null,
    lastError: null,
    botAccount: null,
    lastInboundAt: null,
    lastOutboundAt: null
  },
  xiaomifeng: {
    connected: false,
    startedAt: null,
    lastError: null,
    botAccount: null,
    lastInboundAt: null,
    lastOutboundAt: null
  },
  qq: {
    connected: false,
    startedAt: null,
    lastError: null,
    lastInboundAt: null,
    lastOutboundAt: null
  },
  wecom: {
    connected: false,
    startedAt: null,
    lastError: null,
    botId: null,
    lastInboundAt: null,
    lastOutboundAt: null
  }
}
