/**
 * 这个文件负责从一轮 Cowork 对话中抽取“可能应该进入长期记忆系统”的变更候选。
 *
 * 主要职责：
 * 1. 识别用户显式发出的“记住/删除记忆”指令。
 * 2. 从自然表达里提取隐式的个人资料、所有权信息、偏好和助手风格偏好。
 * 3. 过滤寒暄、问句、临时话题、命令行步骤等不适合长期保存的内容。
 * 4. 输出统一的记忆变更结构，供 `coworkStore` 再做持久化和审计。
 */

// 显式要求“新增记忆”的指令模式。
const EXPLICIT_ADD_RE =
  /(?:^|\n)\s*(?:请)?(?:记住|记下|保存到记忆|保存记忆|写入记忆|remember(?:\s+this|\s+that)?|store\s+(?:this|that)\s+in\s+memory)\s*[:：,，]?\s*(.+)$/gim

// 显式要求“删除记忆”的指令模式。
const EXPLICIT_DELETE_RE =
  /(?:^|\n)\s*(?:请)?(?:删除记忆|从记忆中删除|忘掉|忘记这条|forget\s+this|remove\s+from\s+memory)\s*[:：,，]?\s*(.+)$/gim

// 先移除代码块，避免把代码示例误判成记忆。
const CODE_BLOCK_RE = /```[\s\S]*?```/g

// 常见寒暄或确认语，不应进入长期记忆。
const SMALL_TALK_RE = /^(ok|okay|thanks|thank\s+you|好的|收到|明白|行|嗯|谢谢)[.!? ]*$/i

// 很短但仍可能代表稳定事实的信号。
const SHORT_FACT_SIGNAL_RE =
  /(我叫|我是|我的名字是|我名字是|名字叫|我有(?!\s*(?:一个|个)?问题)|我养了|我家有|\bmy\s+name\s+is\b|\bi\s+am\b|\bi['’]?m\b|\bi\s+have\b|\bi\s+own\b)/i

// 明显是临时报错、当前问题的描述，不适合长期保存。
const NON_DURABLE_TOPIC_RE = /(我有\s*(?:一个|个)?问题|有个问题|报错|出现异常|exception|stack\s*trace)/i

// 个人档案类信息，如姓名、居住地、职业。
const PERSONAL_PROFILE_SIGNAL_RE =
  /(我叫|我是|我的名字是|我名字是|名字叫|我住在|我来自|我是做|我的职业|\bmy\s+name\s+is\b|\bi\s+am\b|\bi['’]?m\b|\bi\s+live\s+in\b|\bi['’]?m\s+from\b|\bi\s+work\s+as\b)/i

// 个人所有权或家庭成员类长期信息。
const PERSONAL_OWNERSHIP_SIGNAL_RE =
  /(我有(?!\s*(?:一个|个)?问题)|我养了|我家有|我女儿|我儿子|我的孩子|我的小狗|我的小猫|\bi\s+have\b|\bi\s+own\b|\bmy\s+(?:daughter|son|child|dog|cat)\b)/i

// 个人偏好类长期信息。
const PERSONAL_PREFERENCE_SIGNAL_RE =
  /(我喜欢|我偏好|我习惯|我常用|我不喜欢|我讨厌|我更喜欢|\bi\s+prefer\b|\bi\s+like\b|\bi\s+usually\b|\bi\s+often\b|\bi\s+don['’]?\s*t\s+like\b|\bi\s+hate\b)/i

// 用户对助手回复语言、格式、风格等的长期偏好。
const ASSISTANT_PREFERENCE_SIGNAL_RE =
  /((请|以后|后续|默认|请始终|不要再|请不要|优先|务必).*(回复|回答|语言|中文|英文|格式|风格|语气|简洁|详细|代码|命名|markdown|respond|reply|language|format|style|tone))/i

// 形如“来源: ...”的说明行，通常是元信息而不是记忆正文。
const SOURCE_STYLE_LINE_RE = /^(?:来源|source)\s*[:：]/i

// 形如“输入文件: ...”的说明行，通常是临时上下文。
const ATTACHMENT_STYLE_LINE_RE = /^(?:输入文件|input\s*file)\s*[:：]/i

// 带明确时间性的内容默认视为短期信息。
const TRANSIENT_SIGNAL_RE =
  /(今天|昨日|昨天|刚刚|刚才|本周|本月|news|breaking|快讯|新闻|\b(19|20)\d{2}[./-]\d{1,2}[./-]\d{1,2}\b|\d{4}年\d{1,2}月\d{1,2}日|\d{1,2}月\d{1,2}日)/i

// 用于裁掉“帮我看下/帮我处理”这类请求尾巴，只保留可能值得记住的前半句。
const REQUEST_TAIL_SPLIT_RE =
  /[,，。]\s*(?:请|麻烦)?你(?:帮我|帮忙|给我|为我|看下|看一下|查下|查一下)|[,，。]\s*帮我|[,，。]\s*请帮我|[,，。]\s*(?:能|可以)不能?\s*帮我|[,，。]\s*你看|[,，。]\s*请你/i

// 命令、脚本、环境变量等流程性内容，不应长期记忆。
const PROCEDURAL_CANDIDATE_RE =
  /(执行以下命令|run\s+(?:the\s+)?following\s+command|\b(?:cd|npm|pnpm|yarn|node|python|bash|sh|git|curl|wget)\b|\$[A-Z_][A-Z0-9_]*|&&|--[a-z0-9-]+|\/tmp\/|\.sh\b|\.bat\b|\.ps1\b)/i

// 明显是在要求使用某个技能/工具的句子，不属于用户长期偏好。
const ASSISTANT_STYLE_CANDIDATE_RE = /^(?:使用|use)\s+[A-Za-z0-9._-]+\s*(?:技能|skill)/i

// 中文问句常见前缀。
const CHINESE_QUESTION_PREFIX_RE =
  /^(?:请问|问下|问一下|是否|能否|可否|为什么|为何|怎么|如何|谁|什么|哪(?:里|儿|个)?|几|多少|要不要|会不会|是不是|能不能|可不可以|行不行|对不对|好不好)/u

// 英文问句常见前缀。
const ENGLISH_QUESTION_PREFIX_RE = /^(?:what|who|why|how|when|where|which|is|are|am|do|does|did|can|could|would|will|should)\b/i

// 句子内部的疑问表达。
const QUESTION_INLINE_RE = /(是不是|能不能|可不可以|要不要|会不会|有没有|对不对|好不好)/i

// 句尾疑问语气词。
const QUESTION_SUFFIX_RE = /(吗|么|呢|嘛)\s*$/u

// 控制隐式记忆提取时的保守程度。
export type CoworkMemoryGuardLevel = 'strict' | 'standard' | 'relaxed'

// 单条记忆变更的统一输出结构。
export interface ExtractedMemoryChange {
  action: 'add' | 'delete'
  text: string
  confidence: number
  isExplicit: boolean
  reason: string
}

// 提取一轮对话记忆时的输入参数。
export interface ExtractTurnMemoryOptions {
  userText: string
  assistantText: string
  guardLevel: CoworkMemoryGuardLevel
  maxImplicitAdds?: number
}

// 统一文本空白并去除首尾空格。
function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

// 判断文本是否更像问句，避免把提问内容错误写入长期记忆。
export function isQuestionLikeMemoryText(text: string): boolean {
  const normalized = normalizeText(text)
    .replace(/[。！!]+$/g, '')
    .trim()
  if (!normalized) return false
  if (/[？?]\s*$/.test(normalized)) return true
  if (CHINESE_QUESTION_PREFIX_RE.test(normalized)) return true
  if (ENGLISH_QUESTION_PREFIX_RE.test(normalized)) return true
  if (QUESTION_INLINE_RE.test(normalized)) return true
  if (QUESTION_SUFFIX_RE.test(normalized)) return true
  return false
}

// 过滤掉不适合进入记忆系统的候选文本。
function shouldKeepCandidate(text: string): boolean {
  const trimmed = normalizeText(text)
  if (!trimmed) return false
  if (trimmed.length < 6 && !SHORT_FACT_SIGNAL_RE.test(trimmed)) return false
  if (SMALL_TALK_RE.test(trimmed)) return false
  if (isQuestionLikeMemoryText(trimmed)) return false
  if (ASSISTANT_STYLE_CANDIDATE_RE.test(trimmed)) return false
  if (PROCEDURAL_CANDIDATE_RE.test(trimmed)) return false
  return true
}

// 清洗隐式候选文本，裁掉请求尾巴和多余标点。
function sanitizeImplicitCandidate(text: string): string {
  const normalized = normalizeText(text)
  if (!normalized) return ''
  const tailMatch = normalized.match(REQUEST_TAIL_SPLIT_RE)
  const clipped = tailMatch?.index && tailMatch.index > 0 ? normalized.slice(0, tailMatch.index) : normalized
  return normalizeText(clipped.replace(/[，,；;:\-]+$/, ''))
}

// 根据守卫等级返回隐式记忆允许通过的最低置信度。
function confidenceThreshold(level: CoworkMemoryGuardLevel): number {
  if (level === 'strict') return 0.85
  if (level === 'relaxed') return 0.5
  return 0.65
}

// 提取显式记忆增删指令，并生成标准化记忆变更记录。
function extractExplicit(text: string, action: 'add' | 'delete', pattern: RegExp, reason: string): ExtractedMemoryChange[] {
  const result: ExtractedMemoryChange[] = []
  const seen = new Set<string>()
  pattern.lastIndex = 0
  let match: RegExpExecArray | null = null
  while ((match = pattern.exec(text)) !== null) {
    const raw = normalizeText(match[1] || '')
    if (!shouldKeepCandidate(raw)) continue
    const key = raw.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push({
      action,
      text: raw,
      confidence: 0.99,
      isExplicit: true,
      reason
    })
  }
  return result
}

// 从当前轮对话里提取隐式可记忆信息。
function extractImplicit(options: ExtractTurnMemoryOptions): ExtractedMemoryChange[] {
  const requestedMaxImplicitAdds = Number.isFinite(options.maxImplicitAdds) ? Number(options.maxImplicitAdds) : 2
  const maxImplicitAdds = Math.max(0, Math.min(2, Math.floor(requestedMaxImplicitAdds)))
  if (maxImplicitAdds === 0) return []

  const threshold = confidenceThreshold(options.guardLevel)
  const strippedUser = options.userText.replace(CODE_BLOCK_RE, ' ').trim()
  const strippedAssistant = options.assistantText.replace(CODE_BLOCK_RE, ' ').trim()
  if (!strippedUser || !strippedAssistant) return []

  const candidates = strippedUser
    .split(/[。！？!?；;\n]/g)
    .map((line) => normalizeText(line))
    .filter(Boolean)

  const result: ExtractedMemoryChange[] = []
  const seen = new Set<string>()

  for (const rawCandidate of candidates) {
    const candidate = sanitizeImplicitCandidate(rawCandidate)
    if (!shouldKeepCandidate(candidate)) continue

    const key = candidate.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    // 当前问题、报错等临时主题直接跳过。
    if (NON_DURABLE_TOPIC_RE.test(candidate)) continue

    // 来源行、附件行这类元信息不应进入记忆。
    if (SOURCE_STYLE_LINE_RE.test(candidate) || ATTACHMENT_STYLE_LINE_RE.test(candidate)) {
      continue
    }

    // 带强时效性的内容，只有在确实是个人资料/所有权/助手偏好时才保留。
    if (
      TRANSIENT_SIGNAL_RE.test(candidate) &&
      !PERSONAL_PROFILE_SIGNAL_RE.test(candidate) &&
      !PERSONAL_OWNERSHIP_SIGNAL_RE.test(candidate) &&
      !ASSISTANT_PREFERENCE_SIGNAL_RE.test(candidate)
    ) {
      continue
    }

    let confidence = 0
    let reason = ''

    // 不同类别的长期信息使用固定置信度，便于后续审计和守卫过滤。
    if (PERSONAL_PROFILE_SIGNAL_RE.test(candidate)) {
      confidence = 0.93
      reason = 'implicit:personal-profile'
    } else if (PERSONAL_OWNERSHIP_SIGNAL_RE.test(candidate)) {
      confidence = 0.9
      reason = 'implicit:personal-ownership'
    } else if (PERSONAL_PREFERENCE_SIGNAL_RE.test(candidate)) {
      confidence = 0.88
      reason = 'implicit:personal-preference'
    } else if (ASSISTANT_PREFERENCE_SIGNAL_RE.test(candidate)) {
      confidence = 0.86
      reason = 'implicit:assistant-preference'
    }

    if (confidence === 0) {
      continue
    }
    if (confidence < threshold) continue

    result.push({
      action: 'add',
      text: candidate,
      confidence,
      isExplicit: false,
      reason
    })

    if (result.length >= maxImplicitAdds) break
  }

  return result
}

// 汇总当前轮的记忆变更，并对显式与隐式结果做统一去重。
export function extractTurnMemoryChanges(options: ExtractTurnMemoryOptions): ExtractedMemoryChange[] {
  const userText = (options.userText || '').trim()
  const assistantText = (options.assistantText || '').trim()
  if (!userText || !assistantText) return []

  const explicitAdds = extractExplicit(userText, 'add', EXPLICIT_ADD_RE, 'explicit:add-command')
  const explicitDeletes = extractExplicit(userText, 'delete', EXPLICIT_DELETE_RE, 'explicit:delete-command')
  const implicitAdds = extractImplicit(options)

  const merged: ExtractedMemoryChange[] = []
  const seen = new Set<string>()
  for (const entry of [...explicitDeletes, ...explicitAdds, ...implicitAdds]) {
    const key = `${entry.action}|${entry.text.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(entry)
  }

  return merged
}
