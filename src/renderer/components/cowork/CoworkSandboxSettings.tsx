import { coworkService } from '@/services/cowork'
import { i18nService } from '@/services/i18n'
import { RootState, store } from '@/store'
import { updateConfig } from '@/store/slices/coworkSlice'
import { CoworkExecutionMode, CoworkSandboxProgress, CoworkSandboxStatus } from '@/types/cowork'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import type { SettingsSectionHandle } from '../SettingsSection'

const CoworkSandboxSettings = forwardRef<SettingsSectionHandle>((_props, ref) => {
  const coworkConfig = useSelector((state: RootState) => state.cowork.config)

  const [coworkExecutionMode, setCoworkExecutionMode] = useState<CoworkExecutionMode>(coworkConfig.executionMode || 'local')
  const [coworkSandboxStatus, setCoworkSandboxStatus] = useState<CoworkSandboxStatus | null>(null)
  const [coworkSandboxLoading, setCoworkSandboxLoading] = useState(true)
  const [coworkSandboxProgress, setCoworkSandboxProgress] = useState<CoworkSandboxProgress | null>(null)
  const [coworkSandboxInstalling, setCoworkSandboxInstalling] = useState(false)

  useImperativeHandle(
    ref,
    () => ({
      save: async () => {
        store.dispatch(
          updateConfig({
            executionMode: coworkExecutionMode
          })
        )
      }
    }),
    [coworkExecutionMode]
  )

  const coworkSandboxDisabled = !coworkSandboxStatus?.supported || !coworkSandboxStatus?.runtimeReady || !coworkSandboxStatus?.imageReady

  const coworkSandboxStatusHint = useMemo(() => {
    if (coworkSandboxLoading) return i18nService.t('coworkSandboxChecking')
    if (!coworkSandboxStatus?.supported) return i18nService.t('coworkSandboxUnsupported')
    if (coworkSandboxStatus?.downloading) return i18nService.t('coworkSandboxDownloading')
    if (!coworkSandboxStatus?.runtimeReady) return i18nService.t('coworkSandboxRuntimeMissing')
    if (!coworkSandboxStatus?.imageReady) return i18nService.t('coworkSandboxImageMissing')
    return ''
  }, [coworkSandboxLoading, coworkSandboxStatus])

  const coworkSandboxStageLabel =
    coworkSandboxProgress?.stage === 'image'
      ? i18nService.getLanguage() === 'zh'
        ? '镜像'
        : 'Image'
      : i18nService.getLanguage() === 'zh'
        ? '运行时'
        : 'Runtime'

  const coworkSandboxPercent = useMemo(() => {
    if (!coworkSandboxProgress) return null
    if (coworkSandboxProgress.percent !== undefined && Number.isFinite(coworkSandboxProgress.percent)) {
      return Math.min(100, Math.max(0, Math.round(coworkSandboxProgress.percent * 100)))
    }
    if (coworkSandboxProgress.total && coworkSandboxProgress.total > 0) {
      return Math.min(100, Math.max(0, Math.round((coworkSandboxProgress.received / coworkSandboxProgress.total) * 100)))
    }
    return null
  }, [coworkSandboxProgress])

  const handleInstallCoworkSandbox = async () => {
    setCoworkSandboxInstalling(true)
    try {
      const result = await coworkService.installSandbox()
      if (result?.status) {
        setCoworkSandboxStatus(result.status)
        if (result.status.progress) {
          setCoworkSandboxProgress(result.status.progress)
        }
      }
    } finally {
      setCoworkSandboxInstalling(false)
    }
  }

  const loadCoworkSandboxStatus = useCallback(async () => {
    setCoworkSandboxLoading(true)
    try {
      const status = await coworkService.getSandboxStatus()
      setCoworkSandboxStatus(status)
      if (status?.progress) {
        setCoworkSandboxProgress(status.progress)
      }
    } catch (loadError) {
      console.error('Failed to load cowork sandbox status:', loadError)
      setCoworkSandboxStatus(null)
    } finally {
      setCoworkSandboxLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCoworkSandboxStatus()
  }, [loadCoworkSandboxStatus])

  useEffect(() => {
    setCoworkExecutionMode(coworkConfig.executionMode || 'local')
  }, [coworkConfig.executionMode])

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <label className="block text-sm font-medium dark:text-claude-darkText text-claude-text">
          {i18nService.t('coworkExecutionMode')}
        </label>
        <div className="space-y-2">
          {(
            [
              {
                value: 'auto',
                label: i18nService.t('coworkExecutionModeAuto'),
                hint: i18nService.t('coworkExecutionModeAutoHint')
              },
              {
                value: 'local',
                label: i18nService.t('coworkExecutionModeLocal'),
                hint: i18nService.t('coworkExecutionModeLocalHint')
              },
              {
                value: 'sandbox',
                label: i18nService.t('coworkExecutionModeSandbox'),
                hint: i18nService.t('coworkExecutionModeSandboxHint')
              }
            ] as Array<{ value: CoworkExecutionMode; label: string; hint: string }>
          ).map((option) => {
            const isDisabled = option.value === 'sandbox' && coworkSandboxDisabled
            return (
              <label
                key={option.value}
                className={`flex items-start gap-3 rounded-xl border px-3 py-2 text-sm transition-colors ${
                  isDisabled
                    ? 'cursor-not-allowed opacity-60 dark:border-claude-darkBorder border-claude-border'
                    : 'cursor-pointer dark:border-claude-darkBorder border-claude-border hover:border-claude-accent'
                }`}
              >
                <input
                  type="radio"
                  name="cowork-execution-mode"
                  value={option.value}
                  checked={coworkExecutionMode === option.value}
                  onChange={() => setCoworkExecutionMode(option.value)}
                  disabled={isDisabled}
                  className="mt-1"
                />
                <span>
                  <span className="block font-medium dark:text-claude-darkText text-claude-text">{option.label}</span>
                  <span className="block text-xs dark:text-claude-darkTextSecondary text-claude-textSecondary">{option.hint}</span>
                </span>
              </label>
            )
          })}
        </div>

        {coworkSandboxStatusHint && (
          <div className="text-xs dark:text-claude-darkTextSecondary text-claude-textSecondary">{coworkSandboxStatusHint}</div>
        )}

        {coworkSandboxProgress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs dark:text-claude-darkTextSecondary text-claude-textSecondary">
              <span>{coworkSandboxStageLabel}</span>
              {coworkSandboxPercent !== null && <span>{coworkSandboxPercent}%</span>}
            </div>
            <div className="h-2 rounded-full dark:bg-claude-darkBorder bg-claude-border overflow-hidden">
              <div className="h-full bg-claude-accent transition-all" style={{ width: `${coworkSandboxPercent ?? 0}%` }} />
            </div>
          </div>
        )}

        {coworkSandboxDisabled && coworkSandboxStatus?.supported && (
          <button
            type="button"
            onClick={handleInstallCoworkSandbox}
            disabled={coworkSandboxInstalling || coworkSandboxLoading}
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-claude-accent hover:bg-claude-accentHover text-white text-sm font-medium transition-colors disabled:opacity-50 active:scale-[0.98]"
          >
            {coworkSandboxInstalling ? i18nService.t('coworkSandboxInstalling') : i18nService.t('coworkSandboxInstall')}
          </button>
        )}

        {coworkSandboxDisabled && !coworkSandboxStatus?.supported && (
          <div className="text-xs text-blue-500 dark:text-blue-400">{i18nService.t('coworkSandboxSelectionBlocked')}</div>
        )}
      </div>
    </div>
  )
})

CoworkSandboxSettings.displayName = 'CoworkSandboxSettings'

export default CoworkSandboxSettings
