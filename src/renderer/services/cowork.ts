import { CoworkMemoryStats, CoworkSandboxStatus, CoworkUserMemoryEntry } from '@/types/cowork'

class CoworkService {
  async createMemoryEntry(input: { text: string; confidence?: number; isExplicit?: boolean }): Promise<CoworkUserMemoryEntry | null> {
    const api = window.electron?.cowork?.createMemoryEntry
    if (!api) return null
    const result = await api(input)
    if (!result?.success || !result.entry) return null
    return result.entry
  }

  async listMemoryEntries(input: {
    query?: string
    status?: 'created' | 'stale' | 'deleted' | 'all'
    includeDeleted?: boolean
    limit?: number
    offset?: number
  }): Promise<CoworkUserMemoryEntry[]> {
    const api = window.electron?.cowork?.listMemoryEntries
    if (!api) return []
    const result = await api(input)
    if (!result?.success || !result.entries) return []
    return result.entries
  }

  async getMemoryStats(): Promise<CoworkMemoryStats | null> {
    const api = window.electron?.cowork?.getMemoryStats
    if (!api) return null
    const result = await api()
    if (!result?.success || !result.stats) return null
    return result.stats
  }

  async deleteMemoryEntry(input: { id: string }): Promise<boolean> {
    const api = window.electron?.cowork?.deleteMemoryEntry
    if (!api) return false
    const result = await api(input)
    return Boolean(result?.success)
  }

  async updateMemoryEntry(input: {
    id: string
    text?: string
    confidence?: number
    status?: 'created' | 'stale' | 'deleted'
    isExplicit?: boolean
  }): Promise<CoworkUserMemoryEntry | null> {
    const api = window.electron?.cowork?.updateMemoryEntry
    if (!api) return null
    const result = await api(input)
    if (!result?.success || !result.entry) return null
    return result.entry
  }

  async installSandbox(): Promise<{ success: boolean; status: CoworkSandboxStatus; error?: string } | null> {
    if (!window.electron?.cowork?.installSandbox) {
      return null
    }
    return window.electron.cowork.installSandbox()
  }
}

export const coworkService = new CoworkService()
