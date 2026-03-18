import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import 'katex/contrib/mhchem'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { ClipboardDocumentIcon, CheckIcon, DocumentIcon, FolderIcon } from '@heroicons/react/24/outline'
import { i18nService } from '../services/i18n'

// 代码块高亮的上限，避免超大内容触发高开销渲染。
const CODE_BLOCK_LINE_LIMIT = 200
const CODE_BLOCK_CHAR_LIMIT = 20000
// Prism 代码块容器使用的统一样式。
const SYNTAX_HIGHLIGHTER_STYLE = {
  margin: 0,
  borderRadius: 0,
  background: '#282c34'
}
// Markdown 链接 URL 过滤允许的协议白名单。
const SAFE_URL_PROTOCOLS = new Set(['http', 'https', 'mailto', 'tel', 'file'])

// 对 file URL 编码，并额外转义括号，避免破坏 Markdown 链接语法。
const encodeFileUrl = (url: string): string => {
  const encoded = encodeURI(url)
  return encoded.replace(/\(/g, '%28').replace(/\)/g, '%29')
}

// 仅对 file:// 目标地址做编码，并保留可选尖括号包裹形式。
const encodeFileUrlDestination = (dest: string): string => {
  const trimmed = dest.trim()
  if (!/^<?file:\/\//i.test(trimmed)) {
    return dest
  }

  let core = trimmed
  let prefix = ''
  let suffix = ''
  if (core.startsWith('<') && core.endsWith('>')) {
    prefix = '<'
    suffix = '>'
    core = core.slice(1, -1)
  }

  const encoded = encodeFileUrl(core)
  return dest.replace(trimmed, `${prefix}${encoded}${suffix}`)
}

// 查找 Markdown 链接目标的匹配右括号，支持嵌套括号场景。
const findMarkdownLinkEnd = (input: string, start: number): number => {
  let depth = 1
  for (let i = start; i < input.length; i += 1) {
    const char = input[i]
    if (char === '\\') {
      i += 1
      continue
    }
    if (char === '(') {
      depth += 1
      continue
    }
    if (char === ')') {
      depth -= 1
      if (depth === 0) {
        return i
      }
    }
    if (char === '\n') {
      return -1
    }
  }
  return -1
}

// 重写 Markdown 中的链接目标，确保 file:// URL 已安全编码。
const encodeFileUrlsInMarkdown = (content: string): string => {
  if (!content.includes('file://')) {
    return content
  }

  let result = ''
  let cursor = 0
  while (cursor < content.length) {
    const openIndex = content.indexOf('](', cursor)
    if (openIndex === -1) {
      result += content.slice(cursor)
      break
    }

    result += content.slice(cursor, openIndex + 2)
    const destStart = openIndex + 2
    const destEnd = findMarkdownLinkEnd(content, destStart)
    if (destEnd === -1) {
      result += content.slice(destStart)
      break
    }

    const dest = content.slice(destStart, destEnd)
    result += encodeFileUrlDestination(dest)
    result += ')'
    cursor = destEnd + 1
  }
  return result
}

/**
 * 规范化多行显示数学公式，兼容 remark-math 的解析规则。
 * remark-math 将 $$ 视作类似代码围栏：起始 $$ 必须独占一行，
 * 结束 $$ 也必须独占一行。
 * LLM 常输出 $$content\n...\ncontent$$ 这种形式，会导致解析失败并影响后续 Markdown。
 * 该函数用于修正这类公式块。
 */
const normalizeDisplayMath = (content: string): string => {
  return content.replace(/\$\$([\s\S]+?)\$\$/g, (match, inner) => {
    if (!inner.includes('\n')) {
      return match
    }
    return `$$\n${inner.trim()}\n$$`
  })
}

// 渲染前过滤掉不安全协议，防止危险链接注入。
const safeUrlTransform = (url: string): string => {
  const trimmed = url.trim()
  if (!trimmed) return trimmed

  const match = trimmed.match(/^([a-z][a-z0-9+.-]*):/i)
  if (!match) {
    return trimmed
  }

  const protocol = match[1].toLowerCase()
  if (SAFE_URL_PROTOCOLS.has(protocol)) {
    return trimmed
  }

  return ''
}

// 提取并返回小写协议名；相对路径或无效值返回 null。
const getHrefProtocol = (href: string): string | null => {
  const trimmed = href.trim()
  const match = trimmed.match(/^([a-z][a-z0-9+.-]*):/i)
  if (!match) return null
  return match[1].toLowerCase()
}

// 将非 file 协议统一视为外部链接。
const isExternalHref = (href: string): boolean => {
  const protocol = getHrefProtocol(href)
  if (!protocol) return false
  return protocol !== 'file'
}

// 优先使用 Electron shell 在系统默认浏览器中打开外链。
const openExternalViaDefaultBrowser = async (url: string): Promise<boolean> => {
  const openExternal = (window as any)?.electron?.shell?.openExternal
  if (typeof openExternal !== 'function') {
    return false
  }

  try {
    const result = await openExternal(url)
    return !!result?.success
  } catch (error) {
    console.error('Failed to open external link with system browser:', url, error)
    return false
  }
}

// 当 Electron shell 不可用或失败时，使用浏览器锚点方式兜底打开。
const openExternalViaAnchorFallback = (url: string): void => {
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.target = '_blank'
  anchor.rel = 'noopener noreferrer'
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
}

// 自定义 code 渲染器：同时处理行内代码和围栏代码块，并支持复制。
const CodeBlock: React.FC<any> = ({ node, className, children, ...props }) => {
  const normalizedClassName = Array.isArray(className) ? className.join(' ') : className || ''
  const match = /language-([\w-]+)/.exec(normalizedClassName)
  const hasPosition = node?.position?.start?.line != null && node?.position?.end?.line != null
  const isInline =
    typeof props.inline === 'boolean' ? props.inline : hasPosition ? node.position.start.line === node.position.end.line : !match
  const codeText = Array.isArray(children) ? children.join('') : String(children)
  const trimmedCodeText = codeText.replace(/\n$/, '')
  const shouldHighlight =
    !isInline && match && trimmedCodeText.length <= CODE_BLOCK_CHAR_LIMIT && trimmedCodeText.split('\n').length <= CODE_BLOCK_LINE_LIMIT
  const [isCopied, setIsCopied] = useState(false)
  const copyTimeoutRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (copyTimeoutRef.current != null) {
        window.clearTimeout(copyTimeoutRef.current)
      }
    },
    []
  )

  // 复制代码块内容，并短暂显示“已复制”状态。
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(trimmedCodeText)
      setIsCopied(true)
      if (copyTimeoutRef.current != null) {
        window.clearTimeout(copyTimeoutRef.current)
      }
      copyTimeoutRef.current = window.setTimeout(() => setIsCopied(false), 1500)
    } catch (error) {
      console.error('Failed to copy code block: ', error)
    }
  }, [trimmedCodeText])

  if (!isInline) {
    // 无语言标识的代码块：使用简洁样式。
    if (!match) {
      return (
        <div className="my-2 relative group">
          <div className="overflow-x-auto rounded-lg bg-[#282c34] text-[13px] leading-6">
            <button
              type="button"
              onClick={handleCopy}
              className="absolute top-2 right-2 z-10 p-1.5 rounded-md bg-gray-700/80 text-gray-300 hover:bg-gray-600 transition-colors opacity-0 group-hover:opacity-100"
              title={i18nService.t('copyToClipboard')}
              aria-label={i18nService.t('copyToClipboard')}
            >
              {isCopied ? <CheckIcon className="h-4 w-4 text-green-500" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
            </button>
            <code className="block px-4 py-3 font-mono text-claude-darkText whitespace-pre">{trimmedCodeText}</code>
          </div>
        </div>
      )
    }

    // 有语言标识的代码块：显示语言头部和复制按钮。
    return (
      <div className="my-3 rounded-xl overflow-hidden border dark:border-claude-darkBorder border-claude-border relative shadow-subtle">
        <div className="dark:bg-claude-darkSurfaceMuted bg-claude-surfaceMuted px-4 py-2 text-xs dark:text-claude-darkTextSecondary text-claude-textSecondary font-medium flex items-center justify-between">
          <span>{match[1]}</span>
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 rounded-md dark:hover:bg-claude-darkSurfaceHover hover:bg-claude-surfaceHover transition-colors"
            title={i18nService.t('copyToClipboard')}
            aria-label={i18nService.t('copyToClipboard')}
          >
            {isCopied ? <CheckIcon className="h-4 w-4 text-green-500" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
          </button>
        </div>
        {shouldHighlight ? (
          <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div" customStyle={SYNTAX_HIGHLIGHTER_STYLE}>
            {trimmedCodeText}
          </SyntaxHighlighter>
        ) : (
          <div className="m-0 overflow-x-auto bg-[#282c34] text-[13px] leading-6">
            <code className="block px-4 py-3 font-mono text-claude-darkText whitespace-pre">{trimmedCodeText}</code>
          </div>
        )}
      </div>
    )
  }

  const inlineClassName = [
    'inline bg-transparent px-0.5 text-[0.92em] font-mono font-medium dark:text-claude-darkText text-claude-text',
    normalizedClassName
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <code className={inlineClassName} {...props}>
      {children}
    </code>
  )
}

// 安全解码 URI，遇到非法编码时不抛错并返回原值。
const safeDecodeURIComponent = (value: string): string => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

// 去除路径型 href 中的 hash 与 query 片段。
const stripHashAndQuery = (value: string): string => value.split('#')[0].split('?')[0]

// 去除 file:// 前缀，并规范化 Windows 盘符前缀。
const stripFileProtocol = (value: string): string => {
  let cleaned = value.replace(/^file:\/\//i, '')
  if (/^\/[A-Za-z]:/.test(cleaned)) {
    cleaned = cleaned.slice(1)
  }
  return cleaned
}

// 检测末尾扩展名，用于区分文件与目录。
const hasFileExtension = (value: string): boolean => /\.[A-Za-z0-9]{1,6}$/.test(value)

// 启发式判断路径是否更像目录。
const looksLikeDirectory = (value: string): boolean => {
  if (!value) return false
  if (value.endsWith('/') || value.endsWith('\\')) return true
  return !hasFileExtension(value)
}

// 启发式判断 Markdown href 是否为本地文件路径。
const isLikelyLocalFilePath = (href: string): boolean => {
  if (!href) return false
  if (/^file:\/\//i.test(href)) return true
  if (/^[A-Za-z]:[\\/]/.test(href)) return true
  if (href.startsWith('/') || href.startsWith('./') || href.startsWith('../')) return true
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return false

  const base = stripHashAndQuery(href)
  if (base.includes('/') || base.includes('\\')) return true

  const extMatch = base.match(/\.([A-Za-z0-9]{1,6})$/)
  if (!extMatch) return false
  const ext = extMatch[1].toLowerCase()
  const commonTlds = new Set(['com', 'net', 'org', 'io', 'cn', 'co', 'ai', 'app', 'dev', 'gov', 'edu'])
  return !commonTlds.has(ext)
}

// 将本地路径转换为适用于 a 标签的 file:// href。
const toFileHref = (filePath: string): string => {
  const normalized = filePath.replace(/\\/g, '/')
  if (/^[A-Za-z]:/.test(filePath)) {
    return `file:///${normalized}`
  }
  if (normalized.startsWith('/')) {
    return `file://${normalized}`
  }
  return `file://${normalized}`
}

// 根据链接 href 与文本上下文解析并规范化本地路径。
const getLocalPathFromLink = (
  href: string | null,
  text: string,
  resolveLocalFilePath?: (href: string, text: string) => string | null
): string | null => {
  if (!href) return null
  const resolved = resolveLocalFilePath ? resolveLocalFilePath(href, text) : null
  if (resolved) return resolved
  if (!isLikelyLocalFilePath(href)) return null
  const rawPath = stripFileProtocol(stripHashAndQuery(href))
  const decoded = safeDecodeURIComponent(rawPath)
  return decoded || rawPath || null
}

// 结合附近目录链接与文件名，推导文件打开失败时的兜底路径。
const findFallbackPathFromContext = (
  anchor: HTMLAnchorElement | null,
  fileName: string,
  resolveLocalFilePath?: (href: string, text: string) => string | null
): string | null => {
  const trimmedName = fileName.trim()
  if (!trimmedName || trimmedName.includes('/') || trimmedName.includes('\\')) {
    return null
  }

  if (!anchor || typeof anchor.closest !== 'function') return null
  const container = anchor.closest('.markdown-content')
  if (!container) return null

  const anchors = Array.from(container.querySelectorAll('a'))
  const index = anchors.indexOf(anchor)
  if (index <= 0) return null

  for (let i = index - 1; i >= 0; i -= 1) {
    const candidate = anchors[i] as HTMLAnchorElement
    const candidateHref = candidate.getAttribute('href')
    const candidateText = candidate.textContent ?? ''
    const basePath = getLocalPathFromLink(candidateHref, candidateText, resolveLocalFilePath)
    if (!basePath || !looksLikeDirectory(basePath)) {
      continue
    }

    const normalizedBase = basePath.replace(/[\\/]+$/, '')
    return `${normalizedBase}/${trimmedName}`
  }

  return null
}

// 构建 react-markdown 组件覆盖配置，统一样式与链接行为。
const createMarkdownComponents = (resolveLocalFilePath?: (href: string, text: string) => string | null) => ({
  p: ({ node, className, children, ...props }: any) => (
    <p className="my-1 first:mt-0 last:mb-0 leading-6 dark:text-claude-darkText text-claude-text" {...props}>
      {children}
    </p>
  ),
  strong: ({ node, className, children, ...props }: any) => (
    <strong className="font-semibold dark:text-claude-darkText text-claude-text" {...props}>
      {children}
    </strong>
  ),
  h1: ({ node, className, children, ...props }: any) => (
    <h1 className="text-2xl font-semibold mt-6 mb-3 dark:text-claude-darkText text-claude-text" {...props}>
      {children}
    </h1>
  ),
  h2: ({ node, className, children, ...props }: any) => (
    <h2 className="text-xl font-semibold mt-5 mb-2 dark:text-claude-darkText text-claude-text" {...props}>
      {children}
    </h2>
  ),
  h3: ({ node, className, children, ...props }: any) => (
    <h3 className="text-lg font-semibold mt-4 mb-2 dark:text-claude-darkText text-claude-text" {...props}>
      {children}
    </h3>
  ),
  ul: ({ node, className, children, ...props }: any) => (
    <ul className="list-disc pl-5 my-1.5 dark:text-claude-darkText text-claude-text" {...props}>
      {children}
    </ul>
  ),
  ol: ({ node, className, children, ...props }: any) => (
    <ol className="list-decimal pl-6 my-1.5 dark:text-claude-darkText text-claude-text" {...props}>
      {children}
    </ol>
  ),
  li: ({ node, className, children, ...props }: any) => (
    <li className="my-0.5 leading-6 dark:text-claude-darkText text-claude-text" {...props}>
      {children}
    </li>
  ),
  blockquote: ({ node, className, children, ...props }: any) => (
    <blockquote
      className="border-l-4 border-claude-accent pl-4 py-1 my-2 dark:bg-claude-darkSurface/30 bg-claude-surfaceHover/30 rounded-r-lg dark:text-claude-darkText text-claude-text"
      {...props}
    >
      {children}
    </blockquote>
  ),
  code: CodeBlock,
  table: ({ node, className, children, ...props }: any) => (
    <div className="my-4 overflow-x-auto rounded-xl border dark:border-claude-darkBorder border-claude-border">
      <table className="border-collapse w-full" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ node, className, children, ...props }: any) => (
    <thead className="dark:bg-claude-darkSurface bg-claude-surfaceHover" {...props}>
      {children}
    </thead>
  ),
  tbody: ({ node, className, children, ...props }: any) => (
    <tbody className="divide-y dark:divide-claude-darkBorder divide-claude-border" {...props}>
      {children}
    </tbody>
  ),
  tr: ({ node, className, children, ...props }: any) => (
    <tr className="divide-x dark:divide-claude-darkBorder divide-claude-border" {...props}>
      {children}
    </tr>
  ),
  th: ({ node, className, children, ...props }: any) => (
    <th className="px-4 py-2 text-left font-semibold dark:text-claude-darkText text-claude-text" {...props}>
      {children}
    </th>
  ),
  td: ({ node, className, children, ...props }: any) => (
    <td className="px-4 py-2 dark:text-claude-darkText text-claude-text" {...props}>
      {children}
    </td>
  ),
  img: ({ node, className, ...props }: any) => <img className="max-w-full h-auto rounded-xl my-4" {...props} />,
  hr: ({ node, ...props }: any) => <hr className="my-5 dark:border-claude-darkBorder border-claude-border" {...props} />,
  a: ({ node, href, className, children, ...props }: any) => {
    if (typeof href === 'string' && href.startsWith('#artifact-')) {
      return null
    }

    const hrefValue = typeof href === 'string' ? href.trim() : ''
    const isExternalLink = !!hrefValue && isExternalHref(hrefValue)
    const linkText = Array.isArray(children) ? children.join('') : String(children ?? '')
    const resolvedPath = hrefValue && !isExternalLink && resolveLocalFilePath ? resolveLocalFilePath(hrefValue, linkText) : null
    const isLocalFilePath = !!hrefValue && !isExternalLink && (resolvedPath || isLikelyLocalFilePath(hrefValue))

    if (isLocalFilePath) {
      const rawPath = resolvedPath ?? stripFileProtocol(stripHashAndQuery(hrefValue))
      const decodedPath = safeDecodeURIComponent(rawPath)
      const filePath = decodedPath || rawPath

      // 直接打开本地文件；若是纯文件名链接则尝试上下文兜底路径。
      const handleClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault()
        const anchor = e.currentTarget
        try {
          const result = await window.electron.shell.openPath(filePath)
          if (result?.success) {
            return
          }

          const fallbackPath = findFallbackPathFromContext(anchor, linkText, resolveLocalFilePath)
          if (fallbackPath) {
            const fallbackResult = await window.electron.shell.openPath(fallbackPath)
            if (!fallbackResult?.success) {
              console.error('Failed to open file (fallback):', fallbackPath, fallbackResult?.error)
            }
          } else {
            console.error('Failed to open file:', filePath, result?.error)
          }
        } catch (error) {
          console.error('Failed to open file:', filePath, error)
        }
      }

      return (
        <a
          href={toFileHref(filePath)}
          onClick={handleClick}
          className="text-claude-accent hover:text-claude-accentHover underline decoration-claude-accent/50 hover:decoration-claude-accent transition-colors cursor-pointer inline-flex items-center gap-1"
          title={filePath}
          {...props}
        >
          {children}
          {looksLikeDirectory(filePath) ? <FolderIcon className="h-3.5 w-3.5 inline" /> : <DocumentIcon className="h-3.5 w-3.5 inline" />}
        </a>
      )
    }

    if (isExternalLink) {
      // Electron 桥可用时，强制外链走系统浏览器打开。
      const handleExternalClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
        const openExternal = (window as any)?.electron?.shell?.openExternal
        if (typeof openExternal !== 'function') {
          return
        }

        e.preventDefault()
        const opened = await openExternalViaDefaultBrowser(hrefValue)
        if (!opened) {
          openExternalViaAnchorFallback(hrefValue)
        }
      }

      return (
        <a
          href={hrefValue}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleExternalClick}
          className="text-claude-accent hover:text-claude-accentHover underline decoration-claude-accent/50 hover:decoration-claude-accent transition-colors"
          {...props}
        >
          {children}
        </a>
      )
    }

    return (
      <a
        href={hrefValue}
        target="_blank"
        rel="noopener noreferrer"
        className="text-claude-accent hover:text-claude-accentHover underline decoration-claude-accent/50 hover:decoration-claude-accent transition-colors"
        {...props}
      >
        {children}
      </a>
    )
  }
})

// Markdown 渲染组件参数，可选传入本地路径解析器。
interface MarkdownContentProps {
  content: string
  className?: string
  resolveLocalFilePath?: (href: string, text: string) => string | null
}

// 主 Markdown 渲染组件：启用数学公式、GFM 与自定义元素渲染。
const MarkdownContent: React.FC<MarkdownContentProps> = ({ content, className = '', resolveLocalFilePath }) => {
  const components = useMemo(() => createMarkdownComponents(resolveLocalFilePath), [resolveLocalFilePath])
  const normalizedContent = useMemo(() => normalizeDisplayMath(encodeFileUrlsInMarkdown(content)), [content])
  return (
    <div className={`markdown-content text-[15px] leading-6 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        urlTransform={safeUrlTransform}
        components={components}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  )
}

export default MarkdownContent
