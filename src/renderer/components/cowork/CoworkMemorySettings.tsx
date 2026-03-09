import { i18nService } from '@/services/i18n'
import { RootState, store } from '@/store'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react'
import { useSelector } from 'react-redux'
import { PlusCircleIcon } from '@heroicons/react/24/outline'
import { CoworkMemoryStats, CoworkUserMemoryEntry } from '@/types/cowork'
import { coworkService } from '@/services/cowork'
import { updateConfig } from '@/store/slices/coworkSlice'
import { TabType } from '../Settings'
import type { SettingsSectionHandle } from '../SettingsSection'

interface CoworkMemorySettingsProps {
  activeTab: TabType
  setError: (message: string) => void
}

const CoworkMemorySettings = forwardRef<SettingsSectionHandle, CoworkMemorySettingsProps>(({ activeTab, setError }, ref) => {
  const coworkConfig = useSelector((state: RootState) => state.cowork.config)

  const [coworkMemoryEnabled, setCoworkMemoryEnabled] = useState<boolean>(coworkConfig.memoryEnabled ?? true)
  const [coworkMemoryLlmJudgeEnabled, setCoworkMemoryLlmJudgeEnabled] = useState<boolean>(coworkConfig.memoryLlmJudgeEnabled ?? false)
  const [coworkMemoryEntries, setCoworkMemoryEntries] = useState<CoworkUserMemoryEntry[]>([])
  const [coworkMemoryStats, setCoworkMemoryStats] = useState<CoworkMemoryStats | null>(null)
  const [coworkMemoryListLoading, setCoworkMemoryListLoading] = useState<boolean>(false)
  const [coworkMemoryQuery, setCoworkMemoryQuery] = useState<string>('')
  const [coworkMemoryEditingId, setCoworkMemoryEditingId] = useState<string | null>(null)
  const [coworkMemoryDraftText, setCoworkMemoryDraftText] = useState<string>('')
  const [showMemoryModal, setShowMemoryModal] = useState<boolean>(false)

  useImperativeHandle(
    ref,
    () => ({
      save: async () => {
        store.dispatch(
          updateConfig({
            memoryEnabled: coworkMemoryEnabled,
            memoryLlmJudgeEnabled: coworkMemoryLlmJudgeEnabled
          })
        )
      }
    }),
    [coworkMemoryEnabled, coworkMemoryLlmJudgeEnabled]
  )

  const handleOpenCoworkMemoryModal = () => {
    resetCoworkMemoryEditor()
    setShowMemoryModal(true)
  }

  const resetCoworkMemoryEditor = () => {
    setCoworkMemoryEditingId(null)
    setCoworkMemoryDraftText('')
    setShowMemoryModal(false)
  }

  const getMemoryStatusLabel = (status: CoworkUserMemoryEntry['status']): string => {
    if (status === 'created') return i18nService.t('coworkMemoryStatusActive')
    if (status === 'stale') return i18nService.t('coworkMemoryStatusInactive')
    return i18nService.t('coworkMemoryStatusDeleted')
  }

  const handleEditCoworkMemoryEntry = (entry: CoworkUserMemoryEntry) => {
    setCoworkMemoryEditingId(entry.id)
    setCoworkMemoryDraftText(entry.text)
    setShowMemoryModal(true)
  }

  const handleDeleteCoworkMemoryEntry = async (entry: CoworkUserMemoryEntry) => {
    setCoworkMemoryListLoading(true)
    try {
      await coworkService.deleteMemoryEntry({ id: entry.id })
      if (coworkMemoryEditingId === entry.id) {
        resetCoworkMemoryEditor()
      }
      await loadCoworkMemoryData()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : i18nService.t('coworkMemoryCrudDeleteFailed'))
    } finally {
      setCoworkMemoryListLoading(false)
    }
  }

  const formatMemoryUpdatedAt = (timestamp: number): string => {
    if (!Number.isFinite(timestamp) || timestamp <= 0) return '-'
    try {
      return new Date(timestamp).toLocaleString()
    } catch {
      return '-'
    }
  }

  const handleSaveCoworkMemoryEntry = async () => {
    const text = coworkMemoryDraftText.trim()
    if (!text) return

    setCoworkMemoryListLoading(true)
    try {
      if (coworkMemoryEditingId) {
        await coworkService.updateMemoryEntry({
          id: coworkMemoryEditingId,
          text,
          status: 'created',
          isExplicit: true
        })
      } else {
        await coworkService.createMemoryEntry({
          text,
          isExplicit: true
        })
      }
      resetCoworkMemoryEditor()
      await loadCoworkMemoryData()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : i18nService.t('coworkMemoryCrudSaveFailed'))
    } finally {
      setCoworkMemoryListLoading(false)
    }
  }

  const loadCoworkMemoryData = useCallback(async () => {
    setCoworkMemoryListLoading(true)
    try {
      const [entries, stats] = await Promise.all([
        coworkService.listMemoryEntries({
          query: coworkMemoryQuery.trim() || undefined
        }),
        coworkService.getMemoryStats()
      ])
      setCoworkMemoryEntries(entries)
      setCoworkMemoryStats(stats)
    } catch (loadError) {
      console.error('Failed to load cowork memory data:', loadError)
      setCoworkMemoryEntries([])
      setCoworkMemoryStats(null)
    } finally {
      setCoworkMemoryListLoading(false)
    }
  }, [coworkMemoryQuery])

  useEffect(() => {
    if (activeTab !== 'coworkMemory') return
    void loadCoworkMemoryData()
  }, [activeTab, loadCoworkMemoryData])

  useEffect(() => {
    setCoworkMemoryEnabled(coworkConfig.memoryEnabled ?? true)
    setCoworkMemoryLlmJudgeEnabled(coworkConfig.memoryLlmJudgeEnabled ?? false)
  }, [coworkConfig.memoryEnabled, coworkConfig.memoryLlmJudgeEnabled])

  return (
    <>
      <div className="space-y-6">
        <div className="space-y-3 rounded-xl border px-4 py-4 dark:border-claude-darkBorder border-claude-border">
          <div className="text-sm font-medium dark:text-claude-darkText text-claude-text">{i18nService.t('coworkMemoryTitle')}</div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={coworkMemoryEnabled}
              onChange={(event) => setCoworkMemoryEnabled(event.target.checked)}
              className="mt-1"
            />
            <span>
              <span className="block text-sm dark:text-claude-darkText text-claude-text">{i18nService.t('coworkMemoryEnabled')}</span>
              <span className="block text-xs dark:text-claude-darkTextSecondary text-claude-textSecondary">
                {i18nService.t('coworkMemoryEnabledHint')}
              </span>
              <span className="mt-1 block text-xs dark:text-claude-darkTextSecondary text-claude-textSecondary">
                {i18nService.t('coworkMemorySimpleHint')}
              </span>
            </span>
          </label>
          <label className={`flex items-start gap-3 ${coworkMemoryEnabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
            <input
              type="checkbox"
              checked={coworkMemoryLlmJudgeEnabled}
              onChange={(event) => setCoworkMemoryLlmJudgeEnabled(event.target.checked)}
              disabled={!coworkMemoryEnabled}
              className="mt-1"
            />
            <span>
              <span className="block text-sm dark:text-claude-darkText text-claude-text">
                {i18nService.t('coworkMemoryLlmJudgeEnabled')}
              </span>
              <span className="block text-xs dark:text-claude-darkTextSecondary text-claude-textSecondary">
                {i18nService.t('coworkMemoryLlmJudgeEnabledHint')}
              </span>
            </span>
          </label>
        </div>

        <div className="space-y-4 rounded-xl border px-4 py-4 dark:border-claude-darkBorder border-claude-border">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-sm font-medium dark:text-claude-darkText text-claude-text">{i18nService.t('coworkMemoryCrudTitle')}</div>
              <div className="text-xs dark:text-claude-darkTextSecondary text-claude-textSecondary">
                {i18nService.t('coworkMemoryManageHint')}
              </div>
            </div>
            <button
              type="button"
              onClick={handleOpenCoworkMemoryModal}
              className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-claude-accent hover:bg-claude-accentHover text-white text-sm transition-colors active:scale-[0.98]"
            >
              <PlusCircleIcon className="h-4 w-4 mr-1.5" />
              {i18nService.t('coworkMemoryCrudCreate')}
            </button>
          </div>

          {coworkMemoryStats && (
            <div className="text-xs dark:text-claude-darkTextSecondary text-claude-textSecondary">
              {`${i18nService.t('coworkMemoryTotalLabel')}: ${coworkMemoryStats.created + coworkMemoryStats.stale} 路 ${i18nService.t('coworkMemoryActiveLabel')}: ${coworkMemoryStats.created} 路 ${i18nService.t('coworkMemoryInactiveLabel')}: ${coworkMemoryStats.stale}`}
            </div>
          )}

          <input
            type="text"
            value={coworkMemoryQuery}
            onChange={(event) => setCoworkMemoryQuery(event.target.value)}
            placeholder={i18nService.t('coworkMemorySearchPlaceholder')}
            className="w-full rounded-lg border px-3 py-2 text-sm dark:border-claude-darkBorder border-claude-border dark:bg-claude-darkSurface bg-claude-surface"
          />

          <div className="max-h-[500px] overflow-auto rounded-lg border dark:border-claude-darkBorder border-claude-border">
            {coworkMemoryListLoading ? (
              <div className="px-3 py-3 text-xs dark:text-claude-darkTextSecondary text-claude-textSecondary">
                {i18nService.t('loading')}
              </div>
            ) : coworkMemoryEntries.length === 0 ? (
              <div className="px-3 py-3 text-xs dark:text-claude-darkTextSecondary text-claude-textSecondary">
                {i18nService.t('coworkMemoryEmpty')}
              </div>
            ) : (
              <div className="divide-y dark:divide-claude-darkBorder divide-claude-border">
                {coworkMemoryEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="px-3 py-3 text-xs hover:bg-claude-surfaceHover dark:hover:bg-claude-darkSurfaceHover transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="font-medium dark:text-claude-darkText text-claude-text break-words">{entry.text}</div>
                        <div className="flex flex-wrap items-center gap-2 dark:text-claude-darkTextSecondary text-claude-textSecondary">
                          <span className="rounded-full border px-2 py-0.5 dark:border-claude-darkBorder border-claude-border">
                            {getMemoryStatusLabel(entry.status)}
                          </span>
                          <span>{`${i18nService.t('coworkMemoryUpdatedAt')}: ${formatMemoryUpdatedAt(entry.updatedAt)}`}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditCoworkMemoryEntry(entry)}
                          className="rounded border px-2 py-1 dark:border-claude-darkBorder border-claude-border dark:text-claude-darkText text-claude-text hover:bg-claude-surfaceHover dark:hover:bg-claude-darkSurfaceHover transition-colors"
                        >
                          {i18nService.t('edit')}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void handleDeleteCoworkMemoryEntry(entry)
                          }}
                          className="rounded border px-2 py-1 text-red-500 dark:border-claude-darkBorder border-claude-border hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-60 transition-colors"
                          disabled={coworkMemoryListLoading}
                        >
                          {i18nService.t('delete')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showMemoryModal && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/35 px-4" onClick={resetCoworkMemoryEditor}>
          <div
            className="dark:bg-claude-darkSurface bg-claude-surface dark:border-claude-darkBorder border-claude-border border rounded-2xl shadow-xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-5 pb-4 border-b dark:border-claude-darkBorder border-claude-border">
              <h3 className="text-base font-semibold dark:text-claude-darkText text-claude-text">
                {coworkMemoryEditingId ? i18nService.t('coworkMemoryCrudUpdate') : i18nService.t('coworkMemoryCrudCreate')}
              </h3>
            </div>

            <div className="px-5 py-4 space-y-4">
              {coworkMemoryEditingId && (
                <div className="rounded-lg border px-2 py-1 text-xs dark:border-claude-darkBorder border-claude-border dark:text-claude-darkTextSecondary text-claude-textSecondary">
                  {i18nService.t('coworkMemoryEditingTag')}
                </div>
              )}
              <textarea
                value={coworkMemoryDraftText}
                onChange={(event) => setCoworkMemoryDraftText(event.target.value)}
                placeholder={i18nService.t('coworkMemoryCrudTextPlaceholder')}
                autoFocus
                className="min-h-[200px] w-full rounded-lg border px-3 py-2 text-sm dark:border-claude-darkBorder border-claude-border dark:bg-claude-darkSurface bg-claude-surface dark:text-claude-darkText text-claude-text focus:border-claude-accent focus:ring-1 focus:ring-claude-accent/30"
              />
            </div>

            <div className="flex justify-end space-x-2 px-5 pb-5">
              <button
                type="button"
                onClick={resetCoworkMemoryEditor}
                className="px-3 py-1.5 text-sm dark:text-claude-darkText text-claude-text dark:hover:bg-claude-darkSurfaceHover hover:bg-claude-surfaceHover rounded-xl border dark:border-claude-darkBorder border-claude-border transition-colors"
              >
                {i18nService.t('cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleSaveCoworkMemoryEntry()
                }}
                disabled={!coworkMemoryDraftText.trim() || coworkMemoryListLoading}
                className="px-3 py-1.5 text-sm text-white bg-claude-accent hover:bg-claude-accentHover rounded-xl disabled:opacity-60 disabled:cursor-not-allowed transition-colors active:scale-[0.98]"
              >
                {coworkMemoryEditingId ? i18nService.t('save') : i18nService.t('coworkMemoryCrudCreate')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
})

CoworkMemorySettings.displayName = 'CoworkMemorySettings'

export default CoworkMemorySettings
