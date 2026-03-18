import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../../store'
import { i18nService } from '../../services/i18n'
import type { CoworkMessage, CoworkMessageMetadata, CoworkImageAttachment } from '../../types/cowork'
import type { Skill } from '../../types/skill'
import CoworkPromptInput from './CoworkPromptInput'
import MarkdownContent from '../MarkdownContent'
import {
  CheckIcon,
  InformationCircleIcon,
  ShareIcon,
  ExclamationTriangleIcon,
  ChevronRightIcon,
  PhotoIcon
} from '@heroicons/react/24/outline'
import { FolderIcon } from '@heroicons/react/24/solid'
import { coworkService } from '../../services/cowork'
import SidebarToggleIcon from '../icons/SidebarToggleIcon'
import ComposeIcon from '../icons/ComposeIcon'
import PuzzleIcon from '../icons/PuzzleIcon'
import EllipsisHorizontalIcon from '../icons/EllipsisHorizontalIcon'
import PencilSquareIcon from '../icons/PencilSquareIcon'
import TrashIcon from '../icons/TrashIcon'
import WindowTitleBar from '../window/WindowTitleBar'
import { getCompactFolderName } from '../../utils/path'

interface CoworkSessionDetailProps {
  onManageSkills?: () => void
  onContinue: (prompt: string, skillPrompt?: string, imageAttachments?: CoworkImageAttachment[]) => void
  onStop: () => void
  onNavigateHome?: () => void
  isSidebarCollapsed?: boolean
  onToggleSidebar?: () => void
  onNewChat?: () => void
  updateBadge?: React.ReactNode
}

// 自动滚动判定阈值（像素）
const AUTO_SCROLL_THRESHOLD = 120
// 导航按钮无操作后的自动隐藏延迟（毫秒）
const NAV_HIDE_DELAY = 3000
// 程序化滚动期间锁定导航状态的时长（毫秒）
const NAV_SCROLL_LOCK_DURATION = 500
// 接近底部时将当前轮次吸附到最后一条的阈值（像素）
const NAV_BOTTOM_SNAP_THRESHOLD = 20
// Windows 文件名非法字符正则
const INVALID_FILE_NAME_PATTERN = /[<>:"/\\|?*\u0000-\u001F]/g

// 清洗导出文件名，避免非法字符并提供兜底名称
const sanitizeExportFileName = (value: string): string => {
  const sanitized = value.replace(INVALID_FILE_NAME_PATTERN, ' ').replace(/\s+/g, ' ').trim()
  return sanitized || 'cowork-session'
}

// 生成导出文件名使用的时间戳（yyyyMMdd-HHmmss）
const formatExportTimestamp = (value: Date): string => {
  const pad = (num: number): string => String(num).padStart(2, '0')
  return `${value.getFullYear()}${pad(value.getMonth() + 1)}${pad(value.getDate())}-${pad(value.getHours())}${pad(value.getMinutes())}${pad(value.getSeconds())}`
}

// 屏幕捕获矩形定义
type CaptureRect = { x: number; y: number; width: number; height: number }

// 单张导出画布的最大高度，避免浏览器 canvas 限制
const MAX_EXPORT_CANVAS_HEIGHT = 32760
// 导出分段上限，避免超长会话导致过多截图拼接
const MAX_EXPORT_SEGMENTS = 240

// 等待下一帧渲染完成
const waitForNextFrame = (): Promise<void> =>
  new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve())
  })

// 将 base64 PNG 解码为可绘制的图片对象
const loadImageFromBase64 = (pngBase64: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to decode captured image'))
    img.src = `data:image/png;base64,${pngBase64}`
  })

// 将 DOMRect 规整为整数像素的捕获矩形
const domRectToCaptureRect = (rect: DOMRect): CaptureRect => ({
  x: Math.max(0, Math.round(rect.x)),
  y: Math.max(0, Math.round(rect.y)),
  width: Math.max(0, Math.round(rect.width)),
  height: Math.max(0, Math.round(rect.height))
})

// 图钉图标组件（支持加斜杠表示取消置顶）
const PushPinIcon: React.FC<React.SVGProps<SVGSVGElement> & { slashed?: boolean }> = ({ slashed, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <g transform="rotate(45 12 12)">
      <path d="M9 3h6l-1 5 2 2v2H8v-2l2-2-1-5z" />
      <path d="M12 12v9" />
    </g>
    {slashed && <path d="M5 5L19 19" />}
  </svg>
)

// 将未知类型值安全转为字符串展示
const formatUnknown = (value: unknown): string => {
  if (typeof value === 'string') {
    return value
  }
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

// 尝试把字符串数组拼接为多行文本
const getStringArray = (value: unknown): string | null => {
  if (!Array.isArray(value)) return null
  const lines = value.filter((item) => typeof item === 'string') as string[]
  return lines.length > 0 ? lines.join('\n') : null
}

// Todo 项状态枚举
type TodoStatus = 'completed' | 'in_progress' | 'pending' | 'unknown'

// TodoWrite 工具输入解析后的展示结构
type ParsedTodoItem = {
  primaryText: string
  secondaryText: string | null
  status: TodoStatus
}

// 统一工具名格式，便于跨大小写/分隔符匹配
const normalizeToolName = (value: string): string => value.toLowerCase().replace(/[\s_]+/g, '')

// 判断是否为 TodoWrite 工具
const isTodoWriteToolName = (toolName: string | undefined): boolean => {
  if (!toolName) return false
  return normalizeToolName(toolName) === 'todowrite'
}

// 提取并裁剪非空字符串
const toTrimmedString = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value.trim() : null)

// 归一化 Todo 状态值
const normalizeTodoStatus = (value: unknown): TodoStatus => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase().replace(/-/g, '_') : ''

  if (normalized === 'completed') return 'completed'
  if (normalized === 'in_progress' || normalized === 'running') return 'in_progress'
  if (normalized === 'pending' || normalized === 'todo') return 'pending'
  return 'unknown'
}

// 解析 TodoWrite 的输入参数并转换为 UI 可展示结构
const parseTodoWriteItems = (input: unknown): ParsedTodoItem[] | null => {
  if (!input || typeof input !== 'object') return null
  const record = input as Record<string, unknown>
  if (!Array.isArray(record.todos)) return null

  const parsedItems = record.todos
    .map((rawTodo) => {
      if (!rawTodo || typeof rawTodo !== 'object') {
        return null
      }

      const todo = rawTodo as Record<string, unknown>
      const activeForm = toTrimmedString(todo.activeForm)
      const content = toTrimmedString(todo.content)
      const primaryText = activeForm ?? content ?? i18nService.t('coworkTodoUntitled')
      const secondaryText = content && content !== primaryText ? content : null

      return {
        primaryText,
        secondaryText,
        status: normalizeTodoStatus(todo.status)
      } satisfies ParsedTodoItem
    })
    .filter((item): item is ParsedTodoItem => item !== null)

  return parsedItems.length > 0 ? parsedItems : null
}

// 生成 TodoWrite 输入摘要文本
const getTodoWriteSummary = (items: ParsedTodoItem[]): string => {
  const completedCount = items.filter((item) => item.status === 'completed').length
  const inProgressCount = items.filter((item) => item.status === 'in_progress').length
  const pendingCount = items.length - completedCount - inProgressCount

  const summary = [
    `${items.length} ${i18nService.t('coworkTodoItems')}`,
    `${completedCount} ${i18nService.t('coworkTodoCompleted')}`,
    `${inProgressCount} ${i18nService.t('coworkTodoInProgress')}`,
    `${pendingCount} ${i18nService.t('coworkTodoPending')}`
  ]

  const activeItem = items.find((item) => item.status === 'in_progress')
  if (activeItem) {
    summary.push(activeItem.primaryText)
  }

  return summary.join(' · ')
}

// 按工具类型提取输入摘要，优先返回便于阅读的单行信息
const getToolInputSummary = (toolName: string | undefined, toolInput?: Record<string, unknown>): string | null => {
  if (!toolName || !toolInput) return null
  const input = toolInput as Record<string, unknown>
  if (isTodoWriteToolName(toolName)) {
    const items = parseTodoWriteItems(input)
    return items ? getTodoWriteSummary(items) : null
  }

  switch (toolName) {
    case 'Bash':
      return typeof input.command === 'string' ? input.command : getStringArray(input.commands)
    case 'Read':
    case 'Write':
    case 'Edit':
    case 'MultiEdit':
      return typeof input.file_path === 'string' ? input.file_path : null
    case 'Glob':
    case 'Grep':
      return typeof input.pattern === 'string' ? input.pattern : null
    case 'Task':
      return typeof input.description === 'string' ? input.description : null
    case 'WebFetch':
      return typeof input.url === 'string' ? input.url : null
    default:
      return null
  }
}

// 格式化工具输入，优先摘要，回退完整 JSON 字符串
const formatToolInput = (toolName: string | undefined, toolInput?: Record<string, unknown>): string | null => {
  if (!toolInput) return null
  const summary = getToolInputSummary(toolName, toolInput)
  if (summary && summary.trim()) {
    return summary
  }
  return formatUnknown(toolInput)
}

// 判断值是否为非空文本
const hasText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0

// 获取工具结果展示文本，依次回退 content/toolResult/error
const getToolResultDisplay = (message: CoworkMessage): string => {
  if (hasText(message.content)) {
    return message.content
  }
  if (hasText(message.metadata?.toolResult)) {
    return message.metadata?.toolResult ?? ''
  }
  if (hasText(message.metadata?.error)) {
    return message.metadata?.error ?? ''
  }
  return ''
}

// 安全 decodeURIComponent，失败时返回原始文本
const safeDecodeURIComponent = (value: string): string => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

// 去除 URL 中的 hash 和 query
const stripHashAndQuery = (value: string): string => value.split('#')[0].split('?')[0]

// 去掉 file:// 协议并处理 /C:/ 形式路径
const stripFileProtocol = (value: string): string => {
  let cleaned = value.replace(/^file:\/\//i, '')
  if (/^\/[A-Za-z]:/.test(cleaned)) {
    cleaned = cleaned.slice(1)
  }
  return cleaned
}

// 判断是否包含 URI 协议头
const hasScheme = (value: string): boolean => /^[a-z][a-z0-9+.-]*:/i.test(value)

// 判断是否为绝对路径（Unix 或 Windows）
const isAbsolutePath = (value: string): boolean => value.startsWith('/') || /^[A-Za-z]:[\\/]/.test(value)

// 判断是否为本地相对路径
const isRelativePath = (value: string): boolean => !isAbsolutePath(value) && !hasScheme(value)
// 沙盒内映射到宿主工作区的标准根目录
const SANDBOX_WORKSPACE_GUEST_ROOT = '/workspace/project'
// 兼容历史版本的沙盒工作区根目录
const SANDBOX_WORKSPACE_LEGACY_ROOT = '/workspace'
// 沙盒内保留目录（不映射到宿主 cwd）
const SANDBOX_WORKSPACE_RESERVED_DIRS = new Set(['skills', 'ipc', 'tmp'])
// 文本中匹配沙盒路径的正则
const SANDBOX_WORKSPACE_PATH_PATTERN = /\/workspace(?:\/project)?(?:\/[^\s'"`)\]}>,;:!?]*)?/g

// 判断相对路径首段是否命中保留目录
const isReservedSandboxSegment = (relativePath: string): boolean => {
  const [firstSegment] = relativePath.split('/')
  return Boolean(firstSegment && SANDBOX_WORKSPACE_RESERVED_DIRS.has(firstSegment.toLowerCase()))
}

// 将沙盒 guest 路径映射到当前会话 cwd 的真实路径
const mapSandboxGuestPathToCwd = (filePath: string, cwd?: string): string | null => {
  if (!cwd) return null

  const normalizedPath = filePath.replace(/\\/g, '/')
  const normalizedCwd = cwd.replace(/[\\/]+$/, '')

  if (normalizedPath === SANDBOX_WORKSPACE_GUEST_ROOT || normalizedPath.startsWith(`${SANDBOX_WORKSPACE_GUEST_ROOT}/`)) {
    const relativePath = normalizedPath.slice(SANDBOX_WORKSPACE_GUEST_ROOT.length).replace(/^\/+/, '')
    if (relativePath && isReservedSandboxSegment(relativePath)) {
      return null
    }
    return relativePath ? `${normalizedCwd}/${relativePath}` : normalizedCwd
  }

  if (normalizedPath !== SANDBOX_WORKSPACE_LEGACY_ROOT && !normalizedPath.startsWith(`${SANDBOX_WORKSPACE_LEGACY_ROOT}/`)) {
    return null
  }

  const legacyRelativePath = normalizedPath.slice(SANDBOX_WORKSPACE_LEGACY_ROOT.length).replace(/^\/+/, '')
  if (!legacyRelativePath) {
    return normalizedCwd
  }

  if (isReservedSandboxSegment(legacyRelativePath)) {
    return null
  }

  return `${normalizedCwd}/${legacyRelativePath}`
}

// 将文本中所有可识别的沙盒路径批量映射到宿主路径
const mapSandboxGuestPathsInText = (value: string, cwd?: string): string => {
  if (!value || !cwd || !value.includes('/workspace')) {
    return value
  }

  return value.replace(SANDBOX_WORKSPACE_PATH_PATTERN, (candidatePath) => mapSandboxGuestPathToCwd(candidatePath, cwd) ?? candidatePath)
}

// 解析 file://root::relative 形式的根相对路径
const parseRootRelativePath = (value: string): string | null => {
  const trimmed = value.trim()
  if (!/^file:\/\//i.test(trimmed)) return null
  const separatorIndex = trimmed.indexOf('::')
  if (separatorIndex < 0) return null

  const rootPart = trimmed.slice(0, separatorIndex)
  const relativePart = trimmed.slice(separatorIndex + 2)
  if (!relativePart.trim()) return null

  const rootPath = safeDecodeURIComponent(stripFileProtocol(stripHashAndQuery(rootPart)))
  const relativePath = safeDecodeURIComponent(stripHashAndQuery(relativePart))
  if (!rootPath || !relativePath) return null

  const normalizedRoot = rootPath.replace(/[\\/]+$/, '')
  const normalizedRelative = relativePath.replace(/^[\\/]+/, '')
  if (!normalizedRelative) return null

  return `${normalizedRoot}/${normalizedRelative}`
}

// 规范化本地路径，识别其绝对/相对属性
const normalizeLocalPath = (value: string): { path: string; isRelative: boolean; isAbsolute: boolean } | null => {
  const trimmed = value.trim()
  if (!trimmed) return null

  const fileScheme = /^file:\/\//i.test(trimmed)
  const schemePresent = hasScheme(trimmed)
  if (schemePresent && !fileScheme && !isAbsolutePath(trimmed)) return null

  let raw = trimmed
  if (fileScheme) {
    raw = stripFileProtocol(raw)
  }
  raw = stripHashAndQuery(raw)
  const decoded = safeDecodeURIComponent(raw)
  const path = decoded || raw
  if (!path) return null

  const isAbsolute = isAbsolutePath(path)
  const isRelative = isRelativePath(path)
  return { path, isRelative, isAbsolute }
}

// 在已有 cwd 的情况下将相对路径转换为绝对路径
const toAbsolutePathFromCwd = (filePath: string, cwd: string): string => {
  if (isAbsolutePath(filePath)) {
    return filePath
  }
  return `${cwd.replace(/\/$/, '')}/${filePath.replace(/^\.\//, '')}`
}

// 工具调用分组项（tool_use + 可选 tool_result）
type ToolGroupItem = {
  type: 'tool_group'
  toolUse: CoworkMessage
  toolResult?: CoworkMessage | null
}

// 消息渲染项（普通消息或工具分组）
type DisplayItem = { type: 'message'; message: CoworkMessage } | ToolGroupItem

// 助手侧单轮渲染项
type AssistantTurnItem =
  | { type: 'assistant'; message: CoworkMessage }
  | { type: 'system'; message: CoworkMessage }
  | { type: 'tool_group'; group: ToolGroupItem }
  | { type: 'tool_result'; message: CoworkMessage }

// 按用户消息切分后的会话轮次结构
type ConversationTurn = {
  id: string
  userMessage: CoworkMessage | null
  assistantItems: AssistantTurnItem[]
}

// 将原始消息流转换为可渲染项，并尝试合并 tool_use/tool_result
const buildDisplayItems = (messages: CoworkMessage[]): DisplayItem[] => {
  const items: DisplayItem[] = []
  const groupsByToolUseId = new Map<string, ToolGroupItem>()
  let pendingAdjacentGroup: ToolGroupItem | null = null

  for (const message of messages) {
    if (message.type === 'tool_use') {
      const group: ToolGroupItem = { type: 'tool_group', toolUse: message }
      items.push(group)

      const toolUseId = message.metadata?.toolUseId
      if (typeof toolUseId === 'string' && toolUseId.trim()) {
        groupsByToolUseId.set(toolUseId, group)
      }
      pendingAdjacentGroup = group
      continue
    }

    if (message.type === 'tool_result') {
      let matched = false
      const toolUseId = message.metadata?.toolUseId
      if (typeof toolUseId === 'string' && groupsByToolUseId.has(toolUseId)) {
        const group = groupsByToolUseId.get(toolUseId)
        if (group) {
          group.toolResult = message
          matched = true
        }
      } else if (pendingAdjacentGroup && !pendingAdjacentGroup.toolResult) {
        pendingAdjacentGroup.toolResult = message
        matched = true
      }

      pendingAdjacentGroup = null
      if (!matched) {
        items.push({ type: 'message', message })
      }
      continue
    }

    pendingAdjacentGroup = null
    items.push({ type: 'message', message })
  }

  return items
}

// 将渲染项按用户输入划分为对话轮次
const buildConversationTurns = (items: DisplayItem[]): ConversationTurn[] => {
  const turns: ConversationTurn[] = []
  let currentTurn: ConversationTurn | null = null
  let orphanIndex = 0

  const ensureTurn = (): ConversationTurn => {
    if (currentTurn) return currentTurn
    const orphanTurn: ConversationTurn = {
      id: `orphan-${orphanIndex++}`,
      userMessage: null,
      assistantItems: []
    }
    turns.push(orphanTurn)
    currentTurn = orphanTurn
    return orphanTurn
  }

  for (const item of items) {
    if (item.type === 'message' && item.message.type === 'user') {
      currentTurn = {
        id: item.message.id,
        userMessage: item.message,
        assistantItems: []
      }
      turns.push(currentTurn)
      continue
    }

    const turn = ensureTurn()
    if (item.type === 'tool_group') {
      turn.assistantItems.push({ type: 'tool_group', group: item })
      continue
    }

    const message = item.message
    if (message.type === 'assistant') {
      turn.assistantItems.push({ type: 'assistant', message })
      continue
    }

    if (message.type === 'system') {
      turn.assistantItems.push({ type: 'system', message })
      continue
    }

    if (message.type === 'tool_result') {
      turn.assistantItems.push({ type: 'tool_result', message })
      continue
    }

    if (message.type === 'tool_use') {
      turn.assistantItems.push({
        type: 'tool_group',
        group: {
          type: 'tool_group',
          toolUse: message
        }
      })
    }
  }

  return turns
}

// 判断 assistant/system 消息是否可渲染
const isRenderableAssistantOrSystemMessage = (message: CoworkMessage): boolean => {
  if (hasText(message.content) || hasText(message.metadata?.error)) {
    return true
  }
  if (message.metadata?.isThinking) {
    return Boolean(message.metadata?.isStreaming)
  }
  return false
}

// 判断助手轮次项是否对用户可见
const isVisibleAssistantTurnItem = (item: AssistantTurnItem): boolean => {
  if (item.type === 'assistant' || item.type === 'system') {
    return isRenderableAssistantOrSystemMessage(item.message)
  }
  if (item.type === 'tool_result') {
    return hasText(getToolResultDisplay(item.message))
  }
  return true
}

// 过滤出可见的助手轮次项
const getVisibleAssistantItems = (assistantItems: AssistantTurnItem[]): AssistantTurnItem[] =>
  assistantItems.filter(isVisibleAssistantTurnItem)

// 判断该轮次是否存在可渲染的助手内容
const hasRenderableAssistantContent = (turn: ConversationTurn): boolean => getVisibleAssistantItems(turn.assistantItems).length > 0

// 计算工具结果文本的行数
const getToolResultLineCount = (result: string): number => {
  if (!result) return 0
  return result.split('\n').length
}

// TodoWrite 工具输入视图
const TodoWriteInputView: React.FC<{ items: ParsedTodoItem[] }> = ({ items }) => {
  // 根据状态决定复选框视觉样式
  const getStatusCheckboxClass = (status: TodoStatus): string => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 border-green-500 text-green-500'
      case 'in_progress':
        return 'bg-transparent border-blue-500'
      case 'pending':
      case 'unknown':
      default:
        return 'bg-transparent dark:border-claude-darkTextSecondary/60 border-claude-textSecondary/60'
    }
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={`todo-item-${index}`} className="flex items-start gap-2">
          <span
            className={`mt-0.5 h-4 w-4 rounded-[4px] border flex-shrink-0 inline-flex items-center justify-center ${getStatusCheckboxClass(item.status)}`}
          >
            {item.status === 'completed' && <CheckIcon className="h-3 w-3 stroke-[2.5]" />}
          </span>
          <div className="min-w-0 flex-1">
            <div
              className={`text-xs whitespace-pre-wrap break-words leading-5 ${
                item.status === 'completed'
                  ? 'dark:text-claude-darkTextSecondary/70 text-claude-textSecondary/80'
                  : 'dark:text-claude-darkText text-claude-text'
              }`}
            >
              {item.primaryText}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// 单个工具调用分组的折叠展示组件
const ToolCallGroup: React.FC<{
  group: ToolGroupItem
  isLastInSequence?: boolean
  mapDisplayText?: (value: string) => string
}> = ({ group, isLastInSequence = true, mapDisplayText }) => {
  const { toolUse, toolResult } = group
  const toolName = typeof toolUse.metadata?.toolName === 'string' ? toolUse.metadata.toolName : 'Tool'
  const toolInput = toolUse.metadata?.toolInput
  const isTodoWriteTool = isTodoWriteToolName(toolName)
  const todoItems = isTodoWriteTool ? parseTodoWriteItems(toolInput) : null
  const mapText = mapDisplayText ?? ((value: string) => value)
  const toolInputDisplayRaw = formatToolInput(toolName, toolInput)
  const toolInputDisplay = toolInputDisplayRaw ? mapText(toolInputDisplayRaw) : null
  const toolInputSummaryRaw = getToolInputSummary(toolName, toolInput) ?? toolInputDisplayRaw
  const toolInputSummary = toolInputSummaryRaw ? mapText(toolInputSummaryRaw) : null
  const toolResultDisplayRaw = toolResult ? getToolResultDisplay(toolResult) : ''
  const toolResultDisplay = mapText(toolResultDisplayRaw)
  const isToolError = Boolean(toolResult?.metadata?.isError || toolResult?.metadata?.error)
  const [isExpanded, setIsExpanded] = useState(false)
  const resultLineCount = getToolResultLineCount(toolResultDisplay)

  // Bash 工具使用终端风格展示
  const isBashTool = toolName === 'Bash'

  return (
    <div className="relative py-1">
      {/* Vertical connecting line to next tool group */}
      {!isLastInSequence && (
        <div className="absolute left-[3.5px] top-[14px] bottom-[-8px] w-px dark:bg-claude-darkTextSecondary/30 bg-claude-textSecondary/30" />
      )}
      <button onClick={() => setIsExpanded(!isExpanded)} className="w-full flex items-start gap-2 text-left group relative z-10">
        <span
          className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
            !toolResult ? 'bg-blue-500 animate-pulse' : isToolError ? 'bg-red-500' : 'bg-green-500'
          }`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium dark:text-claude-darkTextSecondary text-claude-textSecondary">{toolName}</span>
            {toolInputSummary && (
              <code className="text-xs dark:text-claude-darkTextSecondary/80 text-claude-textSecondary/80 font-mono truncate max-w-[400px]">
                {toolInputSummary}
              </code>
            )}
          </div>
          {toolResult && resultLineCount > 0 && !isTodoWriteTool && (
            <div className="text-xs dark:text-claude-darkTextSecondary/60 text-claude-textSecondary/60 mt-0.5">
              {resultLineCount} {resultLineCount === 1 ? 'line' : 'lines'} of output
            </div>
          )}
          {!toolResult && (
            <div className="text-xs dark:text-claude-darkTextSecondary/60 text-claude-textSecondary/60 mt-0.5">
              {i18nService.t('coworkToolRunning')}
            </div>
          )}
        </div>
      </button>
      {isExpanded && (
        <div className="ml-4 mt-2">
          {isBashTool ? (
            // Bash 命令终端样式
            <div className="rounded-lg overflow-hidden border dark:border-claude-darkBorder border-claude-border">
              {/* 终端头部 */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 dark:bg-claude-darkSurface bg-claude-surfaceInset">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span className="ml-2 text-[10px] dark:text-claude-darkTextSecondary text-claude-textSecondary font-medium">Terminal</span>
              </div>
              {/* 终端输出内容 */}
              <div className="dark:bg-claude-darkSurfaceInset bg-claude-surfaceInset px-3 py-3 max-h-72 overflow-y-auto font-mono text-xs">
                {toolInputDisplay && (
                  <div className="dark:text-claude-darkText text-claude-text">
                    <span className="text-claude-accent select-none">$ </span>
                    <span className="whitespace-pre-wrap break-words">{toolInputDisplay}</span>
                  </div>
                )}
                {toolResult && toolResultDisplay && (
                  <div
                    className={`mt-1.5 whitespace-pre-wrap break-words ${
                      isToolError ? 'text-red-400' : 'dark:text-claude-darkTextSecondary text-claude-textSecondary'
                    }`}
                  >
                    {toolResultDisplay}
                  </div>
                )}
                {!toolResult && (
                  <div className="dark:text-claude-darkTextSecondary/60 text-claude-textSecondary/60 mt-1.5 italic">
                    {i18nService.t('coworkToolRunning')}
                  </div>
                )}
              </div>
            </div>
          ) : isTodoWriteTool && todoItems ? (
            <TodoWriteInputView items={todoItems} />
          ) : (
            // 其他工具使用标准输入/输出布局
            <div className="space-y-2">
              {toolInputDisplay && (
                <div>
                  <div className="text-[10px] font-medium dark:text-claude-darkTextSecondary/70 text-claude-textSecondary/70 uppercase tracking-wider mb-1">
                    {i18nService.t('coworkToolInput')}
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <pre className="text-xs dark:text-claude-darkText text-claude-text whitespace-pre-wrap break-words font-mono">
                      {toolInputDisplay}
                    </pre>
                  </div>
                </div>
              )}
              {toolResult && (
                <div>
                  <div className="text-[10px] font-medium dark:text-claude-darkTextSecondary/70 text-claude-textSecondary/70 uppercase tracking-wider mb-1">
                    {i18nService.t('coworkToolResult')}
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    <pre
                      className={`text-xs whitespace-pre-wrap break-words font-mono ${
                        isToolError ? 'text-red-500' : 'dark:text-claude-darkText text-claude-text'
                      }`}
                    >
                      {toolResultDisplay}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// 通用复制按钮组件
const CopyButton: React.FC<{
  content: string
  visible: boolean
}> = ({ content, visible }) => {
  const [copied, setCopied] = useState(false)

  // 复制文本到系统剪贴板
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={`p-1.5 rounded-md dark:hover:bg-claude-darkSurfaceHover hover:bg-claude-surfaceHover transition-all duration-200 ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      title={i18nService.t('copyToClipboard')}
    >
      {copied ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4 h-4 text-green-500"
          aria-hidden="true"
        >
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4 h-4 text-[var(--icon-secondary)]"
          aria-hidden="true"
        >
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
        </svg>
      )}
    </button>
  )
}

// 用户消息卡片（含技能标签与图片附件）
const UserMessageItem: React.FC<{ message: CoworkMessage; skills: Skill[] }> = React.memo(({ message, skills }) => {
  const [isHovered, setIsHovered] = useState(false)
  const [expandedImage, setExpandedImage] = useState<string | null>(null)

  // 计算当前消息使用到的技能
  const messageSkillIds = (message.metadata as CoworkMessageMetadata)?.skillIds || []
  const messageSkills = messageSkillIds
    .map((id) => skills.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => s !== undefined)

  // 读取消息中的图片附件
  const imageAttachments = ((message.metadata as CoworkMessageMetadata)?.imageAttachments ?? []) as CoworkImageAttachment[]

  return (
    <div className="py-2 px-4" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <div className="max-w-3xl mx-auto">
        <div className="pl-4 sm:pl-8 md:pl-12">
          <div className="flex items-start gap-3 flex-row-reverse">
            <div className="w-full min-w-0 flex flex-col items-end">
              <div className="w-fit max-w-[42rem] rounded-2xl px-4 py-2.5 dark:bg-claude-darkSurface bg-claude-surface dark:text-claude-darkText text-claude-text shadow-subtle">
                {message.content?.trim() && (
                  <MarkdownContent content={message.content} className="max-w-none whitespace-pre-wrap break-words" />
                )}
                {imageAttachments.length > 0 && (
                  <div className={`flex flex-wrap gap-2 ${message.content?.trim() ? 'mt-2' : ''}`}>
                    {imageAttachments.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={`data:${img.mimeType};base64,${img.base64Data}`}
                          alt={img.name}
                          className="max-h-48 max-w-[16rem] rounded-lg object-contain cursor-pointer border dark:border-claude-darkBorder/50 border-claude-border/50 hover:border-claude-accent/50 transition-colors"
                          title={img.name}
                          onClick={() => setExpandedImage(`data:${img.mimeType};base64,${img.base64Data}`)}
                        />
                        <div className="absolute bottom-1 left-1 right-1 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/50 text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity truncate pointer-events-none">
                          <PhotoIcon className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{img.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end gap-1.5 mt-1">
                {messageSkills.map((skill) => (
                  <div
                    key={skill.id}
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-claude-accent/5 dark:bg-claude-accent/10"
                    title={skill.description}
                  >
                    <PuzzleIcon className="h-2.5 w-2.5 text-claude-accent/70" />
                    <span className="text-[10px] font-medium text-claude-accent/70 max-w-[60px] truncate">{skill.name}</span>
                  </div>
                ))}
                <CopyButton content={message.content} visible={isHovered} />
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Image lightbox overlay */}
      {/* 图片预览遮罩层 */}
      {expandedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 cursor-pointer"
          onClick={() => setExpandedImage(null)}
        >
          <img
            src={expandedImage}
            alt="Preview"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
})

// 助手消息卡片
const AssistantMessageItem: React.FC<{
  message: CoworkMessage
  resolveLocalFilePath?: (href: string, text: string) => string | null
  mapDisplayText?: (value: string) => string
  showCopyButton?: boolean
}> = ({ message, resolveLocalFilePath, mapDisplayText, showCopyButton = false }) => {
  const [isHovered, setIsHovered] = useState(false)
  const displayContent = mapDisplayText ? mapDisplayText(message.content) : message.content

  return (
    <div className="relative" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <div className="dark:text-claude-darkText text-claude-text">
        <MarkdownContent
          content={displayContent}
          className="prose dark:prose-invert max-w-none"
          resolveLocalFilePath={resolveLocalFilePath}
        />
      </div>
      {showCopyButton && (
        <div className="flex items-center gap-1.5 mt-1">
          <CopyButton content={displayContent} visible={isHovered} />
        </div>
      )}
    </div>
  )
}

// 流式输出时显示在消息区与输入框之间的活动状态条
const StreamingActivityBar: React.FC<{ messages: CoworkMessage[] }> = ({ messages }) => {
  // 反向查找最近一个尚未返回结果的工具调用
  const getStatusText = (): string => {
    const toolUseIds = new Set<string>()
    const toolResultIds = new Set<string>()
    for (const msg of messages) {
      const id = msg.metadata?.toolUseId
      if (typeof id === 'string') {
        if (msg.type === 'tool_result') toolResultIds.add(id)
        if (msg.type === 'tool_use') toolUseIds.add(id)
      }
    }
    // Walk backwards to find latest unresolved tool_use
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]
      if (msg.type === 'tool_use') {
        const id = msg.metadata?.toolUseId
        if (typeof id === 'string' && !toolResultIds.has(id)) {
          const toolName = typeof msg.metadata?.toolName === 'string' ? msg.metadata.toolName : null
          if (toolName) {
            return `${i18nService.t('coworkToolRunning')} ${toolName}...`
          }
        }
      }
    }
    return `${i18nService.t('coworkToolRunning')}`
  }

  return (
    <div className="shrink-0 animate-fade-in px-4">
      <div className="max-w-3xl mx-auto">
        <div className="streaming-bar" />
        <div className="py-1">
          <span className="text-xs dark:text-claude-darkTextSecondary text-claude-textSecondary">{getStatusText()}</span>
        </div>
      </div>
    </div>
  )
}

// 助手正在输出时的打字点动画
const TypingDots: React.FC = () => (
  <div className="flex items-center space-x-1.5 py-1">
    <div className="w-2 h-2 rounded-full bg-claude-accent animate-bounce" style={{ animationDelay: '0ms' }} />
    <div className="w-2 h-2 rounded-full bg-claude-accent animate-bounce" style={{ animationDelay: '150ms' }} />
    <div className="w-2 h-2 rounded-full bg-claude-accent animate-bounce" style={{ animationDelay: '300ms' }} />
  </div>
)

// 思考过程块（可展开/折叠）
const ThinkingBlock: React.FC<{
  message: CoworkMessage
  mapDisplayText?: (value: string) => string
}> = ({ message, mapDisplayText }) => {
  const isCurrentlyStreaming = Boolean(message.metadata?.isStreaming)
  const [isExpanded, setIsExpanded] = useState(isCurrentlyStreaming)
  const displayContent = mapDisplayText ? mapDisplayText(message.content) : message.content

  // 流式期间自动展开，结束后自动折叠
  useEffect(() => {
    if (isCurrentlyStreaming) {
      setIsExpanded(true)
    } else {
      setIsExpanded(false)
    }
  }, [isCurrentlyStreaming])

  return (
    <div className="rounded-lg border dark:border-claude-darkBorder/50 border-claude-border/50 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left dark:hover:bg-claude-darkSurfaceHover/50 hover:bg-claude-surfaceHover/50 transition-colors"
      >
        <ChevronRightIcon
          className={`h-3.5 w-3.5 dark:text-claude-darkTextSecondary text-claude-textSecondary flex-shrink-0 transition-transform duration-200 ${
            isExpanded ? 'rotate-90' : ''
          }`}
        />
        <span className="text-xs font-medium dark:text-claude-darkTextSecondary text-claude-textSecondary">
          {i18nService.t('reasoning')}
        </span>
        {isCurrentlyStreaming && <span className="w-1.5 h-1.5 rounded-full bg-claude-accent animate-pulse" />}
      </button>
      {isExpanded && (
        <div className="px-3 pb-3 max-h-64 overflow-y-auto">
          <div className="text-xs leading-relaxed dark:text-claude-darkTextSecondary/80 text-claude-textSecondary/80 whitespace-pre-wrap">
            {displayContent}
          </div>
        </div>
      )}
    </div>
  )
}

// 单轮助手输出区块（文本、工具调用、系统提示等）
const AssistantTurnBlock: React.FC<{
  turn: ConversationTurn
  resolveLocalFilePath?: (href: string, text: string) => string | null
  mapDisplayText?: (value: string) => string
  showTypingIndicator?: boolean
  showCopyButtons?: boolean
}> = ({ turn, resolveLocalFilePath, mapDisplayText, showTypingIndicator = false, showCopyButtons = true }) => {
  const visibleAssistantItems = getVisibleAssistantItems(turn.assistantItems)

  // 渲染系统消息
  const renderSystemMessage = (message: CoworkMessage) => {
    const rawContent = hasText(message.content)
      ? message.content
      : typeof message.metadata?.error === 'string'
        ? message.metadata.error
        : ''
    const content = mapDisplayText ? mapDisplayText(rawContent) : rawContent
    if (!content.trim()) return null

    return (
      <div className="rounded-lg border dark:border-claude-darkBorder/70 border-claude-border/70 dark:bg-claude-darkBg/40 bg-claude-bg/60 px-3 py-2">
        <div className="flex items-start gap-2">
          <InformationCircleIcon className="h-4 w-4 mt-0.5 dark:text-claude-darkTextSecondary text-claude-textSecondary flex-shrink-0" />
          <div className="text-xs whitespace-pre-wrap dark:text-claude-darkTextSecondary text-claude-textSecondary">{content}</div>
        </div>
      </div>
    )
  }

  // 渲染未配对的工具结果
  const renderOrphanToolResult = (message: CoworkMessage) => {
    const toolResultDisplayRaw = getToolResultDisplay(message)
    const toolResultDisplay = mapDisplayText ? mapDisplayText(toolResultDisplayRaw) : toolResultDisplayRaw
    const isToolError = Boolean(message.metadata?.isError || message.metadata?.error)
    const resultLineCount = getToolResultLineCount(toolResultDisplay)
    return (
      <div className="py-1">
        <div className="flex items-start gap-2">
          <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${isToolError ? 'bg-red-500' : 'bg-claude-darkTextSecondary/50'}`} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium dark:text-claude-darkTextSecondary text-claude-textSecondary">
              {i18nService.t('coworkToolResult')}
            </div>
            {resultLineCount > 0 && (
              <div className="text-xs dark:text-claude-darkTextSecondary/60 text-claude-textSecondary/60 mt-0.5">
                {resultLineCount} {resultLineCount === 1 ? 'line' : 'lines'} of output
              </div>
            )}
            <div className="mt-2 px-3 py-2 rounded-lg dark:bg-claude-darkSurface/50 bg-claude-surface/50 max-h-64 overflow-y-auto">
              <pre
                className={`text-xs whitespace-pre-wrap break-words font-mono ${
                  isToolError ? 'text-red-500' : 'dark:text-claude-darkText text-claude-text'
                }`}
              >
                {toolResultDisplay || i18nService.t('coworkToolRunning')}
              </pre>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-2">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0 px-4 py-3 space-y-3">
            {visibleAssistantItems.map((item, index) => {
              if (item.type === 'assistant') {
                if (item.message.metadata?.isThinking) {
                  return <ThinkingBlock key={item.message.id} message={item.message} mapDisplayText={mapDisplayText} />
                }
                // Check if there are any tool_group items after this assistant message
                const hasToolGroupAfter = visibleAssistantItems.slice(index + 1).some((laterItem) => laterItem.type === 'tool_group')

                return (
                  <AssistantMessageItem
                    key={item.message.id}
                    message={item.message}
                    resolveLocalFilePath={resolveLocalFilePath}
                    mapDisplayText={mapDisplayText}
                    showCopyButton={showCopyButtons && !hasToolGroupAfter}
                  />
                )
              }

              if (item.type === 'tool_group') {
                const nextItem = visibleAssistantItems[index + 1]
                const isLastInSequence = !nextItem || nextItem.type !== 'tool_group'
                return (
                  <ToolCallGroup
                    key={`tool-${item.group.toolUse.id}`}
                    group={item.group}
                    isLastInSequence={isLastInSequence}
                    mapDisplayText={mapDisplayText}
                  />
                )
              }

              if (item.type === 'system') {
                const systemMessage = renderSystemMessage(item.message)
                if (!systemMessage) {
                  return null
                }
                return <div key={item.message.id}>{systemMessage}</div>
              }

              return <div key={item.message.id}>{renderOrphanToolResult(item.message)}</div>
            })}
            {showTypingIndicator && <TypingDots />}
          </div>
        </div>
      </div>
    </div>
  )
}

const CoworkSessionDetail: React.FC<CoworkSessionDetailProps> = ({
  onManageSkills,
  onContinue,
  onStop,
  onNavigateHome,
  isSidebarCollapsed,
  onToggleSidebar,
  onNewChat,
  updateBadge
}) => {
  // 当前平台是否为 macOS（用于标题栏留白）
  const isMac = window.electron.platform === 'darwin'
  // 当前选中的会话
  const currentSession = useSelector((state: RootState) => state.cowork.currentSession)
  // 会话是否正在流式输出
  const isStreaming = useSelector((state: RootState) => state.cowork.isStreaming)
  // 技能列表（用于用户消息展示技能标签）
  const skills = useSelector((state: RootState) => state.skill.skills)
  // 根容器引用
  const detailRootRef = useRef<HTMLDivElement>(null)
  // 消息滚动容器引用
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  // 是否应自动滚到底部
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)

  // 轮次导航状态
  // currentTurnIndex 用于 UI 渲染；currentTurnIndexRef 用于回调中的最新值读取。
  // 两者需要保持同步，避免闭包导致索引滞后。
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0)
  const currentTurnIndexRef = useRef(0)
  const [showTurnNav, setShowTurnNav] = useState(false)
  const hideNavTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isNavigatingRef = useRef(false)
  const navigatingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const turnElsCacheRef = useRef<HTMLElement[]>([])
  const [isScrollable, setIsScrollable] = useState(false)

  // 菜单与操作状态
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const actionButtonRef = useRef<HTMLButtonElement>(null)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [isExportingImage, setIsExportingImage] = useState(false)

  // 重命名状态
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)
  const ignoreNextBlurRef = useRef(false)

  // 会话切换后重置重命名输入框内容
  useEffect(() => {
    if (!isRenaming && currentSession) {
      setRenameValue(currentSession.title)
      ignoreNextBlurRef.current = false
    }
  }, [isRenaming, currentSession?.title])

  useEffect(() => {
    setShouldAutoScroll(true)
  }, [currentSession?.id])

  // 进入重命名模式后自动聚焦输入框
  useEffect(() => {
    if (!isRenaming) return
    requestAnimationFrame(() => {
      renameInputRef.current?.focus()
      renameInputRef.current?.select()
    })
  }, [isRenaming])

  // 组件卸载时清理导航相关定时器
  useEffect(() => {
    return () => {
      if (hideNavTimerRef.current) clearTimeout(hideNavTimerRef.current)
      if (navigatingTimerRef.current) clearTimeout(navigatingTimerRef.current)
    }
  }, [])

  // 会话切换后重置轮次导航状态
  useEffect(() => {
    setShowTurnNav(false)
    setIsScrollable(false)
    setCurrentTurnIndex(0)
    currentTurnIndexRef.current = 0
    isNavigatingRef.current = false
    turnElsCacheRef.current = []
    if (hideNavTimerRef.current) clearTimeout(hideNavTimerRef.current)
    if (navigatingTimerRef.current) clearTimeout(navigatingTimerRef.current)
  }, [currentSession?.id])

  // 点击外部区域、按 Esc、窗口滚动或缩放时关闭菜单
  useEffect(() => {
    if (!menuPosition) return
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (!menuRef.current?.contains(target) && !actionButtonRef.current?.contains(target)) {
        closeMenu()
      }
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu()
      }
    }
    const handleScroll = () => closeMenu()
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleScroll)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleScroll)
    }
  }, [menuPosition])

  // 路径展示辅助：将路径压缩为更短的显示文本
  const truncatePath = (path: string, maxLength = 20): string => {
    if (!path) return i18nService.t('noFolderSelected')
    return getCompactFolderName(path, maxLength) || i18nService.t('noFolderSelected')
  }

  // 计算菜单浮层位置，避免超出视口
  const calculateMenuPosition = (height: number) => {
    const rect = actionButtonRef.current?.getBoundingClientRect()
    if (!rect) return null
    const menuWidth = 180
    const padding = 8
    const x = Math.min(Math.max(padding, rect.right - menuWidth), window.innerWidth - menuWidth - padding)
    const y = Math.min(rect.bottom + 8, window.innerHeight - height - padding)
    return { x, y }
  }

  // 打开/关闭会话操作菜单
  const openMenu = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isRenaming) return
    if (menuPosition) {
      closeMenu()
      return
    }
    const menuHeight = 160
    const position = calculateMenuPosition(menuHeight)
    if (position) {
      setMenuPosition(position)
    }
    setShowConfirmDelete(false)
  }

  // 关闭会话操作菜单并清除删除确认态
  const closeMenu = () => {
    setMenuPosition(null)
    setShowConfirmDelete(false)
  }

  // 在系统文件管理器中打开当前会话工作目录
  const handleOpenFolder = useCallback(async () => {
    if (!currentSession?.cwd) return
    try {
      await window.electron.shell.openPath(currentSession.cwd)
    } catch (error) {
      console.error('Failed to open folder:', error)
    }
  }, [currentSession?.cwd])

  // 点击重命名菜单项
  const handleRenameClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!currentSession) return
    ignoreNextBlurRef.current = false
    setIsRenaming(true)
    setShowConfirmDelete(false)
    setRenameValue(currentSession.title)
    setMenuPosition(null)
  }

  // 提交会话重命名
  const handleRenameSave = async (e?: React.SyntheticEvent) => {
    e?.stopPropagation()
    if (!currentSession) return
    ignoreNextBlurRef.current = true
    const nextTitle = renameValue.trim()
    if (nextTitle && nextTitle !== currentSession.title) {
      await coworkService.renameSession(currentSession.id, nextTitle)
    }
    setIsRenaming(false)
  }

  // 取消会话重命名并恢复原标题
  const handleRenameCancel = (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.stopPropagation()
    ignoreNextBlurRef.current = true
    if (currentSession) {
      setRenameValue(currentSession.title)
    }
    setIsRenaming(false)
  }

  // 处理重命名输入框失焦保存
  const handleRenameBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    if (ignoreNextBlurRef.current) {
      ignoreNextBlurRef.current = false
      return
    }
    handleRenameSave(event)
  }

  // 切换会话置顶/取消置顶
  const handleTogglePin = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!currentSession) return
    await coworkService.setSessionPinned(currentSession.id, !currentSession.pinned)
    closeMenu()
  }

  // 打开删除确认弹窗
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowConfirmDelete(true)
    setMenuPosition(null)
  }

  // 导出会话截图（按可视区域分段截图并拼接）
  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!currentSession || isExportingImage) return
    closeMenu()
    setIsExportingImage(true)

    window.requestAnimationFrame(() => {
      void (async () => {
        try {
          const scrollContainer = scrollContainerRef.current
          if (!scrollContainer) {
            throw new Error('Capture target not found')
          }
          const initialScrollTop = scrollContainer.scrollTop
          try {
            const scrollRect = domRectToCaptureRect(scrollContainer.getBoundingClientRect())
            if (scrollRect.width <= 0 || scrollRect.height <= 0) {
              throw new Error('Invalid capture area')
            }

            const scrollContentHeight = Math.max(scrollContainer.scrollHeight, scrollContainer.clientHeight)
            if (scrollContentHeight <= 0) {
              throw new Error('Invalid content height')
            }

            // 将视口 Y 坐标映射为内容区 Y 坐标
            const toContentY = (viewportY: number): number => {
              const y = scrollContainer.scrollTop + (viewportY - scrollRect.y)
              return Math.max(0, Math.min(scrollContentHeight, y))
            }

            const userAnchors = scrollContainer.querySelectorAll<HTMLElement>('[data-export-role="user-message"]')
            const assistantAnchors = scrollContainer.querySelectorAll<HTMLElement>('[data-export-role="assistant-block"]')

            let contentStart = 0
            let contentEnd = scrollContentHeight

            if (userAnchors.length > 0) {
              contentStart = toContentY(userAnchors[0].getBoundingClientRect().top)
            } else if (assistantAnchors.length > 0) {
              contentStart = toContentY(assistantAnchors[0].getBoundingClientRect().top)
            }

            if (assistantAnchors.length > 0) {
              const lastAssistant = assistantAnchors[assistantAnchors.length - 1]
              contentEnd = toContentY(lastAssistant.getBoundingClientRect().bottom)
            } else if (userAnchors.length > 0) {
              const lastUser = userAnchors[userAnchors.length - 1]
              contentEnd = toContentY(lastUser.getBoundingClientRect().bottom)
            }

            const maxStart = Math.max(0, scrollContentHeight - 1)
            contentStart = Math.max(0, Math.min(maxStart, Math.round(contentStart)))
            contentEnd = Math.max(contentStart + 1, Math.min(scrollContentHeight, Math.round(contentEnd)))

            const outputHeight = contentEnd - contentStart

            if (outputHeight > MAX_EXPORT_CANVAS_HEIGHT) {
              throw new Error(`Export image is too tall (${outputHeight}px)`)
            }

            const segmentsEstimate = Math.ceil(outputHeight / Math.max(1, scrollRect.height)) + 1
            if (segmentsEstimate > MAX_EXPORT_SEGMENTS) {
              throw new Error('Export image is too long')
            }

            // 准备最终拼接画布
            const canvas = document.createElement('canvas')
            canvas.width = scrollRect.width
            canvas.height = outputHeight
            const context = canvas.getContext('2d')
            if (!context) {
              throw new Error('Canvas context unavailable')
            }

            // 执行一次分块截图并解码
            const captureAndLoad = async (rect: CaptureRect): Promise<HTMLImageElement> => {
              const chunk = await coworkService.captureSessionImageChunk({ rect })
              if (!chunk.success || !chunk.pngBase64) {
                throw new Error(chunk.error || 'Failed to capture image chunk')
              }
              return loadImageFromBase64(chunk.pngBase64)
            }

            scrollContainer.scrollTop = Math.min(contentStart, Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight))
            await waitForNextFrame()
            await waitForNextFrame()

            // 从起始位置到结束位置逐段截图并绘制到目标画布
            const maxScrollTop = Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight)
            let contentOffset = contentStart
            while (contentOffset < contentEnd) {
              const targetScrollTop = Math.min(contentOffset, maxScrollTop)
              scrollContainer.scrollTop = targetScrollTop
              await waitForNextFrame()
              await waitForNextFrame()

              const chunkImage = await captureAndLoad(scrollRect)
              const sourceYOffset = Math.max(0, contentOffset - targetScrollTop)
              const drawableHeight = Math.min(scrollRect.height - sourceYOffset, contentEnd - contentOffset)
              if (drawableHeight <= 0) {
                throw new Error('Failed to stitch export image')
              }
              const scaleY = chunkImage.naturalHeight / scrollRect.height
              const sourceYInImage = Math.max(0, Math.round(sourceYOffset * scaleY))
              const sourceHeightInImage = Math.max(
                1,
                Math.min(chunkImage.naturalHeight - sourceYInImage, Math.round(drawableHeight * scaleY))
              )

              context.drawImage(
                chunkImage,
                0,
                sourceYInImage,
                chunkImage.naturalWidth,
                sourceHeightInImage,
                0,
                contentOffset - contentStart,
                scrollRect.width,
                drawableHeight
              )

              contentOffset += drawableHeight
            }

            const pngDataUrl = canvas.toDataURL('image/png')
            const base64Index = pngDataUrl.indexOf(',')
            if (base64Index < 0) {
              throw new Error('Failed to encode export image')
            }

            const timestamp = formatExportTimestamp(new Date())
            const saveResult = await coworkService.saveSessionResultImage({
              pngBase64: pngDataUrl.slice(base64Index + 1),
              defaultFileName: sanitizeExportFileName(`${currentSession.title}-${timestamp}.png`)
            })
            // 成功保存后弹出提示
            if (saveResult.success && !saveResult.canceled) {
              window.dispatchEvent(
                new CustomEvent('app:showToast', {
                  detail: i18nService.t('coworkExportImageSuccess')
                })
              )
              return
            }
            if (!saveResult.success) {
              throw new Error(saveResult.error || 'Failed to export image')
            }
          } finally {
            scrollContainer.scrollTop = initialScrollTop
          }
        } catch (error) {
          console.error('Failed to export session image:', error)
          window.dispatchEvent(
            new CustomEvent('app:showToast', {
              detail: i18nService.t('coworkExportImageFailed')
            })
          )
        } finally {
          setIsExportingImage(false)
        }
      })()
    })
  }

  // 确认删除当前会话
  const handleConfirmDelete = async () => {
    if (!currentSession) return
    await coworkService.deleteSession(currentSession.id)
    setShowConfirmDelete(false)
    if (onNavigateHome) {
      onNavigateHome()
    }
  }

  // 取消删除确认
  const handleCancelDelete = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setShowConfirmDelete(false)
  }

  // 消息区滚动处理：自动滚动状态、导航显隐、当前轮次索引计算
  const handleMessagesScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight
    const isNearBottom = distanceToBottom <= AUTO_SCROLL_THRESHOLD
    setShouldAutoScroll((prev) => (prev === isNearBottom ? prev : isNearBottom))

    // 计算是否可滚动（函数式更新避免冗余渲染）
    const scrollable = container.scrollHeight > container.clientHeight
    setIsScrollable((prev) => (prev === scrollable ? prev : scrollable))
    if (!scrollable) return

    // 显示轮次导航并重置自动隐藏计时器
    setShowTurnNav(true)
    if (hideNavTimerRef.current) clearTimeout(hideNavTimerRef.current)
    hideNavTimerRef.current = setTimeout(() => setShowTurnNav(false), NAV_HIDE_DELAY)

    // 程序化滚动期间跳过索引计算，避免抖动
    if (isNavigatingRef.current) return

    // 基于缓存的轮次元素更新当前索引
    const turnEls = turnElsCacheRef.current
    if (turnEls.length === 0) return

    // 接近底部时吸附到最后一轮（阈值小于自动滚动阈值）
    if (distanceToBottom <= NAV_BOTTOM_SNAP_THRESHOLD) {
      const lastIndex = turnEls.length - 1
      currentTurnIndexRef.current = lastIndex
      setCurrentTurnIndex(lastIndex)
      return
    }

    const scrollTop = container.scrollTop
    let visibleIndex = 0
    for (let i = 0; i < turnEls.length; i++) {
      if (turnEls[i].offsetTop <= scrollTop + 80) {
        visibleIndex = i
      } else {
        break
      }
    }
    currentTurnIndexRef.current = visibleIndex
    setCurrentTurnIndex(visibleIndex)
  }, [])

  // 导航到上一轮/下一轮
  const navigateToTurn = useCallback((direction: 'prev' | 'next') => {
    const turnEls = turnElsCacheRef.current
    if (turnEls.length === 0) return
    const idx = currentTurnIndexRef.current
    const targetIndex = direction === 'prev' ? idx - 1 : idx + 1
    if (targetIndex < 0 || targetIndex >= turnEls.length) return

    // 平滑滚动期间锁定，防止滚动回调覆盖索引
    isNavigatingRef.current = true
    if (navigatingTimerRef.current) clearTimeout(navigatingTimerRef.current)
    navigatingTimerRef.current = setTimeout(() => {
      isNavigatingRef.current = false
    }, NAV_SCROLL_LOCK_DURATION)

    turnEls[targetIndex].scrollIntoView({ behavior: 'smooth', block: 'start' })
    currentTurnIndexRef.current = targetIndex
    setCurrentTurnIndex(targetIndex)
    // 重置导航自动隐藏计时器
    setShowTurnNav(true)
    if (hideNavTimerRef.current) clearTimeout(hideNavTimerRef.current)
    hideNavTimerRef.current = setTimeout(() => setShowTurnNav(false), NAV_HIDE_DELAY)
  }, [])

  // 读取最后一条消息内容，用于流式更新时触发自动滚动
  const lastMessage = currentSession?.messages?.[currentSession.messages.length - 1]
  const lastMessageContent = lastMessage?.content

  // 解析 Markdown 本地路径链接到真实文件路径（含沙盒路径映射）
  const resolveLocalFilePath = useCallback(
    (href: string, text: string) => {
      const hrefValue = typeof href === 'string' ? href.trim() : ''
      const textValue = typeof text === 'string' ? text.trim() : ''
      if (!hrefValue && !textValue) return null

      // In sandbox mode, translate VM guest paths to host paths.
      const mapSandboxPath = (filePath: string): string => {
        if (currentSession?.executionMode !== 'sandbox' || !currentSession?.cwd) {
          return filePath
        }
        const mapped = mapSandboxGuestPathToCwd(filePath, currentSession.cwd)
        return mapped ?? filePath
      }

      const hrefRootRelative = hrefValue ? parseRootRelativePath(hrefValue) : null
      if (hrefRootRelative) {
        return mapSandboxPath(hrefRootRelative)
      }

      const hrefPath = hrefValue ? normalizeLocalPath(hrefValue) : null
      if (hrefPath) {
        if (hrefPath.isRelative && currentSession?.cwd) {
          return mapSandboxPath(toAbsolutePathFromCwd(hrefPath.path, currentSession.cwd))
        }
        if (hrefPath.isAbsolute) {
          return mapSandboxPath(hrefPath.path)
        }
      }

      const textRootRelative = textValue ? parseRootRelativePath(textValue) : null
      if (textRootRelative) {
        return mapSandboxPath(textRootRelative)
      }

      const textPath = textValue ? normalizeLocalPath(textValue) : null
      if (textPath) {
        if (textPath.isRelative && currentSession?.cwd) {
          return mapSandboxPath(toAbsolutePathFromCwd(textPath.path, currentSession.cwd))
        }
        if (textPath.isAbsolute) {
          return mapSandboxPath(textPath.path)
        }
      }

      return null
    },
    [currentSession?.cwd, currentSession?.executionMode]
  )

  // 将展示文本中的沙盒 guest 路径映射为宿主路径
  const mapDisplayText = useCallback(
    (value: string): string => {
      if (currentSession?.executionMode !== 'sandbox') {
        return value
      }
      return mapSandboxGuestPathsInText(value, currentSession?.cwd)
    },
    [currentSession?.cwd, currentSession?.executionMode]
  )

  // 当前会话消息列表
  const messages = currentSession?.messages
  // 将原始消息构造成渲染项
  const displayItems = useMemo(() => (messages ? buildDisplayItems(messages) : []), [messages])
  // 将渲染项按轮次组织
  const turns = useMemo(() => buildConversationTurns(displayItems), [displayItems])

  // 轮次变化后缓存对应 DOM 元素，供导航与索引计算复用
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) {
      turnElsCacheRef.current = []
      return
    }
    // DOM is already committed when useEffect runs, query synchronously
    turnElsCacheRef.current = Array.from(container.querySelectorAll<HTMLElement>('[data-turn-index]'))
  }, [turns])

  // 新消息到达或流式内容更新时，按需自动滚动到底部
  useEffect(() => {
    if (!shouldAutoScroll) {
      return
    }
    const container = scrollContainerRef.current
    if (container) {
      container.scrollTop = container.scrollHeight
      setIsScrollable(container.scrollHeight > container.clientHeight)
    }
    // 自动滚到底部后同步当前轮次索引到最后一轮
    if (turns.length > 0) {
      const lastIndex = turns.length - 1
      currentTurnIndexRef.current = lastIndex
      setCurrentTurnIndex(lastIndex)
    }
  }, [currentSession?.messages?.length, lastMessageContent, isStreaming, shouldAutoScroll, turns.length])

  if (!currentSession) {
    return null
  }

  // 渲染按轮次组织后的会话内容
  const renderConversationTurns = () => {
    if (turns.length === 0) {
      if (!isStreaming) return null
      return (
        <div data-export-role="assistant-block">
          <AssistantTurnBlock
            turn={{
              id: 'streaming-only',
              userMessage: null,
              assistantItems: []
            }}
            resolveLocalFilePath={resolveLocalFilePath}
            showTypingIndicator
            showCopyButtons={!isStreaming}
          />
        </div>
      )
    }

    return turns.map((turn, index) => {
      const isLastTurn = index === turns.length - 1
      const showTypingIndicator = isStreaming && isLastTurn && !hasRenderableAssistantContent(turn)
      const showAssistantBlock = turn.assistantItems.length > 0 || showTypingIndicator

      return (
        <div key={turn.id} data-turn-index={index}>
          {turn.userMessage && (
            <div data-export-role="user-message">
              <UserMessageItem message={turn.userMessage} skills={skills} />
            </div>
          )}
          {showAssistantBlock && (
            <div data-export-role="assistant-block">
              <AssistantTurnBlock
                turn={turn}
                resolveLocalFilePath={resolveLocalFilePath}
                mapDisplayText={mapDisplayText}
                showTypingIndicator={showTypingIndicator}
                showCopyButtons={!isStreaming}
              />
            </div>
          )}
        </div>
      )
    })
  }

  return (
    <div ref={detailRootRef} className="flex-1 flex flex-col dark:bg-claude-darkBg bg-claude-bg h-full">
      {/* Header */}
      <div className="draggable flex h-12 items-center justify-between px-4 border-b dark:border-claude-darkBorder border-claude-border dark:bg-claude-darkSurface/50 bg-claude-surface/50 shrink-0">
        {/* Left side: Toggle buttons (when collapsed) + Title + Sandbox badge */}
        <div className="flex h-full items-center gap-2 min-w-0">
          {isSidebarCollapsed && (
            <div className={`non-draggable flex items-center gap-1 ${isMac ? 'pl-[68px]' : ''}`}>
              <button
                type="button"
                onClick={onToggleSidebar}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg dark:text-claude-darkTextSecondary text-claude-textSecondary hover:bg-claude-surfaceHover dark:hover:bg-claude-darkSurfaceHover transition-colors"
              >
                <SidebarToggleIcon className="h-4 w-4" isCollapsed={true} />
              </button>
              <button
                type="button"
                onClick={onNewChat}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg dark:text-claude-darkTextSecondary text-claude-textSecondary hover:bg-claude-surfaceHover dark:hover:bg-claude-darkSurfaceHover transition-colors"
              >
                <ComposeIcon className="h-4 w-4" />
              </button>
              {updateBadge}
            </div>
          )}
          {isRenaming ? (
            <input
              ref={renameInputRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenameSave(e)
                }
                if (e.key === 'Escape') {
                  handleRenameCancel(e)
                }
              }}
              onBlur={handleRenameBlur}
              className="non-draggable min-w-0 max-w-[300px] rounded-lg border dark:border-claude-darkBorder border-claude-border dark:bg-claude-darkBg bg-claude-bg px-2 py-1 text-sm font-medium dark:text-claude-darkText text-claude-text focus:outline-none focus:ring-2 focus:ring-claude-accent"
            />
          ) : (
            <h1 className="text-sm leading-none font-medium dark:text-claude-darkText text-claude-text truncate max-w-[360px]">
              {currentSession.title || i18nService.t('coworkNewSession')}
            </h1>
          )}
          {currentSession.executionMode === 'sandbox' && (
            <span className="inline-flex items-center rounded-full bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
              {i18nService.t('coworkSandboxBadge')}
            </span>
          )}
          {currentSession.executionMode === 'local' && (
            <span className="inline-flex items-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
              {i18nService.t('coworkLocalBadge')}
            </span>
          )}
        </div>

        {/* Right side: Folder + Menu */}
        <div className="non-draggable flex items-center gap-1">
          {/* Folder button */}
          <button
            type="button"
            onClick={handleOpenFolder}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm dark:text-claude-darkTextSecondary text-claude-textSecondary dark:hover:bg-claude-darkSurfaceHover hover:bg-claude-surfaceHover dark:hover:text-claude-darkText hover:text-claude-text transition-colors"
            aria-label={i18nService.t('coworkOpenFolder')}
          >
            <FolderIcon className="h-4 w-4" />
            <span className="max-w-[120px] truncate text-xs">{truncatePath(currentSession.cwd)}</span>
          </button>

          {/* Menu button */}
          <button
            ref={actionButtonRef}
            type="button"
            onClick={openMenu}
            className="p-1.5 rounded-lg dark:text-claude-darkTextSecondary text-claude-textSecondary dark:hover:bg-claude-darkSurfaceHover hover:bg-claude-surfaceHover transition-colors"
            aria-label={i18nService.t('coworkSessionActions')}
          >
            <EllipsisHorizontalIcon className="h-5 w-5" />
          </button>
          <WindowTitleBar inline className="ml-1" />
        </div>
      </div>

      {/* Floating Menu */}
      {menuPosition && (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-[180px] rounded-xl border dark:border-claude-darkBorder border-claude-border dark:bg-claude-darkSurface bg-claude-surface shadow-popover popover-enter overflow-hidden"
          style={{ top: menuPosition.y, left: menuPosition.x }}
          role="menu"
        >
          <button
            type="button"
            onClick={handleRenameClick}
            className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm dark:text-claude-darkText text-claude-text hover:bg-claude-surfaceHover dark:hover:bg-claude-darkSurfaceHover transition-colors"
          >
            <PencilSquareIcon className="h-4 w-4" />
            {i18nService.t('renameConversation')}
          </button>
          <button
            type="button"
            onClick={handleTogglePin}
            className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm dark:text-claude-darkText text-claude-text hover:bg-claude-surfaceHover dark:hover:bg-claude-darkSurfaceHover transition-colors"
          >
            <PushPinIcon slashed={currentSession.pinned} className={`h-4 w-4 ${currentSession.pinned ? 'opacity-60' : ''}`} />
            {currentSession.pinned ? i18nService.t('coworkUnpinSession') : i18nService.t('coworkPinSession')}
          </button>
          <button
            type="button"
            onClick={handleShareClick}
            disabled={isExportingImage}
            className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm dark:text-claude-darkText text-claude-text hover:bg-claude-surfaceHover dark:hover:bg-claude-darkSurfaceHover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShareIcon className="h-4 w-4" />
            {i18nService.t('coworkShareSession')}
          </button>
          <button
            type="button"
            onClick={handleDeleteClick}
            className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <TrashIcon className="h-4 w-4" />
            {i18nService.t('deleteSession')}
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop" onClick={handleCancelDelete}>
          <div
            className="w-full max-w-sm mx-4 dark:bg-claude-darkSurface bg-claude-surface rounded-2xl shadow-modal overflow-hidden modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-500" />
              </div>
              <h2 className="text-base font-semibold dark:text-claude-darkText text-claude-text">
                {i18nService.t('deleteTaskConfirmTitle')}
              </h2>
            </div>

            {/* Content */}
            <div className="px-5 pb-4">
              <p className="text-sm dark:text-claude-darkTextSecondary text-claude-textSecondary">
                {i18nService.t('deleteTaskConfirmMessage')}
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t dark:border-claude-darkBorder border-claude-border">
              <button
                onClick={handleCancelDelete}
                className="px-4 py-2 text-sm font-medium rounded-lg dark:text-claude-darkTextSecondary text-claude-textSecondary dark:hover:bg-claude-darkSurfaceHover hover:bg-claude-surfaceHover transition-colors"
              >
                {i18nService.t('cancel')}
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
              >
                {i18nService.t('deleteSession')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="relative flex-1 min-h-0">
        <div ref={scrollContainerRef} onScroll={handleMessagesScroll} className="h-full min-h-0 overflow-y-auto pt-3">
          {renderConversationTurns()}
          <div className="h-20" />
        </div>

        {/* Turn Navigation Buttons */}
        {turns.length > 1 && isScrollable && (
          <div
            className={`absolute right-4 top-1/2 -translate-y-1/2 flex flex-col rounded-lg overflow-hidden shadow-lg transition-opacity duration-300 z-10
              dark:bg-claude-darkSurface/90 bg-claude-surface/90 backdrop-blur-sm
              border dark:border-claude-darkBorder border-claude-border
              ${showTurnNav ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          >
            <button
              type="button"
              onClick={() => currentTurnIndex > 0 && navigateToTurn('prev')}
              className={`px-1.5 py-3 transition-colors dark:text-claude-darkText text-claude-text
                ${
                  currentTurnIndex <= 0
                    ? 'opacity-30 cursor-default'
                    : 'dark:hover:bg-claude-darkSurfaceHover hover:bg-claude-surfaceHover cursor-pointer'
                }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
              </svg>
            </button>
            <div className="dark:border-claude-darkBorder border-claude-border border-t" />
            <button
              type="button"
              onClick={() => currentTurnIndex < turns.length - 1 && navigateToTurn('next')}
              className={`px-1.5 py-3 transition-colors dark:text-claude-darkText text-claude-text
                ${
                  currentTurnIndex >= turns.length - 1
                    ? 'opacity-30 cursor-default'
                    : 'dark:hover:bg-claude-darkSurfaceHover hover:bg-claude-surfaceHover cursor-pointer'
                }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Streaming Activity Bar */}
      {isStreaming && <StreamingActivityBar messages={currentSession.messages} />}

      {/* Input Area */}
      <div className="p-4 shrink-0">
        <div className="max-w-3xl mx-auto">
          <CoworkPromptInput
            onSubmit={onContinue}
            onStop={onStop}
            isStreaming={isStreaming}
            placeholder={i18nService.t('coworkContinuePlaceholder')}
            disabled={false}
            onManageSkills={onManageSkills}
            size="large"
            showModelSelector={true}
          />
        </div>
      </div>
    </div>
  )
}

export default CoworkSessionDetail
