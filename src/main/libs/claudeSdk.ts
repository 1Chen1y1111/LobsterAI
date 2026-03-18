/**
 * Claude SDK 的“入口适配层 + 生命周期管理器”，把路径、模块格式兼容、缓存和错误恢复都封装掉，供上层业务直接调用
 */

import { app } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { coworkLog } from './coworkLogger'

export type ClaudeSdkModule = typeof import('@anthropic-ai/claude-agent-sdk')

// 缓存 SDK 加载结果，避免重复导入。
let claudeSdkPromise: Promise<ClaudeSdkModule> | null = null

// npm 包路径片段，统一用于拼接 SDK 文件路径。
const CLAUDE_SDK_PATH_PARTS = ['@anthropic-ai', 'claude-agent-sdk']

// 根据运行环境（开发/打包）解析 Claude SDK 的实际文件路径。
function getClaudeSdkPath(): string {
  if (app.isPackaged) {
    // 打包后依赖位于 app.asar.unpacked 下的 node_modules。
    return join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', ...CLAUDE_SDK_PATH_PARTS, 'sdk.mjs')
  }

  // 开发环境下优先从项目根目录的 node_modules 查找 SDK。
  // app.getAppPath() 可能指向 dist-electron 等构建产物目录，
  // 因此需要回退到项目根目录。
  const appPath = app.getAppPath()
  // 如果路径末尾是 dist-electron，则上移一级到项目根目录。
  const rootDir = appPath.endsWith('dist-electron') ? join(appPath, '..') : appPath

  const sdkPath = join(rootDir, 'node_modules', ...CLAUDE_SDK_PATH_PARTS, 'sdk.mjs')

  console.log('[ClaudeSDK] Resolved SDK path:', sdkPath)
  return sdkPath
}

export function loadClaudeSdk(): Promise<ClaudeSdkModule> {
  if (!claudeSdkPromise) {
    // 运行时动态 import：让 CJS 构建产物也能加载 SDK 的 ESM 入口。
    const dynamicImport = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<ClaudeSdkModule>
    const sdkPath = getClaudeSdkPath()
    const sdkUrl = pathToFileURL(sdkPath).href
    const sdkExists = existsSync(sdkPath)

    coworkLog('INFO', 'loadClaudeSdk', 'Loading Claude SDK', {
      sdkPath,
      sdkUrl,
      sdkExists,
      isPackaged: app.isPackaged,
      resourcesPath: process.resourcesPath
    })

    claudeSdkPromise = dynamicImport(sdkUrl).catch((error) => {
      coworkLog('ERROR', 'loadClaudeSdk', 'Failed to load Claude SDK', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        sdkPath,
        sdkExists
      })
      // 失败后清空缓存，允许后续再次尝试加载。
      claudeSdkPromise = null
      throw error
    })
  }

  return claudeSdkPromise
}
