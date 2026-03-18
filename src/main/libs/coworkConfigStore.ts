/**
 * 这个文件负责持久化 Cowork 使用的基础 API 配置。
 *
 * 主要职责：
 * 1. 约定 API 配置文件在 Electron `userData` 目录下的存放位置。
 * 2. 负责读取、校验并规范化本地保存的 API 配置。
 * 3. 负责把渲染层传入的 API 配置写入磁盘。
 * 4. 提供删除配置文件的能力，供重置配置或退出兼容逻辑时使用。
 */

import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import { join } from 'path'

// Cowork 目前支持的 API 协议类型。
export type CoworkApiType = 'anthropic' | 'openai'

// 持久化到本地的最小 API 配置结构。
export type CoworkApiConfig = {
  apiKey: string
  baseURL: string
  model: string
  apiType?: CoworkApiType
}

// API 配置文件名，实际保存在 Electron userData 目录下。
const CONFIG_FILE_NAME = 'api-config.json'

// 计算 API 配置文件的绝对路径。
function getConfigPath(): string {
  const userDataPath = app.getPath('userData')
  return join(userDataPath, CONFIG_FILE_NAME)
}

// 从本地配置文件读取 Cowork API 配置；文件不存在或内容无效时返回 null。
export function loadCoworkApiConfig(): CoworkApiConfig | null {
  try {
    const configPath = getConfigPath()
    if (!existsSync(configPath)) {
      return null
    }

    const raw = readFileSync(configPath, 'utf8')
    const config = JSON.parse(raw) as CoworkApiConfig
    if (config.apiKey && config.baseURL && config.model) {
      const normalizedApiType = config.apiType === 'openai' || config.apiType === 'anthropic' ? config.apiType : 'anthropic'
      config.apiType = normalizedApiType
      return config
    }

    return null
  } catch (error) {
    console.error('[cowork-config] Failed to load API config:', error)
    return null
  }
}

// 把传入的 Cowork API 配置规范化后写入本地磁盘。
export function saveCoworkApiConfig(config: CoworkApiConfig): void {
  const configPath = getConfigPath()
  const userDataPath = app.getPath('userData')

  // 确保 userData 目录存在，避免首次写入时报错。
  if (!existsSync(userDataPath)) {
    mkdirSync(userDataPath, { recursive: true })
  }

  // 这些字段是运行 Cowork 的必填项，缺失时直接拒绝保存。
  if (!config.apiKey || !config.baseURL || !config.model) {
    throw new Error('Invalid config: apiKey, baseURL, and model are required')
  }

  // 写入前统一去除首尾空白，并把未知 apiType 收敛为 anthropic。
  const normalized: CoworkApiConfig = {
    apiKey: config.apiKey.trim(),
    baseURL: config.baseURL.trim(),
    model: config.model.trim(),
    apiType: config.apiType === 'openai' ? 'openai' : 'anthropic'
  }

  writeFileSync(configPath, JSON.stringify(normalized, null, 2), 'utf8')
  console.info('[cowork-config] API config saved successfully')
}

// 删除本地 API 配置文件；文件不存在时静默跳过。
export function deleteCoworkApiConfig(): void {
  try {
    const configPath = getConfigPath()
    if (existsSync(configPath)) {
      unlinkSync(configPath)
      console.info('[cowork-config] API config deleted')
    }
  } catch (error) {
    console.error('[cowork-config] Failed to delete API config:', error)
  }
}
