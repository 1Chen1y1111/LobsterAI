import { useMemo, useRef, useState } from 'react'

import { i18nService, LanguageType } from '@/services/i18n'

import {
  XMarkIcon,
  Cog6ToothIcon,
  CubeIcon,
  ChatBubbleLeftIcon,
  ShieldCheckIcon,
  EnvelopeIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

import BrainIcon from './icons/BrainIcon'
import ShortcutsIcon from './icons/ShortcutsIcon'
import ErrorMessage from './ErrorMessage'

import GeneralSettings from './general/GeneralSettings'
import ModelSettings from './model/ModelSettings'
import EmailSkillSettings from './skills/EmailSkillSettings'
import CoworkMemorySettings from './cowork/CoworkMemorySettings'

export type TabType = 'general' | 'model' | 'coworkSandbox' | 'coworkMemory' | 'shortcuts' | 'im' | 'email' | 'about'

export type SettingsOpenOptions = {
  initialTab?: TabType
  notice?: string
}

interface SettingsProps extends SettingsOpenOptions {
  onClose: () => void
}

const Settings: React.FC<SettingsProps> = ({ initialTab, notice, onClose }) => {
  // 状态
  const [activeTab, setActiveTab] = useState<TabType>(initialTab ?? 'general')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [noticeMessage, setNoticeMessage] = useState<string | null>(notice ?? null)
  const contentRef = useRef<HTMLDivElement>(null)

  const [language, setLanguage] = useState<LanguageType>('zh')

  // 渲染标签页
  const sidebarTabs: { key: TabType; label: string; icon: React.ReactNode }[] = useMemo(
    () => [
      {
        key: 'general',
        label: i18nService.t('general'),
        icon: <Cog6ToothIcon className="h-5 w-5" />
      },
      {
        key: 'model',
        label: i18nService.t('model'),
        icon: <CubeIcon className="h-5 w-5" />
      },
      {
        key: 'im',
        label: i18nService.t('imBot'),
        icon: <ChatBubbleLeftIcon className="h-5 w-5" />
      },
      {
        key: 'email',
        label: i18nService.t('emailTab'),
        icon: <EnvelopeIcon className="h-5 w-5" />
      },
      {
        key: 'coworkMemory',
        label: i18nService.t('coworkMemoryTitle'),
        icon: <BrainIcon className="h-5 w-5" />
      },
      {
        key: 'coworkSandbox',
        label: i18nService.t('coworkSandbox'),
        icon: <ShieldCheckIcon className="h-5 w-5" />
      },
      {
        key: 'shortcuts',
        label: i18nService.t('shortcuts'),
        icon: <ShortcutsIcon className="h-5 w-5" />
      },
      {
        key: 'about',
        label: i18nService.t('about'),
        icon: <InformationCircleIcon className="h-5 w-5" />
      }
    ],
    [language]
  )

  const activeTabLabel = useMemo(() => {
    return sidebarTabs.find((t) => t.key === activeTab)?.label ?? ''
  }, [activeTab, sidebarTabs])

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return <GeneralSettings language={language} setLanguage={setLanguage} setError={setError} />

      case 'model':
        return <ModelSettings language={language} setError={setError} setNoticeMessage={setNoticeMessage} />

      case 'email':
        return <EmailSkillSettings />

      case 'coworkMemory':
        return <CoworkMemorySettings activeTab={activeTab} setError={setError} />

      default:
        return null
    }
  }

  // 阻止点击设置窗口时事件传播到背景
  const handleSettingsClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)
  }

  // 标签页切换处理
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
  }

  return (
    <div className="fixed inset-0 z-50 modal-backdrop flex items-center justify-center" onClick={onClose}>
      <div
        className="flex w-[900px] h-[80vh] rounded-2xl dark:border-claude-darkBorder border-claude-border border shadow-modal overflow-hidden modal-content"
        onClick={handleSettingsClick}
      >
        {/* Left sidebar */}
        <div className="w-[220px] shrink-0 flex flex-col dark:bg-claude-darkSurfaceMuted bg-claude-surfaceMuted border-r dark:border-claude-darkBorder border-claude-border rounded-l-2xl overflow-y-auto">
          <div className="px-5 pt-5 pb-3">
            <h2 className="text-lg font-semibold dark:text-claude-darkText text-claude-text">settings</h2>
          </div>
          <nav className="flex flex-col gap-0.5 px-3 pb-4">
            {sidebarTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                  activeTab === tab.key
                    ? 'bg-claude-accent/10 text-claude-accent'
                    : 'dark:text-claude-darkTextSecondary text-claude-textSecondary dark:hover:text-claude-darkText hover:text-claude-text dark:hover:bg-claude-darkSurfaceHover hover:bg-claude-surfaceHover'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Right content */}
        <div className="relative flex-1 flex flex-col min-w-0 overflow-hidden dark:bg-claude-darkBg bg-claude-bg rounded-r-2xl">
          {/* Content header */}
          <div className="flex justify-between items-center px-6 pt-5 pb-3 shrink-0">
            <h3 className="text-lg font-semibold dark:text-claude-darkText text-claude-text">{activeTabLabel}</h3>
            <button
              onClick={onClose}
              className="dark:text-claude-darkTextSecondary text-claude-textSecondary dark:hover:text-claude-darkText hover:text-claude-text p-1.5 dark:hover:bg-claude-darkSurfaceHover hover:bg-claude-surfaceHover rounded-lg transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {noticeMessage && (
            <div className="px-6">
              <ErrorMessage message={noticeMessage} onClose={() => setNoticeMessage(null)} />
            </div>
          )}

          {error && (
            <div className="px-6">
              <ErrorMessage message={error} onClose={() => setError(null)} />
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            {/* Tab content */}
            <div ref={contentRef} className="px-6 py-4 flex-1 overflow-y-auto">
              {renderTabContent()}
            </div>

            {/* Footer buttons */}
            <div className="flex justify-end space-x-4 p-4 dark:border-claude-darkBorder border-claude-border border-t dark:bg-claude-darkBg bg-claude-bg shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 dark:text-claude-darkText text-claude-text dark:hover:bg-claude-darkSurfaceHover hover:bg-claude-surfaceHover rounded-xl transition-colors text-sm font-medium border dark:border-claude-darkBorder border-claude-border active:scale-[0.98]"
              >
                {i18nService.t('cancel')}
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-claude-accent hover:bg-claude-accentHover text-white rounded-xl transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {isSaving ? i18nService.t('saving') : i18nService.t('save')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Settings
