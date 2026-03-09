import { app, session } from 'electron'
import { createHash } from 'crypto'
import { EventEmitter } from 'events'
import fs from 'fs'
import path from 'path'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import { createGunzip } from 'zlib'
import { spawnSync } from 'child_process'
import { coworkLog } from './coworkLogger'

// 渲染层关心的沙箱总体状态：
// 1. 当前平台是否支持；
// 2. QEMU 运行时是否可用；
// 3. 虚拟机镜像是否已存在；
// 4. 是否正在执行下载或安装；
// 5. 最近一次进度和错误信息。
export type CoworkSandboxStatus = {
  supported: boolean
  runtimeReady: boolean
  imageReady: boolean
  downloading: boolean
  progress?: CoworkSandboxProgress
  error?: string | null
}

// 下载进度快照。
// `stage` 用来区分当前是在准备 runtime，还是在准备镜像/内核/initrd 这类镜像侧资源。
export type CoworkSandboxProgress = {
  stage: 'runtime' | 'image'
  received: number
  total?: number
  percent?: number
  url?: string
}

// 真正启动虚拟机时需要的一组关键路径。
// 其中 kernel/initrd 是可选项，因为有些镜像可以直接从磁盘镜像启动。
export type SandboxRuntimeInfo = {
  platform: NodeJS.Platform
  arch: NodeJS.Architecture
  runtimeBinary: string
  imagePath: string
  kernelPath?: string | null
  initrdPath?: string | null
  baseDir: string
}

type SandboxCheckResult = { ok: true; runtimeInfo: SandboxRuntimeInfo } | { ok: false; error: string }

// 支持通过环境变量覆盖下载地址和版本号，方便：
// 1. 私有部署时替换资源源站；
// 2. 灰度发布时固定某个资源版本；
// 3. 本地调试时指向开发环境资源。
const SANDBOX_BASE_URL = process.env.COWORK_SANDBOX_BASE_URL || ''
const SANDBOX_RUNTIME_VERSION = process.env.COWORK_SANDBOX_RUNTIME_VERSION || 'v0.1.3'
const SANDBOX_IMAGE_VERSION = process.env.COWORK_SANDBOX_IMAGE_VERSION || 'v0.1.4'

const SANDBOX_RUNTIME_URL = process.env.COWORK_SANDBOX_RUNTIME_URL
const SANDBOX_IMAGE_URL = process.env.COWORK_SANDBOX_IMAGE_URL
const SANDBOX_IMAGE_URL_ARM64 = process.env.COWORK_SANDBOX_IMAGE_URL_ARM64
const SANDBOX_IMAGE_URL_AMD64 = process.env.COWORK_SANDBOX_IMAGE_URL_AMD64
const SANDBOX_KERNEL_URL = process.env.COWORK_SANDBOX_KERNEL_URL
const SANDBOX_KERNEL_URL_ARM64 = process.env.COWORK_SANDBOX_KERNEL_URL_ARM64
const SANDBOX_KERNEL_URL_AMD64 = process.env.COWORK_SANDBOX_KERNEL_URL_AMD64
const SANDBOX_INITRD_URL = process.env.COWORK_SANDBOX_INITRD_URL
const SANDBOX_INITRD_URL_ARM64 = process.env.COWORK_SANDBOX_INITRD_URL_ARM64
const SANDBOX_INITRD_URL_AMD64 = process.env.COWORK_SANDBOX_INITRD_URL_AMD64
const SANDBOX_KERNEL_PATH = process.env.COWORK_SANDBOX_KERNEL_PATH
const SANDBOX_KERNEL_PATH_ARM64 = process.env.COWORK_SANDBOX_KERNEL_PATH_ARM64
const SANDBOX_KERNEL_PATH_AMD64 = process.env.COWORK_SANDBOX_KERNEL_PATH_AMD64
const SANDBOX_INITRD_PATH = process.env.COWORK_SANDBOX_INITRD_PATH
const SANDBOX_INITRD_PATH_ARM64 = process.env.COWORK_SANDBOX_INITRD_PATH_ARM64
const SANDBOX_INITRD_PATH_AMD64 = process.env.COWORK_SANDBOX_INITRD_PATH_AMD64

// 下载完成后可选做摘要校验，防止资源损坏或拿到错误文件。
const SANDBOX_RUNTIME_SHA256 = process.env.COWORK_SANDBOX_RUNTIME_SHA256
const SANDBOX_IMAGE_SHA256 = process.env.COWORK_SANDBOX_IMAGE_SHA256
const SANDBOX_IMAGE_SHA256_ARM64 = process.env.COWORK_SANDBOX_IMAGE_SHA256_ARM64
const SANDBOX_IMAGE_SHA256_AMD64 = process.env.COWORK_SANDBOX_IMAGE_SHA256_AMD64

// 内置默认下载地址按平台和架构拆分。
// macOS 这里使用预构建运行时；Windows 当前内置的是完整安装包。
const DEFAULT_SANDBOX_RUNTIME_URL_DARWIN_ARM64 = 'https://ydhardwarecommon.nosdn.127.net/f23e57c47e4356c31b5bf1012f10a53e.gz'
const DEFAULT_SANDBOX_RUNTIME_URL_DARWIN_AMD64 = 'https://ydhardwarecommon.nosdn.127.net/20a9f6a34705ca51dbd9fb8c7695c1e5.gz'
const DEFAULT_SANDBOX_RUNTIME_URL_WIN32_AMD64 = 'https://ydhardwarecommon.nosdn.127.net/02a016878c4457bd819e11e55b7b6884.gz'

const DEFAULT_SANDBOX_IMAGE_URL_ARM64 = 'https://ydhardwarecommon.nosdn.127.net/59d9df60ce9c0463c54e3043af60cb10.qcow2'
const DEFAULT_SANDBOX_IMAGE_URL_AMD64 = 'https://ydhardwarebusiness.nosdn.127.net/3ba0e509b60aaf8b5a969618d1b4e170.qcow2'

// 下载任务状态缓存。
// 这里把 runtime 和 image 的 promise 暂存起来，目的是避免多个调用方并发触发重复下载。
const downloadState: {
  runtime: Promise<string> | null
  image: Promise<string> | null
  progress?: CoworkSandboxProgress
  error: string | null
} = {
  runtime: null,
  image: null,
  progress: undefined,
  error: null
}

// Windows 场景下可能直接复用系统已经安装好的 QEMU。
// 为了让状态查询更快，这里缓存上一次解析成功的路径。
let _resolvedSystemQemuPath: string | null = null

const sandboxEvents = new EventEmitter()

// 将下载进度写回共享状态，并同步通知订阅者。
function emitProgress(progress: CoworkSandboxProgress): void {
  downloadState.progress = progress
  sandboxEvents.emit('progress', progress)
}

// 监听沙箱下载/安装进度。
// 返回值是解除监听的函数，便于渲染层在组件卸载时清理订阅。
export function onSandboxProgress(listener: (progress: CoworkSandboxProgress) => void): () => void {
  sandboxEvents.on('progress', listener)
  return () => sandboxEvents.off('progress', listener)
}

// 只允许当前代码已显式适配的平台和架构组合进入沙箱流程。
function getPlatformKey(): string | null {
  if (!['darwin', 'win32', 'linux'].includes(process.platform)) {
    return null
  }
  if (!['x64', 'arm64'].includes(process.arch)) {
    return null
  }
  return `${process.platform}-${process.arch}`
}

// 根据当前平台和架构推导 QEMU 主程序文件名。
function getRuntimeBinaryName(): string {
  const isWindows = process.platform === 'win32'
  if (process.arch === 'arm64') {
    return isWindows ? 'qemu-system-aarch64.exe' : 'qemu-system-aarch64'
  }
  return isWindows ? 'qemu-system-x86_64.exe' : 'qemu-system-x86_64'
}

// 统一计算所有沙箱资源所在目录。
// 资源落在 Electron userData 下，避免写入仓库目录或依赖启动目录。
function getSandboxPaths() {
  const baseDir = path.join(app.getPath('userData'), 'cowork', 'sandbox')
  const runtimeDir = path.join(baseDir, 'runtime', `${SANDBOX_RUNTIME_VERSION}`)
  const imageDir = path.join(baseDir, 'images', `${SANDBOX_IMAGE_VERSION}`)
  const runtimeBinary = path.join(runtimeDir, getRuntimeBinaryName())
  const imagePath = path.join(imageDir, `linux-${process.arch}.qcow2`)
  return { baseDir, runtimeDir, imageDir, runtimeBinary, imagePath }
}

// 解析 runtime 下载地址。
// 优先级：显式环境变量 > 内置默认地址 > 按 base URL 规则拼接。
function getRuntimeUrl(platformKey: string): string | null {
  if (SANDBOX_RUNTIME_URL) {
    return SANDBOX_RUNTIME_URL
  }
  if (platformKey === 'darwin-arm64' && DEFAULT_SANDBOX_RUNTIME_URL_DARWIN_ARM64) {
    return DEFAULT_SANDBOX_RUNTIME_URL_DARWIN_ARM64
  }
  if (platformKey === 'darwin-x64' && DEFAULT_SANDBOX_RUNTIME_URL_DARWIN_AMD64) {
    return DEFAULT_SANDBOX_RUNTIME_URL_DARWIN_AMD64
  }
  // Windows x64 默认走 CDN 上的安装包。
  if (platformKey === 'win32-x64' && DEFAULT_SANDBOX_RUNTIME_URL_WIN32_AMD64) {
    return DEFAULT_SANDBOX_RUNTIME_URL_WIN32_AMD64
  }
  // Windows arm64 暂无默认地址，必须依赖外部配置或系统已安装 QEMU。
  if (platformKey.startsWith('win32')) {
    return null
  }
  if (!SANDBOX_BASE_URL) {
    return null
  }
  return `${SANDBOX_BASE_URL}/${SANDBOX_RUNTIME_VERSION}/runtime-${platformKey}.tar.gz`
}

// 外部资源命名使用 amd64 / arm64，而 Node.js 里常见的是 x64 / arm64。
// 这里做一层映射，统一后续 URL 和文件名生成逻辑。
function getArchVariant(): 'amd64' | 'arm64' | null {
  if (process.arch === 'x64') {
    return 'amd64'
  }
  if (process.arch === 'arm64') {
    return 'arm64'
  }
  return null
}

// 解析镜像下载地址。
// 与 runtime 类似，但优先支持按架构覆盖。
function getImageUrl(): string | null {
  const archVariant = getArchVariant()
  if (archVariant === 'arm64' && (SANDBOX_IMAGE_URL_ARM64 || DEFAULT_SANDBOX_IMAGE_URL_ARM64)) {
    return SANDBOX_IMAGE_URL_ARM64 || DEFAULT_SANDBOX_IMAGE_URL_ARM64
  }
  if (archVariant === 'amd64' && (SANDBOX_IMAGE_URL_AMD64 || DEFAULT_SANDBOX_IMAGE_URL_AMD64)) {
    return SANDBOX_IMAGE_URL_AMD64 || DEFAULT_SANDBOX_IMAGE_URL_AMD64
  }
  if (SANDBOX_IMAGE_URL) {
    return SANDBOX_IMAGE_URL
  }
  if (!SANDBOX_BASE_URL) {
    return null
  }
  return `${SANDBOX_BASE_URL}/${SANDBOX_IMAGE_VERSION}/image-linux-${process.arch}.qcow2`
}

// 解析镜像摘要校验值，支持按架构覆盖。
function getImageSha256(): string | null {
  const archVariant = getArchVariant()
  if (archVariant === 'arm64' && SANDBOX_IMAGE_SHA256_ARM64) {
    return SANDBOX_IMAGE_SHA256_ARM64
  }
  if (archVariant === 'amd64' && SANDBOX_IMAGE_SHA256_AMD64) {
    return SANDBOX_IMAGE_SHA256_AMD64
  }
  return SANDBOX_IMAGE_SHA256 || null
}

// kernel 地址优先级：按架构覆盖 > 通用地址。
function getKernelUrl(): string | null {
  const archVariant = getArchVariant()
  if (archVariant === 'arm64' && SANDBOX_KERNEL_URL_ARM64) {
    return SANDBOX_KERNEL_URL_ARM64
  }
  if (archVariant === 'amd64' && SANDBOX_KERNEL_URL_AMD64) {
    return SANDBOX_KERNEL_URL_AMD64
  }
  return SANDBOX_KERNEL_URL || null
}

// initrd 地址优先级：按架构覆盖 > 通用地址。
function getInitrdUrl(): string | null {
  const archVariant = getArchVariant()
  if (archVariant === 'arm64' && SANDBOX_INITRD_URL_ARM64) {
    return SANDBOX_INITRD_URL_ARM64
  }
  if (archVariant === 'amd64' && SANDBOX_INITRD_URL_AMD64) {
    return SANDBOX_INITRD_URL_AMD64
  }
  return SANDBOX_INITRD_URL || null
}

// 允许调用方通过环境变量直接指定本地 kernel 路径。
// 如果给了路径并且文件存在，就完全跳过下载逻辑。
function getKernelPathOverride(): string | null {
  const archVariant = getArchVariant()
  if (archVariant === 'arm64' && SANDBOX_KERNEL_PATH_ARM64) {
    return SANDBOX_KERNEL_PATH_ARM64
  }
  if (archVariant === 'amd64' && SANDBOX_KERNEL_PATH_AMD64) {
    return SANDBOX_KERNEL_PATH_AMD64
  }
  return SANDBOX_KERNEL_PATH || null
}

// initrd 的本地路径覆盖规则与 kernel 保持一致。
function getInitrdPathOverride(): string | null {
  const archVariant = getArchVariant()
  if (archVariant === 'arm64' && SANDBOX_INITRD_PATH_ARM64) {
    return SANDBOX_INITRD_PATH_ARM64
  }
  if (archVariant === 'amd64' && SANDBOX_INITRD_PATH_AMD64) {
    return SANDBOX_INITRD_PATH_AMD64
  }
  return SANDBOX_INITRD_PATH || null
}

// 下载文件到目标路径。
// 这里使用 Electron session 发请求，而不是 Node 原生 http/https，
// 是为了复用应用本身的网络栈、代理和证书配置。
async function downloadFile(url: string, destination: string, stage: CoworkSandboxProgress['stage']): Promise<void> {
  const response = await session.defaultSession.fetch(url)
  if (!response.ok) {
    throw new Error(`Download failed (${response.status}): ${url}`)
  }

  await fs.promises.mkdir(path.dirname(destination), { recursive: true })

  // 某些响应体可能无法以流的方式读取，此时退化为一次性读入并写盘。
  if (!response.body) {
    const data = Buffer.from(await response.arrayBuffer())
    await fs.promises.writeFile(destination, data)
    emitProgress({
      stage,
      received: data.length,
      total: data.length,
      percent: 1,
      url
    })
    return
  }

  const totalHeader = response.headers.get('content-length')
  const total = totalHeader ? Number(totalHeader) : undefined
  let received = 0
  emitProgress({
    stage,
    received,
    total: total && Number.isFinite(total) ? total : undefined,
    percent: total && Number.isFinite(total) ? 0 : undefined,
    url
  })

  const nodeStream = Readable.fromWeb(response.body as any)
  nodeStream.on('data', (chunk: Buffer) => {
    received += chunk.length
    emitProgress({
      stage,
      received,
      total: total && Number.isFinite(total) ? total : undefined,
      percent: total && Number.isFinite(total) ? received / total : undefined,
      url
    })
  })

  await pipeline(nodeStream, fs.createWriteStream(destination))

  emitProgress({
    stage,
    received,
    total: total && Number.isFinite(total) ? total : undefined,
    percent: total && Number.isFinite(total) ? 1 : undefined,
    url
  })
}

// 对文件做 SHA-256 摘要计算。
async function sha256File(filePath: string): Promise<string> {
  const hash = createHash('sha256')
  const stream = fs.createReadStream(filePath)
  await new Promise<void>((resolve, reject) => {
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('end', () => resolve())
    stream.on('error', reject)
  })
  return hash.digest('hex')
}

// 如果配置了期望摘要，则在下载后立即做一致性校验。
async function verifySha256(filePath: string, expected?: string | null): Promise<void> {
  if (!expected) return
  const actual = await sha256File(filePath)
  if (actual.toLowerCase() !== expected.toLowerCase()) {
    throw new Error(`Checksum mismatch for ${path.basename(filePath)}`)
  }
}

// 单独封装 tar 解包，方便其他地方复用错误处理逻辑。
function extractTarArchive(archivePath: string, destDir: string): void {
  const result = spawnSync('tar', ['-xf', archivePath, '-C', destDir], { stdio: 'pipe' })
  if (result.status !== 0) {
    throw new Error(result.stderr?.toString() || 'Failed to extract tar archive')
  }
}

// 根据压缩包格式选择对应解压策略。
// Windows zip 走 PowerShell，其他平台尽量依赖系统 tar/unzip。
function extractArchive(archivePath: string, destDir: string): void {
  if (archivePath.endsWith('.zip')) {
    if (process.platform === 'win32') {
      const result = spawnSync('powershell', ['-NoProfile', '-Command', `Expand-Archive -Force "${archivePath}" "${destDir}"`], {
        stdio: 'pipe'
      })
      if (result.status !== 0) {
        throw new Error(result.stderr?.toString() || 'Failed to extract zip archive')
      }
    } else {
      const result = spawnSync('unzip', ['-q', archivePath, '-d', destDir], { stdio: 'pipe' })
      if (result.status !== 0) {
        throw new Error(result.stderr?.toString() || 'Failed to extract zip archive')
      }
    }
    return
  }

  if (archivePath.endsWith('.tar')) {
    extractTarArchive(archivePath, destDir)
    return
  }

  if (archivePath.endsWith('.tar.gz') || archivePath.endsWith('.tgz')) {
    const result = spawnSync('tar', ['-xzf', archivePath, '-C', destDir], { stdio: 'pipe' })
    if (result.status !== 0) {
      throw new Error(result.stderr?.toString() || 'Failed to extract tar archive')
    }
    return
  }

  throw new Error('Unsupported runtime archive format')
}

// 将 .gz 文件解成原始内容。
// 解出来的内容可能是单个二进制，也可能仍然是 tar 包，需要后续再判断。
async function extractGzipBinary(archivePath: string, targetPath: string): Promise<void> {
  await pipeline(fs.createReadStream(archivePath), createGunzip(), fs.createWriteStream(targetPath))
}

// 读取 tar header 判断文件是否为 tar 包。
async function isTarFile(filePath: string): Promise<boolean> {
  try {
    const handle = await fs.promises.open(filePath, 'r')
    const buffer = Buffer.alloc(262)
    await handle.read(buffer, 0, 262, 0)
    await handle.close()
    const magic = buffer.subarray(257, 262).toString('utf8')
    return magic === 'ustar'
  } catch (error) {
    console.warn('Failed to probe sandbox runtime archive:', error)
    return false
  }
}

// 读取 gzip 文件头魔数判断是否为 gzip。
async function isGzipFile(filePath: string): Promise<boolean> {
  try {
    const handle = await fs.promises.open(filePath, 'r')
    const buffer = Buffer.alloc(2)
    await handle.read(buffer, 0, 2, 0)
    await handle.close()
    return buffer[0] === 0x1f && buffer[1] === 0x8b
  } catch (error) {
    console.warn('Failed to probe sandbox runtime binary:', error)
    return false
  }
}

// Windows PE/COFF 可执行文件通常以 MZ 开头。
// 这里用最轻量的方式判断 gunzip 后拿到的是不是 Windows 可执行文件。
async function isPEFile(filePath: string): Promise<boolean> {
  try {
    const handle = await fs.promises.open(filePath, 'r')
    const buffer = Buffer.alloc(2)
    await handle.read(buffer, 0, 2, 0)
    await handle.close()
    return buffer[0] === 0x4d && buffer[1] === 0x5a
  } catch (error) {
    console.warn('Failed to probe file for PE header:', error)
    return false
  }
}

/**
 * 以交互式方式启动 NSIS 安装器，并等待其结束。
 *
 * 这里刻意通过 PowerShell 的 Start-Process 调 ShellExecute，
 * 是因为它可以让系统正常处理 UAC 提权和安装界面展示，
 * 行为更接近用户手动双击安装包。
 */
async function runNsisInstaller(installerPath: string, targetDir: string): Promise<void> {
  await fs.promises.mkdir(targetDir, { recursive: true })

  console.log(`[Sandbox] Launching QEMU installer interactively: ${installerPath}`)
  console.log(`[Sandbox] Suggested install directory: ${targetDir}`)

  // -Wait：等待安装器退出。
  // /D=：给 NSIS 预填安装目录，用户仍然可以自行修改。
  const result = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-Command', `Start-Process -FilePath '${installerPath}' -ArgumentList '/D=${targetDir}' -Wait`],
    { stdio: 'pipe', timeout: 600000 }
  ) // 10 分钟超时，避免安装器挂起后永久阻塞。

  if (result.error) {
    throw new Error(`Failed to launch installer: ${result.error.message}`)
  }
  if (result.status !== 0) {
    const stderr = result.stderr?.toString().trim() || ''
    throw new Error(
      `Installer failed (exit code ${result.status}): ${stderr || 'User may have cancelled the installation or denied elevation.'}`
    )
  }

  console.log('[Sandbox] QEMU installer process completed')
}

// 下载或解压后的目录结构并不总是稳定的。
// 因此这里除了检查预期路径，还会递归扫描 runtime 目录，寻找同名二进制。
function resolveRuntimeBinary(runtimeDir: string, expectedPath: string): string | null {
  if (fs.existsSync(expectedPath)) {
    return expectedPath
  }

  if (!fs.existsSync(runtimeDir)) {
    return null
  }

  const targetName = path.basename(expectedPath)
  const stack = [runtimeDir]
  while (stack.length > 0) {
    const current = stack.pop()
    if (!current) continue
    const entries = fs.readdirSync(current, { withFileTypes: true })
    for (const entry of entries) {
      const entryPath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        stack.push(entryPath)
      } else if (entry.isFile() && entry.name === targetName) {
        return entryPath
      }
    }
  }

  return null
}

/**
 * 在 Windows 上尝试寻找系统已安装的 QEMU。
 *
 * 顺序是：
 * 1. 先查 PATH；
 * 2. 再查常见安装目录。
 */
function findSystemQemu(): string | null {
  if (process.platform !== 'win32') {
    return null
  }

  const qemuName = getRuntimeBinaryName()

  // 先从 PATH 里找，兼容用户手工安装或包管理器安装。
  const result = spawnSync('where', [qemuName], { stdio: 'pipe' })
  if (result.status === 0 && result.stdout) {
    const paths = result.stdout.toString().trim().split('\n')
    for (const qemuPath of paths) {
      const trimmedPath = qemuPath.trim()
      if (fs.existsSync(trimmedPath)) {
        // 通过 --version 做一次最小可运行性探测，避免返回失效路径。
        const testResult = spawnSync(trimmedPath, ['--version'], { stdio: 'pipe', timeout: 5000 })
        if (testResult.status === 0 || testResult.status === 3221225781) {
          // 3221225781 表示 DLL 缺失。
          // 这里仍然返回路径，让后续校验给出更明确错误，而不是直接忽略。
          return trimmedPath
        }
      }
    }
  }

  // 再补查几个常见安装目录，兼容没有写 PATH 的安装方式。
  const commonPaths = [
    'C:\\Program Files\\qemu',
    'C:\\Program Files (x86)\\qemu',
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'qemu')
  ]

  for (const basePath of commonPaths) {
    const qemuPath = path.join(basePath, qemuName)
    if (fs.existsSync(qemuPath)) {
      return qemuPath
    }
  }

  return null
}

/**
 * 校验一个 QEMU 二进制是否真的可以运行。
 *
 * 仅仅“文件存在”不够，因为 Windows 上很常见的情况是主程序在，但依赖 DLL 不全。
 */
function validateQemuBinary(binaryPath: string): { valid: boolean; error?: string } {
  if (!fs.existsSync(binaryPath)) {
    return { valid: false, error: 'Binary not found' }
  }

  // 使用 --version 做轻量探测，尽量降低副作用。
  const result = spawnSync(binaryPath, ['--version'], { stdio: 'pipe', timeout: 5000 })

  // 0 表示二进制可正常执行。
  if (result.status === 0) {
    return { valid: true }
  }

  // 3221225781 (0xC0000135) 对应 DLL 缺失。
  if (result.status === 3221225781) {
    return {
      valid: false,
      error: 'QEMU binary is missing required DLL files. Please install QEMU properly or use a complete QEMU package.'
    }
  }

  // 其他非零退出码统一作为可执行但失败处理。
  if (result.status !== null && result.status !== 0) {
    return {
      valid: false,
      error: `QEMU binary failed to run (exit code: ${result.status}). ${result.stderr?.toString() || ''}`.trim()
    }
  }

  // 这里通常是进程启动超时或系统级错误。
  if (result.error) {
    return {
      valid: false,
      error: `Failed to run QEMU: ${result.error.message}`
    }
  }

  return { valid: false, error: 'Unknown error validating QEMU binary' }
}

/**
 * 检查 QEMU 是否具备 virtfs(9p) 支持。
 *
 * 非 Windows 平台依赖 `-virtfs` 做宿主机与虚拟机目录共享；
 * 如果缺少这个能力，沙箱中的文件交换会直接失效。
 *
 * Windows 上通常不依赖 virtfs，而是走 virtio-serial，因此这里直接放行。
 */
function checkQemuVirtfsSupport(binaryPath: string): boolean {
  if (process.platform === 'win32') {
    return true
  }

  const result = spawnSync(binaryPath, ['-help'], { stdio: 'pipe', timeout: 5000 })
  if (result.status === 0 && result.stdout) {
    return result.stdout.toString().includes('-virtfs')
  }
  return false
}

function hasHypervisorEntitlement(output: string): boolean {
  return output.includes('com.apple.security.hypervisor')
}

// macOS 上如果 QEMU 没带 hypervisor entitlement，就无法使用 HVF 硬件虚拟化。
// 这里会尝试做一次 ad-hoc codesign，给下载到本地的 runtime 补上最小权限。
function ensureHypervisorEntitlement(binaryPath: string, runtimeDir: string): void {
  if (process.platform !== 'darwin') return

  const probe = spawnSync('codesign', ['-d', '--entitlements', ':-', binaryPath], { stdio: 'pipe' })
  if (probe.status === 0) {
    const stdout = probe.stdout?.toString() || ''
    const stderr = probe.stderr?.toString() || ''
    if (hasHypervisorEntitlement(stdout) || hasHypervisorEntitlement(stderr)) {
      return
    }
  }

  // 动态生成一份只包含 hypervisor 权限的 entitlement 文件。
  const entitlementsPath = path.join(runtimeDir, 'entitlements.hypervisor.plist')
  const entitlements = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0">',
    '<dict>',
    '  <key>com.apple.security.hypervisor</key>',
    '  <true/>',
    '</dict>',
    '</plist>',
    ''
  ].join('\n')
  try {
    fs.writeFileSync(entitlementsPath, entitlements)
  } catch (error) {
    console.warn('Failed to write hypervisor entitlements file:', error)
    return
  }

  const sign = spawnSync('codesign', ['-s', '-', '--force', '--entitlements', entitlementsPath, binaryPath], { stdio: 'pipe' })
  if (sign.status !== 0) {
    const stderr = sign.stderr?.toString() || sign.stdout?.toString() || 'Unknown codesign error'
    console.warn('Failed to codesign sandbox runtime for HVF:', stderr.trim())
  }
}

// 确保 QEMU runtime 可用。
// 流程顺序是：
// 1. 优先复用本地已有 runtime；
// 2. Windows 再尝试复用系统安装的 QEMU；
// 3. 最后才按配置下载并解压。
async function ensureRuntime(): Promise<string> {
  const platformKey = getPlatformKey()
  if (!platformKey) {
    throw new Error('Sandbox VM is not supported on this platform.')
  }

  const { runtimeDir, runtimeBinary } = getSandboxPaths()
  const resolvedBinary = resolveRuntimeBinary(runtimeDir, runtimeBinary)
  if (resolvedBinary) {
    // 兼容旧格式残留：
    // 某些版本可能把 gzip 或 tar 文件直接放在了 runtime 目录里，这里顺手修复。
    if (await isGzipFile(resolvedBinary)) {
      const tempPath = `${resolvedBinary}.tmp`
      await extractGzipBinary(resolvedBinary, tempPath)
      if (await isTarFile(tempPath)) {
        extractTarArchive(tempPath, runtimeDir)
        await fs.promises.unlink(tempPath)
        try {
          await fs.promises.unlink(resolvedBinary)
        } catch (error) {
          console.warn('Failed to remove sandbox runtime gzip archive:', error)
        }
      } else {
        await fs.promises.rename(tempPath, resolvedBinary)
      }
    } else if (await isTarFile(resolvedBinary)) {
      extractTarArchive(resolvedBinary, runtimeDir)
      try {
        await fs.promises.unlink(resolvedBinary)
      } catch (error) {
        console.warn('Failed to remove sandbox runtime tar archive:', error)
      }
    }

    const finalResolved = resolveRuntimeBinary(runtimeDir, runtimeBinary)
    if (!finalResolved) {
      throw new Error('Sandbox runtime binary not found after extraction.')
    }

    // 这里只打告警，不主动删文件或重新下载，避免误伤用户自己准备的 runtime。
    const validation = validateQemuBinary(finalResolved)
    if (!validation.valid) {
      console.warn(`[Sandbox] QEMU binary validation warning: ${validation.error}`)
    }

    if (process.platform !== 'win32') {
      try {
        fs.chmodSync(finalResolved, 0o755)
      } catch (error) {
        console.warn('Failed to chmod sandbox runtime binary:', error)
      }
    }
    ensureHypervisorEntitlement(finalResolved, runtimeDir)
    return finalResolved
  }

  // Windows 优先复用系统 QEMU，避免首次启动时强制下载和安装。
  if (process.platform === 'win32') {
    const systemQemu = findSystemQemu()
    if (systemQemu) {
      console.log(`[Sandbox] Found system QEMU at: ${systemQemu}`)
      const validation = validateQemuBinary(systemQemu)
      if (validation.valid) {
        if (checkQemuVirtfsSupport(systemQemu)) {
          console.log('[Sandbox] Using system QEMU installation')
          _resolvedSystemQemuPath = systemQemu
          return systemQemu
        }
        console.warn('[Sandbox] System QEMU lacks virtfs (9p) support, will download a compatible build')
      } else {
        console.warn(`[Sandbox] System QEMU found but invalid: ${validation.error}`)
      }
    }
  }

  const url = getRuntimeUrl(platformKey)
  if (!url) {
    let errorMsg: string
    if (platformKey === 'win32-x64' || platformKey === 'win32-arm64') {
      errorMsg = [
        'Windows sandbox requires QEMU to be installed.',
        '',
        'Please install QEMU using one of these methods:',
        '1. Download and install from: https://qemu.weilnetz.de/w64/',
        '2. Install via scoop: scoop install qemu',
        '3. Install via chocolatey: choco install qemu',
        '',
        'After installation, QEMU should be available in your system PATH.',
        'Alternatively, set the COWORK_SANDBOX_RUNTIME_URL environment variable to a QEMU package URL.'
      ].join('\n')
    } else {
      errorMsg = 'Sandbox runtime download URL is not configured.'
    }
    throw new Error(errorMsg)
  }

  // 先下载到临时文件，避免半成品直接污染最终路径。
  const archivePath = path.join(runtimeDir, `runtime-${platformKey}.download`)
  await fs.promises.mkdir(runtimeDir, { recursive: true })

  await downloadFile(url, archivePath, 'runtime')
  await verifySha256(archivePath, SANDBOX_RUNTIME_SHA256)

  if (url.endsWith('.zip') || url.endsWith('.tar.gz') || url.endsWith('.tgz')) {
    extractArchive(archivePath, runtimeDir)
    await fs.promises.unlink(archivePath)
  } else if (url.endsWith('.gz')) {
    const tempPath = `${runtimeBinary}.download`
    await extractGzipBinary(archivePath, tempPath)
    await fs.promises.unlink(archivePath)
    if (await isTarFile(tempPath)) {
      extractTarArchive(tempPath, runtimeDir)
      await fs.promises.unlink(tempPath)
    } else if (process.platform === 'win32' && (await isPEFile(tempPath))) {
      // Windows 下 gunzip 之后可能得到：
      // 1. QEMU 主程序本体；
      // 2. 一个安装器（例如 NSIS）。
      const fileStats = await fs.promises.stat(tempPath)
      console.log(`[Sandbox] Decompressed PE file: ${fileStats.size} bytes`)

      // 先用 --version 探测是否已经是可直接运行的 QEMU 二进制。
      const versionProbe = spawnSync(tempPath, ['--version'], { stdio: 'pipe', timeout: 5000 })
      const versionOutput = versionProbe.stdout?.toString().trim() || ''
      console.log(`[Sandbox] PE --version probe: exit=${versionProbe.status}, stdout="${versionOutput.slice(0, 120)}"`)

      if (versionProbe.status === 0 && versionOutput.toLowerCase().includes('qemu')) {
        console.log('[Sandbox] Downloaded file is a QEMU binary, renaming directly')
        await fs.promises.rename(tempPath, runtimeBinary)
      } else {
        // 否则按安装器处理，拉起交互式安装流程。
        const installerPath = path.join(runtimeDir, 'qemu-installer.exe')
        await fs.promises.rename(tempPath, installerPath)
        try {
          console.log(`[Sandbox] Running QEMU NSIS installer to: ${runtimeDir}`)
          await runNsisInstaller(installerPath, runtimeDir)
          console.log('[Sandbox] QEMU NSIS installer completed successfully')
        } catch (error) {
          // 安装失败时输出目录内容，帮助定位安装器是否已落地文件。
          try {
            const entries = fs.readdirSync(runtimeDir)
            console.log(`[Sandbox] Runtime dir contents after failed install: ${JSON.stringify(entries)}`)
          } catch {
            /* ignore */
          }
          try {
            await fs.promises.unlink(installerPath)
          } catch {
            /* ignore */
          }
          throw new Error(`Failed to install QEMU: ${error instanceof Error ? error.message : String(error)}`)
        }
        // 安装成功后也记录一次目录快照，便于排查路径解析问题。
        try {
          const entries = fs.readdirSync(runtimeDir)
          console.log(`[Sandbox] Runtime dir contents after install: ${JSON.stringify(entries)}`)
        } catch {
          /* ignore */
        }
        // 安装器只用于引导安装，成功后应删除，避免后续误识别。
        try {
          await fs.promises.unlink(installerPath)
        } catch (error) {
          console.warn('[Sandbox] Failed to remove QEMU installer after installation:', error)
        }
      }
    } else {
      await fs.promises.rename(tempPath, runtimeBinary)
    }
  } else {
    const targetPath = runtimeBinary
    await fs.promises.rename(archivePath, targetPath)
  }

  const finalBinary = resolveRuntimeBinary(runtimeDir, runtimeBinary)
  if (!finalBinary) {
    // 输出目录树方便快速判断：
    // 是“包解开了但层级不对”，还是“包里压根没有目标二进制”。
    try {
      const listDir = (dir: string, prefix = ''): string[] => {
        const results: string[] = []
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name)
          results.push(`${prefix}${entry.name}${entry.isDirectory() ? '/' : ''}`)
          if (entry.isDirectory()) {
            results.push(...listDir(full, prefix + '  '))
          }
        }
        return results
      }
      console.log(`[Sandbox] Binary not found. Looking for: ${path.basename(runtimeBinary)}`)
      console.log(`[Sandbox] Runtime dir tree:\n${listDir(runtimeDir).join('\n')}`)
    } catch {
      /* ignore */
    }
    throw new Error('Sandbox runtime binary not found after extraction.')
  }
  console.log(`[Sandbox] Resolved runtime binary: ${finalBinary}`)

  // 这里仍然只做告警，不阻塞准备流程。
  // 如果二进制真的不可用，最终会在实际启动 VM 时暴露出来。
  const validation = validateQemuBinary(finalBinary)
  if (!validation.valid) {
    console.warn(`[Sandbox] QEMU binary validation warning: ${validation.error}`)
  }

  if (process.platform !== 'win32') {
    try {
      fs.chmodSync(finalBinary, 0o755)
    } catch (error) {
      console.warn('Failed to chmod sandbox runtime binary:', error)
    }
  }
  ensureHypervisorEntitlement(finalBinary, runtimeDir)

  return finalBinary
}

// 确保虚拟机磁盘镜像存在。
// 镜像通常最大，因此单独维护下载状态和进度。
async function ensureImage(): Promise<string> {
  const { imageDir, imagePath } = getSandboxPaths()
  if (fs.existsSync(imagePath)) {
    return imagePath
  }

  const url = getImageUrl()
  if (!url) {
    const errorMsg =
      process.platform === 'win32'
        ? 'Windows sandbox image is not yet configured. Please set COWORK_SANDBOX_IMAGE_URL or COWORK_SANDBOX_BASE_URL environment variable, or wait for default Windows image support.'
        : 'Sandbox image download URL is not configured.'
    throw new Error(errorMsg)
  }

  await fs.promises.mkdir(imageDir, { recursive: true })
  const downloadPath = `${imagePath}.download`
  await downloadFile(url, downloadPath, 'image')
  await verifySha256(downloadPath, getImageSha256())
  await fs.promises.rename(downloadPath, imagePath)
  return imagePath
}

// kernel 是附加资源。
// 如果调用方已经指定了本地路径，就直接返回；否则按当前架构尝试下载。
async function ensureKernel(): Promise<string | null> {
  const override = getKernelPathOverride()
  if (override && fs.existsSync(override)) {
    return override
  }

  const archVariant = getArchVariant()
  if (!archVariant) return null

  const { imageDir } = getSandboxPaths()
  const kernelPath = path.join(imageDir, `vmlinuz-virt-${archVariant}`)
  if (fs.existsSync(kernelPath)) {
    return kernelPath
  }

  const url = getKernelUrl()
  if (!url) return null
  await fs.promises.mkdir(imageDir, { recursive: true })
  const downloadPath = `${kernelPath}.download`
  await downloadFile(url, downloadPath, 'image')
  await fs.promises.rename(downloadPath, kernelPath)
  return kernelPath
}

// initrd 与 kernel 处理方式一致，也是可选资源。
async function ensureInitrd(): Promise<string | null> {
  const override = getInitrdPathOverride()
  if (override && fs.existsSync(override)) {
    return override
  }

  const archVariant = getArchVariant()
  if (!archVariant) return null

  const { imageDir } = getSandboxPaths()
  const initrdPath = path.join(imageDir, `initramfs-virt-${archVariant}`)
  if (fs.existsSync(initrdPath)) {
    return initrdPath
  }

  const url = getInitrdUrl()
  if (!url) return null
  await fs.promises.mkdir(imageDir, { recursive: true })
  const downloadPath = `${initrdPath}.download`
  await downloadFile(url, downloadPath, 'image')
  await fs.promises.rename(downloadPath, initrdPath)
  return initrdPath
}

// 只读取当前已存在的 kernel 路径，不触发任何下载。
function getExistingKernelPath(): string | null {
  const override = getKernelPathOverride()
  if (override && fs.existsSync(override)) {
    return override
  }

  const archVariant = getArchVariant()
  if (!archVariant) return null

  const { imageDir } = getSandboxPaths()
  const kernelPath = path.join(imageDir, `vmlinuz-virt-${archVariant}`)
  return fs.existsSync(kernelPath) ? kernelPath : null
}

// 只读取当前已存在的 initrd 路径，不触发任何下载。
function getExistingInitrdPath(): string | null {
  const override = getInitrdPathOverride()
  if (override && fs.existsSync(override)) {
    return override
  }

  const archVariant = getArchVariant()
  if (!archVariant) return null

  const { imageDir } = getSandboxPaths()
  const initrdPath = path.join(imageDir, `initramfs-virt-${archVariant}`)
  return fs.existsSync(initrdPath) ? initrdPath : null
}

// 尝试返回“当前已经可用”的 runtime 路径。
// 这个函数不会触发下载，只做本地探测。
function resolveAvailableRuntimeBinary(): string | null {
  const { runtimeDir, runtimeBinary } = getSandboxPaths()
  const localRuntime = resolveRuntimeBinary(runtimeDir, runtimeBinary)
  if (localRuntime) {
    return localRuntime
  }

  // Windows 还要考虑系统安装的 QEMU。
  if (process.platform === 'win32') {
    if (_resolvedSystemQemuPath && fs.existsSync(_resolvedSystemQemuPath)) {
      return _resolvedSystemQemuPath
    }
    const systemQemu = findSystemQemu()
    if (systemQemu) {
      const validation = validateQemuBinary(systemQemu)
      if (validation.valid && checkQemuVirtfsSupport(systemQemu)) {
        _resolvedSystemQemuPath = systemQemu
        return systemQemu
      }
    }
  }

  return null
}

// 整个“准备沙箱”的流程做成单飞模式。
// 这样多个会话同时进入时，只会有一个真正执行下载和解压。
let _ensureSandboxReadyPromise: Promise<SandboxCheckResult> | null = null

// 对外暴露的统一入口。
// 如果当前已有进行中的准备任务，就直接复用那一个 promise。
export function ensureSandboxReady(): Promise<SandboxCheckResult> {
  if (_ensureSandboxReadyPromise) {
    return _ensureSandboxReadyPromise
  }
  _ensureSandboxReadyPromise = _ensureSandboxReadyImpl()
  _ensureSandboxReadyPromise.finally(() => {
    _ensureSandboxReadyPromise = null
  })
  return _ensureSandboxReadyPromise
}

// 真正的准备逻辑：
// 1. 确保 runtime；
// 2. 确保 image；
// 3. 尝试补齐 kernel/initrd；
// 4. 汇总结果并写日志。
async function _ensureSandboxReadyImpl(): Promise<SandboxCheckResult> {
  const platformKey = getPlatformKey()
  if (!platformKey) {
    return { ok: false, error: 'Sandbox VM is not supported on this platform.' }
  }

  coworkLog('INFO', 'ensureSandboxReady', 'Checking sandbox readiness', {
    platformKey,
    platform: process.platform,
    arch: process.arch
  })

  try {
    if (!downloadState.runtime) {
      downloadState.runtime = ensureRuntime()
    }
    const runtimeBinary = await downloadState.runtime
    downloadState.runtime = null

    if (!downloadState.image) {
      downloadState.image = ensureImage()
    }
    const imagePath = await downloadState.image
    downloadState.image = null

    let kernelPath: string | null = null
    let initrdPath: string | null = null
    try {
      // kernel/initrd 属于增强项，下载失败不阻断主流程 ready。
      kernelPath = await ensureKernel()
      initrdPath = await ensureInitrd()
    } catch (error) {
      console.warn('Failed to download sandbox kernel/initrd:', error)
    }

    const { baseDir } = getSandboxPaths()
    downloadState.error = null
    downloadState.progress = undefined

    coworkLog('INFO', 'ensureSandboxReady', 'Sandbox ready', {
      runtimeBinary,
      runtimeExists: fs.existsSync(runtimeBinary),
      imagePath,
      imageExists: fs.existsSync(imagePath),
      kernelPath,
      initrdPath
    })

    return {
      ok: true,
      runtimeInfo: {
        platform: process.platform,
        arch: process.arch,
        runtimeBinary,
        imagePath,
        kernelPath,
        initrdPath,
        baseDir
      }
    }
  } catch (error) {
    downloadState.error = error instanceof Error ? error.message : String(error)
    downloadState.runtime = null
    downloadState.image = null
    coworkLog('ERROR', 'ensureSandboxReady', 'Sandbox not ready', {
      error: downloadState.error
    })
    return { ok: false, error: downloadState.error }
  }
}

// 仅读取已经准备好的 runtime 信息。
// 如果资源不存在，直接返回失败，不会主动触发下载。
export function getSandboxRuntimeInfoIfReady(): { ok: true; runtimeInfo: SandboxRuntimeInfo } | { ok: false; error: string } {
  const platformKey = getPlatformKey()
  if (!platformKey) {
    return { ok: false, error: 'Sandbox VM is not supported on this platform.' }
  }

  const runtimeBinary = resolveAvailableRuntimeBinary()
  if (!runtimeBinary) {
    return { ok: false, error: 'Sandbox runtime is not installed.' }
  }

  const { baseDir, imagePath } = getSandboxPaths()
  if (!fs.existsSync(imagePath)) {
    return { ok: false, error: 'Sandbox image is not installed.' }
  }

  return {
    ok: true,
    runtimeInfo: {
      platform: process.platform,
      arch: process.arch,
      runtimeBinary,
      imagePath,
      kernelPath: getExistingKernelPath(),
      initrdPath: getExistingInitrdPath(),
      baseDir
    }
  }
}

// 汇总当前沙箱状态，供设置页或会话 UI 直接消费。
export function getSandboxStatus(): CoworkSandboxStatus {
  const platformKey = getPlatformKey()
  if (!platformKey) {
    return {
      supported: false,
      runtimeReady: false,
      imageReady: false,
      downloading: Boolean(downloadState.runtime || downloadState.image),
      error: downloadState.error
    }
  }

  const { imagePath } = getSandboxPaths()
  const runtimeReady = Boolean(resolveAvailableRuntimeBinary())
  const imageReady = fs.existsSync(imagePath)

  return {
    supported: true,
    runtimeReady,
    imageReady,
    downloading: Boolean(downloadState.runtime || downloadState.image),
    progress: downloadState.progress,
    error: downloadState.error
  }
}
