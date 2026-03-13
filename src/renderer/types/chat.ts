/**
 * Chat 类型定义
 * 用于通用聊天消息与图片附件结构
 */

/** 图片附件 */
export interface ImageAttachment {
  /** 附件唯一标识 */
  id: string
  /** 文件名 */
  name: string
  /** MIME 类型 */
  type: string
  /** 文件大小（字节） */
  size: number
  /** Data URL 内容 */
  dataUrl: string
}

/** 发送给模型的消息结构 */
export interface ChatMessagePayload {
  /** 消息角色 */
  role: 'system' | 'user' | 'assistant'
  /** 文本内容 */
  content: string
  /** 图片附件列表 */
  images?: ImageAttachment[]
}

/** 用户输入消息结构 */
export interface ChatUserMessageInput {
  /** 文本内容 */
  content: string
  /** 图片附件列表 */
  images?: ImageAttachment[]
}
