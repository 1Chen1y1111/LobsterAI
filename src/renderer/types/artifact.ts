/**
 * Artifact 类型定义
 * 用于消息中可预览产物（HTML/SVG/Mermaid/React/代码）的结构描述
 */

/** 产物类型 */
export type ArtifactType = 'html' | 'svg' | 'mermaid' | 'react' | 'code'

/** 解析后的产物实体 */
export interface Artifact {
  /** 产物唯一标识 */
  id: string
  /** 所属消息 ID */
  messageId: string
  /** 所属会话 ID */
  conversationId: string
  /** 产物类型 */
  type: ArtifactType
  /** 产物标题 */
  title: string
  /** 产物主体内容 */
  content: string
  /** 代码语言（仅代码类产物可选） */
  language?: string
  /** 创建时间戳 */
  createdAt: number
}

/** 从消息文本中识别出的产物标记信息 */
export interface ArtifactMarker {
  /** 产物类型 */
  type: ArtifactType
  /** 产物标题 */
  title: string
  /** 产物内容 */
  content: string
  /** 代码语言（可选） */
  language?: string
  /** 原始完整匹配文本 */
  fullMatch: string
}
