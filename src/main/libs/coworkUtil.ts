import { app } from 'electron'
import { execSync, spawnSync } from 'child_process'
import { existsSync, mkdirSync, writeFileSync, chmodSync, statSync, readdirSync } from 'fs'
import { delimiter, dirname, join } from 'path'
import { buildEnvForConfig, getCurrentApiConfig, resolveCurrentApiConfig } from './claudeSettings'
import type { OpenAICompatProxyTarget } from './coworkOpenAICompatProxy'
import { getInternalApiBaseURL } from './coworkOpenAICompatProxy'
import { coworkLog } from './coworkLogger'
import { appendPythonRuntimeToEnv } from './pythonRuntime'
import { isSystemProxyEnabled, resolveSystemProxyUrl } from './systemProxy'

// 合并 PATH 字符串，去重后按平台分隔符拼接。
function appendEnvPath(current: string | undefined, additions: string[]): string | undefined {
  const items = new Set<string>()

  for (const entry of additions) {
    if (entry) {
      items.add(entry)
    }
  }

  if (current) {
    for (const entry of current.split(delimiter)) {
      if (entry) {
        items.add(entry)
      }
    }
  }

  return items.size > 0 ? Array.from(items).join(delimiter) : current
}

// 在指定环境变量集合中检查命令是否可执行。
function hasCommandInEnv(command: string, env: Record<string, string | undefined>): boolean {
  const whichCmd = process.platform === 'win32' ? 'where' : 'which'
  try {
    const result = spawnSync(whichCmd, [command], {
      env: { ...env } as NodeJS.ProcessEnv,
      encoding: 'utf-8',
      timeout: 5000,
      windowsHide: process.platform === 'win32'
    })
    return result.status === 0
  } catch {
    return false
  }
}

let cachedElectronNodeRuntimePath: string | null = null

// 解析 Electron 可作为 Node 运行时的可执行路径。
function resolveElectronNodeRuntimePath(): string {
  if (!app.isPackaged || process.platform !== 'darwin') {
    return process.execPath
  }

  try {
    const appName = app.getName()
    const frameworksDir = join(process.resourcesPath, '..', 'Frameworks')
    if (!existsSync(frameworksDir)) {
      return process.execPath
    }

    const helperApps = readdirSync(frameworksDir)
      .filter((entry) => entry.startsWith(`${appName} Helper`) && entry.endsWith('.app'))
      .sort((a, b) => {
        const score = (name: string): number => {
          if (name === `${appName} Helper.app`) return 0
          if (name === `${appName} Helper (Renderer).app`) return 1
          if (name === `${appName} Helper (Plugin).app`) return 2
          if (name === `${appName} Helper (GPU).app`) return 3
          return 10
        }
        return score(a) - score(b)
      })

    for (const helperApp of helperApps) {
      const helperExeName = helperApp.replace(/\.app$/, '')
      const helperExePath = join(frameworksDir, helperApp, 'Contents', 'MacOS', helperExeName)
      if (existsSync(helperExePath)) {
        coworkLog('INFO', 'resolveNodeShim', `Using Electron helper runtime for node shim: ${helperExePath}`)
        return helperExePath
      }
    }
  } catch (error) {
    coworkLog(
      'WARN',
      'resolveNodeShim',
      `Failed to resolve Electron helper runtime: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  return process.execPath
}

// 获取并缓存 Electron Node 运行时路径。
export function getElectronNodeRuntimePath(): string {
  if (!cachedElectronNodeRuntimePath) {
    cachedElectronNodeRuntimePath = resolveElectronNodeRuntimePath()
  }
  return cachedElectronNodeRuntimePath
}

/**
 * 用户登录 shell 的 PATH 缓存（首次解析后复用）。
 */
let cachedUserShellPath: string | null | undefined

/**
 * 解析 macOS/Linux 下用户登录 shell 的 PATH。
 * 打包后的 Electron 应用通常不会继承用户 shell 配置，
 * 需要主动解析以确保 node/npm 等工具可用。
 */
function resolveUserShellPath(): string | null {
  if (cachedUserShellPath !== undefined) return cachedUserShellPath

  if (process.platform === 'win32') {
    cachedUserShellPath = null
    return null
  }

  try {
    const shell = process.env.SHELL || '/bin/bash'
    // 优先使用非交互登录 shell，避免交互启动脚本副作用（如拉起 GUI 进程）。
    const pathProbes = [`${shell} -lc 'echo __PATH__=$PATH'`]

    let resolved: string | null = null
    for (const probe of pathProbes) {
      try {
        const result = execSync(probe, {
          encoding: 'utf-8',
          timeout: 5000,
          env: { ...process.env }
        })
        const match = result.match(/__PATH__=(.+)/)
        if (match?.[1]) {
          resolved = match[1].trim()
          break
        }
      } catch {
        // 当前探测失败，继续下一个。
      }
    }
    cachedUserShellPath = resolved
  } catch (error) {
    console.warn('[coworkUtil] Failed to resolve user shell PATH:', error)
    cachedUserShellPath = null
  }

  return cachedUserShellPath
}

/**
 * Windows 注册表 PATH 缓存（首次解析后复用）。
 */
let cachedWindowsRegistryPath: string | null | undefined

// 读取指定注册表键中的 Path 值。
function readWindowsRegistryPathValue(registryKey: string): string {
  try {
    const output = execSync(`reg query "${registryKey}" /v Path`, {
      encoding: 'utf-8',
      timeout: 8000,
      windowsHide: true
    })

    for (const line of output.split(/\r?\n/)) {
      const match = line.match(/^\s*Path\s+REG_\w+\s+(.+)$/i)
      if (match?.[1]) {
        return match[1].trim()
      }
    }
  } catch {
    // 忽略键不存在或权限不足导致的读取失败。
  }

  return ''
}

/**
 * 读取 Windows 注册表中的最新 PATH（机器级 + 用户级）。
 *
 * 从开始菜单/桌面快捷方式启动的 Electron 应用，可能继承到过期 PATH。
 * 该函数直接读取注册表，获取比 process.env.PATH 更实时的路径集合。
 */
function resolveWindowsRegistryPath(): string | null {
  if (cachedWindowsRegistryPath !== undefined) return cachedWindowsRegistryPath

  if (process.platform !== 'win32') {
    cachedWindowsRegistryPath = null
    return null
  }

  try {
    const machinePath = readWindowsRegistryPathValue('HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment')
    const userPath = readWindowsRegistryPathValue('HKCU\\Environment')
    const registryPath = [machinePath, userPath].filter(Boolean).join(';')
    if (registryPath.trim()) {
      // 去重并剔除空项。
      const entries = registryPath
        .split(';')
        .map((entry) => entry.trim())
        .filter(Boolean)
      const unique = Array.from(new Set(entries))
      cachedWindowsRegistryPath = unique.join(';')
      coworkLog('INFO', 'resolveWindowsRegistryPath', `Resolved ${unique.length} PATH entries from Windows registry`)
    } else {
      cachedWindowsRegistryPath = null
    }
  } catch (error) {
    coworkLog(
      'WARN',
      'resolveWindowsRegistryPath',
      `Failed to read PATH from Windows registry: ${error instanceof Error ? error.message : String(error)}`
    )
    cachedWindowsRegistryPath = null
  }

  return cachedWindowsRegistryPath
}

/**
 * 将当前进程 PATH 与注册表 PATH 合并（Windows）。
 *
 * 采用“追加缺失项”策略，保留当前环境中已有优先级覆盖。
 */
function ensureWindowsRegistryPathEntries(env: Record<string, string | undefined>): void {
  const registryPath = resolveWindowsRegistryPath()
  if (!registryPath) return

  const currentPath = env.PATH || ''
  const currentEntriesLower = new Set(currentPath.split(delimiter).map((entry) => entry.toLowerCase().replace(/\\$/, '')))

  const missingEntries: string[] = []
  for (const entry of registryPath.split(';')) {
    const trimmed = entry.trim()
    if (!trimmed) continue
    // 比较前统一格式：去除末尾反斜杠。
    const normalizedLower = trimmed.toLowerCase().replace(/\\$/, '')
    if (!currentEntriesLower.has(normalizedLower)) {
      missingEntries.push(trimmed)
      currentEntriesLower.add(normalizedLower) // prevent duplicates within registry entries
    }
  }

  if (missingEntries.length > 0) {
    // 将注册表缺失项追加到末尾，避免覆盖现有路径优先级（如 Git/shim）。
    env.PATH = currentPath ? `${currentPath}${delimiter}${missingEntries.join(delimiter)}` : missingEntries.join(delimiter)
    coworkLog(
      'INFO',
      'ensureWindowsRegistryPathEntries',
      `Appended ${missingEntries.length} missing PATH entries from Windows registry: ${missingEntries.join(', ')}`
    )
  }
}

/**
 * Windows git-bash 路径缓存（首次解析后复用）。
 */
let cachedGitBashPath: string | null | undefined
let cachedGitBashResolutionError: string | null | undefined

// 规范化 Windows 路径文本（去引号、统一分隔符）。
function normalizeWindowsPath(input: string | undefined): string | null {
  if (!input) return null
  const trimmed = input.trim().replace(/\r/g, '')
  if (!trimmed) return null

  const unquoted = trimmed.replace(/^["']+|["']+$/g, '')
  if (!unquoted) return null

  return unquoted.replace(/\//g, '\\')
}

// 执行 where 命令并返回存在的可执行路径列表。
function listWindowsCommandPaths(command: string): string[] {
  try {
    const output = execSync(command, { encoding: 'utf-8', timeout: 5000 })
    const parsed = output
      .split(/\r?\n/)
      .map((line) => normalizeWindowsPath(line))
      .filter((line): line is string => Boolean(line && existsSync(line)))
    return Array.from(new Set(parsed))
  } catch {
    return []
  }
}

// 从注册表枚举 Git for Windows 安装目录。
function listGitInstallPathsFromRegistry(): string[] {
  const registryKeys = ['HKCU\\Software\\GitForWindows', 'HKLM\\Software\\GitForWindows', 'HKLM\\Software\\WOW6432Node\\GitForWindows']

  const installRoots: string[] = []

  for (const key of registryKeys) {
    try {
      const output = execSync(`reg query "${key}" /v InstallPath`, { encoding: 'utf-8', timeout: 5000 })
      for (const line of output.split(/\r?\n/)) {
        const match = line.match(/InstallPath\s+REG_\w+\s+(.+)$/i)
        const root = normalizeWindowsPath(match?.[1])
        if (root) {
          installRoots.push(root)
        }
      }
    } catch {
      // 注册表键可能不存在。
    }
  }

  return Array.from(new Set(installRoots))
}

// 获取内置 PortableGit 的 bash 候选路径。
function getBundledGitBashCandidates(): string[] {
  const bundledRoots = app.isPackaged
    ? [join(process.resourcesPath, 'mingit')]
    : [join(__dirname, '..', '..', 'resources', 'mingit'), join(process.cwd(), 'resources', 'mingit')]

  const candidates: string[] = []
  for (const root of bundledRoots) {
    // 优先使用 bin/bash.exe；直接调用 usr/bin/bash.exe 可能缺失 Git 工具链 PATH。
    candidates.push(join(root, 'bin', 'bash.exe'))
    candidates.push(join(root, 'usr', 'bin', 'bash.exe'))
  }

  return candidates
}

// 检查指定 git-bash 是否健康可用。
function checkWindowsGitBashHealth(bashPath: string): { ok: boolean; reason?: string } {
  try {
    if (!existsSync(bashPath)) {
      return { ok: false, reason: 'path does not exist' }
    }

    // 健康检查使用最小环境，避免 BASH_ENV/MSYS2_PATH_TYPE 等变量干扰启动。
    // 仅传入 PATH + SYSTEMROOT（DLL 加载所需）+ HOME。
    const healthEnv: Record<string, string> = {
      PATH: process.env.PATH || '',
      SYSTEMROOT: process.env.SYSTEMROOT || process.env.SystemRoot || 'C:\\Windows',
      HOME: process.env.HOME || process.env.USERPROFILE || ''
    }

    // 先用非登录 shell 提速；登录 shell 需要加载 /etc/profile，可能较慢。
    // cygpath 本身为独立二进制，通常不依赖登录 shell。
    const fastResult = spawnSync(bashPath, ['-c', 'cygpath -u "C:\\\\Windows"'], {
      encoding: 'utf-8',
      timeout: 5000,
      windowsHide: true,
      env: healthEnv
    })

    const result =
      fastResult.error || (typeof fastResult.status === 'number' && fastResult.status !== 0)
        ? // 非登录 shell 失败时，退回登录 shell 并延长超时。
          // 某些 Git Bash 发行版需要登录过程初始化 PATH 才能找到 cygpath。
          spawnSync(bashPath, ['-lc', 'cygpath -u "C:\\\\Windows"'], {
            encoding: 'utf-8',
            timeout: 15000,
            windowsHide: true,
            env: healthEnv
          })
        : fastResult

    if (result.error) {
      return { ok: false, reason: result.error.message }
    }

    if (typeof result.status === 'number' && result.status !== 0) {
      const stderr = (result.stderr || '').trim()
      const stdout = (result.stdout || '').trim()
      return {
        ok: false,
        reason: `exit ${result.status}${stderr ? `, stderr: ${stderr}` : ''}${stdout ? `, stdout: ${stdout}` : ''}`
      }
    }

    const stdout = (result.stdout || '').trim()
    const stderr = (result.stderr || '').trim()
    const lines = stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
    const lastNonEmptyLine = lines.length > 0 ? lines[lines.length - 1] : ''

    // 某些 Git Bash 在真实输出前会打印运行告警（如缺失 /dev/shm）。
    // 仅要求最后一个非空行是合法 POSIX 路径即可判定通过。
    if (!/^\/[a-zA-Z]\//.test(lastNonEmptyLine)) {
      const diagnosticStdout = truncateDiagnostic(stdout || '(empty)')
      const diagnosticStderr = stderr ? `, stderr: ${truncateDiagnostic(stderr)}` : ''
      return { ok: false, reason: `unexpected cygpath output: ${diagnosticStdout}${diagnosticStderr}` }
    }

    return { ok: true }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) }
  }
}

// 截断诊断信息，避免日志过长。
function truncateDiagnostic(message: string, maxLength = 500): string {
  if (message.length <= maxLength) return message
  return `${message.slice(0, maxLength - 3)}...`
}

// 基于 bash 路径推断 Git 相关工具目录。
function getWindowsGitToolDirs(bashPath: string): string[] {
  const normalized = bashPath.replace(/\//g, '\\')
  const lower = normalized.toLowerCase()
  let gitRoot: string | null = null

  if (lower.endsWith('\\usr\\bin\\bash.exe')) {
    gitRoot = normalized.slice(0, -'\\usr\\bin\\bash.exe'.length)
  } else if (lower.endsWith('\\bin\\bash.exe')) {
    gitRoot = normalized.slice(0, -'\\bin\\bash.exe'.length)
  }

  if (!gitRoot) {
    const bashDir = dirname(normalized)
    return [bashDir].filter((dir) => existsSync(dir))
  }

  const candidates = [join(gitRoot, 'cmd'), join(gitRoot, 'mingw64', 'bin'), join(gitRoot, 'usr', 'bin'), join(gitRoot, 'bin')]

  return candidates.filter((dir) => existsSync(dir))
}

// 生成 Electron Node 运行时 shim（node/npm/npx）。
function ensureElectronNodeShim(electronPath: string, npmBinDir?: string): string | null {
  try {
    const shimDir = join(app.getPath('userData'), 'cowork', 'bin')
    mkdirSync(shimDir, { recursive: true })
    coworkLog('INFO', 'resolveNodeShim', `Shim directory: ${shimDir}, electronPath: ${electronPath}, npmBinDir: ${npmBinDir || '(none)'}`)

    // --- node shim ---
    // shell 脚本版本（macOS/Linux/Windows git-bash）。
    const nodeSh = join(shimDir, 'node')
    const nodeShContent = [
      '#!/usr/bin/env bash',
      'if [ -z "${LOBSTERAI_ELECTRON_PATH:-}" ]; then',
      '  echo "LOBSTERAI_ELECTRON_PATH is not set" >&2',
      '  exit 127',
      'fi',
      'exec env ELECTRON_RUN_AS_NODE=1 "${LOBSTERAI_ELECTRON_PATH}" "$@"',
      ''
    ].join('\n')

    writeFileSync(nodeSh, nodeShContent, 'utf8')
    try {
      chmodSync(nodeSh, 0o755)
    } catch {
      // 忽略不支持 POSIX 权限位的文件系统报错。
    }
    coworkLog('INFO', 'resolveNodeShim', `Created node bash shim: ${nodeSh}`)

    // Windows 下额外生成 .cmd 包装器。
    if (process.platform === 'win32') {
      const nodeCmd = join(shimDir, 'node.cmd')
      const nodeCmdContent = [
        '@echo off',
        'if "%LOBSTERAI_ELECTRON_PATH%"=="" (',
        '  echo LOBSTERAI_ELECTRON_PATH is not set 1>&2',
        '  exit /b 127',
        ')',
        'set ELECTRON_RUN_AS_NODE=1',
        '"%LOBSTERAI_ELECTRON_PATH%" %*',
        ''
      ].join('\r\n')
      writeFileSync(nodeCmd, nodeCmdContent, 'utf8')
      coworkLog('INFO', 'resolveNodeShim', `Created node.cmd shim: ${nodeCmd}`)
    }

    // --- npx / npm shims ---
    // 通过上面的 node shim 调用 npm 包内 npx-cli.js/npm-cli.js，
    // 避免依赖 Windows 下不稳定的 node_modules/.bin 软链接。
    if (npmBinDir && existsSync(npmBinDir)) {
      const npxCliJs = join(npmBinDir, 'npx-cli.js')
      const npmCliJs = join(npmBinDir, 'npm-cli.js')

      // 为 Windows git-bash 脚本转换为 POSIX 路径。
      const npxCliJsPosix = npxCliJs.replace(/\\/g, '/')
      const npmCliJsPosix = npmCliJs.replace(/\\/g, '/')

      coworkLog(
        'INFO',
        'resolveNodeShim',
        `npmBinDir exists: true, npx-cli.js exists: ${existsSync(npxCliJs)}, npm-cli.js exists: ${existsSync(npmCliJs)}`
      )

      if (existsSync(npxCliJs)) {
        // npx 的 bash shim。
        const npxSh = join(shimDir, 'npx')
        const npxShContent = [
          '#!/usr/bin/env bash',
          'SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"',
          `exec "$SCRIPT_DIR/node" "${npxCliJsPosix}" "$@"`,
          ''
        ].join('\n')
        writeFileSync(npxSh, npxShContent, 'utf8')
        try {
          chmodSync(npxSh, 0o755)
        } catch {
          /* ignore */
        }
        coworkLog('INFO', 'resolveNodeShim', `Created npx bash shim: ${npxSh} -> ${npxCliJsPosix}`)

        // Windows npx.cmd：使用环境变量避免硬编码非 ASCII 路径（GBK cmd 下易异常）。
        if (process.platform === 'win32') {
          const npxCmd = join(shimDir, 'npx.cmd')
          const npxCmdContent = ['@echo off', '"%~dp0node.cmd" "%LOBSTERAI_NPM_BIN_DIR%\\npx-cli.js" %*', ''].join('\r\n')
          writeFileSync(npxCmd, npxCmdContent, 'utf8')
          coworkLog('INFO', 'resolveNodeShim', `Created npx.cmd shim: ${npxCmd} (using env var LOBSTERAI_NPM_BIN_DIR)`)
        }
      } else {
        coworkLog('WARN', 'resolveNodeShim', `npx-cli.js not found at: ${npxCliJs}`)
      }

      if (existsSync(npmCliJs)) {
        // npm bash shim
        const npmSh = join(shimDir, 'npm')
        const npmShContent = [
          '#!/usr/bin/env bash',
          'SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"',
          `exec "$SCRIPT_DIR/node" "${npmCliJsPosix}" "$@"`,
          ''
        ].join('\n')
        writeFileSync(npmSh, npmShContent, 'utf8')
        try {
          chmodSync(npmSh, 0o755)
        } catch {
          /* 忽略权限设置异常 */
        }
        coworkLog('INFO', 'resolveNodeShim', `Created npm bash shim: ${npmSh} -> ${npmCliJsPosix}`)

        // Windows npm.cmd：使用环境变量避免硬编码非 ASCII 路径（GBK cmd 下易异常）。
        if (process.platform === 'win32') {
          const npmCmd = join(shimDir, 'npm.cmd')
          const npmCmdContent = ['@echo off', '"%~dp0node.cmd" "%LOBSTERAI_NPM_BIN_DIR%\\npm-cli.js" %*', ''].join('\r\n')
          writeFileSync(npmCmd, npmCmdContent, 'utf8')
          coworkLog('INFO', 'resolveNodeShim', `Created npm.cmd shim: ${npmCmd} (using env var LOBSTERAI_NPM_BIN_DIR)`)
        }
      } else {
        coworkLog('WARN', 'resolveNodeShim', `npm-cli.js not found at: ${npmCliJs}`)
      }

      coworkLog('INFO', 'resolveNodeShim', `Created npx/npm shims pointing to: ${npmBinDir}`)
    } else {
      coworkLog(
        'WARN',
        'resolveNodeShim',
        `npmBinDir not available: ${npmBinDir || '(not provided)'}, exists: ${npmBinDir ? existsSync(npmBinDir) : 'N/A'}`
      )
    }

    // 校验 shim 文件是否存在且可执行。
    const shimFiles = ['node', 'npx', 'npm']
    for (const name of shimFiles) {
      const shimPath = join(shimDir, name)
      const exists = existsSync(shimPath)
      if (exists) {
        try {
          const stat = statSync(shimPath)
          coworkLog('INFO', 'resolveNodeShim', `Shim verify: ${name} exists, mode=0o${stat.mode.toString(8)}, size=${stat.size}`)
        } catch (e) {
          coworkLog('WARN', 'resolveNodeShim', `Shim verify: ${name} exists but stat failed: ${e instanceof Error ? e.message : String(e)}`)
        }
      } else {
        coworkLog('WARN', 'resolveNodeShim', `Shim verify: ${name} NOT found at ${shimPath}`)
      }
    }

    return shimDir
  } catch (error) {
    coworkLog('WARN', 'resolveNodeShim', `Failed to prepare Electron Node shim: ${error instanceof Error ? error.message : String(error)}`)
    return null
  }
}

/**
 * 解析 Windows 下 git-bash 路径。
 * 优先级：环境变量覆盖 > 内置 PortableGit > 已安装 Git > PATH 查询。
 * 候选路径均需通过健康检查后才会启用。
 */
function resolveWindowsGitBashPath(): string | null {
  if (cachedGitBashPath !== undefined) return cachedGitBashPath

  if (process.platform !== 'win32') {
    cachedGitBashPath = null
    cachedGitBashResolutionError = null
    return null
  }

  const candidates: Array<{ path: string; source: string }> = []
  const seen = new Set<string>()
  const failedCandidates: string[] = []

  const pushCandidate = (candidatePath: string | null, source: string): void => {
    if (!candidatePath) return
    const normalized = normalizeWindowsPath(candidatePath)
    if (!normalized) return
    const key = normalized.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    candidates.push({ path: normalized, source })
  }

  // 1. 显式环境变量覆盖。
  pushCandidate(process.env.CLAUDE_CODE_GIT_BASH_PATH ?? null, 'env:CLAUDE_CODE_GIT_BASH_PATH')

  // 2. 内置 PortableGit（LobsterAI 默认优先）。
  for (const bundledCandidate of getBundledGitBashCandidates()) {
    pushCandidate(bundledCandidate, 'bundled:resources/mingit')
  }

  // 3. 常见 Git for Windows 安装路径。
  const programFiles = process.env.ProgramFiles || 'C:\\Program Files'
  const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'
  const localAppData = process.env.LOCALAPPDATA || ''
  const userProfile = process.env.USERPROFILE || ''

  const installCandidates = [
    join(programFiles, 'Git', 'bin', 'bash.exe'),
    join(programFiles, 'Git', 'usr', 'bin', 'bash.exe'),
    join(programFilesX86, 'Git', 'bin', 'bash.exe'),
    join(programFilesX86, 'Git', 'usr', 'bin', 'bash.exe'),
    join(localAppData, 'Programs', 'Git', 'bin', 'bash.exe'),
    join(localAppData, 'Programs', 'Git', 'usr', 'bin', 'bash.exe'),
    join(userProfile, 'scoop', 'apps', 'git', 'current', 'bin', 'bash.exe'),
    join(userProfile, 'scoop', 'apps', 'git', 'current', 'usr', 'bin', 'bash.exe'),
    'C:\\Git\\bin\\bash.exe',
    'C:\\Git\\usr\\bin\\bash.exe'
  ]

  for (const installCandidate of installCandidates) {
    pushCandidate(installCandidate, 'installed:common-paths')
  }

  // 4. 从注册表查询 Git 安装根路径。
  const registryInstallRoots = listGitInstallPathsFromRegistry()
  for (const installRoot of registryInstallRoots) {
    const registryCandidates = [join(installRoot, 'bin', 'bash.exe'), join(installRoot, 'usr', 'bin', 'bash.exe')]
    for (const registryCandidate of registryCandidates) {
      pushCandidate(registryCandidate, `registry:${installRoot}`)
    }
  }

  // 5. 尝试 `where bash`。
  const bashPaths = listWindowsCommandPaths('where bash')
  for (const bashPath of bashPaths) {
    if (bashPath.toLowerCase().endsWith('\\bash.exe')) {
      pushCandidate(bashPath, 'path:where bash')
    }
  }

  // 6. 尝试 `where git`，并从 git 路径反推 bash。
  const gitPaths = listWindowsCommandPaths('where git')
  for (const gitPath of gitPaths) {
    const gitRoot = dirname(dirname(gitPath))
    const bashCandidates = [join(gitRoot, 'bin', 'bash.exe'), join(gitRoot, 'usr', 'bin', 'bash.exe')]
    for (const bashCandidate of bashCandidates) {
      pushCandidate(bashCandidate, `path:where git (${gitPath})`)
    }
  }

  for (const candidate of candidates) {
    if (!existsSync(candidate.path)) {
      continue
    }

    const health = checkWindowsGitBashHealth(candidate.path)
    if (health.ok) {
      coworkLog('INFO', 'resolveGitBash', `Selected git-bash (${candidate.source}): ${candidate.path}`)
      cachedGitBashPath = candidate.path
      cachedGitBashResolutionError = null
      return candidate.path
    }

    const failure = `${candidate.path} [${candidate.source}] failed health check (${health.reason || 'unknown reason'})`
    failedCandidates.push(failure)
    coworkLog('WARN', 'resolveGitBash', failure)
  }

  const diagnostic =
    failedCandidates.length > 0
      ? `No healthy git-bash found. Failures: ${failedCandidates.join('; ')}`
      : 'No git-bash candidates found on this system'
  coworkLog('WARN', 'resolveGitBash', diagnostic)
  cachedGitBashPath = null
  cachedGitBashResolutionError = truncateDiagnostic(diagnostic)
  return null
}

/**
 * Windows 内置命令依赖的系统目录，需确保存在于 PATH。
 */
const WINDOWS_SYSTEM_PATH_ENTRIES = ['System32', 'System32\\Wbem', 'System32\\WindowsPowerShell\\v1.0', 'System32\\OpenSSH']

/**
 * 某些系统命令与 DLL 依赖的关键 Windows 环境变量。
 */
const WINDOWS_CRITICAL_ENV_VARS: Record<string, () => string | undefined> = {
  SystemRoot: () => process.env.SystemRoot || process.env.SYSTEMROOT || 'C:\\windows',
  windir: () => process.env.windir || process.env.WINDIR || process.env.SystemRoot || process.env.SYSTEMROOT || 'C:\\windows',
  COMSPEC: () => process.env.COMSPEC || process.env.comspec || 'C:\\windows\\system32\\cmd.exe',
  SYSTEMDRIVE: () => process.env.SYSTEMDRIVE || process.env.SystemDrive || 'C:'
}

/**
 * 确保关键 Windows 系统环境变量存在。
 * 缺失时可能导致系统命令无法定位资源，进而在 shell 快照中表现为隐性失败。
 */
function ensureWindowsSystemEnvVars(env: Record<string, string | undefined>): void {
  const injected: string[] = []

  for (const [key, resolver] of Object.entries(WINDOWS_CRITICAL_ENV_VARS)) {
    // 同时考虑大小写差异（Windows 环境变量不区分大小写）。
    if (!env[key]) {
      const value = resolver()
      if (value) {
        env[key] = value
        injected.push(`${key}=${value}`)
      }
    }
  }

  if (injected.length > 0) {
    coworkLog('INFO', 'ensureWindowsSystemEnvVars', `Injected missing Windows system env vars: ${injected.join(', ')}`)
  }
}

/**
 * 确保 Windows 系统目录（如 System32）存在于 PATH。
 * 防止 shell 快照阶段因 PATH 缺失导致系统命令不可用。
 */
function ensureWindowsSystemPathEntries(env: Record<string, string | undefined>): void {
  const systemRoot = env.SystemRoot || env.SYSTEMROOT || 'C:\\windows'
  const currentPath = env.PATH || ''
  const currentEntries = currentPath.split(delimiter).map((entry) => entry.toLowerCase())

  const missingDirs: string[] = []
  for (const relDir of WINDOWS_SYSTEM_PATH_ENTRIES) {
    const fullDir = join(systemRoot, relDir)
    if (!currentEntries.includes(fullDir.toLowerCase()) && existsSync(fullDir)) {
      missingDirs.push(fullDir)
    }
  }

  // 同时确保 systemRoot 本身（如 C:\windows）存在于 PATH。
  if (!currentEntries.includes(systemRoot.toLowerCase()) && existsSync(systemRoot)) {
    missingDirs.push(systemRoot)
  }

  if (missingDirs.length > 0) {
    // 追加到末尾，避免覆盖用户工具优先级。
    env.PATH = currentPath ? `${currentPath}${delimiter}${missingDirs.join(delimiter)}` : missingDirs.join(delimiter)
    coworkLog('INFO', 'ensureWindowsSystemPathEntries', `Appended missing Windows system PATH entries: ${missingDirs.join(', ')}`)
  }
}

/**
 * 确保非登录 git-bash 调用也能解析核心 MSYS 命令。
 * 通过在 PATH 前缀注入 /usr/bin:/bin，规避 cygpath 查找失败。
 */
function ensureWindowsBashBootstrapPath(env: Record<string, string | undefined>): void {
  const currentPath = env.PATH || ''
  if (!currentPath) return

  const bootstrapToken = '/usr/bin:/bin'
  const entries = currentPath
    .split(delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean)
  if (entries.some((entry) => entry === bootstrapToken)) {
    return
  }

  env.PATH = `${bootstrapToken}${delimiter}${currentPath}`
  coworkLog('INFO', 'ensureWindowsBashBootstrapPath', `Prepended bash bootstrap PATH token: ${bootstrapToken}`)
}

/**
 * 将单个 Windows 路径转换为 MSYS2/POSIX 形式。
 * 预转换可降低非 ASCII 路径在编码初始化阶段被破坏的风险。
 */
function singleWindowsPathToPosix(windowsPath: string): string {
  if (!windowsPath) return windowsPath
  const driveMatch = windowsPath.match(/^([A-Za-z]):[/\\](.*)/)
  if (driveMatch) {
    const driveLetter = driveMatch[1].toLowerCase()
    const rest = driveMatch[2].replace(/\\/g, '/').replace(/\/+$/, '')
    return `/${driveLetter}${rest ? '/' + rest : ''}`
  }
  return windowsPath.replace(/\\/g, '/')
}

/**
 * 将 Windows 风格 PATH 转为 MSYS2/POSIX 风格。
 * 避免 semicolon 与 colon 混用导致 bash 将整段 PATH 误识别为单一路径项。
 */
function convertWindowsPathToMsys(windowsPath: string): string {
  if (!windowsPath) return windowsPath

  const entries = windowsPath.split(';').filter(Boolean)
  const converted: string[] = []

  for (const entry of entries) {
    const trimmed = entry.trim()
    if (!trimmed) continue

    // Windows 路径转 POSIX：C:\foo\bar -> /c/foo/bar。
    const driveMatch = trimmed.match(/^([A-Za-z]):[/\\](.*)/)
    if (driveMatch) {
      const driveLetter = driveMatch[1].toLowerCase()
      const rest = driveMatch[2].replace(/\\/g, '/').replace(/\/+$/, '')
      converted.push(`/${driveLetter}${rest ? '/' + rest : ''}`)
    } else if (trimmed.startsWith('/')) {
      // 已是 POSIX 风格。
      converted.push(trimmed)
    } else {
      // 相对路径或未知格式：仅做分隔符转换。
      converted.push(trimmed.replace(/\\/g, '/'))
    }
  }

  return converted.join(':')
}

/**
 * 预先写入 POSIX 格式 ORIGINAL_PATH，供 git-bash /etc/profile 继承。
 */
function ensureWindowsOriginalPath(env: Record<string, string | undefined>): void {
  const currentPath = env.PATH || ''
  if (!currentPath) return

  const posixPath = convertWindowsPathToMsys(currentPath)
  env.ORIGINAL_PATH = posixPath
  coworkLog('INFO', 'ensureWindowsOriginalPath', `Set ORIGINAL_PATH with ${posixPath.split(':').length} POSIX-format entries`)
}

/**
 * 生成 bash 初始化脚本，将 Windows 控制台代码页切换到 UTF-8（65001）。
 */
function ensureWindowsBashUtf8InitScript(): string | null {
  try {
    const initDir = join(app.getPath('userData'), 'cowork', 'bin')
    mkdirSync(initDir, { recursive: true })

    const initScript = join(initDir, 'bash_utf8_init.sh')
    const content = [
      '#!/usr/bin/env bash',
      '# Auto-generated by LobsterAI – switch Windows console code page to UTF-8',
      '# to prevent garbled output from Windows native commands.',
      'if command -v chcp.com >/dev/null 2>&1; then',
      '  chcp.com 65001 >/dev/null 2>&1',
      'fi',
      ''
    ].join('\n')

    writeFileSync(initScript, content, 'utf8')
    try {
      chmodSync(initScript, 0o755)
    } catch {
      // Ignore chmod errors on file systems that do not support POSIX modes.
    }

    return initScript
  } catch (error) {
    coworkLog(
      'WARN',
      'ensureWindowsBashUtf8InitScript',
      `Failed to create bash UTF-8 init script: ${error instanceof Error ? error.message : String(error)}`
    )
    return null
  }
}

// 在打包/开发场景下统一注入协作运行所需环境变量。
function applyPackagedEnvOverrides(env: Record<string, string | undefined>): void {
  const electronNodeRuntimePath = getElectronNodeRuntimePath()

  if (app.isPackaged && !env.LOBSTERAI_ELECTRON_PATH) {
    env.LOBSTERAI_ELECTRON_PATH = electronNodeRuntimePath
  }

  // Windows：解析 git-bash 并确保 Git 工具链目录进入 PATH。
  if (process.platform === 'win32') {
    env.LOBSTERAI_ELECTRON_PATH = electronNodeRuntimePath

    // 强制 MSYS2/git-bash 使用 UTF-8，避免中文 Windows 下乱码。
    if (!env.LANG) {
      env.LANG = 'C.UTF-8'
    }
    if (!env.LC_ALL) {
      env.LC_ALL = 'C.UTF-8'
    }

    // 强制 Python 进入 UTF-8 模式，避免 stdin/stdout/file I/O 编码错配。
    if (!env.PYTHONUTF8) {
      env.PYTHONUTF8 = '1'
    }
    if (!env.PYTHONIOENCODING) {
      env.PYTHONIOENCODING = 'utf-8'
    }

    // 强制 less/git pager 使用 UTF-8。
    if (!env.LESSCHARSET) {
      env.LESSCHARSET = 'utf-8'
    }

    // 通过 BASH_ENV 注入初始化脚本，在每次非交互 bash 执行前切换代码页到 UTF-8。
    if (!env.BASH_ENV) {
      const initScript = ensureWindowsBashUtf8InitScript()
      if (initScript) {
        // 转为 POSIX 路径，降低非 ASCII 路径在初始化阶段的编码风险。
        env.BASH_ENV = singleWindowsPathToPosix(initScript)
        coworkLog('INFO', 'applyPackagedEnvOverrides', `Set BASH_ENV for UTF-8 console code page: ${env.BASH_ENV}`)
      }
    }

    // 保证关键系统环境变量存在，避免系统命令执行失败。
    ensureWindowsSystemEnvVars(env)

    // 保证 System32 等系统目录存在于 PATH。
    ensureWindowsSystemPathEntries(env)

    // 合并注册表中的最新 PATH，修复 Explorer 派生进程 PATH 过期问题。
    ensureWindowsRegistryPathEntries(env)

    const configuredBashPath = normalizeWindowsPath(env.CLAUDE_CODE_GIT_BASH_PATH)
    let bashPath = configuredBashPath && existsSync(configuredBashPath) ? configuredBashPath : resolveWindowsGitBashPath()

    if (configuredBashPath && bashPath === configuredBashPath) {
      const configuredHealth = checkWindowsGitBashHealth(configuredBashPath)
      if (!configuredHealth.ok) {
        const fallbackPath = resolveWindowsGitBashPath()
        if (fallbackPath && fallbackPath !== configuredBashPath) {
          coworkLog(
            'WARN',
            'resolveGitBash',
            `Configured bash is unhealthy (${configuredBashPath}): ${configuredHealth.reason || 'unknown reason'}. Falling back to: ${fallbackPath}`
          )
          bashPath = fallbackPath
        } else {
          const diagnostic = truncateDiagnostic(
            `Configured bash is unhealthy (${configuredBashPath}): ${configuredHealth.reason || 'unknown reason'}`
          )
          env.LOBSTERAI_GIT_BASH_RESOLUTION_ERROR = diagnostic
          coworkLog('WARN', 'resolveGitBash', diagnostic)
          bashPath = null
        }
      }
    }

    if (bashPath) {
      env.CLAUDE_CODE_GIT_BASH_PATH = bashPath
      delete env.LOBSTERAI_GIT_BASH_RESOLUTION_ERROR
      coworkLog('INFO', 'resolveGitBash', `Using Windows git-bash: ${bashPath}`)
      const gitToolDirs = getWindowsGitToolDirs(bashPath)
      env.PATH = appendEnvPath(env.PATH, gitToolDirs)
      coworkLog('INFO', 'resolveGitBash', `Injected Windows Git toolchain PATH entries: ${gitToolDirs.join(', ')}`)
      ensureWindowsBashBootstrapPath(env)
    } else {
      const diagnostic = cachedGitBashResolutionError || 'git-bash not found or failed health checks'
      env.LOBSTERAI_GIT_BASH_RESOLUTION_ERROR = truncateDiagnostic(diagnostic)
    }

    appendPythonRuntimeToEnv(env)

    // 让 git-bash 继承父进程 PATH，避免 /etc/profile 重建最小 PATH 丢失用户工具路径。
    if (!env.MSYS2_PATH_TYPE) {
      env.MSYS2_PATH_TYPE = 'inherit'
      coworkLog('INFO', 'applyPackagedEnvOverrides', 'Set MSYS2_PATH_TYPE=inherit to preserve PATH in git-bash')
    }

    // 预设 POSIX 格式 ORIGINAL_PATH，修复 Windows PATH 分隔符导致的 bash 解析异常。
    ensureWindowsOriginalPath(env)
  }

  if (!app.isPackaged) {
    // 开发模式：前置 node_modules/.bin，确保无全局 Node 时也可找到 npx/npm。
    const devBinDir = join(app.getAppPath(), 'node_modules', '.bin')
    if (existsSync(devBinDir)) {
      env.PATH = [devBinDir, env.PATH].filter(Boolean).join(delimiter)
      coworkLog('INFO', 'applyPackagedEnvOverrides', `Dev mode: prepended node_modules/.bin to PATH: ${devBinDir}`)
    }
    return
  }

  if (!env.HOME) {
    env.HOME = app.getPath('home')
  }

  // 解析用户 shell PATH，确保 node/npm 等工具可被找到。
  const userPath = resolveUserShellPath()
  if (userPath) {
    env.PATH = userPath
    coworkLog('INFO', 'applyPackagedEnvOverrides', `Resolved user shell PATH (${userPath.split(delimiter).length} entries)`)
    for (const entry of userPath.split(delimiter)) {
      coworkLog('INFO', 'applyPackagedEnvOverrides', `  PATH entry: ${entry} (exists: ${existsSync(entry)})`)
    }
  } else {
    // 回退策略：追加常见 Node 安装路径。
    const home = env.HOME || app.getPath('home')
    const commonPaths = [
      '/usr/local/bin',
      '/opt/homebrew/bin',
      `${home}/.nvm/current/bin`,
      `${home}/.volta/bin`,
      `${home}/.fnm/current/bin`
    ]
    env.PATH = [env.PATH, ...commonPaths].filter(Boolean).join(delimiter)
    coworkLog('WARN', 'applyPackagedEnvOverrides', `Failed to resolve user shell PATH, using fallback common paths`)
  }

  const resourcesPath = process.resourcesPath
  coworkLog('INFO', 'applyPackagedEnvOverrides', `Packaged mode: resourcesPath=${resourcesPath}`)

  // 生成 node/npx/npm shim，通过 ELECTRON_RUN_AS_NODE=1 复用 Electron 运行时。
  const npmBinDir = join(resourcesPath, 'app.asar.unpacked', 'node_modules', 'npm', 'bin')
  coworkLog('INFO', 'applyPackagedEnvOverrides', `npmBinDir=${npmBinDir}, exists=${existsSync(npmBinDir)}`)

  // 设置环境变量供 .cmd shim 引用 npmBinDir，避免硬编码非 ASCII 路径。
  env.LOBSTERAI_NPM_BIN_DIR = npmBinDir

  const hasSystemNode = hasCommandInEnv('node', env)
  const hasSystemNpx = hasCommandInEnv('npx', env)
  const hasSystemNpm = hasCommandInEnv('npm', env)
  const shouldInjectShim = process.platform === 'win32' || !(hasSystemNode && hasSystemNpx && hasSystemNpm)
  if (shouldInjectShim) {
    const shimDir = ensureElectronNodeShim(electronNodeRuntimePath, npmBinDir)
    if (shimDir) {
      env.PATH = [shimDir, env.PATH].filter(Boolean).join(delimiter)
      env.LOBSTERAI_NODE_SHIM_ACTIVE = '1'
      coworkLog('INFO', 'resolveNodeShim', `Injected Electron Node/npx/npm shim PATH entry: ${shimDir}`)

      // shim 注入后重算 ORIGINAL_PATH，保证 git-bash 可见 node/npx/npm。
      if (process.platform === 'win32') {
        ensureWindowsOriginalPath(env)
      }
    }
  } else {
    delete env.LOBSTERAI_NODE_SHIM_ACTIVE
    coworkLog('INFO', 'resolveNodeShim', 'System node/npx/npm detected; skipped Electron node shim injection')
  }

  const nodePaths = [join(resourcesPath, 'app.asar', 'node_modules'), join(resourcesPath, 'app.asar.unpacked', 'node_modules')].filter(
    (nodePath) => existsSync(nodePath)
  )

  if (nodePaths.length > 0) {
    env.NODE_PATH = appendEnvPath(env.NODE_PATH, nodePaths)
  }

  // 校验构建后的环境中 node/npx/npm 解析是否正常。
  verifyNodeEnvironment(env)
}

/**
 * 校验构建后的 PATH 是否可解析 node/npx/npm，并输出诊断日志。
 */
function verifyNodeEnvironment(env: Record<string, string | undefined>): void {
  const tag = 'verifyNodeEnv'
  const pathValue = env.PATH || ''

  // 输出最终 PATH 条目。
  const pathEntries = pathValue.split(delimiter)
  coworkLog('INFO', tag, `Final PATH has ${pathEntries.length} entries:`)
  for (let i = 0; i < pathEntries.length; i++) {
    const entry = pathEntries[i]
    const exists = entry ? existsSync(entry) : false
    coworkLog('INFO', tag, `  [${i}] ${entry} (exists: ${exists})`)
  }

  // 用 which/where 解析 node、npx、npm 实际命中路径。
  const whichCmd = process.platform === 'win32' ? 'where' : 'which'
  for (const tool of ['node', 'npx', 'npm']) {
    try {
      const result = spawnSync(whichCmd, [tool], {
        env: { ...env } as NodeJS.ProcessEnv,
        encoding: 'utf-8',
        timeout: 5000,
        windowsHide: process.platform === 'win32'
      })
      if (result.status === 0 && result.stdout) {
        const resolved = result.stdout.trim()
        coworkLog('INFO', tag, `${whichCmd} ${tool} => ${resolved}`)
        const resolvedCandidates = resolved
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
        const resolvedForExec =
          process.platform === 'win32'
            ? resolvedCandidates.find((candidate) => /\.(cmd|exe|bat)$/i.test(candidate)) || resolvedCandidates[0]
            : resolvedCandidates[0]

        // 继续探测版本信息。
        if (tool === 'node' && resolvedForExec) {
          try {
            let execTarget = resolvedForExec
            if (process.platform === 'win32' && /\.cmd$/i.test(resolvedForExec)) {
              execTarget = env.LOBSTERAI_ELECTRON_PATH || process.execPath
            }
            const versionResult = spawnSync(execTarget, ['--version'], {
              env: { ...env, ELECTRON_RUN_AS_NODE: '1' } as NodeJS.ProcessEnv,
              encoding: 'utf-8',
              timeout: 5000,
              windowsHide: process.platform === 'win32'
            })
            coworkLog(
              'INFO',
              tag,
              `node --version (${execTarget}) => ${(versionResult.stdout || '').trim()} (exit: ${versionResult.status})`
            )
            if (versionResult.error) {
              coworkLog('WARN', tag, `node --version spawn error: ${versionResult.error.message}`)
            }
            if (versionResult.stderr) {
              coworkLog('WARN', tag, `node --version stderr: ${versionResult.stderr.trim()}`)
            }
          } catch (e) {
            coworkLog('WARN', tag, `node --version failed: ${e instanceof Error ? e.message : String(e)}`)
          }
        }
      } else {
        coworkLog('WARN', tag, `${whichCmd} ${tool} => NOT FOUND (exit: ${result.status}, stderr: ${(result.stderr || '').trim()})`)
      }
    } catch (e) {
      coworkLog('WARN', tag, `${whichCmd} ${tool} threw: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // 输出关键环境变量。
  coworkLog('INFO', tag, `NODE_PATH=${env.NODE_PATH || '(not set)'}`)
  coworkLog('INFO', tag, `LOBSTERAI_ELECTRON_PATH=${env.LOBSTERAI_ELECTRON_PATH || '(not set)'}`)
  coworkLog('INFO', tag, `LOBSTERAI_NPM_BIN_DIR=${env.LOBSTERAI_NPM_BIN_DIR || '(not set)'}`)
  coworkLog('INFO', tag, `HOME=${env.HOME || '(not set)'}`)
}

/**
 * 获取 SKILLs 根目录路径（兼容开发与生产环境）。
 */
export function getSkillsRoot(): string {
  if (app.isPackaged) {
    // 生产环境：SKILLs 位于 userData 目录。
    return join(app.getPath('userData'), 'SKILLs')
  }

  // 开发环境下 __dirname 可能随打包输出变化，从多个候选锚点依次探测。
  const envRoots = [process.env.LOBSTERAI_SKILLS_ROOT, process.env.SKILLS_ROOT]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
  const candidates = [
    ...envRoots,
    join(app.getAppPath(), 'SKILLs'),
    join(process.cwd(), 'SKILLs'),
    join(__dirname, '..', 'SKILLs'),
    join(__dirname, '..', '..', 'SKILLs')
  ]

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate
    }
  }

  // 最终兜底：首次开发运行时目录可能尚未创建。
  return join(app.getAppPath(), 'SKILLs')
}

/**
 * 获取增强环境变量（含代理注入等）。
 */
export async function getEnhancedEnv(target: OpenAICompatProxyTarget = 'local'): Promise<Record<string, string | undefined>> {
  const config = getCurrentApiConfig(target)
  const env = config ? buildEnvForConfig(config) : { ...process.env }

  applyPackagedEnvOverrides(env)

  // 注入 SKILLs 根目录；Windows 下统一为正斜杠以兼容 Node/bash。
  const skillsRoot = getSkillsRoot().replace(/\\/g, '/')
  env.SKILLS_ROOT = skillsRoot
  env.LOBSTERAI_SKILLS_ROOT = skillsRoot // 备用变量名，便于脚本兼容
  if (process.platform === 'win32' || env.LOBSTERAI_NODE_SHIM_ACTIVE === '1') {
    env.LOBSTERAI_ELECTRON_PATH = getElectronNodeRuntimePath().replace(/\\/g, '/')
  } else {
    delete env.LOBSTERAI_ELECTRON_PATH
  }

  // 注入内部 API 地址（供技能脚本调用，如定时任务创建）。
  const internalApiBaseURL = getInternalApiBaseURL()
  if (internalApiBaseURL) {
    env.LOBSTERAI_API_BASE_URL = internalApiBaseURL
  }

  // 若已有代理环境变量，则不再进行系统代理解析。
  if (env.http_proxy || env.HTTP_PROXY || env.https_proxy || env.HTTPS_PROXY) {
    return env
  }

  // 支持在设置中关闭系统代理注入。
  if (!isSystemProxyEnabled()) {
    return env
  }

  // 从系统代理配置解析代理地址。
  const proxyUrl = await resolveSystemProxyUrl('https://openrouter.ai')
  if (proxyUrl) {
    env.http_proxy = proxyUrl
    env.https_proxy = proxyUrl
    env.HTTP_PROXY = proxyUrl
    env.HTTPS_PROXY = proxyUrl
    console.log('Injected system proxy for subprocess:', proxyUrl)
  }

  return env
}

/**
 * 确保指定工作目录下存在 cowork 临时目录。
 * @param cwd 工作目录路径
 * @returns 临时目录路径
 */
export function ensureCoworkTempDir(cwd: string): string {
  const tempDir = join(cwd, '.cowork-temp')
  if (!existsSync(tempDir)) {
    try {
      mkdirSync(tempDir, { recursive: true })
      console.log('Created cowork temp directory:', tempDir)
    } catch (error) {
      console.error('Failed to create cowork temp directory:', error)
      // 创建失败时回退到工作目录本身。
      return cwd
    }
  }
  return tempDir
}

/**
 * 获取增强环境变量，并将 TMPDIR/TMP/TEMP 指向 cowork 临时目录。
 * 确保 Claude Agent SDK 的临时文件落在用户工作目录中。
 * @param cwd 工作目录路径
 */
export async function getEnhancedEnvWithTmpdir(
  cwd: string,
  target: OpenAICompatProxyTarget = 'local'
): Promise<Record<string, string | undefined>> {
  const env = await getEnhancedEnv(target)
  const tempDir = ensureCoworkTempDir(cwd)

  // 跨平台设置临时目录环境变量。
  env.TMPDIR = tempDir // macOS/Linux
  env.TMP = tempDir // Windows
  env.TEMP = tempDir // Windows

  return env
}

const SESSION_TITLE_FALLBACK = 'New Session'
const SESSION_TITLE_MAX_CHARS = 50
const SESSION_TITLE_TIMEOUT_MS = 8000
const COWORK_MODEL_PROBE_TIMEOUT_MS = 20000
const API_ERROR_SNIPPET_MAX_CHARS = 240

// 规范化为 Anthropic messages 接口地址。
function buildAnthropicMessagesUrl(baseUrl: string): string {
  const normalized = baseUrl.trim().replace(/\/+$/, '')
  if (!normalized) {
    return '/v1/messages'
  }
  if (normalized.endsWith('/v1/messages')) {
    return normalized
  }
  if (normalized.endsWith('/v1')) {
    return `${normalized}/messages`
  }
  return `${normalized}/v1/messages`
}

// 从错误响应中提取简短可读的错误片段。
function extractApiErrorSnippet(rawText: string): string {
  const trimmed = rawText.trim()
  if (!trimmed) {
    return ''
  }

  try {
    const payload = JSON.parse(trimmed) as Record<string, unknown>
    const payloadError = payload.error
    if (typeof payloadError === 'string' && payloadError.trim()) {
      return payloadError.trim().slice(0, API_ERROR_SNIPPET_MAX_CHARS)
    }
    if (payloadError && typeof payloadError === 'object') {
      const message = (payloadError as Record<string, unknown>).message
      if (typeof message === 'string' && message.trim()) {
        return message.trim().slice(0, API_ERROR_SNIPPET_MAX_CHARS)
      }
    }
    const payloadMessage = payload.message
    if (typeof payloadMessage === 'string' && payloadMessage.trim()) {
      return payloadMessage.trim().slice(0, API_ERROR_SNIPPET_MAX_CHARS)
    }
  } catch {
    // 非 JSON 响应时回退为纯文本提取。
  }

  return trimmed.replace(/\s+/g, ' ').slice(0, API_ERROR_SNIPPET_MAX_CHARS)
}

// 从 Anthropic 风格响应中提取文本内容。
function extractTextFromAnthropicResponse(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return ''
  const record = payload as Record<string, unknown>
  const content = record.content
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (!item || typeof item !== 'object') return ''
        const block = item as Record<string, unknown>
        if (typeof block.text === 'string') {
          return block.text
        }
        return ''
      })
      .filter(Boolean)
      .join('\n')
      .trim()
  }
  if (typeof content === 'string') {
    return content.trim()
  }
  if (typeof record.output_text === 'string') {
    return record.output_text.trim()
  }
  return ''
}

// 将标题清洗为纯文本并控制长度。
function normalizeTitleToPlainText(value: string, fallback: string): string {
  if (!value.trim()) return fallback

  let title = value.trim()
  const fenced = /```(?:[\w-]+)?\s*([\s\S]*?)```/i.exec(title)
  if (fenced?.[1]) {
    title = fenced[1].trim()
  }

  title = title
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/_([^_\n]+)_/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/, '')
    .replace(/^\s*>\s?/, '')
    .replace(/^\s*[-*+]\s+/, '')
    .replace(/^\s*\d+\.\s+/, '')
    .replace(/\r?\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const labeledTitle = /^(?:title|标题)\s*[:：]\s*(.+)$/i.exec(title)
  if (labeledTitle?.[1]) {
    title = labeledTitle[1].trim()
  }

  title = title
    .replace(/^["'`“”‘’]+/, '')
    .replace(/["'`“”‘’]+$/, '')
    .trim()

  if (!title) return fallback
  if (title.length > SESSION_TITLE_MAX_CHARS) {
    title = title.slice(0, SESSION_TITLE_MAX_CHARS).trim()
  }
  return title || fallback
}

// 基于用户输入构建标题兜底值。
function buildFallbackSessionTitle(userIntent: string | null): string {
  const normalizedInput = typeof userIntent === 'string' ? userIntent.trim() : ''
  if (!normalizedInput) {
    return SESSION_TITLE_FALLBACK
  }
  const firstLine =
    normalizedInput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean) || ''
  return normalizeTitleToPlainText(firstLine, SESSION_TITLE_FALLBACK)
}

// 探测当前模型配置是否可用。
export async function probeCoworkModelReadiness(
  timeoutMs = COWORK_MODEL_PROBE_TIMEOUT_MS
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { config, error } = resolveCurrentApiConfig()
  if (!config) {
    return {
      ok: false,
      error: error || 'API configuration not found.'
    }
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(buildAnthropicMessagesUrl(config.baseURL), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 1,
        temperature: 0,
        messages: [{ role: 'user', content: 'Reply with "ok".' }]
      }),
      signal: controller.signal
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      const errorSnippet = extractApiErrorSnippet(errorText)
      return {
        ok: false,
        error: errorSnippet
          ? `Model validation failed (${response.status}): ${errorSnippet}`
          : `Model validation failed with status ${response.status}.`
      }
    }

    return { ok: true }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      const timeoutSeconds = Math.ceil(timeoutMs / 1000)
      return {
        ok: false,
        error: `Model validation timed out after ${timeoutSeconds}s.`
      }
    }
    return {
      ok: false,
      error: `Model validation failed: ${error instanceof Error ? error.message : String(error)}`
    }
  } finally {
    clearTimeout(timeoutId)
  }
}

// 使用模型生成会话标题，失败时回退到本地标题。
export async function generateSessionTitle(userIntent: string | null): Promise<string> {
  const normalizedInput = typeof userIntent === 'string' ? userIntent.trim() : ''
  const fallbackTitle = buildFallbackSessionTitle(normalizedInput)
  if (!normalizedInput) {
    return fallbackTitle
  }

  const { config, error } = resolveCurrentApiConfig()
  if (!config) {
    if (error) {
      console.warn('[cowork-title] Skip title generation due to missing API config:', error)
    }
    return fallbackTitle
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), SESSION_TITLE_TIMEOUT_MS)

  try {
    const url = buildAnthropicMessagesUrl(config.baseURL)
    const prompt = `Generate a short title from this input, keep the same language, return plain text only (no markdown), and keep it within ${SESSION_TITLE_MAX_CHARS} characters: ${normalizedInput}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 80,
        temperature: 0,
        messages: [{ role: 'user', content: prompt }]
      }),
      signal: controller.signal
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      console.warn('[cowork-title] Failed to generate title:', response.status, errorText.slice(0, 240))
      return fallbackTitle
    }

    const payload = await response.json()
    const llmTitle = extractTextFromAnthropicResponse(payload)
    return normalizeTitleToPlainText(llmTitle, fallbackTitle)
  } catch (error) {
    console.error('Failed to generate session title:', error)
    return fallbackTitle
  } finally {
    clearTimeout(timeoutId)
  }
}
