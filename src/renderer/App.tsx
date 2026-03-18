import { useCallback, useEffect, useRef, useState } from 'react'
import WindowTitleBar from './components/window/WindowTitleBar'
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'
import Settings, { SettingsOpenOptions } from './components/Settings'
import { i18nService } from './services/i18n'
import { configService } from './services/config'
import Toast from './components/Toast'
import Sidebar from './components/Sidebar'
import { CoworkView } from './components/cowork'
import { apiService } from './services/api'
import { setAvailableModels } from './store/slices/modelSlice'
import { useDispatch, useSelector } from 'react-redux'
import SkillsView from './components/skills/SkillsView'
import { ScheduledTasksView } from './components/scheduledTasks'
import { McpView } from './components/mcp'
import { coworkService } from './services/cowork'
import { clearSelection } from './store/slices/quickActionSlice'
import { RootState } from './store'

const App: React.FC = () => {
  const dispatch = useDispatch()
  const currentSessionId = useSelector((state: RootState) => state.cowork.currentSessionId)

  const [showSettings, setShowSettings] = useState(false)
  const [settingsOptions, setSettingsOptions] = useState<SettingsOpenOptions>({})
  const [mainView, setMainView] = useState<'cowork' | 'skills' | 'scheduledTasks' | 'mcp'>('cowork')
  const [isInitialized, setIsInitialized] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [showUpdateModal, setShowUpdateModal] = useState(false)

  const toastTimerRef = useRef<number | null>(null)
  const hasInitialized = useRef(false)

  const isWindows = window.electron.platform === 'win32'

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current)
      }
    }
  }, [])

  // 初始化应用
  useEffect(() => {
    if (hasInitialized.current) {
      return
    }
    hasInitialized.current = true

    const initializeApp = async () => {
      try {
        // 标记平台，用于 CSS 条件样式（如 Windows 标题栏按钮区域留白）
        document.documentElement.classList.add(`platform-${window.electron.platform}`)

        setIsInitialized(true)
      } catch (error) {
        console.error('Failed to initialize app:', error)
        setInitError('initializationError')
        setIsInitialized(true)
      }
    }

    initializeApp()
  }, [])

  const handleShowSettings = useCallback((options?: SettingsOpenOptions) => {
    setSettingsOptions({
      initialTab: options?.initialTab,
      notice: options?.notice
    })
    setShowSettings(true)
  }, [])

  const handleCloseSettings = () => {
    setShowSettings(false)

    const config = configService.getConfig()
    apiService.setConfig({
      apiKey: config.api.key,
      baseUrl: config.api.baseUrl
    })

    if (config.providers) {
      const allModels: { id: string; name: string; provider?: string; providerKey?: string; supportsImage?: boolean }[] = []
      Object.entries(config.providers).forEach(([providerName, providerConfig]) => {
        if (providerConfig.enabled && providerConfig.models) {
          providerConfig.models.forEach((model: { id: string; name: string; supportsImage?: boolean }) => {
            allModels.push({
              id: model.id,
              name: model.name,
              provider: providerName.charAt(0).toUpperCase() + providerName.slice(1),
              providerKey: providerName,
              supportsImage: model.supportsImage ?? false
            })
          })
        }
      })
      if (allModels.length > 0) {
        dispatch(setAvailableModels(allModels))
      }
    }
  }

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => !prev)
  }, [])

  const handleNewChat = useCallback(() => {
    const shouldClearInput = mainView === 'cowork' || !!currentSessionId
    coworkService.clearSession()
    dispatch(clearSelection())
    setMainView('cowork')
    window.setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('cowork:focus-input', {
          detail: { clear: shouldClearInput }
        })
      )
    }, 0)
  }, [dispatch, mainView])

  const showToast = useCallback((message: string) => {
    setToastMessage(message)
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current)
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null)
      toastTimerRef.current = null
    }, 2200)
  }, [])

  const handleShowLogin = useCallback(() => {
    showToast(i18nService.t('featureInDevelopment'))
  }, [showToast])

  const handleShowScheduledTasks = useCallback(() => {
    setMainView('scheduledTasks')
  }, [])

  const handleShowSkills = useCallback(() => {
    setMainView('skills')
  }, [])

  const handleShowMcp = useCallback(() => {
    setMainView('mcp')
  }, [])

  const handleShowCowork = useCallback(() => {
    setMainView('cowork')
  }, [])

  const isOverlayActive = showSettings || showUpdateModal

  const windowsStandaloneTitleBar = isWindows ? (
    <div className="draggable relative h-9 shrink-0 dark:bg-claude-darkSurfaceMuted bg-claude-surfaceMuted">
      <WindowTitleBar isOverlayActive={isOverlayActive} />
    </div>
  ) : null

  if (!isInitialized) {
    return (
      <div className="h-screen overflow-hidden flex flex-col">
        {windowsStandaloneTitleBar}
        <div className="flex-1 flex items-center justify-center dark:bg-claude-darkBg bg-claude-bg">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-claude-accent to-claude-accentHover flex items-center justify-center shadow-glow-accent animate-pulse">
              <ChatBubbleLeftRightIcon className="h-8 w-8 text-white" />
            </div>
            <div className="w-24 h-1 rounded-full bg-claude-accent/20 overflow-hidden">
              <div className="h-full w-1/2 rounded-full bg-claude-accent animate-shimmer" />
            </div>
            <div className="dark:text-claude-darkText text-claude-text text-xl font-medium">{i18nService.t('loading')}</div>
          </div>
        </div>
      </div>
    )
  }

  if (initError) {
    return (
      <div className="h-screen overflow-hidden flex flex-col">
        {windowsStandaloneTitleBar}
        <div className="flex-1 flex flex-col items-center justify-center dark:bg-claude-darkBg bg-claude-bg">
          <div className="flex flex-col items-center space-y-6 max-w-md px-6">
            <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg">
              <ChatBubbleLeftRightIcon className="h-8 w-8 text-white" />
            </div>
            <div className="dark:text-claude-darkText text-claude-text text-xl font-medium text-center">{initError}</div>
            <button
              onClick={() => handleShowSettings()}
              className="px-6 py-2.5 bg-claude-accent hover:bg-claude-accentHover text-white rounded-xl shadow-md transition-colors text-sm font-medium"
            >
              openSettings
            </button>
          </div>
          {showSettings && (
            <Settings onClose={handleCloseSettings} initialTab={settingsOptions.initialTab} notice={settingsOptions.notice} />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col dark:bg-claude-darkSurfaceMuted bg-claude-surfaceMuted">
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar
          onShowLogin={handleShowLogin}
          onShowSettings={handleShowSettings}
          activeView={mainView}
          onShowSkills={handleShowSkills}
          onShowCowork={handleShowCowork}
          onShowScheduledTasks={handleShowScheduledTasks}
          onShowMcp={handleShowMcp}
          onNewChat={handleNewChat}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
        />

        <div className={`flex-1 min-w-0 py-1.5 pr-1.5 ${isSidebarCollapsed ? 'pl-1.5' : ''}`}>
          <div className="h-full rounded-xl dark:bg-claude-darkBg bg-claude-bg overflow-hidden">
            {mainView === 'skills' ? (
              <SkillsView />
            ) : mainView === 'scheduledTasks' ? (
              <ScheduledTasksView />
            ) : mainView === 'mcp' ? (
              <McpView />
            ) : (
              <CoworkView
                onRequestAppSettings={handleShowSettings}
                isSidebarCollapsed={isSidebarCollapsed}
                onToggleSidebar={handleToggleSidebar}
                onShowSkills={handleShowSkills}
                onNewChat={handleNewChat}
              />
            )}
          </div>
        </div>
      </div>

      {/* 设置窗口显示在所有主内容之上，但不影响主界面的交互 */}
      {showSettings && <Settings onClose={handleCloseSettings} initialTab={settingsOptions.initialTab} notice={settingsOptions.notice} />}
    </div>
  )
}

export default App
