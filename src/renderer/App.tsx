import { useCallback, useEffect, useRef, useState } from 'react'
import WindowTitleBar from './components/window/WindowTitleBar'
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'
import Settings, { SettingsOpenOptions } from './components/Settings'
import { i18nService } from './services/i18n'
import { configService } from './services/config'
import Toast from './components/Toast'
import Sidebar from './components/Sidebar'
import { CoworkView } from './components/cowork'
import { ApiConfig, apiService } from './services/api'
import { setAvailableModels, setSelectedModel } from './store/slices/modelSlice'
import { useDispatch, useSelector } from 'react-redux'
import SkillsView from './components/skills/SkillsView'
import { ScheduledTasksView } from './components/scheduledTasks'
import { McpView } from './components/mcp'
import { coworkService } from './services/cowork'
import { clearSelection } from './store/slices/quickActionSlice'
import { RootState } from './store'
import AppUpdateBadge from './components/update/AppUpdateBadge'
import {
  AppUpdateDownloadProgress,
  AppUpdateInfo,
  checkForAppUpdate,
  UPDATE_HEARTBEAT_INTERVAL_MS,
  UPDATE_POLL_INTERVAL_MS
} from './services/appUpdate'
import AppUpdateModal from './components/update/AppUpdateModal'
import { themeService } from './services/theme'
import { scheduledTaskService } from './services/scheduledTask'

const App: React.FC = () => {
  const dispatch = useDispatch()
  const currentSessionId = useSelector((state: RootState) => state.cowork.currentSessionId)
  const selectedModel = useSelector((state: RootState) => state.model.selectedModel)

  const [showSettings, setShowSettings] = useState(false)
  const [settingsOptions, setSettingsOptions] = useState<SettingsOpenOptions>({})
  const [mainView, setMainView] = useState<'cowork' | 'skills' | 'scheduledTasks' | 'mcp'>('cowork')
  const [isInitialized, setIsInitialized] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  const [, forceLanguageRefresh] = useState(0)

  // 应用更新相关状态
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [updateModalState, setUpdateModalState] = useState<'info' | 'downloading' | 'installing' | 'error'>('info')
  const [downloadProgress, setDownloadProgress] = useState<AppUpdateDownloadProgress | null>(null)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const toastTimerRef = useRef<number | null>(null)
  const hasInitialized = useRef(false)

  const isWindows = window.electron.platform === 'win32'

  // 包装一个 Promise，使其在指定时间内必须完成，否则自动 reject（用于初始化等关键流程的超时控制）
  const waitWithTimeout = useCallback(async <T,>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
    return await new Promise<T>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        reject(new Error(`${label} timed out after ${timeoutMs}ms`))
      }, timeoutMs)

      promise.then(
        (value) => {
          window.clearTimeout(timer)
          resolve(value)
        },
        (error) => {
          window.clearTimeout(timer)
          reject(error)
        }
      )
    })
  }, [])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current)
      }
    }
  }, [])

  /* 初始化应用 */
  useEffect(() => {
    if (hasInitialized.current) {
      return
    }
    hasInitialized.current = true

    const initializeApp = async () => {
      try {
        console.info('[App] initializeApp: start')
        // 标记平台，用于 CSS 条件样式（如 Windows 标题栏按钮区域留白）
        document.documentElement.classList.add(`platform-${window.electron.platform}`)

        // 初始化配置
        console.info('[App] initializeApp: configService.init')
        await waitWithTimeout(configService.init(), 5000, 'configService.init')

        // 初始化主题
        console.info('[App] initializeApp: themeService.initialize')
        themeService.initialize()

        // 初始化语言
        console.info('[App] initializeApp: i18nService.initialize')
        await waitWithTimeout(i18nService.initialize(), 5000, 'i18nService.initialize')

        // 预加载更新信息（不阻塞主界面显示）
        console.info('[App] initializeApp: configService.getConfig')
        const config = await configService.getConfig()

        const apiConfig: ApiConfig = {
          apiKey: config.api.key,
          baseUrl: config.api.baseUrl
        }
        apiService.setConfig(apiConfig)

        // 从 providers 配置中加载可用模型列表到 Redux
        const providerModels: { id: string; name: string; provider?: string; providerKey?: string; supportsImage?: boolean }[] = []
        if (config.providers) {
          Object.entries(config.providers).forEach(([providerName, providerConfig]) => {
            if (providerConfig.enabled && providerConfig.models) {
              providerConfig.models.forEach((model: { id: string; name: string; supportsImage?: boolean }) => {
                providerModels.push({
                  id: model.id,
                  name: model.name,
                  provider: providerName.charAt(0).toUpperCase() + providerName.slice(1),
                  providerKey: providerName,
                  supportsImage: model.supportsImage ?? false
                })
              })
            }
          })
        }

        // 如果 providers 配置中没有任何模型，则回退到 config.model.availableModels 中的模型列表（兼容旧配置）
        const fallbackModels = config.model.availableModels.map((model) => ({
          id: model.id,
          name: model.name,
          providerKey: undefined,
          supportsImage: model.supportsImage ?? false
        }))

        /**
         * 优先使用 providers 配置中的模型列表
         * 如果没有则使用 config.model.availableModels
         * 如果两者都有，则以 providers 配置为准
         */
        const resolvedModels = providerModels.length > 0 ? providerModels : fallbackModels
        if (resolvedModels.length > 0) {
          dispatch(setAvailableModels(resolvedModels))
          const preferredModel =
            resolvedModels.find(
              (model) =>
                model.id === config.model.defaultModel &&
                (!config.model.defaultModelProvider || model.providerKey === config.model.defaultModelProvider)
            ) ?? resolvedModels[0]
          dispatch(setSelectedModel(preferredModel))
        }

        setIsInitialized(true)
        console.info('[App] initializeApp: shell ready')

        // 初始化定时任务服务，但不阻塞首屏
        void waitWithTimeout(scheduledTaskService.init(), 5000, 'scheduledTaskService.init').catch((error) => {
          console.error('[App] initializeApp: scheduledTaskService.init failed:', error)
        })
      } catch (error) {
        console.error('Failed to initialize app:', error)
        setInitError('initializationError')
        setIsInitialized(true)
      }
    }

    initializeApp()
  }, [dispatch, waitWithTimeout])

  /* 监听语言变化，强制刷新组件以更新文本 */
  useEffect(() => {
    const unsubscribe = i18nService.subscribe(() => {
      forceLanguageRefresh((prev) => prev + 1)
    })
    return () => {
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!isInitialized || !selectedModel?.id) return
    const config = configService.getConfig()
    if (config.model.defaultModel === selectedModel.id && (config.model.defaultModelProvider ?? '') === (selectedModel.providerKey ?? '')) {
      return
    }
    void configService.updateConfig({
      model: {
        ...config.model,
        defaultModel: selectedModel.id,
        defaultModelProvider: selectedModel.providerKey
      }
    })
  }, [isInitialized, selectedModel?.id, selectedModel?.providerKey])

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

  const runUpdateCheck = useCallback(async () => {
    try {
      const currentVersion = await window.electron.appInfo.getVersion()
      const nextUpdate = await checkForAppUpdate(currentVersion)
      setUpdateInfo(nextUpdate)
      if (!nextUpdate) {
        setShowUpdateModal(false)
      }
    } catch (error) {
      console.error('Failed to check app update:', error)
      setUpdateInfo(null)
      setShowUpdateModal(false)
    }
  }, [])

  const handleOpenUpdateModal = useCallback(() => {
    if (!updateInfo) return
    setUpdateModalState('info')
    setUpdateError(null)
    setDownloadProgress(null)
    setShowUpdateModal(true)
  }, [updateInfo])

  const handleUpdateFound = useCallback((info: AppUpdateInfo) => {
    setUpdateInfo(info)
    setUpdateModalState('info')
    setUpdateError(null)
    setDownloadProgress(null)
    setShowUpdateModal(true)
  }, [])

  const handleConfirmUpdate = useCallback(async () => {
    if (!updateInfo) return

    // If the URL is a fallback page (not a direct file download), open in browser
    if (updateInfo.url.includes('#') || updateInfo.url.endsWith('/download-list')) {
      setShowUpdateModal(false)
      try {
        const result = await window.electron.shell.openExternal(updateInfo.url)
        if (!result.success) {
          showToast(i18nService.t('updateOpenFailed'))
        }
      } catch (error) {
        console.error('Failed to open update url:', error)
        showToast(i18nService.t('updateOpenFailed'))
      }
      return
    }

    setUpdateModalState('downloading')
    setDownloadProgress(null)
    setUpdateError(null)

    const unsubscribe = window.electron.appUpdate.onDownloadProgress((progress) => {
      setDownloadProgress(progress)
    })

    try {
      const downloadResult = await window.electron.appUpdate.download(updateInfo.url)
      unsubscribe()

      if (!downloadResult.success) {
        // If user cancelled, handleCancelDownload already set the state — don't overwrite
        if (downloadResult.error === 'Download cancelled') {
          return
        }
        setUpdateModalState('error')
        setUpdateError(downloadResult.error || i18nService.t('updateDownloadFailed'))
        return
      }

      setUpdateModalState('installing')
      const installResult = await window.electron.appUpdate.install(downloadResult.filePath!)

      if (!installResult.success) {
        setUpdateModalState('error')
        setUpdateError(installResult.error || i18nService.t('updateInstallFailed'))
      }
      // If successful, app will quit and relaunch
    } catch (error) {
      unsubscribe()
      const msg = error instanceof Error ? error.message : ''
      // If user cancelled, handleCancelDownload already set the state — don't overwrite
      if (msg === 'Download cancelled') {
        return
      }
      setUpdateModalState('error')
      setUpdateError(msg || i18nService.t('updateDownloadFailed'))
    }
  }, [updateInfo, showToast])

  const handleCancelDownload = useCallback(async () => {
    await window.electron.appUpdate.cancelDownload()
    setUpdateModalState('info')
    setDownloadProgress(null)
  }, [])

  const handleRetryUpdate = useCallback(() => {
    setUpdateModalState('info')
    setUpdateError(null)
    setDownloadProgress(null)
  }, [])

  useEffect(() => {
    if (!isInitialized) return

    let cancelled = false
    let lastCheckTime = 0

    const maybeCheck = async () => {
      if (cancelled) return
      const now = Date.now()
      if (lastCheckTime > 0 && now - lastCheckTime < UPDATE_POLL_INTERVAL_MS) return
      lastCheckTime = now
      await runUpdateCheck()
    }

    // 启动时立即检查
    void maybeCheck()

    // 心跳：每 30 分钟检测是否距上次检查已超过 12 小时
    const timer = window.setInterval(() => {
      void maybeCheck()
    }, UPDATE_HEARTBEAT_INTERVAL_MS)

    // 窗口恢复可见时检测（覆盖休眠唤醒场景）
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void maybeCheck()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      cancelled = true
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isInitialized, runUpdateCheck])

  const isOverlayActive = showSettings || showUpdateModal

  const updateBadge = updateInfo ? <AppUpdateBadge latestVersion={updateInfo.latestVersion} onClick={handleOpenUpdateModal} /> : null

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
            <Settings
              onClose={handleCloseSettings}
              initialTab={settingsOptions.initialTab}
              notice={settingsOptions.notice}
              onUpdateFound={handleUpdateFound}
            />
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
          updateBadge={!isSidebarCollapsed ? updateBadge : null}
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
      {showSettings && (
        <Settings
          onClose={handleCloseSettings}
          initialTab={settingsOptions.initialTab}
          notice={settingsOptions.notice}
          onUpdateFound={handleUpdateFound}
        />
      )}

      {showUpdateModal && updateInfo && (
        <AppUpdateModal
          updateInfo={updateInfo}
          onCancel={() => {
            if (updateModalState === 'info' || updateModalState === 'error') {
              setShowUpdateModal(false)
              setUpdateModalState('info')
              setUpdateError(null)
              setDownloadProgress(null)
            }
          }}
          onConfirm={handleConfirmUpdate}
          modalState={updateModalState}
          downloadProgress={downloadProgress}
          errorMessage={updateError}
          onCancelDownload={handleCancelDownload}
          onRetry={handleRetryUpdate}
        />
      )}
    </div>
  )
}

export default App
