// Cowork execution mode
export type CoworkExecutionMode = 'auto' | 'local' | 'sandbox'

// Cowork image attachment for vision-capable models
export interface CoworkImageAttachment {
  name: string
  mimeType: string
  base64Data: string
}

// Cowork configuration
export interface CoworkConfig {
  workingDirectory: string
  systemPrompt: string
  executionMode: CoworkExecutionMode
  memoryEnabled: boolean
  memoryImplicitUpdateEnabled: boolean
  memoryLlmJudgeEnabled: boolean
  memoryGuardLevel: 'strict' | 'standard' | 'relaxed'
  memoryUserMemoriesMaxItems: number
}

export interface CoworkMemoryStats {
  total: number
  created: number
  stale: number
  deleted: number
  explicit: number
  implicit: number
}

export type CoworkUserMemoryStatus = 'created' | 'stale' | 'deleted'

export interface CoworkUserMemoryEntry {
  id: string
  text: string
  confidence: number
  isExplicit: boolean
  status: CoworkUserMemoryStatus
  createdAt: number
  updatedAt: number
  lastUsedAt: number | null
}

export type CoworkSandboxStatus = {
  supported: boolean
  runtimeReady: boolean
  imageReady: boolean
  downloading: boolean
  progress?: CoworkSandboxProgress
  error?: string | null
}

export type CoworkSandboxProgress = {
  stage: 'runtime' | 'image'
  received: number
  total?: number
  percent?: number
  url?: string
}
