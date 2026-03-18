import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { PaperAirplaneIcon, StopIcon, FolderIcon } from '@heroicons/react/24/solid'
import { PhotoIcon } from '@heroicons/react/24/outline'
import PaperClipIcon from '../icons/PaperClipIcon'
import XMarkIcon from '../icons/XMarkIcon'
import ModelSelector from '../ModelSelector'
import FolderSelectorPopover from './FolderSelectorPopover'
import { SkillsButton, ActiveSkillBadge } from '../skills'
import { i18nService } from '../../services/i18n'
import { skillService } from '../../services/skill'
import { RootState } from '../../store'
import { setDraftPrompt } from '../../store/slices/coworkSlice'
import { setSkills, toggleActiveSkill } from '../../store/slices/skillSlice'
import { Skill } from '../../types/skill'
import { CoworkImageAttachment } from '../../types/cowork'
import { getCompactFolderName } from '../../utils/path'

// 输入区附件结构：支持普通文件与图片（可携带 Data URL）
type CoworkAttachment = {
  path: string
  name: string
  isImage?: boolean
  dataUrl?: string
}

// 拼接到最终 prompt 中的附件标签前缀
const INPUT_FILE_LABEL = '输入文件'

// 允许识别为图片的文件扩展名集合
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'])

// 根据文件路径后缀判断是否为图片
const isImagePath = (filePath: string): boolean => {
  const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase()
  return IMAGE_EXTENSIONS.has(ext)
}

// 根据 MIME 类型判断是否为图片
const isImageMimeType = (mimeType: string): boolean => {
  return mimeType.startsWith('image/')
}

// 从 Data URL 中提取 MIME 与纯 base64 内容
const extractBase64FromDataUrl = (dataUrl: string): { mimeType: string; base64Data: string } | null => {
  const match = /^data:(.+);base64,(.*)$/.exec(dataUrl)
  if (!match) return null
  return { mimeType: match[1], base64Data: match[2] }
}

// 从路径中提取文件名（兼容 Windows/Unix 分隔符）
const getFileNameFromPath = (path: string): string => {
  const parts = path.split(/[/\\]/)
  return parts[parts.length - 1] || path
}

// 由 SKILL.md 路径推导技能目录，用于相对路径解析
const getSkillDirectoryFromPath = (skillPath: string): string => {
  const normalized = skillPath.trim().replace(/\\/g, '/')
  return normalized.replace(/\/SKILL\.md$/i, '') || normalized
}

// 将技能信息转成可内联注入的提示词块
const buildInlinedSkillPrompt = (skill: Skill): string => {
  const skillDirectory = getSkillDirectoryFromPath(skill.skillPath)
  return [
    `## Skill: ${skill.name}`,
    '<skill_context>',
    `  <location>${skill.skillPath}</location>`,
    `  <directory>${skillDirectory}</directory>`,
    '  <path_rules>',
    '    Resolve relative file references from this skill against <directory>.',
    '    Do not assume skills are under the current workspace directory.',
    '  </path_rules>',
    '</skill_context>',
    '',
    skill.prompt
  ].join('\n')
}

export interface CoworkPromptInputRef {
  /** 设置输入框值 */
  setValue: (value: string) => void
  /** 聚焦输入框 */
  focus: () => void
}

// 输入组件的对外参数定义
interface CoworkPromptInputProps {
  onSubmit: (prompt: string, skillPrompt?: string, imageAttachments?: CoworkImageAttachment[]) => void
  onStop?: () => void
  isStreaming?: boolean
  placeholder?: string
  disabled?: boolean
  size?: 'normal' | 'large'
  workingDirectory?: string
  onWorkingDirectoryChange?: (dir: string) => void
  showFolderSelector?: boolean
  showModelSelector?: boolean
  onManageSkills?: () => void
}

// Cowork 提示词输入组件：负责文本输入、附件管理、技能注入与提交
const CoworkPromptInput = React.forwardRef<CoworkPromptInputRef, CoworkPromptInputProps>((props, ref) => {
  const {
    onSubmit,
    onStop,
    isStreaming = false,
    placeholder = 'Enter your task...',
    disabled = false,
    size = 'normal',
    workingDirectory = '',
    onWorkingDirectoryChange,
    showFolderSelector = false,
    showModelSelector = false,
    onManageSkills
  } = props
  const dispatch = useDispatch()
  // 从 store 读取草稿并作为初始输入值
  const draftPrompt = useSelector((state: RootState) => state.cowork.draftPrompt)
  // 当前输入内容
  const [value, setValue] = useState(draftPrompt)
  // 当前附件列表（文件 + 图片）
  const [attachments, setAttachments] = useState<CoworkAttachment[]>([])
  // 目录选择弹层显隐
  const [showFolderMenu, setShowFolderMenu] = useState(false)
  // 未选择目录时的提交警告
  const [showFolderRequiredWarning, setShowFolderRequiredWarning] = useState(false)
  // 拖拽文件悬停态
  const [isDraggingFiles, setIsDraggingFiles] = useState(false)
  // 输入框 DOM 引用
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // 目录按钮 DOM 引用（用于 popover 锚点）
  const folderButtonRef = useRef<HTMLButtonElement>(null)
  // 拖拽进入/离开嵌套计数，避免闪烁
  const dragDepthRef = useRef(0)

  // 是否采用大尺寸输入区样式
  const isLarge = size === 'large'
  // 输入框最小高度
  const minHeight = isLarge ? 60 : 24
  // 输入框最大高度
  const maxHeight = isLarge ? 200 : 200

  // 根据内容高度限制输入框尺寸，避免超出视觉边界
  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight)}px`
  }, [maxHeight, minHeight])

  // 暴露方法给父组件
  React.useImperativeHandle(
    ref,
    () => ({
      setValue: (newValue: string) => {
        setValue(newValue)
        // 值更新后在下一帧同步输入框高度，避免读取到旧的 scrollHeight
        requestAnimationFrame(() => {
          resizeTextarea()
        })
      },
      focus: () => {
        textareaRef.current?.focus()
      }
    }),
    [resizeTextarea]
  )

  const activeSkillIds = useSelector((state: RootState) => state.skill.activeSkillIds)
  // 当前已加载的技能列表
  const skills = useSelector((state: RootState) => state.skill.skills)

  // 组件挂载时拉取技能列表
  useEffect(() => {
    const loadSkills = async () => {
      const loadedSkills = await skillService.loadSkills()
      dispatch(setSkills(loadedSkills))
    }
    loadSkills()
  }, [dispatch])

  useEffect(() => {
    const unsubscribe = skillService.onSkillsChanged(async () => {
      const loadedSkills = await skillService.loadSkills()
      dispatch(setSkills(loadedSkills))
    })
    return () => {
      unsubscribe()
    }
  }, [dispatch])

  // 文本变化时自动调整输入框高度
  useEffect(() => {
    resizeTextarea()
  }, [value, resizeTextarea])

  useEffect(() => {
    const handleFocusInput = (event: Event) => {
      // clear=true 时清空输入与附件；默认清空
      const detail = (event as CustomEvent<{ clear?: boolean }>).detail
      const shouldClear = detail?.clear ?? true
      if (shouldClear) {
        setValue('')
        setAttachments([])
      }
      requestAnimationFrame(() => {
        textareaRef.current?.focus()
      })
    }
    window.addEventListener('cowork:focus-input', handleFocusInput)
    return () => {
      window.removeEventListener('cowork:focus-input', handleFocusInput)
    }
  }, [])

  useEffect(() => {
    // 已选择目录后自动隐藏“需先选目录”提示
    if (workingDirectory?.trim()) {
      setShowFolderRequiredWarning(false)
    }
  }, [workingDirectory])

  useEffect(() => {
    // 输入变化后延迟写回草稿，减少高频 dispatch
    if (value !== draftPrompt) {
      const timer = setTimeout(() => {
        dispatch(setDraftPrompt(value))
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [value, draftPrompt, dispatch])

  const handleSubmit = useCallback(() => {
    // 配置要求选择目录时，拦截无目录提交
    if (showFolderSelector && !workingDirectory?.trim()) {
      setShowFolderRequiredWarning(true)
      return
    }

    // 过滤纯空白输入
    const trimmedValue = value.trim()
    // 无文本且无附件、或当前不可提交状态时直接返回
    if ((!trimmedValue && attachments.length === 0) || isStreaming || disabled) return
    setShowFolderRequiredWarning(false)

    // 收集已启用技能，并拼接成统一技能提示词
    const activeSkills = activeSkillIds.map((id) => skills.find((s) => s.id === id)).filter((s): s is Skill => s !== undefined)
    const skillPrompt = activeSkills.length > 0 ? activeSkills.map(buildInlinedSkillPrompt).join('\n\n') : undefined

    // 提取图片附件的 base64 数据，供支持视觉的模型使用
    const imageAttachments: CoworkImageAttachment[] = []
    for (const attachment of attachments) {
      if (attachment.isImage && attachment.dataUrl) {
        const extracted = extractBase64FromDataUrl(attachment.dataUrl)
        if (extracted) {
          imageAttachments.push({
            name: attachment.name,
            mimeType: extracted.mimeType,
            base64Data: extracted.base64Data
          })
        }
      }
    }

    // 将所有真实路径附件（普通文件 + 图片）补充到文本提示词中
    // 图片即使有 base64，也要保留文件路径，便于某些技能通过 --image <path> 使用原图
    // 以 inline: 开头的是剪贴板/内联图片伪路径，这里会过滤掉
    const attachmentLines = attachments
      .filter((a) => !a.path.startsWith('inline:'))
      .map((attachment) => `${INPUT_FILE_LABEL}: ${attachment.path}`)
      .join('\n')
    const finalPrompt = trimmedValue ? (attachmentLines ? `${trimmedValue}\n\n${attachmentLines}` : trimmedValue) : attachmentLines

    // 仅在存在图片附件时输出调试日志
    if (imageAttachments.length > 0) {
      console.log('[CoworkPromptInput] handleSubmit: passing imageAttachments to onSubmit', {
        count: imageAttachments.length,
        names: imageAttachments.map((a) => a.name),
        base64Lengths: imageAttachments.map((a) => a.base64Data.length)
      })
    }
    onSubmit(finalPrompt, skillPrompt, imageAttachments.length > 0 ? imageAttachments : undefined)
    setValue('')
    dispatch(setDraftPrompt(''))
    setAttachments([])
  }, [value, isStreaming, disabled, onSubmit, activeSkillIds, skills, attachments, showFolderSelector, workingDirectory, dispatch])

  // 选择技能：切换激活状态
  const handleSelectSkill = useCallback(
    (skill: Skill) => {
      dispatch(toggleActiveSkill(skill.id))
    },
    [dispatch]
  )

  // 打开技能管理面板（由父组件决定具体行为）
  const handleManageSkills = useCallback(() => {
    if (onManageSkills) {
      onManageSkills()
    }
  }, [onManageSkills])

  // 键盘提交规则：Enter 提交、Shift+Enter 换行
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter 提交，Shift+Enter 换行；输入法合成中不触发提交
    const isComposing = event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229
    if (event.key === 'Enter' && !event.shiftKey && !isComposing && !isStreaming && !disabled) {
      event.preventDefault()
      handleSubmit()
    }
  }

  // 流式输出期间的停止按钮回调
  const handleStopClick = () => {
    if (onStop) {
      onStop()
    }
  }

  // 输入容器样式（大尺寸/常规）
  const containerClass = isLarge
    ? 'relative rounded-2xl border dark:border-claude-darkBorder border-claude-border dark:bg-claude-darkSurface bg-claude-surface shadow-card focus-within:shadow-elevated focus-within:ring-1 focus-within:ring-claude-accent/40 focus-within:border-claude-accent'
    : 'relative flex items-end gap-2 p-3 rounded-xl border dark:border-claude-darkBorder border-claude-border dark:bg-claude-darkSurface bg-claude-surface'

  // 输入框样式（大尺寸/常规）
  const textareaClass = isLarge
    ? `w-full resize-none bg-transparent px-4 pt-2.5 pb-2 dark:text-claude-darkText text-claude-text placeholder:dark:text-claude-darkTextSecondary/60 placeholder:text-claude-textSecondary/60 focus:outline-none text-[15px] leading-6 min-h-[${minHeight}px] max-h-[${maxHeight}px]`
    : 'flex-1 resize-none bg-transparent dark:text-claude-darkText text-claude-text placeholder:dark:text-claude-darkTextSecondary placeholder:text-claude-textSecondary focus:outline-none text-sm leading-relaxed min-h-[24px] max-h-[200px]'

  // 将目录显示为紧凑形式，避免占满输入区
  const truncatePath = (path: string, maxLength = 30): string => {
    if (!path) return i18nService.t('noFolderSelected')
    return getCompactFolderName(path, maxLength) || i18nService.t('noFolderSelected')
  }

  // 目录选择回传给父组件
  const handleFolderSelect = (path: string) => {
    if (onWorkingDirectoryChange) {
      onWorkingDirectoryChange(path)
    }
  }

  // 当前模型配置（用于判断是否支持图片）
  const selectedModel = useSelector((state: RootState) => state.model.selectedModel)
  // 标记模型是否支持视觉输入
  const modelSupportsImage = !!selectedModel?.supportsImage

  // 添加附件（路径去重）
  const addAttachment = useCallback((filePath: string, imageInfo?: { isImage: boolean; dataUrl?: string }) => {
    if (!filePath) return
    setAttachments((prev) => {
      if (prev.some((attachment) => attachment.path === filePath)) {
        return prev
      }
      return [
        ...prev,
        {
          path: filePath,
          name: getFileNameFromPath(filePath),
          isImage: imageInfo?.isImage,
          dataUrl: imageInfo?.dataUrl
        }
      ]
    })
  }, [])

  // 添加无本地路径的内联图片附件
  const addImageAttachmentFromDataUrl = useCallback((name: string, dataUrl: string) => {
    // 内联图片没有真实文件路径，使用伪路径确保列表 key 唯一
    const pseudoPath = `inline:${name}:${Date.now()}`
    setAttachments((prev) => {
      return [
        ...prev,
        {
          path: pseudoPath,
          name,
          isImage: true,
          dataUrl
        }
      ]
    })
  }, [])

  // File 对象转 Data URL（用于图片预处理）
  const fileToDataUrl = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result
        if (typeof result !== 'string') {
          reject(new Error('Failed to read file'))
          return
        }
        resolve(result)
      }
      reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
  }, [])

  // File 对象转 base64（不含 data:image/... 前缀）
  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result
        if (typeof result !== 'string') {
          reject(new Error('Failed to read file'))
          return
        }
        const commaIndex = result.indexOf(',')
        resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result)
      }
      reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
  }, [])

  // 尝试读取浏览器 File 中的原生文件路径（Electron 场景）
  const getNativeFilePath = useCallback((file: File): string | null => {
    const maybePath = (file as File & { path?: string }).path
    if (typeof maybePath === 'string' && maybePath.trim()) {
      return maybePath
    }
    return null
  }, [])

  // 将无原生路径的文件落盘到工作目录，返回落盘路径
  const saveInlineFile = useCallback(
    async (file: File): Promise<string | null> => {
      try {
        const dataBase64 = await fileToBase64(file)
        if (!dataBase64) {
          return null
        }
        const result = await window.electron.dialog.saveInlineFile({
          dataBase64,
          fileName: file.name,
          mimeType: file.type,
          cwd: workingDirectory
        })
        if (result.success && result.path) {
          return result.path
        }
        return null
      } catch (error) {
        console.error('Failed to save inline file:', error)
        return null
      }
    },
    [fileToBase64, workingDirectory]
  )

  // 统一处理拖拽/粘贴/选择进入的文件列表
  const handleIncomingFiles = useCallback(
    async (fileList: FileList | File[]) => {
      // 流式中或禁用态不处理新文件
      if (disabled || isStreaming) return
      const files = Array.from(fileList ?? [])
      if (files.length === 0) return

      for (const file of files) {
        const nativePath = getNativeFilePath(file)

        // 判断是否图片，并确认当前模型支持视觉能力
        const fileIsImage = nativePath ? isImagePath(nativePath) : isImageMimeType(file.type)

        if (fileIsImage && modelSupportsImage) {
          // 视觉模型优先读取图片 Data URL，便于直接随请求发送
          if (nativePath) {
            try {
              const result = await window.electron.dialog.readFileAsDataUrl(nativePath)
              if (result.success && result.dataUrl) {
                addAttachment(nativePath, { isImage: true, dataUrl: result.dataUrl })
                continue
              }
            } catch (error) {
              console.error('Failed to read image as data URL:', error)
            }
            // 回退到普通文件附件流程
            addAttachment(nativePath)
          } else {
            // 无本地路径（如剪贴板、浏览器拖拽）时，走 FileReader 读取
            try {
              const dataUrl = await fileToDataUrl(file)
              addImageAttachmentFromDataUrl(file.name, dataUrl)
            } catch (error) {
              console.error('Failed to read image from clipboard:', error)
              const stagedPath = await saveInlineFile(file)
              if (stagedPath) {
                addAttachment(stagedPath)
              }
            }
          }
          continue
        }

        // 非图片，或当前模型不支持视觉能力：按普通文件流程处理
        if (nativePath) {
          addAttachment(nativePath)
          continue
        }

        const stagedPath = await saveInlineFile(file)
        if (stagedPath) {
          addAttachment(stagedPath)
        }
      }
    },
    [
      addAttachment,
      addImageAttachmentFromDataUrl,
      disabled,
      fileToDataUrl,
      getNativeFilePath,
      isStreaming,
      modelSupportsImage,
      saveInlineFile
    ]
  )

  // 打开系统文件选择器并添加选中文件
  const handleAddFile = useCallback(async () => {
    try {
      const result = await window.electron.dialog.selectFile({
        title: i18nService.t('coworkAddFile')
      })
      if (result.success && result.path) {
        // 单文件选择时同样遵循“图片优先走视觉附件”的策略
        if (isImagePath(result.path) && modelSupportsImage) {
          try {
            const readResult = await window.electron.dialog.readFileAsDataUrl(result.path)
            if (readResult.success && readResult.dataUrl) {
              addAttachment(result.path, { isImage: true, dataUrl: readResult.dataUrl })
              return
            }
          } catch (error) {
            console.error('Failed to read image as data URL:', error)
          }
        }
        addAttachment(result.path)
      }
    } catch (error) {
      console.error('Failed to select file:', error)
    }
  }, [addAttachment, modelSupportsImage])

  // 删除指定附件
  const handleRemoveAttachment = useCallback((path: string) => {
    setAttachments((prev) => prev.filter((attachment) => attachment.path !== path))
  }, [])

  // 判断当前拖拽事件是否包含文件数据
  const hasFileTransfer = (dataTransfer: DataTransfer | null): boolean => {
    if (!dataTransfer) return false
    if (dataTransfer.files.length > 0) return true
    return Array.from(dataTransfer.types).includes('Files')
  }

  // 拖拽进入：累加深度并展示文件投放高亮
  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    console.log('eee')
    if (!hasFileTransfer(event.dataTransfer)) return
    event.preventDefault()
    event.stopPropagation()
    dragDepthRef.current += 1
    if (!disabled && !isStreaming) {
      setIsDraggingFiles(true)
    }
  }

  // 拖拽悬停：允许 drop 并设置视觉反馈
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (!hasFileTransfer(event.dataTransfer)) return
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = disabled || isStreaming ? 'none' : 'copy'
  }

  // 拖拽离开：按深度归零后再关闭高亮，避免抖动
  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    if (!hasFileTransfer(event.dataTransfer)) return
    event.preventDefault()
    event.stopPropagation()
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
    if (dragDepthRef.current === 0) {
      setIsDraggingFiles(false)
    }
  }

  // 文件投放：重置拖拽态并交给统一文件入口处理
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (!hasFileTransfer(event.dataTransfer)) return
    event.preventDefault()
    event.stopPropagation()
    dragDepthRef.current = 0
    setIsDraggingFiles(false)
    if (disabled || isStreaming) return
    void handleIncomingFiles(event.dataTransfer.files)
  }

  // 处理粘贴文件（如截图）并阻止默认粘贴行为
  const handlePaste = useCallback(
    (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
      if (disabled || isStreaming) return
      const files = Array.from(event.clipboardData?.files ?? [])
      if (files.length === 0) return
      event.preventDefault()
      void handleIncomingFiles(files)
    },
    [disabled, handleIncomingFiles, isStreaming]
  )

  // 当前是否允许提交（有文本或有附件，且非禁用）
  const canSubmit = !disabled && (!!value.trim() || attachments.length > 0)
  // 拖拽中追加高亮样式
  const enhancedContainerClass = isDraggingFiles ? `${containerClass} ring-2 ring-claude-accent/50 border-claude-accent/60` : containerClass

  return (
    <div className="relative">
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.path}
              className="inline-flex items-center gap-1.5 rounded-full border dark:border-claude-darkBorder border-claude-border dark:bg-claude-darkSurface bg-claude-surface px-2.5 py-1 text-xs dark:text-claude-darkText text-claude-text max-w-full"
              title={attachment.path}
            >
              {attachment.isImage ? (
                <PhotoIcon className="h-3.5 w-3.5 flex-shrink-0 text-blue-500" />
              ) : (
                <PaperClipIcon className="h-3.5 w-3.5 flex-shrink-0" />
              )}
              <span className="truncate max-w-[180px]">{attachment.name}</span>
              <button
                type="button"
                onClick={() => handleRemoveAttachment(attachment.path)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-claude-surfaceHover dark:hover:bg-claude-darkSurfaceHover"
                aria-label={i18nService.t('coworkAttachmentRemove')}
                title={i18nService.t('coworkAttachmentRemove')}
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div
        className={enhancedContainerClass}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDraggingFiles && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-[inherit] bg-claude-accent/10 text-xs font-medium text-claude-accent">
            {i18nService.t('coworkDropFileHint')}
          </div>
        )}

        {isLarge ? (
          <>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={placeholder}
              disabled={disabled}
              rows={isLarge ? 2 : 1}
              className={textareaClass}
              style={{ minHeight: `${minHeight}px` }}
            />
            <div className="flex items-center justify-between px-4 pb-2 pt-1.5">
              <div className="flex items-center gap-2 relative">
                {showFolderSelector && (
                  <>
                    <div className="relative group">
                      <button
                        ref={folderButtonRef as React.RefObject<HTMLButtonElement>}
                        type="button"
                        onClick={() => setShowFolderMenu(!showFolderMenu)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm dark:text-claude-darkTextSecondary text-claude-textSecondary dark:hover:bg-claude-darkSurfaceHover hover:bg-claude-surfaceHover dark:hover:text-claude-darkText hover:text-claude-text transition-colors"
                      >
                        <FolderIcon className="h-4 w-4" />
                        <span className="max-w-[150px] truncate text-xs">{truncatePath(workingDirectory)}</span>
                      </button>
                      {/* 目录下拉打开时不显示 tooltip，避免视觉重叠 */}
                      {!showFolderMenu && (
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3.5 py-2.5 text-[13px] leading-relaxed rounded-xl shadow-xl dark:bg-claude-darkBg bg-claude-bg dark:text-claude-darkText text-claude-text dark:border-claude-darkBorder border-claude-border border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-50 max-w-[400px] break-all whitespace-nowrap">
                          {truncatePath(workingDirectory, 120)}
                        </div>
                      )}
                    </div>
                    <FolderSelectorPopover
                      isOpen={showFolderMenu}
                      onClose={() => setShowFolderMenu(false)}
                      onSelectFolder={handleFolderSelect}
                      anchorRef={folderButtonRef as React.RefObject<HTMLElement>}
                    />
                  </>
                )}
                {showModelSelector && <ModelSelector dropdownDirection="up" />}
                <button
                  type="button"
                  onClick={handleAddFile}
                  className="flex items-center justify-center p-1.5 rounded-lg text-sm dark:text-claude-darkTextSecondary text-claude-textSecondary dark:hover:bg-claude-darkSurfaceHover hover:bg-claude-surfaceHover dark:hover:text-claude-darkText hover:text-claude-text transition-colors"
                  title={i18nService.t('coworkAddFile')}
                  aria-label={i18nService.t('coworkAddFile')}
                  disabled={disabled || isStreaming}
                >
                  <PaperClipIcon className="h-4 w-4" />
                </button>
                <SkillsButton onSelectSkill={handleSelectSkill} onManageSkills={handleManageSkills} />
                <ActiveSkillBadge />
              </div>
              <div className="flex items-center gap-2">
                {isStreaming ? (
                  <button
                    type="button"
                    onClick={handleStopClick}
                    className="p-2 rounded-xl bg-red-500 hover:bg-red-600 text-white transition-all shadow-subtle hover:shadow-card active:scale-95"
                    aria-label="Stop"
                  >
                    <StopIcon className="h-5 w-5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className="p-2 rounded-xl bg-claude-accent hover:bg-claude-accentHover text-white transition-all shadow-subtle hover:shadow-card active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Send"
                  >
                    <PaperAirplaneIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              className={textareaClass}
            />

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleAddFile}
                className="flex-shrink-0 p-1.5 rounded-lg dark:text-claude-darkTextSecondary text-claude-textSecondary dark:hover:bg-claude-darkSurfaceHover hover:bg-claude-surfaceHover dark:hover:text-claude-darkText hover:text-claude-text transition-colors"
                title={i18nService.t('coworkAddFile')}
                aria-label={i18nService.t('coworkAddFile')}
                disabled={disabled || isStreaming}
              >
                <PaperClipIcon className="h-4 w-4" />
              </button>
            </div>

            {isStreaming ? (
              <button
                type="button"
                onClick={handleStopClick}
                className="flex-shrink-0 p-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-all shadow-subtle hover:shadow-card active:scale-95"
                aria-label="Stop"
              >
                <StopIcon className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="flex-shrink-0 p-2 rounded-lg bg-claude-accent hover:bg-claude-accentHover text-white transition-all shadow-subtle hover:shadow-card active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Send"
              >
                <PaperAirplaneIcon className="h-4 w-4" />
              </button>
            )}
          </>
        )}
      </div>
      {showFolderRequiredWarning && (
        <div className="mt-2 text-xs text-red-500 dark:text-red-400">{i18nService.t('coworkSelectFolderFirst')}</div>
      )}
    </div>
  )
})

CoworkPromptInput.displayName = 'CoworkPromptInput'

export default CoworkPromptInput
