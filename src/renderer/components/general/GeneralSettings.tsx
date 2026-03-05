import { useState } from 'react'
import ThemedSelect from '../ui/ThemedSelect'
import { i18nService, LanguageType } from '@/services/i18n'
import { themeService } from '@/services/theme'
import LightAppearance from '../icons/appearance/LightAppearance'
import DarkAppearance from '../icons/appearance/DarkAppearance'
import SystemAppearance from '../icons/appearance/SystemAppearance'

interface GeneralSettingsProps {
  language: LanguageType
  setError: (message: string) => void
  setLanguage: (language: LanguageType) => void
}

const GeneralSettings: React.FC<GeneralSettingsProps> = ({ language, setLanguage, setError }) => {
  const [autoLaunch, setAutoLaunchState] = useState(false)
  const [useSystemProxy, setUseSystemProxy] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')
  const [isUpdatingAutoLaunch, setIsUpdatingAutoLaunch] = useState(false)

  return (
    <div className="space-y-8">
      {/* Language Section */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium dark:text-claude-darkText text-claude-text">{i18nService.t('language')}</h4>
        <div className="w-[140px] shrink-0">
          <ThemedSelect
            id="language"
            value={language}
            onChange={(value) => {
              const nextLanguage = value as LanguageType
              setLanguage(nextLanguage)
              i18nService.setLanguage(nextLanguage, { persist: false })
            }}
            options={[
              { value: 'zh', label: i18nService.t('chinese') },
              { value: 'en', label: i18nService.t('english') }
            ]}
          />
        </div>
      </div>

      {/* Auto-launch Section */}
      <div>
        <h4 className="text-sm font-medium dark:text-claude-darkText text-claude-text mb-3">{i18nService.t('autoLaunch')}</h4>
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm dark:text-claude-darkSecondaryText text-claude-secondaryText">
            {i18nService.t('autoLaunchDescription')}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={autoLaunch}
            onClick={async () => {
              if (isUpdatingAutoLaunch) return
              const next = !autoLaunch
              setIsUpdatingAutoLaunch(true)
              try {
                const result = await window.electron.autoLaunch.set(next)
                if (result.success) {
                  setAutoLaunchState(next)
                } else {
                  setError(result.error || 'Failed to update auto-launch setting')
                }
              } catch (err) {
                console.error('Failed to set auto-launch:', err)
                setError('Failed to update auto-launch setting')
              } finally {
                setIsUpdatingAutoLaunch(false)
              }
            }}
            disabled={isUpdatingAutoLaunch}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
              isUpdatingAutoLaunch ? 'opacity-50 cursor-not-allowed' : ''
            } ${autoLaunch ? 'bg-claude-accent' : 'bg-gray-300 dark:bg-gray-600'}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                autoLaunch ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </label>
      </div>

      {/* System proxy Section */}
      <div>
        <h4 className="text-sm font-medium dark:text-claude-darkText text-claude-text mb-3">{i18nService.t('useSystemProxy')}</h4>
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm dark:text-claude-darkSecondaryText text-claude-secondaryText">
            {i18nService.t('useSystemProxyDescription')}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={useSystemProxy}
            onClick={() => {
              setUseSystemProxy((prev) => !prev)
            }}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
              useSystemProxy ? 'bg-claude-accent' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                useSystemProxy ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </label>
      </div>

      {/* Appearance Section */}
      <div>
        <h4 className="text-sm font-medium dark:text-claude-darkText text-claude-text mb-3">{i18nService.t('appearance')}</h4>
        <div className="grid grid-cols-3 gap-4">
          {[
            { value: 'light' as const, label: i18nService.t('light') },
            { value: 'dark' as const, label: i18nService.t('dark') },
            { value: 'system' as const, label: i18nService.t('system') }
          ].map((option) => {
            const isSelected = theme === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setTheme(option.value)
                  themeService.setTheme(option.value)
                }}
                className={`flex flex-col items-center rounded-xl border-2 p-3 transition-colors cursor-pointer ${
                  isSelected
                    ? 'border-claude-accent bg-claude-accent/5 dark:bg-claude-accent/10'
                    : 'dark:border-claude-darkBorder border-claude-border hover:border-claude-accent/50 dark:hover:border-claude-accent/50'
                }`}
              >
                {option.value === 'light' && <LightAppearance />}
                {option.value === 'dark' && <DarkAppearance />}
                {option.value === 'system' && <SystemAppearance />}

                <span className={`text-xs font-medium ${isSelected ? 'text-claude-accent' : 'dark:text-claude-darkText text-claude-text'}`}>
                  {option.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default GeneralSettings
