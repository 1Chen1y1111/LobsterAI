/**
 * MCP 类型定义
 * 用于 MCP 服务配置、表单和市场数据结构
 */

/** 传输方式类型 */
export type McpTransportType = 'stdio' | 'sse' | 'http'

/** MCP 服务配置 */
export interface McpServerConfig {
  /** 服务唯一标识 */
  id: string
  /** 服务名称 */
  name: string
  /** 服务描述 */
  description: string
  /** 是否启用 */
  enabled: boolean
  /** 传输方式 */
  transportType: McpTransportType
  command?: string // stdio 模式命令
  args?: string[] // stdio 模式参数
  env?: Record<string, string> // stdio 模式环境变量
  url?: string // sse/http 模式地址
  headers?: Record<string, string> // sse/http 模式请求头
  isBuiltIn: boolean // 是否来自内置注册表
  githubUrl?: string // GitHub 仓库地址
  registryId?: string // 对应注册表条目 ID
  /** 创建时间戳 */
  createdAt: number
  /** 更新时间戳 */
  updatedAt: number
}

/** MCP 服务表单数据 */
export interface McpServerFormData {
  /** 服务名称 */
  name: string
  /** 服务描述 */
  description: string
  /** 传输方式 */
  transportType: McpTransportType
  command?: string
  args?: string[]
  env?: Record<string, string>
  url?: string
  headers?: Record<string, string>
  isBuiltIn?: boolean
  githubUrl?: string
  registryId?: string
}

/** 内置 MCP 注册表条目（前端定义） */
export interface McpRegistryEntry {
  id: string // 唯一标识，例如 filesystem
  name: string // 显示名称
  descriptionKey: string // 描述的 i18n key
  description_zh?: string // 中文描述（远端数据）
  description_en?: string // 英文描述（远端数据）
  category: McpCategory // 分类标签
  categoryKey: string // 分类的 i18n key
  transportType: McpTransportType
  command: string // 默认命令，例如 npx
  defaultArgs: string[] // 默认参数
  requiredEnvKeys?: string[] // 必填环境变量键
  optionalEnvKeys?: string[] // 可选环境变量键
  argPlaceholders?: string[] // 参数占位提示
}

/** 远程市场 MCP 服务条目 */
export interface McpMarketplaceServer {
  /** 服务唯一标识 */
  id: string
  /** 服务名称 */
  name: string
  /** 中文描述 */
  description_zh?: string
  /** 英文描述 */
  description_en?: string
  /** 分类 */
  category: string
  /** 传输方式（字符串形式，来自远端） */
  transportType: string
  /** 启动命令 */
  command: string
  /** 默认参数 */
  defaultArgs: string[]
  /** 必填环境变量键 */
  requiredEnvKeys?: string[]
  /** 可选环境变量键 */
  optionalEnvKeys?: string[]
}

/** 远程市场动态分类信息 */
export interface McpMarketplaceCategoryInfo {
  /** 分类 ID */
  id: string
  /** 中文分类名 */
  name_zh: string
  /** 英文分类名 */
  name_en: string
}

/** MCP 分类 */
export type McpCategory = 'search' | 'browser' | 'developer' | 'productivity' | 'design' | 'data-api'
