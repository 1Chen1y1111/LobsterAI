import { app } from 'electron'
import crypto from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { Database } from 'sql.js'
import { v4 as uuidv4 } from 'uuid'
import { extractTurnMemoryChanges, isQuestionLikeMemoryText, type CoworkMemoryGuardLevel } from './libs/coworkMemoryExtractor'
import { judgeMemoryCandidate } from './libs/coworkMemoryJudge'

/**
 * 这个文件是主进程里的 cowork 数据存储层。
 *
 * 它主要负责 5 类事情：
 * 1. 会话 session 的增删改查
 * 2. 会话消息的持久化与顺序读取
 * 3. cowork 配置项的读写
 * 4. 用户记忆（user memory）的抽取、去重、更新、删除与统计
 * 5. 历史对话检索与最近对话摘要
 *
 * 阅读建议：
 * - 前半部分是各种纯函数和类型定义
 * - `CoworkStore` 类内部再按“会话 / 消息 / 配置 / 记忆 / 检索”分段阅读
 */

// 新用户默认工作目录。数据库里还没有配置时，会回落到这里。
const getDefaultWorkingDirectory = (): string => {
  return path.join(os.homedir(), 'lobsterai', 'project')
}

const TASK_WORKSPACE_CONTAINER_DIR = '.lobsterai-tasks'

// 任务工作区通常会落到 `.lobsterai-tasks` 子目录，这里把它归一化回原项目目录，
// 这样“最近目录”列表展示的是用户真正关心的工作区根目录。
const normalizeRecentWorkspacePath = (cwd: string): string => {
  const resolved = path.resolve(cwd)
  const marker = `${path.sep}${TASK_WORKSPACE_CONTAINER_DIR}${path.sep}`
  const markerIndex = resolved.lastIndexOf(marker)
  if (markerIndex > 0) {
    return resolved.slice(0, markerIndex)
  }
  return resolved
}

// memory 相关默认值与阈值。
const DEFAULT_MEMORY_ENABLED = true
const DEFAULT_MEMORY_IMPLICIT_UPDATE_ENABLED = true
const DEFAULT_MEMORY_LLM_JUDGE_ENABLED = false
const DEFAULT_MEMORY_GUARD_LEVEL: CoworkMemoryGuardLevel = 'strict'
const DEFAULT_MEMORY_USER_MEMORIES_MAX_ITEMS = 12
const MIN_MEMORY_USER_MEMORIES_MAX_ITEMS = 1
const MAX_MEMORY_USER_MEMORIES_MAX_ITEMS = 60
const MEMORY_NEAR_DUPLICATE_MIN_SCORE = 0.82
const MEMORY_PROCEDURAL_TEXT_RE =
  /(执行以下命令|run\s+(?:the\s+)?following\s+command|\b(?:cd|npm|pnpm|yarn|node|python|bash|sh|git|curl|wget)\b|\$[A-Z_][A-Z0-9_]*|&&|--[a-z0-9-]+|\/tmp\/|\.sh\b|\.bat\b|\.ps1\b)/i
const MEMORY_ASSISTANT_STYLE_TEXT_RE = /^(?:使用|use)\s+[A-Za-z0-9._-]+\s*(?:技能|skill)/i

// 对外部配置做兜底，保证只有系统支持的 guard level 能进入业务逻辑。
function normalizeMemoryGuardLevel(value: string | undefined): CoworkMemoryGuardLevel {
  if (value === 'strict' || value === 'standard' || value === 'relaxed') return value
  return DEFAULT_MEMORY_GUARD_LEVEL
}

// 数据库存的是字符串配置，这里统一兼容 1/0、true/false、yes/no 等写法。
function parseBooleanConfig(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback
  const normalized = value.trim().toLowerCase()
  if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on') return true
  if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') return false
  return fallback
}

// 限制“最多保留多少条用户记忆”的范围，避免 UI 或旧配置写入异常值。
function clampMemoryUserMemoriesMaxItems(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_MEMORY_USER_MEMORIES_MAX_ITEMS
  return Math.max(MIN_MEMORY_USER_MEMORIES_MAX_ITEMS, Math.min(MAX_MEMORY_USER_MEMORIES_MAX_ITEMS, Math.floor(value)))
}

// memory 文本先做最基础的“压缩空白 + trim”，后续所有判断都基于这个规范化结果。
function normalizeMemoryText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

// 对搜索词做“整句 + 分词”的混合提取，兼顾精确命中和模糊召回。
function extractConversationSearchTerms(value: string): string[] {
  const normalized = normalizeMemoryText(value).toLowerCase()
  if (!normalized) return []

  const terms: string[] = []
  const seen = new Set<string>()
  const addTerm = (term: string): void => {
    const normalizedTerm = normalizeMemoryText(term).toLowerCase()
    if (!normalizedTerm) return
    if (/^[a-z0-9]$/i.test(normalizedTerm)) return
    if (seen.has(normalizedTerm)) return
    seen.add(normalizedTerm)
    terms.push(normalizedTerm)
  }

  // 既保留整句，也追加分词后的 term，避免“整句完全不一致时搜不到”。
  addTerm(normalized)
  const tokens = normalized
    .split(/[\s,，、|/\\;；]+/g)
    .map((token) => token.replace(/^['"`]+|['"`]+$/g, '').trim())
    .filter(Boolean)

  for (const token of tokens) {
    addTerm(token)
    if (terms.length >= 8) break
  }

  return terms.slice(0, 8)
}

// 生成用于记忆匹配的 key：去大小写、去标点、压缩空白。
function normalizeMemoryMatchKey(value: string): string {
  return normalizeMemoryText(value)
    .toLowerCase()
    .replace(/[\u0000-\u001f]/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// 在 match key 基础上继续去掉“我 / 用户 / the user”这类前缀，用于近似语义去重。
function normalizeMemorySemanticKey(value: string): string {
  const key = normalizeMemoryMatchKey(value)
  if (!key) return ''
  return key
    .replace(/^(?:the user|user|i am|i m|i|my|me)\s+/i, '')
    .replace(/^(?:该用户|这个用户|用户|本人|我的|我们|咱们|咱|我|你的|你)\s*/u, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// 下面几组 score* 函数共同承担“相似记忆判重”的工作。
function buildTokenFrequencyMap(value: string): Map<string, number> {
  const tokens = value
    .split(/\s+/g)
    .map((token) => token.trim())
    .filter(Boolean)
  const map = new Map<string, number>()
  for (const token of tokens) {
    map.set(token, (map.get(token) || 0) + 1)
  }
  return map
}

// 计算词级重叠率，适合判断“词差不多一样，只是顺序略有变化”的情况。
function scoreTokenOverlap(left: string, right: string): number {
  const leftMap = buildTokenFrequencyMap(left)
  const rightMap = buildTokenFrequencyMap(right)
  if (leftMap.size === 0 || rightMap.size === 0) return 0

  let leftCount = 0
  let rightCount = 0
  let intersection = 0
  for (const count of leftMap.values()) leftCount += count
  for (const count of rightMap.values()) rightCount += count
  for (const [token, leftValue] of leftMap.entries()) {
    intersection += Math.min(leftValue, rightMap.get(token) || 0)
  }

  const denominator = Math.min(leftCount, rightCount)
  if (denominator <= 0) return 0
  return intersection / denominator
}

// 把字符串切成连续双字片段，用于更细粒度地比较中英文短语相似度。
function buildCharacterBigramMap(value: string): Map<string, number> {
  const compact = value.replace(/\s+/g, '').trim()
  if (!compact) return new Map<string, number>()
  if (compact.length <= 1) return new Map<string, number>([[compact, 1]])

  const map = new Map<string, number>()
  for (let index = 0; index < compact.length - 1; index += 1) {
    const gram = compact.slice(index, index + 2)
    map.set(gram, (map.get(gram) || 0) + 1)
  }
  return map
}

// Dice 系数适合处理轻微拼写差异、少量增删字的场景。
function scoreCharacterBigramDice(left: string, right: string): number {
  const leftMap = buildCharacterBigramMap(left)
  const rightMap = buildCharacterBigramMap(right)
  if (leftMap.size === 0 || rightMap.size === 0) return 0

  let leftCount = 0
  let rightCount = 0
  let intersection = 0
  for (const count of leftMap.values()) leftCount += count
  for (const count of rightMap.values()) rightCount += count
  for (const [gram, leftValue] of leftMap.entries()) {
    intersection += Math.min(leftValue, rightMap.get(gram) || 0)
  }

  const denominator = leftCount + rightCount
  if (denominator <= 0) return 0
  return (2 * intersection) / denominator
}

// 综合“包含关系 / token overlap / 双字 bigram”三种特征做相似度打分。
function scoreMemorySimilarity(left: string, right: string): number {
  if (!left || !right) return 0
  if (left === right) return 1

  const compactLeft = left.replace(/\s+/g, '')
  const compactRight = right.replace(/\s+/g, '')
  if (compactLeft && compactLeft === compactRight) {
    return 1
  }

  let phraseScore = 0
  if (compactLeft && compactRight && (compactLeft.includes(compactRight) || compactRight.includes(compactLeft))) {
    phraseScore = Math.min(compactLeft.length, compactRight.length) / Math.max(compactLeft.length, compactRight.length)
  }

  return Math.max(phraseScore, scoreTokenOverlap(left, right), scoreCharacterBigramDice(left, right))
}

// 当两条记忆很像时，用这个分数挑选更像“用户事实”的那条表述。
function scoreMemoryTextQuality(value: string): number {
  const normalized = normalizeMemoryText(value)
  if (!normalized) return 0
  let score = normalized.length
  if (/^(?:该用户|这个用户|用户)\s*/u.test(normalized)) {
    score -= 12
  }
  if (/^(?:the user|user)\b/i.test(normalized)) {
    score -= 12
  }
  if (/^(?:我|我的|我是|我有|我会|我喜欢|我偏好)/u.test(normalized)) {
    score += 4
  }
  if (/^(?:i|i am|i'm|my)\b/i.test(normalized)) {
    score += 4
  }
  return score
}

// 合并近重复记忆时，优先保留质量更高、信息更完整的文本。
function choosePreferredMemoryText(currentText: string, incomingText: string): string {
  const normalizedCurrent = truncate(normalizeMemoryText(currentText), 360)
  const normalizedIncoming = truncate(normalizeMemoryText(incomingText), 360)
  if (!normalizedCurrent) return normalizedIncoming
  if (!normalizedIncoming) return normalizedCurrent

  const currentScore = scoreMemoryTextQuality(normalizedCurrent)
  const incomingScore = scoreMemoryTextQuality(normalizedIncoming)
  if (incomingScore > currentScore + 1) return normalizedIncoming
  if (currentScore > incomingScore + 1) return normalizedCurrent
  return normalizedIncoming.length >= normalizedCurrent.length ? normalizedIncoming : normalizedCurrent
}

// 删除记忆时不接受过短的碎片，避免误删。
function isMeaningfulDeleteFragment(value: string): boolean {
  if (!value) return false
  const tokens = value.split(/\s+/g).filter(Boolean)
  if (tokens.length >= 2) return true
  if (/[\u3400-\u9fff]/u.test(value)) return value.length >= 4
  return value.length >= 6
}

// delete 匹配时既要允许“摘一段关键词”删除，也要尽量避免半个单词误命中。
function includesAsBoundedPhrase(target: string, fragment: string): boolean {
  if (!target || !fragment) return false
  const paddedTarget = ` ${target} `
  const paddedFragment = ` ${fragment} `
  if (paddedTarget.includes(paddedFragment)) {
    return true
  }
  // 中文短语常常没有显式分词，按空格边界判断并不可靠，所以这里退化成直接包含判断。
  if (/[\u3400-\u9fff]/u.test(fragment) && !fragment.includes(' ')) {
    return target.includes(fragment)
  }
  return false
}

// 用于 delete 场景的匹配分数，重点是“是不是这条记忆的有效片段”。
function scoreDeleteMatch(targetKey: string, queryKey: string): number {
  if (!targetKey || !queryKey) return 0
  if (targetKey === queryKey) {
    return 1000 + queryKey.length
  }
  if (!isMeaningfulDeleteFragment(queryKey)) {
    return 0
  }
  if (!includesAsBoundedPhrase(targetKey, queryKey)) {
    return 0
  }
  return 100 + Math.min(targetKey.length, queryKey.length)
}

// fingerprint 用于精确去重；文本改动只要影响规范化 key，指纹就会变化。
function buildMemoryFingerprint(text: string): string {
  const key = normalizeMemoryMatchKey(text)
  return crypto.createHash('sha1').update(key).digest('hex')
}

// UI 摘要、检索片段、memory 文本都统一经过截断，避免把超长内容直接持久化或展示。
function truncate(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value
  return `${value.slice(0, maxChars - 1)}…`
}

// 把 before / after 之类的时间过滤参数转成毫秒时间戳。
function parseTimeToMs(input?: string | null): number | null {
  if (!input) return null
  const timestamp = Date.parse(input)
  if (!Number.isFinite(timestamp)) return null
  return timestamp
}

// 这类文本更像操作步骤、提问或助手话术，不适合作为长期 user memory。
function shouldAutoDeleteMemoryText(text: string): boolean {
  const normalized = normalizeMemoryText(text)
  if (!normalized) return false
  return (
    MEMORY_ASSISTANT_STYLE_TEXT_RE.test(normalized) || MEMORY_PROCEDURAL_TEXT_RE.test(normalized) || isQuestionLikeMemoryText(normalized)
  )
}

// ===== 对外领域类型 =====
// 这些类型给 renderer / service / IPC 调用方使用，表达“业务对象长什么样”。

// 与 renderer 侧类型大体对齐，但在 main 进程独立定义，避免跨层直接耦合。
export type CoworkSessionStatus = 'idle' | 'running' | 'completed' | 'error'
export type CoworkMessageType = 'user' | 'assistant' | 'tool_use' | 'tool_result' | 'system'
export type CoworkExecutionMode = 'auto' | 'local' | 'sandbox'

export interface CoworkMessageMetadata {
  toolName?: string
  toolInput?: Record<string, unknown>
  toolResult?: string
  toolUseId?: string | null
  error?: string
  isError?: boolean
  isStreaming?: boolean
  isFinal?: boolean
  skillIds?: string[]
  [key: string]: unknown
}

export interface CoworkMessage {
  id: string
  type: CoworkMessageType
  content: string
  timestamp: number
  metadata?: CoworkMessageMetadata
}

export interface CoworkSession {
  id: string
  title: string
  claudeSessionId: string | null
  status: CoworkSessionStatus
  pinned: boolean
  cwd: string
  systemPrompt: string
  executionMode: CoworkExecutionMode
  activeSkillIds: string[]
  messages: CoworkMessage[]
  createdAt: number
  updatedAt: number
}

export interface CoworkSessionSummary {
  id: string
  title: string
  status: CoworkSessionStatus
  pinned: boolean
  createdAt: number
  updatedAt: number
}

export type CoworkUserMemoryStatus = 'created' | 'stale' | 'deleted'

export interface CoworkUserMemory {
  id: string
  text: string
  confidence: number
  isExplicit: boolean
  status: CoworkUserMemoryStatus
  createdAt: number
  updatedAt: number
  lastUsedAt: number | null
}

export interface CoworkUserMemorySource {
  id: string
  memoryId: string
  sessionId: string | null
  messageId: string | null
  role: 'user' | 'assistant' | 'tool' | 'system'
  isActive: boolean
  createdAt: number
}

export interface CoworkUserMemorySourceInput {
  sessionId?: string
  messageId?: string
  role?: 'user' | 'assistant' | 'tool' | 'system'
}

export interface CoworkUserMemoryStats {
  total: number
  created: number
  stale: number
  deleted: number
  explicit: number
  implicit: number
}

export interface CoworkConversationSearchRecord {
  sessionId: string
  title: string
  updatedAt: number
  url: string
  human: string
  assistant: string
}

export interface CoworkConfig {
  workingDirectory: string
  systemPrompt: string
  executionMode: CoworkExecutionMode
  memoryEnabled: boolean
  memoryImplicitUpdateEnabled: boolean
  memoryLlmJudgeEnabled: boolean
  memoryGuardLevel: CoworkMemoryGuardLevel
  memoryUserMemoriesMaxItems: number
}

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

export interface ApplyTurnMemoryUpdatesOptions {
  sessionId: string
  userText: string
  assistantText: string
  implicitEnabled: boolean
  memoryLlmJudgeEnabled: boolean
  guardLevel: CoworkMemoryGuardLevel
  userMessageId?: string
  assistantMessageId?: string
}

export interface ApplyTurnMemoryUpdatesResult {
  totalChanges: number
  created: number
  updated: number
  deleted: number
  judgeRejected: number
  llmReviewed: number
  skipped: number
}

let cachedDefaultSystemPrompt: string | null = null

// 默认 system prompt 从内置文件读取，并在进程内做一次缓存。
const getDefaultSystemPrompt = (): string => {
  if (cachedDefaultSystemPrompt !== null) {
    return cachedDefaultSystemPrompt
  }

  try {
    const promptPath = path.join(app.getAppPath(), 'sandbox', 'agent-runner', 'AGENT_SYSTEM_PROMPT.md')
    cachedDefaultSystemPrompt = fs.readFileSync(promptPath, 'utf-8')
  } catch (error) {
    console.warn('Failed to load default system prompt:', error)
    cachedDefaultSystemPrompt = ''
  }

  return cachedDefaultSystemPrompt
}

// ===== 数据库行类型 =====
// 这些 interface 只服务于 SQL 结果映射，字段名保持 snake_case，便于和表结构一一对应。

interface CoworkMessageRow {
  id: string
  type: string
  content: string
  metadata: string | null
  created_at: number
  sequence: number | null
}

interface CoworkUserMemoryRow {
  id: string
  text: string
  fingerprint: string
  confidence: number
  is_explicit: number
  status: string
  created_at: number
  updated_at: number
  last_used_at: number | null
}

/**
 * CoworkStore 封装所有 SQLite 读写细节。
 *
 * 调用方只需要拿领域对象（CoworkSession / CoworkMessage / CoworkUserMemory），
 * 不需要关心表结构、字段名、SQL 细节以及 saveDb 落盘时机。
 */
export class CoworkStore {
  private db: Database
  private saveDb: () => void

  // `saveDb` 由外部注入，Store 只负责在写操作后调用它。
  constructor(db: Database, saveDb: () => void) {
    this.db = db
    this.saveDb = saveDb
  }

  // 基础查询工具：取单行并映射成普通对象。
  private getOne<T>(sql: string, params: (string | number | null)[] = []): T | undefined {
    const result = this.db.exec(sql, params)
    if (!result[0]?.values[0]) return undefined
    const columns = result[0].columns
    const values = result[0].values[0]
    const row: Record<string, unknown> = {}
    columns.forEach((col, i) => {
      row[col] = values[i]
    })
    return row as T
  }

  // 基础查询工具：取多行并映射成普通对象数组。
  private getAll<T>(sql: string, params: (string | number | null)[] = []): T[] {
    const result = this.db.exec(sql, params)
    if (!result[0]?.values) return []
    const columns = result[0].columns
    return result[0].values.map((values) => {
      const row: Record<string, unknown> = {}
      columns.forEach((col, i) => {
        row[col] = values[i]
      })
      return row as T
    })
  }

  // ===== 会话相关 =====

  // 创建新会话，并写入初始运行环境信息。
  createSession(
    title: string,
    cwd: string,
    systemPrompt: string = '',
    executionMode: CoworkExecutionMode = 'local',
    activeSkillIds: string[] = []
  ): CoworkSession {
    const id = uuidv4()
    const now = Date.now()

    this.db.run(
      `
      INSERT INTO cowork_sessions (id, title, claude_session_id, status, cwd, system_prompt, execution_mode, active_skill_ids, pinned, created_at, updated_at)
      VALUES (?, ?, NULL, 'idle', ?, ?, ?, ?, 0, ?, ?)
    `,
      [id, title, cwd, systemPrompt, executionMode, JSON.stringify(activeSkillIds), now, now]
    )

    this.saveDb()

    return {
      id,
      title,
      claudeSessionId: null,
      status: 'idle',
      pinned: false,
      cwd,
      systemPrompt,
      executionMode,
      activeSkillIds,
      messages: [],
      createdAt: now,
      updatedAt: now
    }
  }

  // 读取单个会话，同时把该会话的消息一并装配回来。
  getSession(id: string): CoworkSession | null {
    interface SessionRow {
      id: string
      title: string
      claude_session_id: string | null
      status: string
      pinned?: number | null
      cwd: string
      system_prompt: string
      execution_mode?: string | null
      active_skill_ids?: string | null
      created_at: number
      updated_at: number
    }

    const row = this.getOne<SessionRow>(
      `
      SELECT id, title, claude_session_id, status, pinned, cwd, system_prompt, execution_mode, active_skill_ids, created_at, updated_at
      FROM cowork_sessions
      WHERE id = ?
    `,
      [id]
    )

    if (!row) return null

    const messages = this.getSessionMessages(id)

    let activeSkillIds: string[] = []
    if (row.active_skill_ids) {
      try {
        activeSkillIds = JSON.parse(row.active_skill_ids)
      } catch {
        activeSkillIds = []
      }
    }

    return {
      id: row.id,
      title: row.title,
      claudeSessionId: row.claude_session_id,
      status: row.status as CoworkSessionStatus,
      pinned: Boolean(row.pinned),
      cwd: row.cwd,
      systemPrompt: row.system_prompt,
      executionMode: (row.execution_mode as CoworkExecutionMode) || 'local',
      activeSkillIds,
      messages,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  // 局部更新会话，只修改显式传入的字段。
  updateSession(
    id: string,
    updates: Partial<Pick<CoworkSession, 'title' | 'claudeSessionId' | 'status' | 'cwd' | 'systemPrompt' | 'executionMode'>>
  ): void {
    const now = Date.now()
    const setClauses: string[] = ['updated_at = ?']
    const values: (string | number | null)[] = [now]

    if (updates.title !== undefined) {
      setClauses.push('title = ?')
      values.push(updates.title)
    }
    if (updates.claudeSessionId !== undefined) {
      setClauses.push('claude_session_id = ?')
      values.push(updates.claudeSessionId)
    }
    if (updates.status !== undefined) {
      setClauses.push('status = ?')
      values.push(updates.status)
    }
    if (updates.cwd !== undefined) {
      setClauses.push('cwd = ?')
      values.push(updates.cwd)
    }
    if (updates.systemPrompt !== undefined) {
      setClauses.push('system_prompt = ?')
      values.push(updates.systemPrompt)
    }
    if (updates.executionMode !== undefined) {
      setClauses.push('execution_mode = ?')
      values.push(updates.executionMode)
    }

    values.push(id)
    this.db.run(
      `
      UPDATE cowork_sessions
      SET ${setClauses.join(', ')}
      WHERE id = ?
    `,
      values
    )

    this.saveDb()
  }

  // 删除会话前先让它关联的 memory source 失活，避免留下悬挂来源。
  deleteSession(id: string): void {
    this.markMemorySourcesInactiveBySession(id)
    this.db.run('DELETE FROM cowork_sessions WHERE id = ?', [id])
    this.markOrphanImplicitMemoriesStale()
    this.saveDb()
  }

  // 批量删除版本，逻辑与 deleteSession 一致。
  deleteSessions(ids: string[]): void {
    if (ids.length === 0) return
    for (const id of ids) {
      this.markMemorySourcesInactiveBySession(id)
    }
    const placeholders = ids.map(() => '?').join(',')
    this.db.run(`DELETE FROM cowork_sessions WHERE id IN (${placeholders})`, ids)
    this.markOrphanImplicitMemoriesStale()
    this.saveDb()
  }

  // 置顶只影响排序，不影响会话内容。
  setSessionPinned(id: string, pinned: boolean): void {
    this.db.run('UPDATE cowork_sessions SET pinned = ? WHERE id = ?', [pinned ? 1 : 0, id])
    this.saveDb()
  }

  // 列表页只需要摘要，不需要把消息正文全部加载出来。
  listSessions(): CoworkSessionSummary[] {
    interface SessionSummaryRow {
      id: string
      title: string
      status: string
      pinned: number | null
      created_at: number
      updated_at: number
    }

    const rows = this.getAll<SessionSummaryRow>(`
      SELECT id, title, status, pinned, created_at, updated_at
      FROM cowork_sessions
      ORDER BY pinned DESC, updated_at DESC
    `)

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status as CoworkSessionStatus,
      pinned: Boolean(row.pinned),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }

  // 启动时把异常留在 running 的旧会话重置成 idle，避免 UI 一直显示“运行中”。
  resetRunningSessions(): number {
    const now = Date.now()
    this.db.run(
      `
      UPDATE cowork_sessions
      SET status = 'idle', updated_at = ?
      WHERE status = 'running'
    `,
      [now]
    )
    this.saveDb()

    const changes = this.db.getRowsModified?.()
    return typeof changes === 'number' ? changes : 0
  }

  // 最近目录列表会做归一化和去重，避免 `.lobsterai-tasks` 子目录污染结果。
  listRecentCwds(limit: number = 8): string[] {
    interface CwdRow {
      cwd: string
      updated_at: number
    }

    const rows = this.getAll<CwdRow>(
      `
      SELECT cwd, updated_at
      FROM cowork_sessions
      WHERE cwd IS NOT NULL AND TRIM(cwd) != ''
      ORDER BY updated_at DESC
      LIMIT ?
    `,
      [Math.max(limit * 8, limit)]
    )

    const deduped: string[] = []
    const seen = new Set<string>()
    for (const row of rows) {
      const normalized = normalizeRecentWorkspacePath(row.cwd)
      if (!normalized || seen.has(normalized)) {
        continue
      }
      seen.add(normalized)
      deduped.push(normalized)
      if (deduped.length >= limit) {
        break
      }
    }

    return deduped
  }

  // ===== 消息相关 =====

  // 按稳定顺序取出整个会话的消息流。sequence 优先，created_at / ROWID 兜底。
  private getSessionMessages(sessionId: string): CoworkMessage[] {
    const rows = this.getAll<CoworkMessageRow>(
      `
      SELECT id, type, content, metadata, created_at, sequence
      FROM cowork_messages
      WHERE session_id = ?
      ORDER BY
        COALESCE(sequence, created_at) ASC,
        created_at ASC,
        ROWID ASC
    `,
      [sessionId]
    )

    return rows.map((row) => ({
      id: row.id,
      type: row.type as CoworkMessageType,
      content: row.content,
      timestamp: row.created_at,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    }))
  }

  // 追加一条消息，并同步刷新会话更新时间。
  addMessage(sessionId: string, message: Omit<CoworkMessage, 'id' | 'timestamp'>): CoworkMessage {
    const id = uuidv4()
    const now = Date.now()

    // sequence 用来保证消息展示顺序稳定，尤其是流式更新和补写时。
    const sequenceRow = this.db.exec(
      `
      SELECT COALESCE(MAX(sequence), 0) + 1 as next_seq
      FROM cowork_messages
      WHERE session_id = ?
    `,
      [sessionId]
    )
    const sequence = (sequenceRow[0]?.values[0]?.[0] as number) || 1

    this.db.run(
      `
      INSERT INTO cowork_messages (id, session_id, type, content, metadata, created_at, sequence)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      [id, sessionId, message.type, message.content, message.metadata ? JSON.stringify(message.metadata) : null, now, sequence]
    )

    this.db.run('UPDATE cowork_sessions SET updated_at = ? WHERE id = ?', [now, sessionId])

    this.saveDb()

    return {
      id,
      type: message.type,
      content: message.content,
      timestamp: now,
      metadata: message.metadata
    }
  }

  // 更新已有消息，常用于 assistant 流式输出过程中的增量刷新。
  updateMessage(sessionId: string, messageId: string, updates: { content?: string; metadata?: CoworkMessageMetadata }): void {
    const setClauses: string[] = []
    const values: (string | null)[] = []

    if (updates.content !== undefined) {
      setClauses.push('content = ?')
      values.push(updates.content)
    }
    if (updates.metadata !== undefined) {
      setClauses.push('metadata = ?')
      values.push(updates.metadata ? JSON.stringify(updates.metadata) : null)
    }

    if (setClauses.length === 0) return

    values.push(messageId)
    values.push(sessionId)
    this.db.run(
      `
      UPDATE cowork_messages
      SET ${setClauses.join(', ')}
      WHERE id = ? AND session_id = ?
    `,
      values
    )

    this.saveDb()
  }

  // ===== 配置相关 =====

  // 读取 cowork 全局配置；缺失项回落到默认值。
  getConfig(): CoworkConfig {
    interface ConfigRow {
      value: string
    }

    const workingDirRow = this.getOne<ConfigRow>('SELECT value FROM cowork_config WHERE key = ?', ['workingDirectory'])
    const executionModeRow = this.getOne<ConfigRow>('SELECT value FROM cowork_config WHERE key = ?', ['executionMode'])
    const memoryEnabledRow = this.getOne<ConfigRow>('SELECT value FROM cowork_config WHERE key = ?', ['memoryEnabled'])
    const memoryImplicitUpdateEnabledRow = this.getOne<ConfigRow>('SELECT value FROM cowork_config WHERE key = ?', [
      'memoryImplicitUpdateEnabled'
    ])
    const memoryLlmJudgeEnabledRow = this.getOne<ConfigRow>('SELECT value FROM cowork_config WHERE key = ?', ['memoryLlmJudgeEnabled'])
    const memoryGuardLevelRow = this.getOne<ConfigRow>('SELECT value FROM cowork_config WHERE key = ?', ['memoryGuardLevel'])
    const memoryUserMemoriesMaxItemsRow = this.getOne<ConfigRow>('SELECT value FROM cowork_config WHERE key = ?', [
      'memoryUserMemoriesMaxItems'
    ])

    const normalizedExecutionMode = executionModeRow?.value === 'container' ? 'sandbox' : (executionModeRow?.value as CoworkExecutionMode)

    return {
      workingDirectory: workingDirRow?.value || getDefaultWorkingDirectory(),
      systemPrompt: getDefaultSystemPrompt(),
      executionMode: normalizedExecutionMode || 'local',
      memoryEnabled: parseBooleanConfig(memoryEnabledRow?.value, DEFAULT_MEMORY_ENABLED),
      memoryImplicitUpdateEnabled: parseBooleanConfig(memoryImplicitUpdateEnabledRow?.value, DEFAULT_MEMORY_IMPLICIT_UPDATE_ENABLED),
      memoryLlmJudgeEnabled: parseBooleanConfig(memoryLlmJudgeEnabledRow?.value, DEFAULT_MEMORY_LLM_JUDGE_ENABLED),
      memoryGuardLevel: normalizeMemoryGuardLevel(memoryGuardLevelRow?.value),
      memoryUserMemoriesMaxItems: clampMemoryUserMemoriesMaxItems(Number(memoryUserMemoriesMaxItemsRow?.value))
    }
  }

  // 局部写配置，统一使用 UPSERT，兼容新旧数据库。
  setConfig(config: CoworkConfigUpdate): void {
    const now = Date.now()

    if (config.workingDirectory !== undefined) {
      this.db.run(
        `
        INSERT INTO cowork_config (key, value, updated_at)
        VALUES ('workingDirectory', ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = excluded.updated_at
      `,
        [config.workingDirectory, now]
      )
    }

    if (config.executionMode !== undefined) {
      this.db.run(
        `
        INSERT INTO cowork_config (key, value, updated_at)
        VALUES ('executionMode', ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = excluded.updated_at
      `,
        [config.executionMode, now]
      )
    }

    if (config.memoryEnabled !== undefined) {
      this.db.run(
        `
        INSERT INTO cowork_config (key, value, updated_at)
        VALUES ('memoryEnabled', ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = excluded.updated_at
      `,
        [config.memoryEnabled ? '1' : '0', now]
      )
    }

    if (config.memoryImplicitUpdateEnabled !== undefined) {
      this.db.run(
        `
        INSERT INTO cowork_config (key, value, updated_at)
        VALUES ('memoryImplicitUpdateEnabled', ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = excluded.updated_at
      `,
        [config.memoryImplicitUpdateEnabled ? '1' : '0', now]
      )
    }

    if (config.memoryLlmJudgeEnabled !== undefined) {
      this.db.run(
        `
        INSERT INTO cowork_config (key, value, updated_at)
        VALUES ('memoryLlmJudgeEnabled', ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = excluded.updated_at
      `,
        [config.memoryLlmJudgeEnabled ? '1' : '0', now]
      )
    }

    if (config.memoryGuardLevel !== undefined) {
      this.db.run(
        `
        INSERT INTO cowork_config (key, value, updated_at)
        VALUES ('memoryGuardLevel', ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = excluded.updated_at
      `,
        [normalizeMemoryGuardLevel(config.memoryGuardLevel), now]
      )
    }

    if (config.memoryUserMemoriesMaxItems !== undefined) {
      this.db.run(
        `
        INSERT INTO cowork_config (key, value, updated_at)
        VALUES ('memoryUserMemoriesMaxItems', ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = excluded.updated_at
      `,
        [String(clampMemoryUserMemoriesMaxItems(config.memoryUserMemoriesMaxItems)), now]
      )
    }

    this.saveDb()
  }

  // app 语言仍然放在通用 kv 表，这里只是提供一个便捷读取入口。
  getAppLanguage(): 'zh' | 'en' {
    interface KvRow {
      value: string
    }

    const row = this.getOne<KvRow>('SELECT value FROM kv WHERE key = ?', ['app_config'])
    if (!row?.value) {
      return 'zh'
    }

    try {
      const config = JSON.parse(row.value) as { language?: string }
      return config.language === 'en' ? 'en' : 'zh'
    } catch {
      return 'zh'
    }
  }

  // ===== 用户记忆相关 =====

  // 把数据库 row 映射成对外的领域对象，并顺手做数字 / 状态兜底。
  private mapMemoryRow(row: CoworkUserMemoryRow): CoworkUserMemory {
    return {
      id: row.id,
      text: row.text,
      confidence: Number.isFinite(Number(row.confidence)) ? Number(row.confidence) : 0.7,
      isExplicit: Boolean(row.is_explicit),
      status: (row.status === 'stale' || row.status === 'deleted' ? row.status : 'created') as CoworkUserMemoryStatus,
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at),
      lastUsedAt: row.last_used_at === null ? null : Number(row.last_used_at)
    }
  }

  // 为一条记忆追加来源链路，用于回溯它来自哪个会话、哪条消息。
  private addMemorySource(memoryId: string, source?: CoworkUserMemorySourceInput): void {
    const now = Date.now()
    this.db.run(
      `
      INSERT INTO user_memory_sources (id, memory_id, session_id, message_id, role, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, 1, ?)
    `,
      [uuidv4(), memoryId, source?.sessionId || null, source?.messageId || null, source?.role || 'system', now]
    )
  }

  /**
   * 记忆写入核心入口：
   * 1. 归一化文本
   * 2. 先按 fingerprint 精确去重
   * 3. 再按语义相似度做近重复合并
   * 4. 命中就“复活并更新”，否则新建
   */
  private createOrReviveUserMemory(input: {
    text: string
    confidence?: number
    isExplicit?: boolean
    source?: CoworkUserMemorySourceInput
  }): { memory: CoworkUserMemory; created: boolean; updated: boolean } {
    const normalizedText = truncate(normalizeMemoryText(input.text), 360)
    if (!normalizedText) {
      throw new Error('Memory text is required')
    }

    const now = Date.now()
    const fingerprint = buildMemoryFingerprint(normalizedText)
    const confidence = Math.max(0, Math.min(1, Number.isFinite(input.confidence) ? Number(input.confidence) : 0.75))
    const explicitFlag = input.isExplicit ? 1 : 0

    let existing = this.getOne<CoworkUserMemoryRow>(
      `
      SELECT id, text, fingerprint, confidence, is_explicit, status, created_at, updated_at, last_used_at
      FROM user_memories
      WHERE fingerprint = ? AND status != 'deleted'
      ORDER BY updated_at DESC
      LIMIT 1
    `,
      [fingerprint]
    )

    if (!existing) {
      const incomingSemanticKey = normalizeMemorySemanticKey(normalizedText)
      if (incomingSemanticKey) {
        const candidates = this.getAll<CoworkUserMemoryRow>(`
          SELECT id, text, fingerprint, confidence, is_explicit, status, created_at, updated_at, last_used_at
          FROM user_memories
          WHERE status != 'deleted'
          ORDER BY updated_at DESC
          LIMIT 200
        `)
        let bestCandidate: CoworkUserMemoryRow | null = null
        let bestScore = 0
        for (const candidate of candidates) {
          const candidateSemanticKey = normalizeMemorySemanticKey(candidate.text)
          if (!candidateSemanticKey) continue
          const score = scoreMemorySimilarity(candidateSemanticKey, incomingSemanticKey)
          if (score <= bestScore) continue
          bestScore = score
          bestCandidate = candidate
        }
        if (bestCandidate && bestScore >= MEMORY_NEAR_DUPLICATE_MIN_SCORE) {
          existing = bestCandidate
        }
      }
    }

    if (existing) {
      const mergedText = choosePreferredMemoryText(existing.text, normalizedText)
      const mergedExplicit = existing.is_explicit ? 1 : explicitFlag
      const mergedConfidence = Math.max(Number(existing.confidence) || 0, confidence)
      this.db.run(
        `
        UPDATE user_memories
        SET text = ?, fingerprint = ?, confidence = ?, is_explicit = ?, status = 'created', updated_at = ?
        WHERE id = ?
      `,
        [mergedText, buildMemoryFingerprint(mergedText), mergedConfidence, mergedExplicit, now, existing.id]
      )
      this.addMemorySource(existing.id, input.source)
      const memory = this.getOne<CoworkUserMemoryRow>(
        `
        SELECT id, text, fingerprint, confidence, is_explicit, status, created_at, updated_at, last_used_at
        FROM user_memories
        WHERE id = ?
      `,
        [existing.id]
      )
      if (!memory) {
        throw new Error('Failed to reload updated memory')
      }
      return { memory: this.mapMemoryRow(memory), created: false, updated: true }
    }

    const id = uuidv4()
    this.db.run(
      `
      INSERT INTO user_memories (
        id, text, fingerprint, confidence, is_explicit, status, created_at, updated_at, last_used_at
      ) VALUES (?, ?, ?, ?, ?, 'created', ?, ?, NULL)
    `,
      [id, normalizedText, fingerprint, confidence, explicitFlag, now, now]
    )
    this.addMemorySource(id, input.source)

    const memory = this.getOne<CoworkUserMemoryRow>(
      `
      SELECT id, text, fingerprint, confidence, is_explicit, status, created_at, updated_at, last_used_at
      FROM user_memories
      WHERE id = ?
    `,
      [id]
    )
    if (!memory) {
      throw new Error('Failed to load created memory')
    }

    return { memory: this.mapMemoryRow(memory), created: true, updated: false }
  }

  // 按状态、关键字和分页列出记忆，主要给设置页和调试面板用。
  listUserMemories(
    options: {
      query?: string
      status?: CoworkUserMemoryStatus | 'all'
      limit?: number
      offset?: number
      includeDeleted?: boolean
    } = {}
  ): CoworkUserMemory[] {
    const query = normalizeMemoryText(options.query || '')
    const includeDeleted = Boolean(options.includeDeleted)
    const status = options.status || 'all'
    const limit = Math.max(1, Math.min(200, Math.floor(options.limit ?? 200)))
    const offset = Math.max(0, Math.floor(options.offset ?? 0))

    const clauses: string[] = []
    const params: Array<string | number> = []

    if (!includeDeleted && status === 'all') {
      clauses.push(`status != 'deleted'`)
    }
    if (status !== 'all') {
      clauses.push('status = ?')
      params.push(status)
    }
    if (query) {
      clauses.push('LOWER(text) LIKE ?')
      params.push(`%${query.toLowerCase()}%`)
    }

    const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''

    const rows = this.getAll<CoworkUserMemoryRow>(
      `
      SELECT id, text, fingerprint, confidence, is_explicit, status, created_at, updated_at, last_used_at
      FROM user_memories
      ${whereClause}
      ORDER BY updated_at DESC
      LIMIT ? OFFSET ?
    `,
      [...params, limit, offset]
    )

    return rows.map((row) => this.mapMemoryRow(row))
  }

  // 显式创建一条记忆，属于直接写入入口。
  createUserMemory(input: {
    text: string
    confidence?: number
    isExplicit?: boolean
    source?: CoworkUserMemorySourceInput
  }): CoworkUserMemory {
    const result = this.createOrReviveUserMemory(input)
    this.saveDb()
    return result.memory
  }

  // 直接编辑单条记忆，不做抽取和判重。
  updateUserMemory(input: {
    id: string
    text?: string
    confidence?: number
    status?: CoworkUserMemoryStatus
    isExplicit?: boolean
  }): CoworkUserMemory | null {
    const current = this.getOne<CoworkUserMemoryRow>(
      `
      SELECT id, text, fingerprint, confidence, is_explicit, status, created_at, updated_at, last_used_at
      FROM user_memories
      WHERE id = ?
    `,
      [input.id]
    )
    if (!current) return null

    const now = Date.now()
    const nextText = input.text !== undefined ? truncate(normalizeMemoryText(input.text), 360) : current.text
    if (!nextText) {
      throw new Error('Memory text is required')
    }
    const nextConfidence = input.confidence !== undefined ? Math.max(0, Math.min(1, Number(input.confidence))) : Number(current.confidence)
    const nextStatus =
      input.status && (input.status === 'created' || input.status === 'stale' || input.status === 'deleted') ? input.status : current.status
    const nextExplicit = input.isExplicit !== undefined ? (input.isExplicit ? 1 : 0) : current.is_explicit

    this.db.run(
      `
      UPDATE user_memories
      SET text = ?, fingerprint = ?, confidence = ?, is_explicit = ?, status = ?, updated_at = ?
      WHERE id = ?
    `,
      [nextText, buildMemoryFingerprint(nextText), nextConfidence, nextExplicit, nextStatus, now, input.id]
    )

    const updated = this.getOne<CoworkUserMemoryRow>(
      `
      SELECT id, text, fingerprint, confidence, is_explicit, status, created_at, updated_at, last_used_at
      FROM user_memories
      WHERE id = ?
    `,
      [input.id]
    )

    this.saveDb()
    return updated ? this.mapMemoryRow(updated) : null
  }

  // 软删除记忆，并把它的所有来源全部置为 inactive。
  deleteUserMemory(id: string): boolean {
    const now = Date.now()
    this.db.run(
      `
      UPDATE user_memories
      SET status = 'deleted', updated_at = ?
      WHERE id = ?
    `,
      [now, id]
    )
    this.db.run(
      `
      UPDATE user_memory_sources
      SET is_active = 0
      WHERE memory_id = ?
    `,
      [id]
    )
    this.saveDb()
    return (this.db.getRowsModified?.() || 0) > 0
  }

  // 聚合统计信息，方便 UI 展示 created / stale / deleted / explicit / implicit。
  getUserMemoryStats(): CoworkUserMemoryStats {
    const rows = this.getAll<{
      status: string
      is_explicit: number
      count: number
    }>(`
      SELECT status, is_explicit, COUNT(*) AS count
      FROM user_memories
      GROUP BY status, is_explicit
    `)

    const stats: CoworkUserMemoryStats = {
      total: 0,
      created: 0,
      stale: 0,
      deleted: 0,
      explicit: 0,
      implicit: 0
    }

    for (const row of rows) {
      const count = Number(row.count) || 0
      stats.total += count
      if (row.status === 'created') stats.created += count
      if (row.status === 'stale') stats.stale += count
      if (row.status === 'deleted') stats.deleted += count
      if (row.is_explicit) stats.explicit += count
      else stats.implicit += count
    }

    return stats
  }

  // 自动清掉明显不是“用户画像”的记忆，例如命令、问题句和助手话术。
  autoDeleteNonPersonalMemories(): number {
    const rows = this.getAll<Pick<CoworkUserMemoryRow, 'id' | 'text'>>(`SELECT id, text FROM user_memories WHERE status = 'created'`)
    if (rows.length === 0) return 0

    const now = Date.now()
    let deleted = 0
    for (const row of rows) {
      if (!shouldAutoDeleteMemoryText(row.text)) {
        continue
      }
      this.db.run(
        `
        UPDATE user_memories
        SET status = 'deleted', updated_at = ?
        WHERE id = ?
      `,
        [now, row.id]
      )
      this.db.run(
        `
        UPDATE user_memory_sources
        SET is_active = 0
        WHERE memory_id = ?
      `,
        [row.id]
      )
      deleted += 1
    }

    if (deleted > 0) {
      this.saveDb()
    }
    return deleted
  }

  // 某个会话被删掉后，它挂过来的 source 也应该全部失效。
  markMemorySourcesInactiveBySession(sessionId: string): void {
    this.db.run(
      `
      UPDATE user_memory_sources
      SET is_active = 0
      WHERE session_id = ? AND is_active = 1
    `,
      [sessionId]
    )
  }

  // 失去所有 active source 的隐式记忆会降级为 stale。
  markOrphanImplicitMemoriesStale(): void {
    const now = Date.now()
    this.db.run(
      `
      UPDATE user_memories
      SET status = 'stale', updated_at = ?
      WHERE is_explicit = 0
        AND status = 'created'
        AND NOT EXISTS (
          SELECT 1
          FROM user_memory_sources s
          WHERE s.memory_id = user_memories.id AND s.is_active = 1
        )
    `,
      [now]
    )
  }

  /**
   * 处理一整轮对话带来的记忆变更：
   * - 从 user / assistant 文本中抽取 add / delete 候选
   * - add 候选先过 judge，再写入或合并
   * - delete 候选按模糊匹配找到目标并软删除
   * - 最后把失去来源的隐式记忆降为 stale
   */
  async applyTurnMemoryUpdates(options: ApplyTurnMemoryUpdatesOptions): Promise<ApplyTurnMemoryUpdatesResult> {
    const result: ApplyTurnMemoryUpdatesResult = {
      totalChanges: 0,
      created: 0,
      updated: 0,
      deleted: 0,
      judgeRejected: 0,
      llmReviewed: 0,
      skipped: 0
    }

    const extracted = extractTurnMemoryChanges({
      userText: options.userText,
      assistantText: options.assistantText,
      guardLevel: options.guardLevel,
      maxImplicitAdds: options.implicitEnabled ? 2 : 0
    })
    result.totalChanges = extracted.length

    for (const change of extracted) {
      if (change.action === 'add') {
        if (!options.implicitEnabled && !change.isExplicit) {
          result.skipped += 1
          continue
        }
        const judge = await judgeMemoryCandidate({
          text: change.text,
          isExplicit: change.isExplicit,
          guardLevel: options.guardLevel,
          llmEnabled: options.memoryLlmJudgeEnabled
        })
        if (judge.source === 'llm') {
          result.llmReviewed += 1
        }
        if (!judge.accepted) {
          result.judgeRejected += 1
          result.skipped += 1
          continue
        }

        const write = this.createOrReviveUserMemory({
          text: change.text,
          confidence: change.confidence,
          isExplicit: change.isExplicit,
          source: {
            role: 'user',
            sessionId: options.sessionId,
            messageId: options.userMessageId
          }
        })

        if (!change.isExplicit && options.assistantMessageId) {
          this.addMemorySource(write.memory.id, {
            role: 'assistant',
            sessionId: options.sessionId,
            messageId: options.assistantMessageId
          })
        }

        if (write.created) result.created += 1
        else if (write.updated) result.updated += 1
        else result.skipped += 1
        continue
      }

      // delete 不要求全文完全一致，而是按片段去找最可能匹配的那条记忆。
      const key = normalizeMemoryMatchKey(change.text)
      if (!key) {
        result.skipped += 1
        continue
      }

      const candidates = this.listUserMemories({ status: 'all', includeDeleted: false, limit: 100 })
      let target: CoworkUserMemory | null = null
      let bestScore = 0
      for (const entry of candidates) {
        const currentKey = normalizeMemoryMatchKey(entry.text)
        if (!currentKey) continue
        const score = scoreDeleteMatch(currentKey, key)
        if (score <= bestScore) continue
        bestScore = score
        target = entry
      }

      if (!target) {
        result.skipped += 1
        continue
      }

      const deleted = this.deleteUserMemory(target.id)
      if (deleted) result.deleted += 1
      else result.skipped += 1
    }

    this.markOrphanImplicitMemoriesStale()
    this.saveDb()
    return result
  }

  // ===== 检索相关 =====

  // 给搜索结果或最近会话补一条最后的 user / assistant 摘要。
  private getLatestMessageByType(sessionId: string, type: 'user' | 'assistant'): string {
    const row = this.getOne<{ content: string }>(
      `
      SELECT content
      FROM cowork_messages
      WHERE session_id = ? AND type = ?
      ORDER BY created_at DESC, ROWID DESC
      LIMIT 1
    `,
      [sessionId, type]
    )
    return truncate((row?.content || '').replace(/\s+/g, ' ').trim(), 280)
  }

  // 按消息正文做关键词搜索，再按 session 聚合成展示记录。
  conversationSearch(options: { query: string; maxResults?: number; before?: string; after?: string }): CoworkConversationSearchRecord[] {
    const terms = extractConversationSearchTerms(options.query)
    if (terms.length === 0) return []

    const maxResults = Math.max(1, Math.min(10, Math.floor(options.maxResults ?? 5)))
    const beforeMs = parseTimeToMs(options.before)
    const afterMs = parseTimeToMs(options.after)

    const likeClauses = terms.map(() => 'LOWER(m.content) LIKE ?')
    const clauses: string[] = ["m.type IN ('user', 'assistant')", `(${likeClauses.join(' OR ')})`]
    const params: Array<string | number> = terms.map((term) => `%${term}%`)

    if (beforeMs !== null) {
      clauses.push('m.created_at < ?')
      params.push(beforeMs)
    }
    if (afterMs !== null) {
      clauses.push('m.created_at > ?')
      params.push(afterMs)
    }

    const rows = this.getAll<{
      session_id: string
      title: string
      updated_at: number
      type: string
      content: string
      created_at: number
    }>(
      `
      SELECT m.session_id, s.title, s.updated_at, m.type, m.content, m.created_at
      FROM cowork_messages m
      INNER JOIN cowork_sessions s ON s.id = m.session_id
      WHERE ${clauses.join(' AND ')}
      ORDER BY m.created_at DESC
      LIMIT ?
    `,
      [...params, maxResults * 40]
    )

    const bySession = new Map<string, CoworkConversationSearchRecord>()
    for (const row of rows) {
      if (!row.session_id) continue
      let current = bySession.get(row.session_id)
      if (!current) {
        current = {
          sessionId: row.session_id,
          title: row.title || 'Untitled',
          updatedAt: Number(row.updated_at) || 0,
          url: `https://claude.ai/chat/${row.session_id}`,
          human: '',
          assistant: ''
        }
        bySession.set(row.session_id, current)
      }

      const snippet = truncate((row.content || '').replace(/\s+/g, ' ').trim(), 280)
      if (row.type === 'user' && !current.human) {
        current.human = snippet
      }
      if (row.type === 'assistant' && !current.assistant) {
        current.assistant = snippet
      }

      if (bySession.size >= maxResults) {
        const complete = Array.from(bySession.values()).every((entry) => entry.human && entry.assistant)
        if (complete) break
      }
    }

    const records = Array.from(bySession.values())
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, maxResults)
      .map((entry) => ({
        ...entry,
        human: entry.human || this.getLatestMessageByType(entry.sessionId, 'user'),
        assistant: entry.assistant || this.getLatestMessageByType(entry.sessionId, 'assistant')
      }))

    return records
  }

  // 直接按会话更新时间取最近聊天，并补齐最后的人类/助手消息摘要。
  recentChats(options: { n?: number; sortOrder?: 'asc' | 'desc'; before?: string; after?: string }): CoworkConversationSearchRecord[] {
    const n = Math.max(1, Math.min(20, Math.floor(options.n ?? 3)))
    const sortOrder = options.sortOrder === 'asc' ? 'asc' : 'desc'
    const beforeMs = parseTimeToMs(options.before)
    const afterMs = parseTimeToMs(options.after)

    const clauses: string[] = []
    const params: Array<string | number> = []

    if (beforeMs !== null) {
      clauses.push('updated_at < ?')
      params.push(beforeMs)
    }
    if (afterMs !== null) {
      clauses.push('updated_at > ?')
      params.push(afterMs)
    }

    const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''

    const rows = this.getAll<{
      id: string
      title: string
      updated_at: number
    }>(
      `
      SELECT id, title, updated_at
      FROM cowork_sessions
      ${whereClause}
      ORDER BY updated_at ${sortOrder.toUpperCase()}
      LIMIT ?
    `,
      [...params, n]
    )

    return rows.map((row) => ({
      sessionId: row.id,
      title: row.title || 'Untitled',
      updatedAt: Number(row.updated_at) || 0,
      url: `https://claude.ai/chat/${row.id}`,
      human: this.getLatestMessageByType(row.id, 'user'),
      assistant: this.getLatestMessageByType(row.id, 'assistant')
    }))
  }
}
