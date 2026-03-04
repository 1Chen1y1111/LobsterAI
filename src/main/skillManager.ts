import { app, BrowserWindow, session } from "electron";
import { execSync, spawn, spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import extractZip from "extract-zip";
import { SqliteStore } from "./sqliteStore";
import { cpRecursiveSync } from "./fsCompat";
import { appendPythonRuntimeToEnv } from "./libs/pythonRuntime";

/**
 * 解析 macOS/Linux 用户登录 shell 的 PATH。
 *
 * 背景：
 * - 打包后的 Electron 在 macOS 下通常不会继承用户 shell profile。
 * - 如果不主动解析，`node/npm` 可能不在 PATH 中，导致技能脚本无法运行。
 */
function resolveUserShellPath(): string | null {
  if (process.platform === "win32") return null;

  try {
    const shell = process.env.SHELL || "/bin/bash";
    // 使用 login + interactive shell，确保 profile 被加载后再输出 PATH。
    const result = execSync(`${shell} -ilc 'echo __PATH__=$PATH'`, {
      encoding: "utf-8",
      timeout: 5000,
      env: { ...process.env },
    });
    const match = result.match(/__PATH__=(.+)/);
    return match ? match[1].trim() : null;
  } catch (error) {
    console.warn("[skills] Failed to resolve user shell PATH:", error);
    return null;
  }
}

/**
 * 检查给定环境变量下某个命令是否可执行。
 */
function hasCommand(command: string, env: NodeJS.ProcessEnv): boolean {
  const isWin = process.platform === "win32";
  const checker = isWin ? "where" : "which";
  // Windows 下使用 shell: true，让 cmd.exe 参与 PATH 解析，
  // 可规避 env 中 PATH/Path 并存时的解析异常。
  const result = spawnSync(checker, [command], {
    stdio: "pipe",
    env,
    shell: isWin,
    timeout: 5000,
  });
  if (result.status !== 0) {
    console.log(
      `[skills] hasCommand('${command}'): not found (status=${result.status}, error=${result.error?.message || "none"})`,
    );
  }
  return result.status === 0;
}

/**
 * 统一 Windows 环境变量对象中的 PATH 键名。
 *
 * 说明：
 * - Windows 环境变量名大小写不敏感，但 JS 对象键大小写敏感。
 * - 展开 `process.env` 后可能同时出现 `Path` 与 `PATH`。
 * - 这里合并后统一写回 `PATH`，避免子进程读取异常。
 */
function normalizePathKey(env: Record<string, string | undefined>): void {
  if (process.platform !== "win32") return;

  const pathKeys = Object.keys(env).filter((k) => k.toLowerCase() === "path");
  if (pathKeys.length <= 1) return;

  // 合并所有 PATH 类键的值（`;` 分隔），并按目录去重。
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const key of pathKeys) {
    const value = env[key];
    if (!value) continue;
    for (const entry of value.split(";")) {
      const trimmed = entry.trim();
      if (!trimmed) continue;
      const normalized = trimmed.toLowerCase().replace(/[\\/]+$/, "");
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      merged.push(trimmed);
    }
    if (key !== "PATH") {
      delete env[key];
    }
  }
  env.PATH = merged.join(";");
}

/**
 * 从 Windows 注册表读取最新系统 PATH（机器级 + 用户级）。
 *
 * 背景：
 * - 从开始菜单/资源管理器启动的 Electron 进程可能拿到“过期 PATH”。
 * - 某些工具安装后，Explorer 未重启前，`process.env.PATH` 可能缺项。
 */
function resolveWindowsRegistryPath(): string | null {
  if (process.platform !== "win32") return null;

  try {
    const machinePath = execSync(
      'reg query "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment" /v Path',
      { encoding: "utf-8", timeout: 5000, stdio: ["ignore", "pipe", "ignore"] },
    );
    const userPath = execSync('reg query "HKCU\\Environment" /v Path', {
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["ignore", "pipe", "ignore"],
    });

    const extract = (output: string): string => {
      const match = output.match(/Path\s+REG_(?:EXPAND_)?SZ\s+(.+)/i);
      return match ? match[1].trim() : "";
    };

    const combined = [extract(machinePath), extract(userPath)]
      .filter(Boolean)
      .join(";");
    return combined || null;
  } catch {
    return null;
  }
}

/**
 * 构建技能脚本执行环境。
 *
 * 目标：
 * - 在打包态尽量恢复用户真实可用的 PATH（跨平台差异处理）。
 * - 注入运行技能脚本所需的额外环境变量（例如 Electron/ Python 运行时）。
 */
function buildSkillEnv(): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = { ...process.env };

  // 先统一 PATH 键名，避免后续拼接出现 PATH/Path 双键。
  normalizePathKey(env);

  if (app.isPackaged) {
    // 确保 HOME 存在（npm 查找配置依赖此变量）。
    if (!env.HOME) {
      env.HOME = app.getPath("home");
    }

    if (process.platform === "win32") {
      // Windows 下合并注册表 PATH，补齐应用启动后新增安装的工具路径。
      const registryPath = resolveWindowsRegistryPath();
      if (registryPath) {
        const currentPath = env.PATH || "";
        const seen = new Set(
          currentPath
            .toLowerCase()
            .split(";")
            .map((s) => s.trim().replace(/[\\/]+$/, ""))
            .filter(Boolean),
        );
        const extra: string[] = [];
        for (const entry of registryPath.split(";")) {
          const trimmed = entry.trim();
          if (!trimmed) continue;
          const key = trimmed.toLowerCase().replace(/[\\/]+$/, "");
          if (!seen.has(key)) {
            seen.add(key);
            extra.push(trimmed);
          }
        }
        if (extra.length > 0) {
          env.PATH = currentPath
            ? `${currentPath};${extra.join(";")}`
            : extra.join(";");
          console.log(
            "[skills] Merged registry PATH entries for skill scripts",
          );
        }
      }

      // 兜底追加常见 Windows Node.js 安装路径。
      const commonWinPaths = [
        "C:\\Program Files\\nodejs",
        "C:\\Program Files (x86)\\nodejs",
        `${env.APPDATA || ""}\\npm`,
        `${env.LOCALAPPDATA || ""}\\Programs\\nodejs`,
      ].filter(Boolean);

      const pathSet = new Set(
        (env.PATH || "")
          .toLowerCase()
          .split(";")
          .map((s) => s.trim().replace(/[\\/]+$/, "")),
      );
      const missingPaths = commonWinPaths.filter(
        (p) => !pathSet.has(p.toLowerCase().replace(/[\\/]+$/, "")),
      );
      if (missingPaths.length > 0) {
        env.PATH = env.PATH
          ? `${env.PATH};${missingPaths.join(";")}`
          : missingPaths.join(";");
      }
    } else {
      // macOS/Linux：优先解析用户 shell PATH，确保能找到 node/npm。
      const userPath = resolveUserShellPath();
      if (userPath) {
        env.PATH = userPath;
        console.log("[skills] Resolved user shell PATH for skill scripts");
      } else {
        // 兜底追加常见 Node 安装路径。
        const commonPaths = [
          "/usr/local/bin",
          "/opt/homebrew/bin",
          `${env.HOME}/.nvm/current/bin`,
          `${env.HOME}/.volta/bin`,
          `${env.HOME}/.fnm/current/bin`,
        ];
        env.PATH = [env.PATH, ...commonPaths].filter(Boolean).join(":");
        console.log("[skills] Using fallback PATH for skill scripts");
      }
    }
  }

  // 暴露 Electron 可执行路径：系统未安装 Node 时，可用 ELECTRON_RUN_AS_NODE 执行脚本。
  env.LOBSTERAI_ELECTRON_PATH = process.execPath;
  appendPythonRuntimeToEnv(env);

  // Python 运行时注入后再次规范 PATH 键名，避免重复键。
  normalizePathKey(env);

  return env;
}

export type SkillRecord = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  isOfficial: boolean;
  isBuiltIn: boolean;
  updatedAt: number;
  prompt: string;
  skillPath: string;
  version?: string;
};

type SkillStateMap = Record<string, { enabled: boolean }>;

type EmailConnectivityCheckCode = "imap_connection" | "smtp_connection";
type EmailConnectivityCheckLevel = "pass" | "fail";
type EmailConnectivityVerdict = "pass" | "fail";

type EmailConnectivityCheck = {
  code: EmailConnectivityCheckCode;
  level: EmailConnectivityCheckLevel;
  message: string;
  durationMs: number;
};

type EmailConnectivityTestResult = {
  testedAt: number;
  verdict: EmailConnectivityVerdict;
  checks: EmailConnectivityCheck[];
};

type SkillDefaultConfig = {
  order?: number;
  enabled?: boolean;
};

type SkillsConfig = {
  version: number;
  description?: string;
  defaults: Record<string, SkillDefaultConfig>;
};

const SKILLS_DIR_NAME = "SKILLs";
const SKILL_FILE_NAME = "SKILL.md";
const SKILLS_CONFIG_FILE = "skills.config.json";
const SKILL_STATE_KEY = "skills_state";
const WATCH_DEBOUNCE_MS = 250;
const CLAUDE_SKILLS_DIR_NAME = ".claude";
const CLAUDE_SKILLS_SUBDIR = "skills";

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/**
 * 解析 SKILL.md 的 YAML frontmatter 与正文。
 */
const parseFrontmatter = (
  raw: string,
): { frontmatter: Record<string, unknown>; content: string } => {
  const normalized = raw.replace(/^\uFEFF/, "");
  const match = normalized.match(FRONTMATTER_RE);
  if (!match) {
    return { frontmatter: {}, content: normalized };
  }

  let frontmatter: Record<string, unknown> = {};
  try {
    const parsed = yaml.load(match[1]);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      frontmatter = parsed as Record<string, unknown>;
    }
  } catch (e) {
    console.warn("[skills] Failed to parse YAML frontmatter:", e);
  }

  const content = normalized.slice(match[0].length);
  return { frontmatter, content };
};

const isTruthy = (value?: unknown): boolean => {
  if (value === true) return true;
  if (!value) return false;
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "yes" || normalized === "1";
};

const extractDescription = (content: string): string => {
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    return trimmed.replace(/^#+\s*/, "");
  }
  return "";
};

const normalizeFolderName = (name: string): string => {
  const normalized = name
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "skill";
};

const isZipFile = (filePath: string): boolean =>
  path.extname(filePath).toLowerCase() === ".zip";

/**
 * 比较两个 semver 风格版本号（如 1.0.0 vs 1.0.1）。
 * 返回：a>b 为 1，a<b 为 -1，相等为 0。
 */
const compareVersions = (a: string, b: string): number => {
  const pa = a.split(".").map((s) => parseInt(s, 10) || 0);
  const pb = b.split(".").map((s) => parseInt(s, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
};

const resolveWithin = (root: string, target: string): string => {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(root, target);
  if (resolvedTarget === resolvedRoot) return resolvedTarget;
  if (!resolvedTarget.startsWith(resolvedRoot + path.sep)) {
    throw new Error("Invalid target path");
  }
  return resolvedTarget;
};

const appendEnvPath = (
  current: string | undefined,
  entries: string[],
): string => {
  const delimiter = process.platform === "win32" ? ";" : ":";
  const existing = (current || "").split(delimiter).filter(Boolean);
  const merged = [...existing];
  entries.forEach((entry) => {
    if (!entry || merged.includes(entry)) return;
    merged.push(entry);
  });
  return merged.join(delimiter);
};

const listWindowsCommandPaths = (command: string): string[] => {
  if (process.platform !== "win32") return [];

  try {
    const result = spawnSync("cmd.exe", ["/d", "/s", "/c", command], {
      encoding: "utf8",
      windowsHide: true,
    });
    if (result.status !== 0) return [];
    return result.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
};

const resolveWindowsGitExecutable = (): string | null => {
  if (process.platform !== "win32") return null;

  const programFiles = process.env.ProgramFiles || "C:\\Program Files";
  const programFilesX86 =
    process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
  const localAppData = process.env.LOCALAPPDATA || "";
  const userProfile = process.env.USERPROFILE || "";

  const installedCandidates = [
    path.join(programFiles, "Git", "cmd", "git.exe"),
    path.join(programFiles, "Git", "bin", "git.exe"),
    path.join(programFilesX86, "Git", "cmd", "git.exe"),
    path.join(programFilesX86, "Git", "bin", "git.exe"),
    path.join(localAppData, "Programs", "Git", "cmd", "git.exe"),
    path.join(localAppData, "Programs", "Git", "bin", "git.exe"),
    path.join(userProfile, "scoop", "apps", "git", "current", "cmd", "git.exe"),
    path.join(userProfile, "scoop", "apps", "git", "current", "bin", "git.exe"),
    "C:\\Git\\cmd\\git.exe",
    "C:\\Git\\bin\\git.exe",
  ];

  for (const candidate of installedCandidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  const whereCandidates = listWindowsCommandPaths("where git");
  for (const candidate of whereCandidates) {
    const normalized = candidate.trim();
    if (!normalized) continue;
    if (
      normalized.toLowerCase().endsWith("git.exe") &&
      fs.existsSync(normalized)
    ) {
      return normalized;
    }
  }

  const bundledRoots = app.isPackaged
    ? [path.join(process.resourcesPath, "mingit")]
    : [
        path.join(__dirname, "..", "..", "resources", "mingit"),
        path.join(process.cwd(), "resources", "mingit"),
      ];

  for (const root of bundledRoots) {
    const bundledCandidates = [
      path.join(root, "cmd", "git.exe"),
      path.join(root, "bin", "git.exe"),
      path.join(root, "mingw64", "bin", "git.exe"),
      path.join(root, "usr", "bin", "git.exe"),
    ];
    for (const candidate of bundledCandidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }

  return null;
};

const resolveGitCommand = (): { command: string; env?: NodeJS.ProcessEnv } => {
  if (process.platform !== "win32") {
    return { command: "git" };
  }

  const gitExe = resolveWindowsGitExecutable();
  if (!gitExe) {
    return { command: "git" };
  }

  const env: NodeJS.ProcessEnv = { ...process.env };
  const gitDir = path.dirname(gitExe);
  const gitRoot = path.dirname(gitDir);
  const candidateDirs = [
    gitDir,
    path.join(gitRoot, "cmd"),
    path.join(gitRoot, "bin"),
    path.join(gitRoot, "mingw64", "bin"),
    path.join(gitRoot, "usr", "bin"),
  ].filter((dir) => fs.existsSync(dir));

  env.PATH = appendEnvPath(env.PATH, candidateDirs);
  return { command: gitExe, env };
};

const runCommand = (
  command: string,
  args: string[],
  options?: { cwd?: string; env?: NodeJS.ProcessEnv },
): Promise<void> =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options?.cwd,
      env: options?.env,
      windowsHide: true,
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => reject(error));
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(stderr.trim() || `Command failed with exit code ${code}`),
      );
    });
  });

type SkillScriptRunResult = {
  success: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
  error?: string;
  spawnErrorCode?: string;
};

/**
 * 带超时保护执行脚本命令，收集 stdout/stderr 与退出状态。
 */
const runScriptWithTimeout = (options: {
  command: string;
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  timeoutMs: number;
}): Promise<SkillScriptRunResult> =>
  new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn(options.command, options.args, {
      cwd: options.cwd,
      env: options.env,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let settled = false;
    let timedOut = false;
    let stdout = "";
    let stderr = "";
    let forceKillTimer: NodeJS.Timeout | null = null;

    const settle = (result: SkillScriptRunResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const timeoutTimer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      forceKillTimer = setTimeout(() => {
        child.kill("SIGKILL");
      }, 2000);
    }, options.timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error: NodeJS.ErrnoException) => {
      clearTimeout(timeoutTimer);
      if (forceKillTimer) clearTimeout(forceKillTimer);
      settle({
        success: false,
        exitCode: null,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        durationMs: Date.now() - startedAt,
        timedOut,
        error: error.message,
        spawnErrorCode: error.code,
      });
    });

    child.on("close", (exitCode) => {
      clearTimeout(timeoutTimer);
      if (forceKillTimer) clearTimeout(forceKillTimer);
      settle({
        success: !timedOut && exitCode === 0,
        exitCode,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        durationMs: Date.now() - startedAt,
        timedOut,
        error: timedOut
          ? `Command timed out after ${options.timeoutMs}ms`
          : undefined,
      });
    });
  });

/**
 * 安全删除临时目录/文件。
 * Windows 下启用重试，降低文件句柄占用导致的删除失败概率。
 */
const cleanupPathSafely = (targetPath: string | null): void => {
  if (!targetPath) return;
  try {
    fs.rmSync(targetPath, {
      recursive: true,
      force: true,
      maxRetries: process.platform === "win32" ? 5 : 0,
      retryDelay: process.platform === "win32" ? 200 : 0,
    });
  } catch (error) {
    console.warn(
      "[skills] Failed to cleanup temporary directory:",
      targetPath,
      error,
    );
  }
};

/**
 * 列出 root 下可识别的技能目录：
 * - 若 root 自身含 SKILL.md，返回 [root]
 * - 否则返回其一级子目录中含 SKILL.md 的目录
 */
const listSkillDirs = (root: string): string[] => {
  if (!fs.existsSync(root)) return [];
  const skillFile = path.join(root, SKILL_FILE_NAME);
  if (fs.existsSync(skillFile)) {
    return [root];
  }

  const entries = fs.readdirSync(root);
  return entries
    .map((entry) => path.join(root, entry))
    .filter((entryPath) => {
      try {
        const stat = fs.lstatSync(entryPath);
        if (!stat.isDirectory() && !stat.isSymbolicLink()) {
          return false;
        }
        return fs.existsSync(path.join(entryPath, SKILL_FILE_NAME));
      } catch {
        return false;
      }
    });
};

/**
 * 从来源路径收集技能目录，按“最可能命中”的顺序尝试：
 * 1. 来源自身是技能目录
 * 2. 来源/SKILLs 下的技能目录
 * 3. 来源一级子目录中的技能目录
 * 4. 递归扫描（排除 .git/node_modules）
 */
const collectSkillDirsFromSource = (source: string): string[] => {
  const resolved = path.resolve(source);
  if (fs.existsSync(path.join(resolved, SKILL_FILE_NAME))) {
    return [resolved];
  }

  const nestedRoot = path.join(resolved, SKILLS_DIR_NAME);
  if (fs.existsSync(nestedRoot) && fs.statSync(nestedRoot).isDirectory()) {
    const nestedSkills = listSkillDirs(nestedRoot);
    if (nestedSkills.length > 0) {
      return nestedSkills;
    }
  }

  const directSkills = listSkillDirs(resolved);
  if (directSkills.length > 0) {
    return directSkills;
  }

  return collectSkillDirsRecursively(resolved);
};

/**
 * 广度优先递归扫描技能目录。
 */
const collectSkillDirsRecursively = (root: string): string[] => {
  const resolvedRoot = path.resolve(root);
  if (!fs.existsSync(resolvedRoot)) return [];

  const matchedDirs: string[] = [];
  const queue: string[] = [resolvedRoot];
  const seen = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    const normalized = path.resolve(current);
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    let stat: fs.Stats;
    try {
      stat = fs.lstatSync(normalized);
    } catch {
      continue;
    }
    if (!stat.isDirectory() || stat.isSymbolicLink()) continue;

    if (fs.existsSync(path.join(normalized, SKILL_FILE_NAME))) {
      matchedDirs.push(normalized);
      continue;
    }

    let entries: string[] = [];
    try {
      entries = fs.readdirSync(normalized);
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry || entry === ".git" || entry === "node_modules") continue;
      queue.push(path.join(normalized, entry));
    }
  }

  return matchedDirs;
};

const deriveRepoName = (source: string): string => {
  const cleaned = source.replace(/[#?].*$/, "");
  const base = cleaned.split("/").filter(Boolean).pop() || "skill";
  return normalizeFolderName(base.replace(/\.git$/, ""));
};

type NormalizedGitSource = {
  repoUrl: string;
  sourceSubpath?: string;
  ref?: string;
  repoNameHint?: string;
};

type GithubRepoSource = {
  owner: string;
  repo: string;
};

const extractErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

/**
 * 从 GitHub SSH/HTTPS 仓库地址提取 owner/repo。
 */
const parseGithubRepoSource = (repoUrl: string): GithubRepoSource | null => {
  const trimmed = repoUrl.trim();

  const sshMatch = trimmed.match(
    /^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?\/?$/i,
  );
  if (sshMatch) {
    return {
      owner: sshMatch[1],
      repo: sshMatch[2],
    };
  }

  try {
    const parsedUrl = new URL(trimmed);
    if (
      !["github.com", "www.github.com"].includes(
        parsedUrl.hostname.toLowerCase(),
      )
    ) {
      return null;
    }

    const segments = parsedUrl.pathname
      .replace(/\.git$/i, "")
      .split("/")
      .filter(Boolean);
    if (segments.length < 2) {
      return null;
    }

    return {
      owner: segments[0],
      repo: segments[1],
    };
  } catch {
    return null;
  }
};

/**
 * 下载 GitHub 仓库归档（zip）并解压，返回可用源码根目录。
 * 用于 git clone 失败时的兜底下载方案。
 */
const downloadGithubArchive = async (
  source: GithubRepoSource,
  tempRoot: string,
  ref?: string,
): Promise<string> => {
  const encodedRef = ref ? encodeURIComponent(ref) : "";
  const archiveUrlCandidates: Array<{
    url: string;
    headers: Record<string, string>;
  }> = [];

  if (encodedRef) {
    archiveUrlCandidates.push(
      {
        url: `https://github.com/${source.owner}/${source.repo}/archive/refs/heads/${encodedRef}.zip`,
        headers: { "User-Agent": "LobsterAI Skill Downloader" },
      },
      {
        url: `https://github.com/${source.owner}/${source.repo}/archive/refs/tags/${encodedRef}.zip`,
        headers: { "User-Agent": "LobsterAI Skill Downloader" },
      },
      {
        url: `https://github.com/${source.owner}/${source.repo}/archive/${encodedRef}.zip`,
        headers: { "User-Agent": "LobsterAI Skill Downloader" },
      },
    );
  }

  archiveUrlCandidates.push({
    url: `https://api.github.com/repos/${source.owner}/${source.repo}/zipball${encodedRef ? `/${encodedRef}` : ""}`,
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "LobsterAI Skill Downloader",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  let buffer: Buffer | null = null;
  let lastError: string | null = null;

  for (const candidate of archiveUrlCandidates) {
    try {
      const response = await session.defaultSession.fetch(candidate.url, {
        method: "GET",
        headers: candidate.headers,
      });

      if (!response.ok) {
        const detail = (await response.text()).trim();
        lastError = `Archive download failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`;
        continue;
      }

      buffer = Buffer.from(await response.arrayBuffer());
      break;
    } catch (error) {
      lastError = extractErrorMessage(error);
    }
  }

  if (!buffer) {
    throw new Error(lastError || "Archive download failed");
  }

  const zipPath = path.join(tempRoot, "github-archive.zip");
  const extractRoot = path.join(tempRoot, "github-archive");
  fs.writeFileSync(zipPath, buffer);
  fs.mkdirSync(extractRoot, { recursive: true });
  await extractZip(zipPath, { dir: extractRoot });

  const extractedDirs = fs
    .readdirSync(extractRoot)
    .map((entry) => path.join(extractRoot, entry))
    .filter((entryPath) => {
      try {
        return fs.statSync(entryPath).isDirectory();
      } catch {
        return false;
      }
    });

  if (extractedDirs.length === 1) {
    return extractedDirs[0];
  }

  return extractRoot;
};

/**
 * 规范化 GitHub 子路径，拒绝 "."/".." 以避免路径穿越。
 */
const normalizeGithubSubpath = (value: string): string | null => {
  const trimmed = value.trim().replace(/^\/+|\/+$/g, "");
  if (!trimmed) return null;
  const segments = trimmed
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    });
  if (segments.some((segment) => segment === "." || segment === "..")) {
    return null;
  }
  return segments.join("/");
};

/**
 * 解析 GitHub tree/blob URL，映射为可 clone 的仓库信息 + 子路径 + ref。
 */
const parseGithubTreeOrBlobUrl = (
  source: string,
): NormalizedGitSource | null => {
  try {
    const parsedUrl = new URL(source);
    if (!["github.com", "www.github.com"].includes(parsedUrl.hostname)) {
      return null;
    }

    const segments = parsedUrl.pathname.split("/").filter(Boolean);
    if (segments.length < 5) {
      return null;
    }

    const [owner, repoRaw, mode, ref, ...rest] = segments;
    if (!owner || !repoRaw || !ref || (mode !== "tree" && mode !== "blob")) {
      return null;
    }

    const repo = repoRaw.replace(/\.git$/i, "");
    const sourceSubpath = normalizeGithubSubpath(rest.join("/"));
    if (!repo || !sourceSubpath) {
      return null;
    }

    return {
      repoUrl: `https://github.com/${owner}/${repo}.git`,
      sourceSubpath,
      ref: decodeURIComponent(ref),
      repoNameHint: repo,
    };
  } catch {
    return null;
  }
};

/**
 * 针对 web-search 技能的完整性探测。
 * 通过关键文件与关键字符串判断该技能是否处于“已损坏需修复”状态。
 */
const isWebSearchSkillBroken = (skillRoot: string): boolean => {
  const startServerScript = path.join(skillRoot, "scripts", "start-server.sh");
  const searchScript = path.join(skillRoot, "scripts", "search.sh");
  const serverEntry = path.join(skillRoot, "dist", "server", "index.js");
  const requiredPaths = [
    startServerScript,
    searchScript,
    serverEntry,
    path.join(skillRoot, "node_modules", "iconv-lite", "encodings", "index.js"),
  ];

  if (requiredPaths.some((requiredPath) => !fs.existsSync(requiredPath))) {
    return true;
  }

  try {
    const startScript = fs.readFileSync(startServerScript, "utf-8");
    const searchScriptContent = fs.readFileSync(searchScript, "utf-8");
    const serverEntryContent = fs.readFileSync(serverEntry, "utf-8");
    if (!startScript.includes("WEB_SEARCH_FORCE_REPAIR")) {
      return true;
    }
    if (!startScript.includes("detect_healthy_bridge_server")) {
      return true;
    }
    if (!searchScriptContent.includes("ACTIVE_SERVER_URL")) {
      return true;
    }
    if (!searchScriptContent.includes("try_switch_to_local_server")) {
      return true;
    }
    if (!searchScriptContent.includes("build_search_payload")) {
      return true;
    }
    if (!searchScriptContent.includes("@query_file")) {
      return true;
    }
    if (!serverEntryContent.includes("decodeJsonRequestBody")) {
      return true;
    }
    if (!serverEntryContent.includes("TextDecoder('gb18030'")) {
      return true;
    }
    if (
      serverEntryContent.includes("scoreDecodedJsonText") &&
      serverEntryContent.includes("Request body decoded using gb18030 (score")
    ) {
      return true;
    }
  } catch {
    return true;
  }

  return false;
};

/**
 * 技能管理核心类（主进程）。
 *
 * 主要职责：
 * - 发现/解析技能目录并生成技能清单。
 * - 管理技能启停状态与配置（.env、skills_state）。
 * - 安装/下载技能并与内置技能做同步修复。
 * - 文件监听变化并通过 IPC 广播给渲染进程。
 * - 提供邮箱技能连通性测试能力。
 */
export class SkillManager {
  private watchers: fs.FSWatcher[] = [];
  private notifyTimer: NodeJS.Timeout | null = null;

  constructor(private getStore: () => SqliteStore) {}

  /**
   * 返回用户技能根目录（userData/SKILLs）。
   */
  getSkillsRoot(): string {
    return path.resolve(app.getPath("userData"), SKILLS_DIR_NAME);
  }

  /**
   * 确保用户技能根目录存在，不存在则创建。
   */
  ensureSkillsRoot(): string {
    const root = this.getSkillsRoot();
    if (!fs.existsSync(root)) {
      fs.mkdirSync(root, { recursive: true });
    }
    return root;
  }

  /**
   * 将应用内置技能同步到用户目录。
   *
   * 规则：
   * - 仅打包态执行。
   * - 新技能直接复制。
   * - 已存在技能按版本/健康检查决定是否修复覆盖。
   * - clean copy 时保留用户 `.env` 配置。
   */
  syncBundledSkillsToUserData(): void {
    if (!app.isPackaged) {
      return;
    }

    console.log("[skills] syncBundledSkillsToUserData: start");
    const userRoot = this.ensureSkillsRoot();
    console.log("[skills] syncBundledSkillsToUserData: userRoot =", userRoot);
    const bundledRoot = this.getBundledSkillsRoot();
    console.log(
      "[skills] syncBundledSkillsToUserData: bundledRoot =",
      bundledRoot,
    );
    if (
      !bundledRoot ||
      bundledRoot === userRoot ||
      !fs.existsSync(bundledRoot)
    ) {
      console.log(
        "[skills] syncBundledSkillsToUserData: bundledRoot skipped (missing or same as userRoot)",
      );
      return;
    }

    try {
      const bundledSkillDirs = listSkillDirs(bundledRoot);
      console.log(
        "[skills] syncBundledSkillsToUserData: found",
        bundledSkillDirs.length,
        "bundled skills",
      );
      bundledSkillDirs.forEach((dir) => {
        const id = path.basename(dir);
        const targetDir = path.join(userRoot, id);
        const targetExists = fs.existsSync(targetDir);

        // 判断是否需要修复或升级。
        let shouldRepair = false;
        let needsCleanCopy = false;
        if (targetExists) {
          // 版本升级：内置版本更高时触发 clean copy。
          const bundledVer = this.getSkillVersion(dir);
          if (
            bundledVer &&
            compareVersions(
              bundledVer,
              this.getSkillVersion(targetDir) || "0.0.0",
            ) > 0
          ) {
            shouldRepair = true;
            needsCleanCopy = true;
          }
          // web-search 使用专用损坏检测逻辑。
          else if (id === "web-search" && isWebSearchSkillBroken(targetDir)) {
            shouldRepair = true;
          }
          // 通用健康检查：依赖缺失则修复。
          else if (!this.isSkillRuntimeHealthy(targetDir, dir)) {
            shouldRepair = true;
          }
        }

        if (targetExists && !shouldRepair) return;
        try {
          console.log(
            `[skills] syncBundledSkillsToUserData: copying "${id}" from ${dir} to ${targetDir}`,
          );

          // clean copy 前备份 .env，避免覆盖用户密钥配置。
          let envBackup: Buffer | null = null;
          const envPath = path.join(targetDir, ".env");
          if (needsCleanCopy && fs.existsSync(envPath)) {
            envBackup = fs.readFileSync(envPath);
          }

          // clean copy 前先删除旧目录，清理历史残留文件。
          if (needsCleanCopy) {
            fs.rmSync(targetDir, { recursive: true, force: true });
          }

          cpRecursiveSync(dir, targetDir, {
            dereference: true,
            force: shouldRepair,
          });

          // 覆盖后恢复 .env。
          if (envBackup !== null) {
            fs.writeFileSync(envPath, envBackup);
          }

          console.log(
            `[skills] syncBundledSkillsToUserData: copied "${id}" successfully`,
          );
          if (shouldRepair) {
            console.log(`[skills] Repaired bundled skill "${id}" in user data`);
          }
        } catch (error) {
          console.warn(`[skills] Failed to sync bundled skill "${id}":`, error);
        }
      });

      const bundledConfig = path.join(bundledRoot, SKILLS_CONFIG_FILE);
      const targetConfig = path.join(userRoot, SKILLS_CONFIG_FILE);
      if (fs.existsSync(bundledConfig)) {
        if (!fs.existsSync(targetConfig)) {
          console.log(
            "[skills] syncBundledSkillsToUserData: copying skills.config.json",
          );
          cpRecursiveSync(bundledConfig, targetConfig);
        } else {
          this.mergeSkillsConfig(bundledConfig, targetConfig);
        }
      }
      console.log("[skills] syncBundledSkillsToUserData: done");
    } catch (error) {
      console.warn("[skills] Failed to sync bundled skills:", error);
    }
  }

  /**
   * 判断技能运行时是否健康。
   * 当内置技能含依赖但用户目录缺依赖时，返回 false 触发修复。
   */
  private isSkillRuntimeHealthy(
    targetDir: string,
    bundledDir: string,
  ): boolean {
    const bundledNodeModules = path.join(bundledDir, "node_modules");
    const targetNodeModules = path.join(targetDir, "node_modules");
    const targetPackageJson = path.join(targetDir, "package.json");

    // 无 package.json 视为无依赖技能。
    if (!fs.existsSync(targetPackageJson)) {
      return true;
    }

    // 内置版本无 node_modules 时，无需依赖修复。
    if (!fs.existsSync(bundledNodeModules)) {
      return true;
    }

    // 内置有依赖、目标无依赖，判定为不健康。
    if (!fs.existsSync(targetNodeModules)) {
      return false;
    }

    return true;
  }

  /**
   * 读取技能版本号（frontmatter.version）。
   */
  private getSkillVersion(skillDir: string): string {
    try {
      const raw = fs.readFileSync(path.join(skillDir, SKILL_FILE_NAME), "utf8");
      const { frontmatter } = parseFrontmatter(raw);
      return typeof frontmatter.version === "string"
        ? frontmatter.version
        : typeof frontmatter.version === "number"
          ? String(frontmatter.version)
          : "";
    } catch {
      return "";
    }
  }

  /**
   * 合并内置 skills.config.json 到用户配置。
   * 仅补齐“用户配置中不存在”的技能默认项，不覆盖用户已有设置。
   */
  private mergeSkillsConfig(bundledPath: string, targetPath: string): void {
    try {
      const bundled = JSON.parse(fs.readFileSync(bundledPath, "utf-8"));
      const target = JSON.parse(fs.readFileSync(targetPath, "utf-8"));
      if (!bundled.defaults || !target.defaults) return;
      let changed = false;
      for (const [id, config] of Object.entries(bundled.defaults)) {
        if (!(id in target.defaults)) {
          target.defaults[id] = config;
          changed = true;
        }
      }
      if (changed) {
        // 先写临时文件再 rename，降低写入中断导致配置损坏风险。
        const tmpPath = targetPath + ".tmp";
        fs.writeFileSync(
          tmpPath,
          JSON.stringify(target, null, 2) + "\n",
          "utf-8",
        );
        fs.renameSync(tmpPath, targetPath);
        console.log(
          "[skills] mergeSkillsConfig: merged new skill entries into user config",
        );
      }
    } catch (e) {
      console.warn("[skills] Failed to merge skills config:", e);
    }
  }

  /**
   * 聚合并返回技能列表。
   *
   * 数据来源优先级：
   * 1. 用户目录（最高）
   * 2. Claude 技能目录
   * 3. 应用内置目录（最低）
   *
   * 最终按 defaults.order + 名称排序。
   */
  listSkills(): SkillRecord[] {
    const primaryRoot = this.ensureSkillsRoot();
    const state = this.loadSkillStateMap();
    const roots = this.getSkillRoots(primaryRoot);
    const orderedRoots = roots
      .filter((root) => root !== primaryRoot)
      .concat(primaryRoot);
    const defaults = this.loadSkillsDefaults(roots);
    const builtInSkillIds = this.listBuiltInSkillIds();
    const skillMap = new Map<string, SkillRecord>();

    orderedRoots.forEach((root) => {
      if (!fs.existsSync(root)) return;
      const skillDirs = listSkillDirs(root);
      skillDirs.forEach((dir) => {
        const skill = this.parseSkillDir(
          dir,
          state,
          defaults,
          builtInSkillIds.has(path.basename(dir)),
        );
        if (!skill) return;
        skillMap.set(skill.id, skill);
      });
    });

    const skills = Array.from(skillMap.values());

    skills.sort((a, b) => {
      const orderA = defaults[a.id]?.order ?? 999;
      const orderB = defaults[b.id]?.order ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });
    return skills;
  }

  /**
   * 生成给模型的技能自动路由提示词（仅包含启用且有 prompt 的技能）。
   */
  buildAutoRoutingPrompt(): string | null {
    const skills = this.listSkills();
    const enabled = skills.filter((s) => s.enabled && s.prompt);
    if (enabled.length === 0) return null;

    const skillEntries = enabled
      .map(
        (s) =>
          `  <skill><id>${s.id}</id><name>${s.name}</name><description>${s.description}</description><location>${s.skillPath}</location></skill>`,
      )
      .join("\n");

    return [
      "## Skills (mandatory)",
      "Before replying: scan <available_skills> <description> entries.",
      "- If exactly one skill clearly applies: read its SKILL.md at <location> with the Read tool, then follow it.",
      "- If multiple could apply: choose the most specific one, then read/follow it.",
      "- If none clearly apply: do not read any SKILL.md.",
      '- IMPORTANT: If a description contains "Do NOT use" constraints, strictly respect them. If the user\'s request falls into a "Do NOT" category, treat that skill as non-matching — do NOT read its SKILL.md.',
      "- For the selected skill, treat <location> as the canonical SKILL.md path.",
      "- Resolve relative paths mentioned by that SKILL.md against its directory (dirname(<location>)), not the workspace root.",
      "Constraints: never read more than one skill up front; only read additional skills if the first one explicitly references them.",
      "",
      "<available_skills>",
      skillEntries,
      "</available_skills>",
    ].join("\n");
  }

  /**
   * 设置技能启用状态并广播变化。
   */
  setSkillEnabled(id: string, enabled: boolean): SkillRecord[] {
    const state = this.loadSkillStateMap();
    state[id] = { enabled };
    this.saveSkillStateMap(state);
    this.notifySkillsChanged();
    return this.listSkills();
  }

  /**
   * 删除用户技能目录（内置技能禁止删除）。
   */
  deleteSkill(id: string): SkillRecord[] {
    const root = this.ensureSkillsRoot();
    if (id !== path.basename(id)) {
      throw new Error("Invalid skill id");
    }
    if (this.isBuiltInSkillId(id)) {
      throw new Error("Built-in skills cannot be deleted");
    }

    const targetDir = resolveWithin(root, id);
    if (!fs.existsSync(targetDir)) {
      throw new Error("Skill not found");
    }

    fs.rmSync(targetDir, { recursive: true, force: true });
    const state = this.loadSkillStateMap();
    delete state[id];
    this.saveSkillStateMap(state);
    this.startWatching();
    this.notifySkillsChanged();
    return this.listSkills();
  }

  /**
   * 下载/导入技能来源并安装到用户技能目录。
   *
   * 支持来源：
   * - 本地目录、zip、SKILL.md 文件
   * - GitHub owner/repo
   * - Git 仓库 URL
   * - GitHub tree/blob URL（含子路径）
   */
  async downloadSkill(
    source: string,
  ): Promise<{ success: boolean; skills?: SkillRecord[]; error?: string }> {
    let cleanupPath: string | null = null;
    try {
      const trimmed = source.trim();
      if (!trimmed) {
        return { success: false, error: "Missing skill source" };
      }

      const root = this.ensureSkillsRoot();
      let localSource = trimmed;
      if (fs.existsSync(localSource)) {
        const stat = fs.statSync(localSource);
        if (stat.isFile()) {
          if (isZipFile(localSource)) {
            const tempRoot = fs.mkdtempSync(
              path.join(app.getPath("temp"), "lobsterai-skill-zip-"),
            );
            await extractZip(localSource, { dir: tempRoot });
            localSource = tempRoot;
            cleanupPath = tempRoot;
          } else if (path.basename(localSource) === SKILL_FILE_NAME) {
            localSource = path.dirname(localSource);
          } else {
            return {
              success: false,
              error:
                "Skill source must be a directory, zip file, or SKILL.md file",
            };
          }
        }
      } else {
        const normalized = this.normalizeGitSource(trimmed);
        if (!normalized) {
          return {
            success: false,
            error:
              "Invalid skill source. Use owner/repo, repo URL, or a GitHub tree/blob URL.",
          };
        }
        const tempRoot = fs.mkdtempSync(
          path.join(app.getPath("temp"), "lobsterai-skill-"),
        );
        cleanupPath = tempRoot;
        const repoName = normalizeFolderName(
          normalized.repoNameHint || deriveRepoName(normalized.repoUrl),
        );
        const clonePath = path.join(tempRoot, repoName);
        const cloneArgs = ["clone", "--depth", "1"];
        if (normalized.ref) {
          cloneArgs.push("--branch", normalized.ref);
        }
        cloneArgs.push(normalized.repoUrl, clonePath);
        const gitRuntime = resolveGitCommand();
        const githubSource = parseGithubRepoSource(normalized.repoUrl);
        let downloadedSourceRoot = clonePath;
        try {
          await runCommand(gitRuntime.command, cloneArgs, {
            env: gitRuntime.env,
          });
        } catch (error) {
          const errno = (error as NodeJS.ErrnoException | null)?.code;
          if (githubSource) {
            try {
              downloadedSourceRoot = await downloadGithubArchive(
                githubSource,
                tempRoot,
                normalized.ref,
              );
            } catch (archiveError) {
              const gitMessage = extractErrorMessage(error);
              const archiveMessage = extractErrorMessage(archiveError);
              if (errno === "ENOENT" && process.platform === "win32") {
                throw new Error(
                  "Git executable not found. Please install Git for Windows or reinstall LobsterAI with bundled PortableGit." +
                    ` Archive fallback also failed: ${archiveMessage}`,
                );
              }
              throw new Error(
                `Git clone failed: ${gitMessage}. Archive fallback failed: ${archiveMessage}`,
              );
            }
          } else if (errno === "ENOENT" && process.platform === "win32") {
            throw new Error(
              "Git executable not found. Please install Git for Windows or reinstall LobsterAI with bundled PortableGit.",
            );
          } else {
            throw error;
          }
        }

        if (normalized.sourceSubpath) {
          const scopedSource = resolveWithin(
            downloadedSourceRoot,
            normalized.sourceSubpath,
          );
          if (!fs.existsSync(scopedSource)) {
            return {
              success: false,
              error: `Path "${normalized.sourceSubpath}" not found in repository`,
            };
          }
          const scopedStat = fs.statSync(scopedSource);
          if (scopedStat.isFile()) {
            if (path.basename(scopedSource) === SKILL_FILE_NAME) {
              localSource = path.dirname(scopedSource);
            } else {
              return {
                success: false,
                error: "GitHub path must point to a directory or SKILL.md file",
              };
            }
          } else {
            localSource = scopedSource;
          }
        } else {
          localSource = downloadedSourceRoot;
        }
      }

      const skillDirs = collectSkillDirsFromSource(localSource);
      if (skillDirs.length === 0) {
        cleanupPathSafely(cleanupPath);
        cleanupPath = null;
        return { success: false, error: "No SKILL.md found in source" };
      }

      for (const skillDir of skillDirs) {
        const folderName = normalizeFolderName(path.basename(skillDir));
        let targetDir = resolveWithin(root, folderName);
        let suffix = 1;
        while (fs.existsSync(targetDir)) {
          targetDir = resolveWithin(root, `${folderName}-${suffix}`);
          suffix += 1;
        }
        cpRecursiveSync(skillDir, targetDir);
      }

      cleanupPathSafely(cleanupPath);
      cleanupPath = null;

      this.startWatching();
      this.notifySkillsChanged();
      return { success: true, skills: this.listSkills() };
    } catch (error) {
      cleanupPathSafely(cleanupPath);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to download skill",
      };
    }
  }

  /**
   * 启动技能目录监听（根目录 + 各技能目录）。
   */
  startWatching(): void {
    this.stopWatching();
    const primaryRoot = this.ensureSkillsRoot();
    const roots = this.getSkillRoots(primaryRoot);

    const watchHandler = () => this.scheduleNotify();
    roots.forEach((root) => {
      if (!fs.existsSync(root)) return;
      try {
        this.watchers.push(fs.watch(root, watchHandler));
      } catch (error) {
        console.warn("[skills] Failed to watch skills root:", root, error);
      }

      const skillDirs = listSkillDirs(root);
      skillDirs.forEach((dir) => {
        try {
          this.watchers.push(fs.watch(dir, watchHandler));
        } catch (error) {
          console.warn("[skills] Failed to watch skill directory:", dir, error);
        }
      });
    });
  }

  /**
   * 停止并清理所有目录监听与防抖定时器。
   */
  stopWatching(): void {
    this.watchers.forEach((watcher) => watcher.close());
    this.watchers = [];
    if (this.notifyTimer) {
      clearTimeout(this.notifyTimer);
      this.notifyTimer = null;
    }
  }

  /**
   * 工作目录变化时重建监听并通知前端刷新技能列表。
   */
  handleWorkingDirectoryChange(): void {
    this.startWatching();
    this.notifySkillsChanged();
  }

  /**
   * 技能目录变更通知防抖，避免高频 fs.watch 事件导致频繁刷新。
   */
  private scheduleNotify(): void {
    if (this.notifyTimer) {
      clearTimeout(this.notifyTimer);
    }
    this.notifyTimer = setTimeout(() => {
      this.startWatching();
      this.notifySkillsChanged();
    }, WATCH_DEBOUNCE_MS);
  }

  /**
   * 向所有渲染窗口广播 `skills:changed` 事件。
   */
  private notifySkillsChanged(): void {
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send("skills:changed");
      }
    });
  }

  /**
   * 解析技能目录，构造 SkillRecord。
   */
  private parseSkillDir(
    dir: string,
    state: SkillStateMap,
    defaults: Record<string, SkillDefaultConfig>,
    isBuiltIn: boolean,
  ): SkillRecord | null {
    const skillFile = path.join(dir, SKILL_FILE_NAME);
    if (!fs.existsSync(skillFile)) return null;
    try {
      const raw = fs.readFileSync(skillFile, "utf8");
      const { frontmatter, content } = parseFrontmatter(raw);
      const name =
        (String(frontmatter.name || "") || path.basename(dir)).trim() ||
        path.basename(dir);
      const description = (
        String(frontmatter.description || "") ||
        extractDescription(content) ||
        name
      ).trim();
      const isOfficial =
        isTruthy(frontmatter.official) || isTruthy(frontmatter.isOfficial);
      const version =
        typeof frontmatter.version === "string"
          ? frontmatter.version
          : typeof frontmatter.version === "number"
            ? String(frontmatter.version)
            : undefined;
      const updatedAt = fs.statSync(skillFile).mtimeMs;
      const id = path.basename(dir);
      const prompt = content.trim();
      const defaultEnabled = defaults[id]?.enabled ?? true;
      const enabled = state[id]?.enabled ?? defaultEnabled;
      return {
        id,
        name,
        description,
        enabled,
        isOfficial,
        isBuiltIn,
        updatedAt,
        prompt,
        skillPath: skillFile,
        version,
      };
    } catch (error) {
      console.warn("[skills] Failed to parse skill:", dir, error);
      return null;
    }
  }

  /**
   * 获取内置技能 id 集合。
   */
  private listBuiltInSkillIds(): Set<string> {
    const builtInRoot = this.getBundledSkillsRoot();
    if (!builtInRoot || !fs.existsSync(builtInRoot)) {
      return new Set();
    }
    return new Set(listSkillDirs(builtInRoot).map((dir) => path.basename(dir)));
  }

  private isBuiltInSkillId(id: string): boolean {
    return this.listBuiltInSkillIds().has(id);
  }

  /**
   * 读取技能启停状态映射。
   * 兼容旧结构（SkillRecord[]）并自动迁移为新结构（SkillStateMap）。
   */
  private loadSkillStateMap(): SkillStateMap {
    const store = this.getStore();
    const raw = store.get(SKILL_STATE_KEY) as
      | SkillStateMap
      | SkillRecord[]
      | undefined;
    if (Array.isArray(raw)) {
      const migrated: SkillStateMap = {};
      raw.forEach((skill) => {
        migrated[skill.id] = { enabled: skill.enabled };
      });
      store.set(SKILL_STATE_KEY, migrated);
      return migrated;
    }
    return raw ?? {};
  }

  /**
   * 持久化技能启停状态映射。
   */
  private saveSkillStateMap(map: SkillStateMap): void {
    this.getStore().set(SKILL_STATE_KEY, map);
  }

  /**
   * 读取并合并各 root 下 skills.config.json 默认配置。
   */
  private loadSkillsDefaults(
    roots: string[],
  ): Record<string, SkillDefaultConfig> {
    const merged: Record<string, SkillDefaultConfig> = {};

    // 反向加载再合并：高优先级 root（用户目录）可覆盖低优先级默认项。
    const reversedRoots = [...roots].reverse();

    for (const root of reversedRoots) {
      const configPath = path.join(root, SKILLS_CONFIG_FILE);
      if (!fs.existsSync(configPath)) continue;

      try {
        const raw = fs.readFileSync(configPath, "utf8");
        const config = JSON.parse(raw) as SkillsConfig;
        if (config.defaults && typeof config.defaults === "object") {
          for (const [id, settings] of Object.entries(config.defaults)) {
            merged[id] = { ...merged[id], ...settings };
          }
        }
      } catch (error) {
        console.warn(
          "[skills] Failed to load skills config:",
          configPath,
          error,
        );
      }
    }

    return merged;
  }

  /**
   * 按优先级返回技能根目录列表。
   */
  private getSkillRoots(primaryRoot?: string): string[] {
    const resolvedPrimary = primaryRoot ?? this.getSkillsRoot();
    const roots: string[] = [resolvedPrimary];

    const claudeSkillsRoot = this.getClaudeSkillsRoot();
    if (claudeSkillsRoot && fs.existsSync(claudeSkillsRoot)) {
      roots.push(claudeSkillsRoot);
    }

    const appRoot = this.getBundledSkillsRoot();
    if (appRoot !== resolvedPrimary && fs.existsSync(appRoot)) {
      roots.push(appRoot);
    }
    return roots;
  }

  private getClaudeSkillsRoot(): string | null {
    const homeDir = app.getPath("home");
    return path.join(homeDir, CLAUDE_SKILLS_DIR_NAME, CLAUDE_SKILLS_SUBDIR);
  }

  /**
   * 返回应用内置技能目录路径。
   */
  private getBundledSkillsRoot(): string {
    if (app.isPackaged) {
      // 生产环境优先读取 Resources/SKILLs。
      const resourcesRoot = path.resolve(
        process.resourcesPath,
        SKILLS_DIR_NAME,
      );
      if (fs.existsSync(resourcesRoot)) {
        return resourcesRoot;
      }

      // 兼容旧包结构：SKILLs 位于 app.asar 内。
      return path.resolve(app.getAppPath(), SKILLS_DIR_NAME);
    }

    // 开发环境下，基于项目根目录读取 SKILLs。
    const projectRoot = path.resolve(__dirname, "..");
    return path.resolve(projectRoot, SKILLS_DIR_NAME);
  }

  /**
   * 读取技能目录下 `.env` 配置并解析为键值对。
   */
  getSkillConfig(skillId: string): {
    success: boolean;
    config?: Record<string, string>;
    error?: string;
  } {
    try {
      const skillDir = this.resolveSkillDir(skillId);
      const envPath = path.join(skillDir, ".env");
      if (!fs.existsSync(envPath)) {
        return { success: true, config: {} };
      }
      const raw = fs.readFileSync(envPath, "utf8");
      const config: Record<string, string> = {};
      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx < 0) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).trim();
        config[key] = value;
      }
      return { success: true, config };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to read skill config",
      };
    }
  }

  /**
   * 将技能配置写入 `.env` 文件（整文件覆盖写入）。
   */
  setSkillConfig(
    skillId: string,
    config: Record<string, string>,
  ): { success: boolean; error?: string } {
    try {
      const skillDir = this.resolveSkillDir(skillId);
      const envPath = path.join(skillDir, ".env");
      const lines = Object.entries(config)
        .filter(([key]) => key.trim())
        .map(([key, value]) => `${key}=${value}`);
      fs.writeFileSync(envPath, lines.join("\n") + "\n", "utf8");
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to write skill config",
      };
    }
  }

  /**
   * 尝试从内置资源修复指定技能目录（主要用于补齐 node_modules）。
   */
  private repairSkillFromBundled(skillId: string, skillPath: string): boolean {
    if (!app.isPackaged) return false;

    const bundledRoot = this.getBundledSkillsRoot();
    if (!bundledRoot || !fs.existsSync(bundledRoot)) {
      return false;
    }

    const bundledPath = path.join(bundledRoot, skillId);
    if (!fs.existsSync(bundledPath) || bundledPath === skillPath) {
      return false;
    }

    // 仅当内置技能包含 node_modules 时才执行修复。
    const bundledNodeModules = path.join(bundledPath, "node_modules");
    if (!fs.existsSync(bundledNodeModules)) {
      console.log(
        `[skills] Bundled ${skillId} does not have node_modules, skipping repair`,
      );
      return false;
    }

    try {
      console.log(`[skills] Repairing ${skillId} from bundled resources...`);
      fs.cpSync(bundledPath, skillPath, {
        recursive: true,
        dereference: true,
        force: true,
        errorOnExist: false,
      });
      console.log(`[skills] Repaired ${skillId} from bundled resources`);
      return true;
    } catch (error) {
      console.warn(
        `[skills] Failed to repair ${skillId} from bundled resources:`,
        error,
      );
      return false;
    }
  }

  /**
   * 确保技能依赖可用。
   *
   * 策略：
   * 1. 已有 node_modules -> 直接通过
   * 2. 无 package.json -> 无依赖，直接通过
   * 3. 尝试从内置资源修复
   * 4. 最后回退到 npm install
   */
  private ensureSkillDependencies(skillDir: string): {
    success: boolean;
    error?: string;
  } {
    const nodeModulesPath = path.join(skillDir, "node_modules");
    const packageJsonPath = path.join(skillDir, "package.json");
    const skillId = path.basename(skillDir);

    console.log(`[skills] Checking dependencies for ${skillId}...`);
    console.log(
      `[skills]   node_modules exists: ${fs.existsSync(nodeModulesPath)}`,
    );
    console.log(
      `[skills]   package.json exists: ${fs.existsSync(packageJsonPath)}`,
    );
    console.log(`[skills]   skillDir: ${skillDir}`);

    // 目录中已有 node_modules，视为依赖可用。
    if (fs.existsSync(nodeModulesPath)) {
      console.log(`[skills] Dependencies already installed for ${skillId}`);
      return { success: true };
    }

    // 无 package.json，说明技能本身无 npm 依赖。
    if (!fs.existsSync(packageJsonPath)) {
      console.log(
        `[skills] No package.json found for ${skillId}, skipping install`,
      );
      return { success: true };
    }

    // 优先使用内置资源修复，避免依赖本机 npm。
    if (this.repairSkillFromBundled(skillId, skillDir)) {
      if (fs.existsSync(nodeModulesPath)) {
        console.log(
          `[skills] Dependencies restored from bundled resources for ${skillId}`,
        );
        return { success: true };
      }
    }

    // 构建脚本执行环境（打包态 PATH 修复很关键）。
    const env = buildSkillEnv() as NodeJS.ProcessEnv;
    const pathKeys = Object.keys(env).filter((k) => k.toLowerCase() === "path");
    console.log(`[skills]   PATH keys in env: ${JSON.stringify(pathKeys)}`);
    console.log(
      `[skills]   PATH (first 300 chars): ${env.PATH?.substring(0, 300)}`,
    );

    // 检查 npm 可执行性。
    const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
    if (!hasCommand(npmCommand, env) && !hasCommand("npm", env)) {
      const errorMsg =
        "npm is not available and skill cannot be repaired from bundled resources. Please install Node.js from https://nodejs.org/";
      console.error(`[skills] ${errorMsg}`);
      return { success: false, error: errorMsg };
    }

    console.log(`[skills] npm is available`);

    // 回退执行 npm install 安装依赖。
    console.log(`[skills] Installing dependencies for ${skillId}...`);
    console.log(`[skills]   Working directory: ${skillDir}`);

    try {
      // Windows 下使用 shell: true 以正确解析 npm.cmd。
      const isWin = process.platform === "win32";
      const result = spawnSync("npm", ["install"], {
        cwd: skillDir,
        encoding: "utf-8",
        stdio: "pipe",
        timeout: 120000, // 2 minute timeout
        env,
        shell: isWin,
      });

      console.log(`[skills] npm install exit code: ${result.status}`);
      if (result.stdout) {
        console.log(
          `[skills] npm install stdout: ${result.stdout.substring(0, 500)}`,
        );
      }
      if (result.stderr) {
        console.log(
          `[skills] npm install stderr: ${result.stderr.substring(0, 500)}`,
        );
      }

      if (result.status !== 0) {
        const errorMsg = result.stderr || result.stdout || "npm install failed";
        console.error(
          `[skills] Failed to install dependencies for ${skillId}:`,
          errorMsg,
        );
        return {
          success: false,
          error: `Failed to install dependencies: ${errorMsg}`,
        };
      }

      // 额外校验 node_modules 是否已生成。
      if (!fs.existsSync(nodeModulesPath)) {
        const errorMsg =
          "npm install appeared to succeed but node_modules was not created";
        console.error(`[skills] ${errorMsg}`);
        return { success: false, error: errorMsg };
      }

      console.log(
        `[skills] Dependencies installed successfully for ${skillId}`,
      );
      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(
        `[skills] Error installing dependencies for ${skillId}:`,
        errorMsg,
      );
      return {
        success: false,
        error: `Failed to install dependencies: ${errorMsg}`,
      };
    }
  }

  async testEmailConnectivity(
    skillId: string,
    config: Record<string, string>,
  ): Promise<{
    success: boolean;
    result?: EmailConnectivityTestResult;
    error?: string;
  }> {
    try {
      const skillDir = this.resolveSkillDir(skillId);

      // 执行连通性脚本前先确保依赖可用。
      const depsResult = this.ensureSkillDependencies(skillDir);
      if (!depsResult.success) {
        console.error(
          "[email-connectivity] Dependency install failed:",
          depsResult.error,
        );
        return { success: false, error: depsResult.error };
      }

      const imapScript = path.join(skillDir, "scripts", "imap.js");
      const smtpScript = path.join(skillDir, "scripts", "smtp.js");
      if (!fs.existsSync(imapScript) || !fs.existsSync(smtpScript)) {
        console.error("[email-connectivity] Scripts not found:", {
          imapScript,
          smtpScript,
        });
        return {
          success: false,
          error: "Email connectivity scripts not found",
        };
      }

      // 日志脱敏，避免明文密码输出到控制台。
      const safeConfig = { ...config };
      if (safeConfig.IMAP_PASS) safeConfig.IMAP_PASS = "***";
      if (safeConfig.SMTP_PASS) safeConfig.SMTP_PASS = "***";
      console.log(
        "[email-connectivity] Testing with config:",
        JSON.stringify(safeConfig, null, 2),
      );

      const envOverrides = Object.fromEntries(
        Object.entries(config ?? {})
          .filter(([key]) => key.trim())
          .map(([key, value]) => [key, String(value ?? "")]),
      );

      console.log("[email-connectivity] Running IMAP test (list-mailboxes)...");
      const imapResult = await this.runSkillScriptWithEnv(
        skillDir,
        imapScript,
        ["list-mailboxes"],
        envOverrides,
        20000,
      );
      console.log(
        "[email-connectivity] IMAP result:",
        JSON.stringify(
          {
            success: imapResult.success,
            exitCode: imapResult.exitCode,
            timedOut: imapResult.timedOut,
            durationMs: imapResult.durationMs,
            stdout: imapResult.stdout?.slice(0, 500),
            stderr: imapResult.stderr?.slice(0, 500),
            error: imapResult.error,
            spawnErrorCode: imapResult.spawnErrorCode,
          },
          null,
          2,
        ),
      );

      console.log("[email-connectivity] Running SMTP test (verify)...");
      const smtpResult = await this.runSkillScriptWithEnv(
        skillDir,
        smtpScript,
        ["verify"],
        envOverrides,
        20000,
      );
      console.log(
        "[email-connectivity] SMTP result:",
        JSON.stringify(
          {
            success: smtpResult.success,
            exitCode: smtpResult.exitCode,
            timedOut: smtpResult.timedOut,
            durationMs: smtpResult.durationMs,
            stdout: smtpResult.stdout?.slice(0, 500),
            stderr: smtpResult.stderr?.slice(0, 500),
            error: smtpResult.error,
            spawnErrorCode: smtpResult.spawnErrorCode,
          },
          null,
          2,
        ),
      );

      const checks: EmailConnectivityCheck[] = [
        this.buildEmailConnectivityCheck("imap_connection", imapResult),
        this.buildEmailConnectivityCheck("smtp_connection", smtpResult),
      ];
      const verdict: EmailConnectivityVerdict = checks.every(
        (check) => check.level === "pass",
      )
        ? "pass"
        : "fail";

      console.log(
        "[email-connectivity] Final verdict:",
        verdict,
        "checks:",
        JSON.stringify(checks, null, 2),
      );

      return {
        success: true,
        result: {
          testedAt: Date.now(),
          verdict,
          checks,
        },
      };
    } catch (error) {
      console.error("[email-connectivity] Unexpected error:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to test email connectivity",
      };
    }
  }

  /**
   * 根据 skillId 解析技能目录绝对路径。
   */
  private resolveSkillDir(skillId: string): string {
    const skills = this.listSkills();
    const skill = skills.find((s) => s.id === skillId);
    if (!skill) {
      throw new Error("Skill not found");
    }
    return path.dirname(skill.skillPath);
  }

  /**
   * 生成脚本运行时候选：
   * - 开发态优先 `node`
   * - 始终回退到 `electron + ELECTRON_RUN_AS_NODE=1`
   */
  private getScriptRuntimeCandidates(): Array<{
    command: string;
    extraEnv?: NodeJS.ProcessEnv;
  }> {
    const candidates: Array<{ command: string; extraEnv?: NodeJS.ProcessEnv }> =
      [];
    if (!app.isPackaged) {
      candidates.push({ command: "node" });
    }
    candidates.push({
      command: process.execPath,
      extraEnv: { ELECTRON_RUN_AS_NODE: "1" },
    });
    return candidates;
  }

  /**
   * 在候选运行时中依次尝试执行技能脚本。
   * 若出现 ENOENT（运行时不存在）则自动尝试下一个候选。
   */
  private async runSkillScriptWithEnv(
    skillDir: string,
    scriptPath: string,
    scriptArgs: string[],
    envOverrides: Record<string, string>,
    timeoutMs: number,
  ): Promise<SkillScriptRunResult> {
    let lastResult: SkillScriptRunResult | null = null;

    // 先构建基础环境，再叠加运行时变量与调用方覆盖变量。
    const baseEnv = buildSkillEnv();

    for (const runtime of this.getScriptRuntimeCandidates()) {
      const env: NodeJS.ProcessEnv = {
        ...baseEnv,
        ...runtime.extraEnv,
        ...envOverrides,
      };
      const result = await runScriptWithTimeout({
        command: runtime.command,
        args: [scriptPath, ...scriptArgs],
        cwd: skillDir,
        env,
        timeoutMs,
      });
      lastResult = result;

      if (result.spawnErrorCode === "ENOENT") {
        continue;
      }
      return result;
    }

    return (
      lastResult ?? {
        success: false,
        exitCode: null,
        stdout: "",
        stderr: "",
        durationMs: 0,
        timedOut: false,
        error: "Failed to run skill script",
      }
    );
  }

  /**
   * 尝试把脚本 stdout 解析为 JSON，并提取 message 字段。
   */
  private parseScriptMessage(stdout: string): string | null {
    if (!stdout) {
      return null;
    }
    try {
      const parsed = JSON.parse(stdout);
      if (
        parsed &&
        typeof parsed === "object" &&
        typeof parsed.message === "string" &&
        parsed.message.trim()
      ) {
        return parsed.message.trim();
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * 获取输出文本最后一条非空行，便于错误提示兜底展示。
   */
  private getLastOutputLine(text: string): string {
    return (
      text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(-1)[0] || ""
    );
  }

  /**
   * 将脚本执行结果转换为前端可展示的连通性检查项。
   */
  private buildEmailConnectivityCheck(
    code: EmailConnectivityCheckCode,
    result: SkillScriptRunResult,
  ): EmailConnectivityCheck {
    const label = code === "imap_connection" ? "IMAP" : "SMTP";

    if (result.success) {
      const parsedMessage = this.parseScriptMessage(result.stdout);
      return {
        code,
        level: "pass",
        message: parsedMessage || `${label} connection successful`,
        durationMs: result.durationMs,
      };
    }

    const message = result.timedOut
      ? `${label} connectivity check timed out`
      : result.error ||
        this.getLastOutputLine(result.stderr) ||
        this.getLastOutputLine(result.stdout) ||
        `${label} connection failed`;

    return {
      code,
      level: "fail",
      message,
      durationMs: result.durationMs,
    };
  }

  /**
   * 规范化技能来源字符串，统一输出可 clone 的仓库描述。
   */
  private normalizeGitSource(source: string): NormalizedGitSource | null {
    const githubTreeOrBlob = parseGithubTreeOrBlobUrl(source);
    if (githubTreeOrBlob) {
      return githubTreeOrBlob;
    }

    if (/^[\w.-]+\/[\w.-]+$/.test(source)) {
      return {
        repoUrl: `https://github.com/${source}.git`,
      };
    }
    if (
      source.startsWith("http://") ||
      source.startsWith("https://") ||
      source.startsWith("git@")
    ) {
      return {
        repoUrl: source,
      };
    }
    if (source.endsWith(".git")) {
      return {
        repoUrl: source,
      };
    }
    return null;
  }
}

export const __skillManagerTestUtils = {
  parseFrontmatter,
  isTruthy,
  extractDescription,
};
