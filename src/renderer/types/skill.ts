/**
 * Skill 类型定义
 * 用于技能管理与技能市场数据结构
 */

/** 本地技能信息 */
export interface Skill {
  /** 技能唯一标识 */
  id: string
  /** 技能名称 */
  name: string
  /** 技能描述 */
  description: string
  enabled: boolean // 是否在弹层中可见
  isOfficial: boolean // 是否展示“官方”标记
  isBuiltIn: boolean // 是否内置（内置技能不可删除）
  updatedAt: number // 更新时间戳
  prompt: string // 系统提示词内容
  skillPath: string // SKILL.md 绝对路径
  version?: string // 从 SKILL.md frontmatter 解析的版本
}

/** 多语言文本结构 */
export type LocalizedText = { en: string; zh: string }

/** 技能市场标签 */
export interface MarketTag {
  /** 标签 ID */
  id: string
  /** 英文标签 */
  en: string
  /** 中文标签 */
  zh: string
}

/** 本地技能元信息 */
export interface LocalSkillInfo {
  /** 技能 ID */
  id: string
  /** 技能名称 */
  name: string
  /** 技能描述（支持多语言） */
  description: string | LocalizedText
  /** 版本号 */
  version: string
}

/** 技能市场条目 */
export interface MarketplaceSkill {
  /** 技能 ID */
  id: string
  /** 技能名称 */
  name: string
  /** 技能描述（支持多语言） */
  description: string | LocalizedText
  /** 标签列表 */
  tags?: string[]
  url: string // 下载地址（.zip）
  /** 版本号 */
  version: string
  /** 来源信息 */
  source: {
    from: string // 来源平台（如 Github）
    url: string // 源仓库地址
    author?: string // 作者名称
  }
}
