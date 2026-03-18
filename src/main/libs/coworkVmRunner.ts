/**
 * 这个文件负责启动 Cowork 的沙箱虚拟机，并建立主机与 guest 之间的 IPC 通道。
 *
 * 主要职责：
 * 1. 准备 sandbox 会话目录、请求文件、流式日志文件等宿主侧结构。
 * 2. 根据当前平台和 runtime 信息生成 QEMU 启动参数并拉起 VM。
 * 3. 在 macOS/Linux 上使用 9p 共享目录，在 Windows 上改用 virtio-serial IPC。
 * 4. 提供 Windows virtio-serial bridge，把 guest 消息转换回宿主侧文件和事件。
 */

import { app } from 'electron'
import { spawn, type ChildProcessByStdio } from 'child_process'
import fs from 'fs'
import net from 'net'
import path from 'path'
import type { Readable } from 'stream'
import { StringDecoder } from 'string_decoder'
import { v4 as uuidv4 } from 'uuid'
import type { SandboxRuntimeInfo } from './coworkSandboxRuntime'
import { coworkLog } from './coworkLogger'

// 单个 sandbox 会话在宿主机上的目录布局。
export type CoworkSandboxPaths = {
  baseDir: string
  ipcDir: string
  requestsDir: string
  responsesDir: string
  streamsDir: string
}

// 启动 QEMU 时使用的 launcher 模式。
export type SandboxLauncherMode = 'direct' | 'launchctl'

// 一次 sandbox 请求对应的请求文件和流式日志文件信息。
export type SandboxRequestInfo = {
  requestId: string
  requestPath: string
  streamPath: string
}

// 把宿主工作目录映射到 guest 内路径时使用的描述结构。
export type SandboxCwdMapping = {
  hostPath: string
  guestPath: string
  mountTag: string
}

// 额外挂载目录的描述结构。
export type SandboxExtraMount = {
  hostPath: string
  mountTag: string
}

// 为指定 session 准备 sandbox 运行所需的宿主目录结构。
export function ensureCoworkSandboxDirs(sessionId: string): CoworkSandboxPaths {
  const baseDir = path.join(app.getPath('userData'), 'cowork', 'sandbox')
  const ipcDir = path.join(baseDir, 'ipc', sessionId)
  const requestsDir = path.join(ipcDir, 'requests')
  const responsesDir = path.join(ipcDir, 'responses')
  const streamsDir = path.join(ipcDir, 'streams')

  fs.mkdirSync(requestsDir, { recursive: true })
  fs.mkdirSync(responsesDir, { recursive: true })
  fs.mkdirSync(streamsDir, { recursive: true })

  return {
    baseDir,
    ipcDir,
    requestsDir,
    responsesDir,
    streamsDir
  }
}

// 把宿主 cwd 映射到 guest 内统一的工作目录路径。
export function resolveSandboxCwd(cwd: string): SandboxCwdMapping {
  // On all platforms, mount the host directory to /workspace/project inside the VM
  // This ensures a consistent Linux path inside the Alpine VM
  return {
    hostPath: cwd,
    guestPath: '/workspace/project',
    mountTag: 'work'
  }
}

// 同步 skills 到 guest 时需要忽略的目录和文件。
const SKILL_SYNC_IGNORE = new Set([
  'node_modules',
  '.git',
  '__pycache__',
  'dist',
  '.DS_Store',
  'Thumbs.db',
  '.server.pid',
  '.server.log',
  '.connection'
])

// 单个被同步到 guest 的技能文件大小上限。
const SKILL_SYNC_MAX_FILE_SIZE = 1 * 1024 * 1024 // 1 MB

/**
 * Collect skill files for transfer into the sandbox VM.
 * Walks the skills directory, skipping heavy/transient dirs and large files.
 * Returns an array of { path, data } entries with forward-slash relative paths.
 */
// 收集需要同步到 sandbox VM 的技能文件内容。
export function collectSkillFilesForSandbox(skillsRoot: string): { path: string; data: Buffer }[] {
  const result: { path: string; data: Buffer }[] = []
  if (!fs.existsSync(skillsRoot)) {
    coworkLog('WARN', 'collectSkillFiles', `Skills root does not exist: ${skillsRoot}`)
    return result
  }

  coworkLog('INFO', 'collectSkillFiles', `Scanning skills root: ${skillsRoot}`)

  // 递归遍历技能目录，过滤大文件和临时目录。
  function scan(dir: string, base: string): void {
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (SKILL_SYNC_IGNORE.has(entry.name)) continue
      const fullPath = path.join(dir, entry.name)
      const relPath = base ? `${base}/${entry.name}` : entry.name
      if (entry.isDirectory()) {
        scan(fullPath, relPath)
      } else if (entry.isFile()) {
        try {
          const stat = fs.statSync(fullPath)
          if (stat.size <= SKILL_SYNC_MAX_FILE_SIZE) {
            result.push({ path: relPath, data: fs.readFileSync(fullPath) })
          } else {
            coworkLog('WARN', 'collectSkillFiles', `Skipping oversized file: ${relPath} (${stat.size} bytes)`)
          }
        } catch {
          /* skip unreadable files */
        }
      }
    }
  }

  scan(skillsRoot, '')
  coworkLog('INFO', 'collectSkillFiles', `Collected ${result.length} files from ${skillsRoot}`, {
    files: result.map((f) => f.path).join(', ')
  })
  return result
}

// 在 requests 目录下落一条 sandbox 请求，并返回关联的路径信息。
export function buildSandboxRequest(paths: CoworkSandboxPaths, input: Record<string, unknown>): SandboxRequestInfo {
  const requestId = uuidv4()
  const requestPath = path.join(paths.requestsDir, `${requestId}.json`)
  const streamPath = path.join(paths.streamsDir, `${requestId}.log`)
  fs.writeFileSync(requestPath, JSON.stringify(input))
  return { requestId, requestPath, streamPath }
}

// 根据当前平台选择默认的 QEMU 硬件加速后端。
function getPreferredAccel(): string | null {
  if (process.env.COWORK_SANDBOX_ACCEL) {
    return process.env.COWORK_SANDBOX_ACCEL
  }
  if (process.platform === 'darwin') {
    return 'hvf'
  }
  if (process.platform === 'win32') {
    return 'whpx'
  }
  if (process.platform === 'linux') {
    return 'kvm'
  }
  return null
}

// 从 runtime 可执行文件路径反推 runtime 根目录。
function resolveRuntimeRoot(runtimeBinary: string): string {
  return path.resolve(path.dirname(runtimeBinary), '..')
}

// 把路径转成适合 QEMU option 子参数使用的格式，并转义逗号。
function toQemuOptionPath(targetPath: string): string {
  const normalized = process.platform === 'win32' ? path.resolve(targetPath).replace(/\\/g, '/') : path.resolve(targetPath)
  // QEMU option values (drive/virtfs/chardev sub-options) use commas as separators.
  // Escape commas in paths to avoid truncation when user paths contain commas.
  return normalized.replace(/,/g, '\\,')
}

// ARM64 模式下解析并准备 EDK2 firmware 文件。
function resolveAarch64Firmware(options: { runtime: SandboxRuntimeInfo; ipcDir: string }): { codePath: string; varsPath: string } | null {
  if (options.runtime.arch !== 'arm64') return null
  const runtimeRoot = resolveRuntimeRoot(options.runtime.runtimeBinary)
  const codePath = path.join(runtimeRoot, 'share', 'qemu', 'edk2-aarch64-code.fd')
  const varsTemplate = path.join(runtimeRoot, 'share', 'qemu', 'edk2-arm-vars.fd')
  if (!fs.existsSync(codePath) || !fs.existsSync(varsTemplate)) {
    return null
  }

  const varsPath = path.join(options.ipcDir, 'edk2-vars.fd')
  if (!fs.existsSync(varsPath)) {
    try {
      fs.copyFileSync(varsTemplate, varsPath)
    } catch (error) {
      console.warn('Failed to prepare QEMU vars file:', error)
    }
  }
  return { codePath, varsPath }
}

// 生成启动 sandbox VM 所需的完整 QEMU 参数。
function buildQemuArgs(options: {
  runtime: SandboxRuntimeInfo
  ipcDir: string
  cwdMapping: SandboxCwdMapping
  extraMounts?: SandboxExtraMount[]
  accelOverride?: string | null
  ipcPort?: number
  skillsDir?: string
  memoryMb?: number
}): string[] {
  const memoryMb = options.memoryMb ?? (process.env.COWORK_SANDBOX_MEMORY ? parseInt(process.env.COWORK_SANDBOX_MEMORY, 10) : null) ?? 4096
  const args: string[] = ['-m', String(memoryMb), '-smp', '2', '-nographic', '-snapshot']

  // 先处理 CPU/加速器这类基础参数。
  const accel = options.accelOverride !== undefined ? options.accelOverride : getPreferredAccel()
  if (accel) {
    const accelArg = accel === 'tcg' ? 'tcg,thread=multi' : accel
    args.push('-accel', accelArg)
  }

  if (options.runtime.arch === 'arm64') {
    const cpu = accel && accel !== 'tcg' ? 'host' : 'cortex-a57'
    args.push('-machine', 'virt', '-cpu', cpu)

    // ARM64 优先用 kernel/initrd 启动；没有的话再退回 firmware 启动。
    const kernelPath = options.runtime.kernelPath
    const initrdPath = options.runtime.initrdPath
    const hasKernel = Boolean(kernelPath && initrdPath && fs.existsSync(kernelPath) && fs.existsSync(initrdPath))

    if (hasKernel) {
      args.push(
        '-kernel',
        kernelPath as string,
        '-initrd',
        initrdPath as string,
        '-append',
        ['root=/dev/vda2', 'rootfstype=ext4', 'rw', 'console=ttyAMA0,115200', 'loglevel=4', 'init=/sbin/init', 'quiet'].join(' ')
      )
    } else {
      const firmware = resolveAarch64Firmware(options)
      if (firmware) {
        args.push(
          '-drive',
          `if=pflash,format=raw,readonly=on,file=${toQemuOptionPath(firmware.codePath)}`,
          '-drive',
          `if=pflash,format=raw,file=${toQemuOptionPath(firmware.varsPath)}`
        )
      }
    }
  }

  args.push(
    '-drive',
    `file=${toQemuOptionPath(options.runtime.imagePath)},if=virtio,format=qcow2`,
    '-netdev',
    'user,id=net0',
    '-device',
    'virtio-net,netdev=net0'
  )

  if (options.runtime.platform === 'win32') {
    // Windows QEMU 不支持 virtfs(9p)，因此改用 virtio-serial 做双向 IPC。
    if (options.ipcPort) {
      args.push(
        '-device',
        'virtio-serial-pci',
        '-chardev',
        `socket,id=ipc,host=127.0.0.1,port=${options.ipcPort},server=on,wait=off`,
        '-device',
        'virtserialport,chardev=ipc,name=ipc.0'
      )
    }
  } else {
    // macOS / Linux 使用 virtfs(9p) 挂载 ipc、工作目录和额外挂载目录。
    args.push('-virtfs', `local,path=${toQemuOptionPath(options.ipcDir)},mount_tag=ipc,security_model=none`)
    args.push(
      '-virtfs',
      `local,path=${toQemuOptionPath(options.cwdMapping.hostPath)},mount_tag=${options.cwdMapping.mountTag},security_model=none`
    )
    for (const mount of options.extraMounts ?? []) {
      args.push('-virtfs', `local,path=${toQemuOptionPath(mount.hostPath)},mount_tag=${mount.mountTag},security_model=none`)
    }
    const hasExplicitExtraMounts = (options.extraMounts ?? []).length > 0
    if (!hasExplicitExtraMounts && options.skillsDir && fs.existsSync(options.skillsDir)) {
      args.push('-virtfs', `local,path=${toQemuOptionPath(options.skillsDir)},mount_tag=skills,security_model=none`)
    }
  }

  const serialLogPath =
    process.platform === 'win32' ? path.join(options.ipcDir, 'serial.log').replace(/\\/g, '/') : path.join(options.ipcDir, 'serial.log')
  args.push('-serial', `file:${serialLogPath}`)

  return args
}

/**
 * Find a free TCP port on 127.0.0.1 by briefly binding to port 0.
 */
// 在本地回环地址上申请一个空闲端口。
export function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as net.AddressInfo
      const port = addr.port
      server.close(() => resolve(port))
    })
    server.on('error', reject)
  })
}

// 按给定参数启动一台 Cowork sandbox VM。
export function spawnCoworkSandboxVm(options: {
  runtime: SandboxRuntimeInfo
  ipcDir: string
  cwdMapping: SandboxCwdMapping
  extraMounts?: SandboxExtraMount[]
  accelOverride?: string | null
  launcher?: SandboxLauncherMode
  ipcPort?: number
  skillsDir?: string
  memoryMb?: number
}): ChildProcessByStdio<null, Readable, Readable> {
  const args = buildQemuArgs(options)

  coworkLog('INFO', 'spawnSandboxVm', 'Spawning QEMU', {
    runtimeBinary: options.runtime.runtimeBinary,
    runtimeExists: fs.existsSync(options.runtime.runtimeBinary),
    imageExists: fs.existsSync(options.runtime.imagePath),
    ipcPort: options.ipcPort ?? null,
    launcher: options.launcher ?? 'direct',
    accelOverride: options.accelOverride ?? null,
    memoryMb: options.memoryMb ?? null,
    args: args.join(' ')
  })

  if (options.launcher === 'launchctl' && process.platform === 'darwin') {
    const uid = typeof process.getuid === 'function' ? process.getuid() : null
    if (uid !== null) {
      return spawn('/bin/launchctl', ['asuser', String(uid), options.runtime.runtimeBinary, ...args], {
        stdio: ['ignore', 'pipe', 'pipe']
      })
    }
  }
  return spawn(options.runtime.runtimeBinary, args, { stdio: ['ignore', 'pipe', 'pipe'] })
}

// ---------------------------------------------------------------------------
// VirtioSerialBridge — TCP bridge for Windows virtio-serial IPC
// ---------------------------------------------------------------------------
// QEMU exposes the guest's virtio-serial port as a TCP server.  The bridge
// connects as a TCP client and translates JSON-line messages:
//   Guest → Host: heartbeat, stream, response  → written to local ipcDir files
//   Host → Guest: request, permission_response  → sent over TCP
// This keeps the existing file-polling code (waitForVmReady, readSandboxStream)
// working unchanged on the host side.
// ---------------------------------------------------------------------------

// Windows 下把 guest virtio-serial 消息桥接回宿主文件系统和宿主请求通道。
export class VirtioSerialBridge {
  // QEMU virtio-serial 对应的 TCP socket。
  private socket: net.Socket | null = null

  // 用于累计按行解析的 socket 缓冲区。
  private buffer = ''

  // 当前 sandbox session 的宿主 IPC 目录。
  private ipcDir: string

  // 当前 guest 工作目录映射回宿主的基准目录，用于文件同步落盘。
  private hostCwd: string | null = null

  // 当前 bridge 是否已连接到 guest。
  private connected = false

  // 分块文件传输的缓存：transferId -> 已收块、总块数、目标路径。
  private pendingTransfers: Map<
    string,
    {
      chunks: Map<number, Buffer>
      totalChunks: number
      path: string
    }
  > = new Map()

  // 初始化 bridge，并记录 IPC 目录和可选的 host cwd。
  constructor(ipcDir: string, hostCwd?: string) {
    this.ipcDir = ipcDir
    this.hostCwd = hostCwd ?? null
  }

  /** Update the host CWD for file sync (e.g. on multi-turn continuation) */
  // 更新 host cwd，供后续 guest -> host 文件同步使用。
  setHostCwd(hostCwd: string): void {
    this.hostCwd = hostCwd
  }

  /**
   * Try to connect to QEMU's virtio-serial TCP server with retries.
   * QEMU may need a moment to start listening after spawn.
   */
  // 带重试地连接到 guest 暴露的 virtio-serial TCP server。
  async connect(port: number, timeoutMs = 30000): Promise<void> {
    const start = Date.now()
    const retryDelay = 500
    let attempts = 0
    let lastError: string | undefined

    coworkLog('INFO', 'VirtioSerialBridge', `Connecting to QEMU serial on port ${port}`, {
      timeoutMs
    })

    while (Date.now() - start < timeoutMs) {
      attempts++
      try {
        await this.tryConnect(port)
        this.connected = true
        coworkLog('INFO', 'VirtioSerialBridge', `Connected to QEMU serial on port ${port}`, {
          attempts,
          elapsed: Date.now() - start
        })
        console.log(`[VirtioSerialBridge] Connected to QEMU serial on port ${port}`)
        return
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err)
        await new Promise((r) => setTimeout(r, retryDelay))
      }
    }

    coworkLog('ERROR', 'VirtioSerialBridge', `Failed to connect to port ${port}`, {
      attempts,
      elapsed: Date.now() - start,
      lastError
    })
    throw new Error(`[VirtioSerialBridge] Failed to connect to port ${port} within ${timeoutMs}ms`)
  }

  // 发起一次实际的 TCP 连接尝试。
  private tryConnect(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const sock = net.createConnection({ host: '127.0.0.1', port }, () => {
        this.socket = sock
        this.setupReader(sock)
        resolve()
      })
      sock.on('error', reject)
    })
  }

  // 为 socket 注册数据读取、关闭和错误处理逻辑。
  private setupReader(sock: net.Socket): void {
    const decoder = new StringDecoder('utf8')

    sock.on('data', (chunk: Buffer) => {
      this.buffer += decoder.write(chunk)
      let idx: number
      while ((idx = this.buffer.indexOf('\n')) !== -1) {
        const line = this.buffer.slice(0, idx).trim()
        this.buffer = this.buffer.slice(idx + 1)
        if (line) this.handleLine(line)
      }
    })
    sock.on('close', () => {
      const tail = decoder.end()
      if (tail) {
        this.buffer += tail
      }
      const finalLine = this.buffer.trim()
      if (finalLine) {
        this.handleLine(finalLine)
      }
      this.buffer = ''
      this.connected = false
      console.warn('[VirtioSerialBridge] Connection closed')
    })
    sock.on('error', (err) => {
      console.warn('[VirtioSerialBridge] Socket error:', err.message)
    })
  }

  // 解析 guest 发来的单行 JSON 消息，并分派到不同处理器。
  private handleLine(line: string): void {
    let msg: Record<string, unknown>
    try {
      msg = JSON.parse(line)
    } catch {
      return // skip non-JSON lines (e.g. kernel boot messages)
    }

    const msgType = String(msg.type ?? '')

    // guest 心跳直接落到 heartbeat 文件，供宿主轮询检测。
    if (msgType === 'heartbeat') {
      try {
        fs.writeFileSync(path.join(this.ipcDir, 'heartbeat'), JSON.stringify(msg))
      } catch {
        /* best effort */
      }
      return
    }

    // guest 流式输出按 requestId 追加到对应 stream log。
    if (msgType === 'stream') {
      const requestId = String(msg.requestId ?? '')
      const streamLine = String(msg.line ?? '')
      if (requestId && streamLine) {
        const streamPath = path.join(this.ipcDir, 'streams', `${requestId}.log`)
        try {
          fs.appendFileSync(streamPath, streamLine + '\n')
        } catch {
          /* best effort */
        }
      }
      return
    }

    // guest 主动同步文件到宿主。
    if (msgType === 'file_sync') {
      this.handleFileSync(msg)
      return
    }

    if (msgType === 'file_sync_chunk') {
      this.handleFileSyncChunk(msg)
      return
    }

    if (msgType === 'file_sync_complete') {
      this.handleFileSyncComplete(msg)
      return
    }
  }

  // -------------------------------------------------------------------------
  // File sync handlers — guest -> host file transfer
  // -------------------------------------------------------------------------

  /**
   * Validate and resolve a guest-relative path to an absolute host path.
   * Returns null if the path is invalid or escapes the host CWD.
   */
  // 把 guest 相对路径安全映射到宿主绝对路径，阻止路径穿越。
  private resolveHostPath(relativePath: string): string | null {
    if (!this.hostCwd) return null
    if (!relativePath) return null

    // Normalize forward slashes from guest to platform separators
    const normalized = relativePath.replace(/\//g, path.sep)
    const resolved = path.resolve(this.hostCwd, normalized)

    // Security: ensure resolved path stays within hostCwd
    const resolvedCwd = path.resolve(this.hostCwd)
    if (!resolved.startsWith(resolvedCwd + path.sep) && resolved !== resolvedCwd) {
      console.warn(`[VirtioSerialBridge] Rejected path traversal: ${relativePath}`)
      return null
    }

    return resolved
  }

  // 处理单文件一次性同步消息。
  private handleFileSync(msg: Record<string, unknown>): void {
    const relativePath = String(msg.path ?? '')
    const data = String(msg.data ?? '')

    const hostPath = this.resolveHostPath(relativePath)
    if (!hostPath) return

    try {
      // 确保父目录存在后再落盘。
      fs.mkdirSync(path.dirname(hostPath), { recursive: true })
      // 解码 base64 并写入宿主文件。
      fs.writeFileSync(hostPath, Buffer.from(data, 'base64'))
      console.log(`[VirtioSerialBridge] File synced: ${relativePath}`)
    } catch (error) {
      console.warn(`[VirtioSerialBridge] File sync error for ${relativePath}:`, error)
    }
  }

  // 处理 guest 发来的分块文件同步消息。
  private handleFileSyncChunk(msg: Record<string, unknown>): void {
    const transferId = String(msg.transferId ?? '')
    const relativePath = String(msg.path ?? '')
    const chunkIndex = Number(msg.chunkIndex ?? 0)
    const totalChunks = Number(msg.totalChunks ?? 0)
    const data = String(msg.data ?? '')

    if (!transferId || !relativePath || !data) return

    // 提前校验路径合法性，避免无效传输污染缓存。
    if (!this.resolveHostPath(relativePath)) return

    if (!this.pendingTransfers.has(transferId)) {
      this.pendingTransfers.set(transferId, {
        chunks: new Map(),
        totalChunks,
        path: relativePath
      })
    }

    const transfer = this.pendingTransfers.get(transferId)!
    transfer.chunks.set(chunkIndex, Buffer.from(data, 'base64'))

    // 全部块到齐后立刻组装并写盘。
    if (transfer.chunks.size === transfer.totalChunks) {
      this.assembleAndWriteChunked(transferId)
    }
  }

  // 标记一次分块传输结束；如果块已齐则立即组装，否则等待一段时间后清理。
  private handleFileSyncComplete(msg: Record<string, unknown>): void {
    const transferId = String(msg.transferId ?? '')
    if (!transferId) return

    const transfer = this.pendingTransfers.get(transferId)
    if (transfer && transfer.chunks.size === transfer.totalChunks) {
      this.assembleAndWriteChunked(transferId)
    }

    // 超时后清理未完成传输，防止缓存泄漏。
    setTimeout(() => {
      if (this.pendingTransfers.has(transferId)) {
        console.warn(`[VirtioSerialBridge] Cleaning up incomplete transfer ${transferId}`)
        this.pendingTransfers.delete(transferId)
      }
    }, 30000)
  }

  // 按块序组装完整文件并写入宿主路径。
  private assembleAndWriteChunked(transferId: string): void {
    const transfer = this.pendingTransfers.get(transferId)
    if (!transfer) return

    const hostPath = this.resolveHostPath(transfer.path)
    if (!hostPath) {
      this.pendingTransfers.delete(transferId)
      return
    }

    try {
      fs.mkdirSync(path.dirname(hostPath), { recursive: true })

      // 按顺序拼接所有分块。
      const buffers: Buffer[] = []
      for (let i = 0; i < transfer.totalChunks; i++) {
        const chunk = transfer.chunks.get(i)
        if (!chunk) {
          console.warn(`[VirtioSerialBridge] Missing chunk ${i} for transfer ${transferId}`)
          this.pendingTransfers.delete(transferId)
          return
        }
        buffers.push(chunk)
      }

      fs.writeFileSync(hostPath, Buffer.concat(buffers))
      console.log(`[VirtioSerialBridge] Chunked file synced: ${transfer.path}`)
    } catch (error) {
      console.warn(`[VirtioSerialBridge] Chunked file write error for ${transfer.path}:`, error)
    } finally {
      this.pendingTransfers.delete(transferId)
    }
  }

  /** Send a sandbox request to the guest via serial */
  // 通过 serial 通道向 guest 发送一条 sandbox request。
  sendRequest(requestId: string, data: Record<string, unknown>): void {
    this.sendLine({ type: 'request', requestId, data })
  }

  /** Send a permission response to the guest via serial */
  // 通过 serial 通道把权限确认结果发送给 guest。
  sendPermissionResponse(requestId: string, result: Record<string, unknown>): void {
    this.sendLine({ type: 'permission_response', requestId, result })
  }

  /** Send a host tool response to the guest via serial */
  // 通过 serial 通道把宿主工具执行结果发送给 guest。
  sendHostToolResponse(requestId: string, payload: Record<string, unknown>): void {
    this.sendLine({
      type: 'host_tool_response',
      requestId,
      ...payload
    })
  }

  /**
   * Push a file from host to guest via serial.
   * Used to transfer skill files into the sandbox on Windows (where 9p is unavailable).
   */
  // 把宿主文件推送给 guest；大文件会自动拆块发送。
  pushFile(basePath: string, relativePath: string, data: Buffer): void {
    coworkLog('INFO', 'VirtioSerialBridge', `pushFile: ${relativePath} (${data.length} bytes) -> ${basePath}/${relativePath}`)
    const CHUNK_SIZE = 512 * 1024 // 512 KB per chunk
    // 统一使用正斜杠，保持 guest/host 两边路径语义一致。
    const syncPath = relativePath.replace(/\\/g, '/')

    if (data.length <= CHUNK_SIZE) {
      this.sendLine({
        type: 'push_file',
        basePath,
        path: syncPath,
        data: data.toString('base64')
      })
    } else {
      // 大文件走分块传输，避免单条消息过大。
      const transferId = uuidv4()
      const totalChunks = Math.ceil(data.length / CHUNK_SIZE)
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE
        const end = Math.min(start + CHUNK_SIZE, data.length)
        this.sendLine({
          type: 'push_file_chunk',
          transferId,
          basePath,
          path: syncPath,
          chunkIndex: i,
          totalChunks,
          data: data.subarray(start, end).toString('base64')
        })
      }
      this.sendLine({
        type: 'push_file_complete',
        transferId,
        basePath,
        path: syncPath,
        totalChunks
      })
    }
  }

  // 把一条 JSON line 写入 socket；未连接时只记日志不抛错。
  private sendLine(data: Record<string, unknown>): void {
    if (this.socket && this.connected) {
      this.socket.write(JSON.stringify(data) + '\n')
    } else {
      coworkLog('WARN', 'VirtioSerialBridge', `sendLine dropped (not connected): type=${String(data.type ?? 'unknown')}`)
    }
  }

  // 主动关闭 bridge，并清空状态缓存。
  close(): void {
    this.socket?.destroy()
    this.socket = null
    this.connected = false
    this.pendingTransfers.clear()
  }
}
