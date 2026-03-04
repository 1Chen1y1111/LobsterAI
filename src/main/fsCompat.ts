/**
 * 兼容性递归拷贝实现。
 *
 * 背景：
 * - 在部分 Node.js/Electron 版本与 Windows 组合下，`fs.cpSync` 在处理
 *   非 ASCII 路径（例如中文路径）时可能触发原生层崩溃。
 * - 本实现改用 `readdirSync/lstatSync/copyFileSync` 组合，规避该问题。
 */
import fs from 'fs';
import path from 'path';

/**
 * 递归复制文件/目录/符号链接。
 *
 * 参数说明：
 * - `dereference`:
 *   `true` 时跟随符号链接（对链接目标执行复制）；
 *   `false` 时保留符号链接本身。
 * - `force`:
 *   `true` 时允许覆盖目标路径；
 *   `false` 时若目标存在则跳过当前条目。
 * - `errorOnExist`:
 *   为兼容调用方保留该字段，当前实现不主动抛“已存在”错误。
 */
export function cpRecursiveSync(
  src: string,
  dest: string,
  opts: { dereference?: boolean; force?: boolean; errorOnExist?: boolean } = {}
): void {
  const { dereference = false, force = false } = opts;
  // 是否跟随符号链接由 dereference 决定：statSync 会跟随，lstatSync 不会。
  const stat = dereference ? fs.statSync(src) : fs.lstatSync(src);

  if (stat.isDirectory()) {
    // 目录：先确保目标目录存在，再递归处理子项。
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    for (const entry of fs.readdirSync(src)) {
      cpRecursiveSync(path.join(src, entry), path.join(dest, entry), opts);
    }
  } else if (stat.isFile()) {
    // 文件：目标已存在且未开启 force 时，直接跳过。
    if (fs.existsSync(dest) && !force) {
      return;
    }
    // 复制前确保目标父目录存在。
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(src, dest);
  } else if (stat.isSymbolicLink()) {
    // 符号链接：按 force 规则覆盖目标，再创建同目标链接。
    if (fs.existsSync(dest)) {
      if (!force) return;
      fs.unlinkSync(dest);
    }
    const target = fs.readlinkSync(src);
    fs.symlinkSync(target, dest);
  }
}
