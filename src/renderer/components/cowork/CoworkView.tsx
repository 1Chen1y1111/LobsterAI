import React, { useEffect, useState, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { RootState } from '../../store'
import { clearCurrentSession, setCurrentSession, setStreaming } from '../../store/slices/coworkSlice'
import { clearActiveSkills, setActiveSkillIds } from '../../store/slices/skillSlice'
import { setActions, selectAction, clearSelection } from '../../store/slices/quickActionSlice'
import { coworkService } from '../../services/cowork'
import { skillService } from '../../services/skill'
import { quickActionService } from '../../services/quickAction'
import { i18nService } from '../../services/i18n'
import CoworkPromptInput, { type CoworkPromptInputRef } from './CoworkPromptInput'
import CoworkSessionDetail from './CoworkSessionDetail'
import ModelSelector from '../ModelSelector'
import SidebarToggleIcon from '../icons/SidebarToggleIcon'
import ComposeIcon from '../icons/ComposeIcon'
import WindowTitleBar from '../window/WindowTitleBar'
import { QuickActionBar, PromptPanel } from '../quick-actions'
import type { SettingsOpenOptions } from '../Settings'
import type { CoworkSession, CoworkImageAttachment } from '../../types/cowork'

export interface CoworkViewProps {
  onRequestAppSettings?: (options?: SettingsOpenOptions) => void
  onShowSkills?: () => void
  isSidebarCollapsed?: boolean
  onToggleSidebar?: () => void
  onNewChat?: () => void
  updateBadge?: React.ReactNode
}

const CoworkView: React.FC<CoworkViewProps> = ({
  onRequestAppSettings,
  onShowSkills,
  isSidebarCollapsed,
  onToggleSidebar,
  onNewChat,
  updateBadge
}) => {
  const dispatch = useDispatch()
  const isMac = window.electron.platform === 'darwin'
  const [isInitialized, setIsInitialized] = useState(false)
  // 标记“启动会话”流程是否正在进行，避免用户重复提交。
  const isStartingRef = useRef(false)
  // 记录当前待启动请求，支持在启动尚未完成时执行取消。
  const pendingStartRef = useRef<{ requestId: number; cancelled: boolean } | null>(null)
  const startRequestIdRef = useRef(0)
  // 输入框引用：用于外部填充文本与聚焦。
  const promptInputRef = useRef<CoworkPromptInputRef>(null)

  const { currentSession, isStreaming, config } = useSelector((state: RootState) => state.cowork)

  const activeSkillIds = useSelector((state: RootState) => state.skill.activeSkillIds)
  const skills = useSelector((state: RootState) => state.skill.skills)
  const quickActions = useSelector((state: RootState) => state.quickAction.actions)
  const selectedActionId = useSelector((state: RootState) => state.quickAction.selectedActionId)

  // 构建模型配置缺失提示文案，并在必要时附加原始错误信息。
  const buildApiConfigNotice = (error?: string) => {
    const baseNotice = i18nService.t('coworkModelSettingsRequired')
    if (!error) {
      return baseNotice
    }
    const normalizedError = error.trim()
    if (
      normalizedError.startsWith('No enabled provider found for model:') ||
      normalizedError === 'No available model configured in enabled providers.'
    ) {
      return baseNotice
    }
    return `${baseNotice} (${error})`
  }

  useEffect(() => {
    // 初始化协作服务、快捷动作与模型配置检查。
    const init = async () => {
      await coworkService.init()
      // 初始化快捷动作（按当前语言加载）。
      try {
        quickActionService.initialize()
        const actions = await quickActionService.getLocalizedActions()
        dispatch(setActions(actions))
      } catch (error) {
        console.error('Failed to load quick actions:', error)
      }
      try {
        const apiConfig = await coworkService.checkApiConfig()
        if (apiConfig && !apiConfig.hasConfig) {
          onRequestAppSettings?.({
            initialTab: 'model',
            notice: buildApiConfigNotice(apiConfig.error)
          })
        }
      } catch (error) {
        console.error('Failed to check cowork API config:', error)
      }
      setIsInitialized(true)
    }
    init()

    // 监听语言变化，动态刷新快捷动作文案。
    const unsubscribe = quickActionService.subscribe(async () => {
      try {
        const actions = await quickActionService.getLocalizedActions()
        dispatch(setActions(actions))
      } catch (error) {
        console.error('Failed to reload quick actions:', error)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [dispatch])

  // 启动新会话：先渲染临时会话，再发起真实会话并处理取消与标题优化。
  const handleStartSession = async (prompt: string, skillPrompt?: string, imageAttachments?: CoworkImageAttachment[]) => {
    // 防止重复触发“新建会话”。
    if (isStartingRef.current) return
    isStartingRef.current = true
    const requestId = ++startRequestIdRef.current
    pendingStartRef.current = { requestId, cancelled: false }
    // 判断当前启动请求是否已被取消或被后续请求覆盖。
    const isPendingStartCancelled = () => {
      const pending = pendingStartRef.current
      return !pending || pending.requestId !== requestId || pending.cancelled
    }

    try {
      try {
        const apiConfig = await coworkService.checkApiConfig()
        if (apiConfig && !apiConfig.hasConfig) {
          onRequestAppSettings?.({
            initialTab: 'model',
            notice: buildApiConfigNotice(apiConfig.error)
          })
          isStartingRef.current = false
          return
        }
      } catch (error) {
        console.error('Failed to check cowork API config:', error)
      }

      // 先创建临时会话并立刻展示用户消息，避免等待接口返回造成空白。
      const tempSessionId = `temp-${Date.now()}`
      const fallbackTitle = prompt.split('\n')[0].slice(0, 50) || i18nService.t('coworkNewSession')
      const now = Date.now()

      // 清空前先保存当前启用技能，确保首条消息携带正确技能上下文。
      const sessionSkillIds = [...activeSkillIds]

      const tempSession: CoworkSession = {
        id: tempSessionId,
        title: fallbackTitle,
        claudeSessionId: null,
        status: 'running',
        pinned: false,
        createdAt: now,
        updatedAt: now,
        cwd: config.workingDirectory || '',
        systemPrompt: '',
        executionMode: config.executionMode || 'local',
        activeSkillIds: sessionSkillIds,
        messages: [
          {
            id: `msg-${now}`,
            type: 'user',
            content: prompt,
            timestamp: now,
            metadata:
              sessionSkillIds.length > 0 || (imageAttachments && imageAttachments.length > 0)
                ? {
                    ...(sessionSkillIds.length > 0 ? { skillIds: sessionSkillIds } : {}),
                    ...(imageAttachments && imageAttachments.length > 0 ? { imageAttachments } : {})
                  }
                : undefined
          }
        ]
      }

      // 立即进入会话详情页，并标记为流式处理中。
      dispatch(setCurrentSession(tempSession))
      dispatch(setStreaming(true))

      // 新会话发起后清理技能和快捷动作选择，避免污染后续会话。
      dispatch(clearActiveSkills())
      dispatch(clearSelection())

      // 组合技能提示词与系统提示词。
      // 未手动选择技能时，回退到自动路由提示词。
      let effectiveSkillPrompt = skillPrompt
      if (!skillPrompt) {
        effectiveSkillPrompt = (await skillService.getAutoRoutingPrompt()) || undefined
      }
      const combinedSystemPrompt = [effectiveSkillPrompt, config.systemPrompt].filter((p) => p?.trim()).join('\n\n') || undefined

      // 使用兜底标题启动真实会话，后续再异步优化标题。
      const startedSession = await coworkService.startSession({
        prompt,
        title: fallbackTitle,
        cwd: config.workingDirectory || undefined,
        systemPrompt: combinedSystemPrompt,
        activeSkillIds: sessionSkillIds,
        imageAttachments
      })

      // 异步生成更准确标题，生成成功后再重命名。
      if (startedSession) {
        coworkService
          .generateSessionTitle(prompt)
          .then((generatedTitle) => {
            const betterTitle = generatedTitle?.trim()
            if (betterTitle && betterTitle !== fallbackTitle) {
              coworkService.renameSession(startedSession.id, betterTitle)
            }
          })
          .catch((error) => {
            console.error('Failed to generate cowork session title:', error)
          })
      }

      // 若启动请求未完成期间用户已取消，则在会话创建后立即停止。
      if (isPendingStartCancelled() && startedSession) {
        await coworkService.stopSession(startedSession.id)
      }
    } finally {
      if (pendingStartRef.current?.requestId === requestId) {
        pendingStartRef.current = null
      }
      isStartingRef.current = false
    }
  }

  // 继续当前会话：合并技能与系统提示词并发送续聊消息。
  const handleContinueSession = async (prompt: string, skillPrompt?: string, imageAttachments?: CoworkImageAttachment[]) => {
    if (!currentSession) return

    console.log('[CoworkView] handleContinueSession called', {
      hasImageAttachments: !!imageAttachments,
      imageAttachmentsCount: imageAttachments?.length ?? 0,
      imageAttachmentsNames: imageAttachments?.map((a) => a.name),
      imageAttachmentsBase64Lengths: imageAttachments?.map((a) => a.base64Data.length)
    })

    // 清理前先记录当前启用技能，用于本次续聊。
    const sessionSkillIds = [...activeSkillIds]

    // 使用后清理技能选择，避免自动带入下一条消息。
    if (sessionSkillIds.length > 0) {
      dispatch(clearActiveSkills())
    }

    // 续聊场景下同样组合技能提示词与系统提示词。
    // 未手动选择技能时，回退到自动路由提示词。
    let effectiveSkillPrompt = skillPrompt
    if (!skillPrompt) {
      effectiveSkillPrompt = (await skillService.getAutoRoutingPrompt()) || undefined
    }
    const combinedSystemPrompt = [effectiveSkillPrompt, config.systemPrompt].filter((p) => p?.trim()).join('\n\n') || undefined

    await coworkService.continueSession({
      sessionId: currentSession.id,
      prompt,
      systemPrompt: combinedSystemPrompt,
      activeSkillIds: sessionSkillIds.length > 0 ? sessionSkillIds : undefined,
      imageAttachments
    })
  }

  // 停止当前会话；若仍处于临时会话启动阶段则标记取消。
  const handleStopSession = async () => {
    if (!currentSession) return
    if (currentSession.id.startsWith('temp-') && pendingStartRef.current) {
      pendingStartRef.current.cancelled = true
    }
    await coworkService.stopSession(currentSession.id)
  }

  // 当前被选中的快捷动作。
  const selectedAction = React.useMemo(() => {
    return quickActions.find((action) => action.id === selectedActionId)
  }, [quickActions, selectedActionId])

  // 选择快捷动作时，同时激活其映射技能。
  // 用于将“动作选择”与“技能切换”保持同步。
  const handleActionSelect = (actionId: string) => {
    dispatch(selectAction(actionId))
    const action = quickActions.find((a) => a.id === actionId)
    if (action) {
      const targetSkill = skills.find((s) => s.id === action.skillMapping)
      if (targetSkill) {
        dispatch(setActiveSkillIds([targetSkill.id]))
      }
    }
  }

  // 若映射技能在输入区被取消，则清除快捷动作选中状态，恢复快捷栏。
  useEffect(() => {
    if (!selectedActionId) return
    const action = quickActions.find((a) => a.id === selectedActionId)
    if (action) {
      const skillStillActive = activeSkillIds.includes(action.skillMapping)
      if (!skillStillActive) {
        dispatch(clearSelection())
      }
    }
  }, [activeSkillIds])

  // 从快捷动作面板选择模板提示词后，写入输入框并聚焦。
  // 便于用户快速二次编辑后发送。
  const handleQuickActionPromptSelect = (prompt: string) => {
    promptInputRef.current?.setValue(prompt)
    promptInputRef.current?.focus()
  }

  useEffect(() => {
    // 处理全局“新会话”快捷键：清空当前会话并聚焦输入框。
    const handleNewSession = () => {
      dispatch(clearCurrentSession())
      dispatch(clearSelection())
      window.dispatchEvent(
        new CustomEvent('cowork:focus-input', {
          detail: { clear: true }
        })
      )
    }
    window.addEventListener('cowork:shortcut:new-session', handleNewSession)
    return () => {
      window.removeEventListener('cowork:shortcut:new-session', handleNewSession)
    }
  }, [dispatch])

  if (!isInitialized) {
    return (
      <div className="flex-1 h-full flex flex-col dark:bg-claude-darkBg bg-claude-bg">
        <div className="draggable flex h-12 items-center justify-end px-4 border-b dark:border-claude-darkBorder border-claude-border shrink-0">
          <WindowTitleBar inline />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="dark:text-claude-darkTextSecondary text-claude-textSecondary">{i18nService.t('loading')}</div>
        </div>
      </div>
    )
  }

  // 存在当前会话时，直接渲染会话详情页。
  if (currentSession) {
    return (
      <>
        <CoworkSessionDetail
          onManageSkills={() => onShowSkills?.()}
          onContinue={handleContinueSession}
          onStop={handleStopSession}
          onNavigateHome={() => dispatch(clearCurrentSession())}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={onToggleSidebar}
          onNewChat={onNewChat}
          updateBadge={updateBadge}
        />
      </>
    )
  }

  // 无当前会话时，渲染首页视图。
  return (
    <div className="flex-1 flex flex-col dark:bg-claude-darkBg bg-claude-bg h-full">
      {/* 顶部区域 */}
      <div className="draggable flex h-12 items-center justify-between px-4 border-b dark:border-claude-darkBorder border-claude-border shrink-0">
        <div className="non-draggable h-8 flex items-center">
          {isSidebarCollapsed && (
            <div className={`flex items-center gap-1 mr-2 ${isMac ? 'pl-[68px]' : ''}`}>
              <button
                type="button"
                onClick={onToggleSidebar}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg dark:text-claude-darkTextSecondary text-claude-textSecondary hover:bg-claude-surfaceHover dark:hover:bg-claude-darkSurfaceHover transition-colors"
              >
                <SidebarToggleIcon className="h-4 w-4" isCollapsed={true} />
              </button>
              <button
                type="button"
                onClick={onNewChat}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg dark:text-claude-darkTextSecondary text-claude-textSecondary hover:bg-claude-surfaceHover dark:hover:bg-claude-darkSurfaceHover transition-colors"
              >
                <ComposeIcon className="h-4 w-4" />
              </button>
              {updateBadge}
            </div>
          )}
          <ModelSelector />
        </div>
        <WindowTitleBar inline />
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-3xl mx-auto px-4 py-16 space-y-12">
          {/* 欢迎信息 */}
          <div className="text-center space-y-5">
            <img src="logo.png" alt="logo" className="w-16 h-16 mx-auto" />
            <h2 className="text-3xl font-bold tracking-tight dark:text-claude-darkText text-claude-text">
              {i18nService.t('coworkWelcome')}
            </h2>
            <p className="text-sm dark:text-claude-darkTextSecondary text-claude-textSecondary max-w-md mx-auto">
              {i18nService.t('coworkDescription')}
            </p>
          </div>

          {/* 提示词输入区（大尺寸，含目录选择器） */}
          <div className="space-y-3">
            <div className="shadow-glow-accent rounded-2xl">
              <CoworkPromptInput
                ref={promptInputRef}
                onSubmit={handleStartSession}
                onStop={handleStopSession}
                isStreaming={isStreaming}
                placeholder={i18nService.t('coworkPlaceholder')}
                size="large"
                workingDirectory={config.workingDirectory}
                onWorkingDirectoryChange={async (dir: string) => {
                  await coworkService.updateConfig({ workingDirectory: dir })
                }}
                showFolderSelector={true}
                onManageSkills={() => onShowSkills?.()}
              />
            </div>
          </div>

          {/* 快捷动作区 */}
          <div className="space-y-4">
            {selectedAction ? (
              <PromptPanel action={selectedAction} onPromptSelect={handleQuickActionPromptSelect} />
            ) : (
              <QuickActionBar actions={quickActions} onActionSelect={handleActionSelect} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CoworkView
