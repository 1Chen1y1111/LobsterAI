/**
 * 这个文件负责把若干日志文件打包成一个 zip 压缩包。
 *
 * 主要职责：
 * 1. 接收一组“磁盘路径 -> 压缩包内文件名”的映射。
 * 2. 把存在的日志文件写入 zip。
 * 3. 对缺失日志用空文件占位，保证导出的压缩包结构稳定。
 * 4. 返回哪些日志条目在导出时实际上不存在，供上层提示用户。
 */

import fs from 'fs'
import { pipeline } from 'stream/promises'
import yazl from 'yazl'

// 单个压缩条目的定义：磁盘文件路径，以及压缩包内的文件名。
export type LogArchiveEntry = {
  archiveName: string
  filePath: string
}

// 导出 zip 时需要的输入参数。
export type ExportLogsZipInput = {
  outputPath: string
  entries: LogArchiveEntry[]
}

// 导出结果：记录哪些条目在源文件缺失时被空文件占位。
export type ExportLogsZipResult = {
  missingEntries: string[]
}

// 把给定日志条目打包成 zip 文件；缺失条目会写入空文件占位。
export async function exportLogsZip(input: ExportLogsZipInput): Promise<ExportLogsZipResult> {
  const zipFile = new yazl.ZipFile()
  const missingEntries: string[] = []

  for (const entry of input.entries) {
    // 存在且是普通文件时，直接加入压缩包。
    if (fs.existsSync(entry.filePath) && fs.statSync(entry.filePath).isFile()) {
      zipFile.addFile(entry.filePath, entry.archiveName)
      continue
    }

    // 文件缺失时用空文件占位，避免导出结构因日志缺失而变化。
    missingEntries.push(entry.archiveName)
    zipFile.addBuffer(Buffer.alloc(0), entry.archiveName)
  }

  // 通过 stream pipeline 把 zip 输出可靠写入目标文件。
  const outputStream = fs.createWriteStream(input.outputPath)
  const pipelinePromise = pipeline(zipFile.outputStream, outputStream)
  zipFile.end()
  await pipelinePromise

  return { missingEntries }
}
