import { configService } from '@/services/config'
import { i18nService } from '@/services/i18n'
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import type { SettingsSectionHandle } from '../SettingsSection'

const ShortcutsSettings = forwardRef<SettingsSectionHandle>((_props, ref) => {
  const [shortcuts, setShortcuts] = useState({
    newChat: 'Ctrl+N',
    search: 'Ctrl+F',
    settings: 'Ctrl+,'
  })

  useImperativeHandle(
    ref,
    () => ({
      save: async () => {
        await configService.updateConfig({
          shortcuts
        })
      }
    }),
    [shortcuts]
  )

  const handleShortcutChange = (key: keyof typeof shortcuts, value: string) => {
    setShortcuts((prev) => ({
      ...prev,
      [key]: value
    }))
  }

  useEffect(() => {
    const config = configService.getConfig()

    if (config.shortcuts) {
      setShortcuts((prev) => ({
        ...prev,
        ...config.shortcuts
      }))
    }
  }, [])

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium dark:text-claude-darkText text-claude-text mb-3">
          {i18nService.t('keyboardShortcuts')}
        </label>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm dark:text-claude-darkText text-claude-text">{i18nService.t('newChat')}</span>
            <input
              type="text"
              value={shortcuts.newChat}
              onChange={(e) => handleShortcutChange('newChat', e.target.value)}
              data-shortcut-input="true"
              className="w-32 rounded-xl bg-claude-surfaceInset dark:bg-claude-darkSurfaceInset dark:border-claude-darkBorder border-claude-border border focus:border-claude-accent focus:ring-1 focus:ring-claude-accent/30 dark:text-claude-darkText text-claude-text px-3 py-1.5 text-sm"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm dark:text-claude-darkText text-claude-text">{i18nService.t('search')}</span>
            <input
              type="text"
              value={shortcuts.search}
              onChange={(e) => handleShortcutChange('search', e.target.value)}
              data-shortcut-input="true"
              className="w-32 rounded-xl bg-claude-surfaceInset dark:bg-claude-darkSurfaceInset dark:border-claude-darkBorder border-claude-border border focus:border-claude-accent focus:ring-1 focus:ring-claude-accent/30 dark:text-claude-darkText text-claude-text px-3 py-1.5 text-sm"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm dark:text-claude-darkText text-claude-text">{i18nService.t('openSettings')}</span>
            <input
              type="text"
              value={shortcuts.settings}
              onChange={(e) => handleShortcutChange('settings', e.target.value)}
              data-shortcut-input="true"
              className="w-32 rounded-xl bg-claude-surfaceInset dark:bg-claude-darkSurfaceInset dark:border-claude-darkBorder border-claude-border border focus:border-claude-accent focus:ring-1 focus:ring-claude-accent/30 dark:text-claude-darkText text-claude-text px-3 py-1.5 text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  )
})

ShortcutsSettings.displayName = 'ShortcutsSettings'

export default ShortcutsSettings
