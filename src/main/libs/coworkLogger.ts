/**
 * 这个文件负责 Cowork 主进程侧的本地日志输出。
 *
 * 主要职责：
 * 1. 统一约定 Cowork 日志文件在 Electron `userData/logs` 目录下的位置。
 * 2. 提供简单的按级别写日志能力，方便 runner、sandbox、sdk 等模块复用。
 * 3. 在日志文件过大时执行单文件轮转，避免 `cowork.log` 无限增长。
 * 4. 保证日志写入失败时不影响主流程执行。
 */

import { app } from 'electron'
import fs from 'fs'
import path from 'path'

// 单个日志文件的最大体积，超过后会轮转为 `.old` 备份文件。
const MAX_LOG_SIZE = 5 * 1024 * 1024 // 5MB

// 缓存日志文件路径，避免每次写日志都重复拼接目录。
let logFilePath: string | null = null

// 解析并确保 Cowork 日志文件路径存在。
function getLogFilePath(): string {
  if (!logFilePath) {
    const logDir = path.join(app.getPath('userData'), 'logs')
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }
    logFilePath = path.join(logDir, 'cowork.log')
  }
  return logFilePath
}

// 当当前日志文件超过上限时，把它重命名为 `.old` 备份文件。
function rotateIfNeeded(): void {
  try {
    const filePath = getLogFilePath()
    if (!fs.existsSync(filePath)) return
    const stat = fs.statSync(filePath)
    if (stat.size > MAX_LOG_SIZE) {
      const backupPath = filePath + '.old'
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath)
      }
      fs.renameSync(filePath, backupPath)
    }
  } catch {
    // ignore rotation errors
  }
}

// 统一生成 ISO 时间戳，便于跨时区排查日志。
function formatTimestamp(): string {
  return new Date().toISOString()
}

// 追加一条 Cowork 日志记录；任何写盘异常都被吞掉，避免影响业务流程。
export function coworkLog(level: 'INFO' | 'WARN' | 'ERROR', tag: string, message: string, extra?: Record<string, unknown>): void {
  try {
    rotateIfNeeded()
    const parts = [`[${formatTimestamp()}] [${level}] [${tag}] ${message}`]
    if (extra) {
      for (const [key, value] of Object.entries(extra)) {
        const serialized = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
        parts.push(`  ${key}: ${serialized}`)
      }
    }
    parts.push('')
    fs.appendFileSync(getLogFilePath(), parts.join('\n'), 'utf-8')
  } catch {
    // Logging should never throw
  }
}

// 对外暴露 Cowork 日志文件路径，供错误提示或日志定位使用。
export function getCoworkLogPath(): string {
  return getLogFilePath()
}
