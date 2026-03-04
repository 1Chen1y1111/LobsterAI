import { app } from "electron";
import EventEmitter from "events";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import initSqlJs, { Database, SqlJsStatic } from "sql.js";
import { DB_FILENAME } from "./appConstants";

/**
 * 主进程 SQLite 存储层（基于 sql.js）。
 *
 * 职责：
 * 1. 提供轻量 KV 存储能力（兼容旧 electron-store 数据）。
 * 2. 管理 cowork、memory、scheduled task 等业务表结构。
 * 3. 在启动时执行可重复的增量迁移，保证历史版本可升级。
 */
type ChangePayload<T = unknown> = {
  key: string;
  newValue: T | undefined;
  oldValue: T | undefined;
};

// 用于标记“旧版 MEMORY.md -> user_memories”迁移是否已完成。
const USER_MEMORIES_MIGRATION_KEY = "userMemories.migration.v1.completed";

/**
 * 从磁盘直接读取 sql.js 的 wasm 二进制，并交给 initSqlJs。
 *
 * 这样做的原因：
 * - 在 Windows 的非 ASCII 路径（如中文用户名目录）下更稳定。
 * - 避免依赖 Emscripten 的路径定位逻辑导致加载失败。
 */
function loadWasmBinary(): ArrayBuffer {
  const wasmPath = app.isPackaged
    ? path.join(
        process.resourcesPath,
        "app.asar.unpacked/node_modules/sql.js/dist/sql-wasm.wasm",
      )
    : path.join(app.getAppPath(), "node_modules/sql.js/dist/sql-wasm.wasm");
  const buf = fs.readFileSync(wasmPath);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

export class SqliteStore {
  // sql.js 的内存数据库句柄。所有 SQL 操作都在该实例上执行。
  private db: Database;
  // sqlite 文件持久化路径（通常位于 userData 目录）。
  private dbPath: string;
  // 仅用于 set/delete 后派发 change 事件。
  private emitter = new EventEmitter();
  // 进程级 sql.js 初始化缓存，避免重复加载 wasm。
  private static sqlPromise: Promise<SqlJsStatic> | null = null;

  private constructor(db: Database, dbPath: string) {
    this.db = db;
    this.dbPath = dbPath;
  }

  /**
   * 工厂方法：创建并初始化 SqliteStore。
   *
   * 步骤：
   * 1. 计算数据库路径。
   * 2. 初始化 sql.js（首次调用才会加载 wasm）。
   * 3. 读取已存在的 sqlite 文件，或创建空库。
   * 4. 建表并执行迁移。
   */
  static async create(userDataPath?: string): Promise<SqliteStore> {
    const basePath = userDataPath ?? app.getPath("userData");
    const dbPath = path.join(basePath, DB_FILENAME);

    // 初始化 SQL.js（通过静态 Promise 复用，避免重复初始化）。
    if (!SqliteStore.sqlPromise) {
      const wasmBinary = loadWasmBinary();
      SqliteStore.sqlPromise = initSqlJs({
        wasmBinary,
      });
    }
    const SQL = await SqliteStore.sqlPromise;

    // 读取已有数据库；若文件不存在则创建空数据库。
    let db: Database;
    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }

    const store = new SqliteStore(db, dbPath);
    store.initializeTables(basePath);
    return store;
  }

  /**
   * 初始化所有业务表并执行历史迁移。
   *
   * 迁移策略：
   * - 先 CREATE TABLE IF NOT EXISTS，保证冷启动可用。
   * - 对列级变更通过 PRAGMA table_info 检查后再 ALTER。
   * - 迁移失败尽量降级处理，避免阻塞启动。
   */
  private initializeTables(basePath: string) {
    // 通用键值表：保存配置、迁移标记等轻量数据。
    this.db.run(`
      CREATE TABLE IF NOT EXISTS kv (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // Cowork 会话主表。
    this.db.run(`
      CREATE TABLE IF NOT EXISTS cowork_sessions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        claude_session_id TEXT,
        status TEXT NOT NULL DEFAULT 'idle',
        pinned INTEGER NOT NULL DEFAULT 0,
        cwd TEXT NOT NULL,
        system_prompt TEXT NOT NULL DEFAULT '',
        execution_mode TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // Cowork 消息表，按 session_id 关联到会话。
    this.db.run(`
      CREATE TABLE IF NOT EXISTS cowork_messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        metadata TEXT,
        created_at INTEGER NOT NULL,
        sequence INTEGER,
        FOREIGN KEY (session_id) REFERENCES cowork_sessions(id) ON DELETE CASCADE
      );
    `);

    // 消息按会话读取时使用该索引。
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_cowork_messages_session_id ON cowork_messages(session_id);
    `);

    // Cowork 配置表（如 execution mode、cwd 等）。
    this.db.run(`
      CREATE TABLE IF NOT EXISTS cowork_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // 结构化用户记忆表。
    this.db.run(`
      CREATE TABLE IF NOT EXISTS user_memories (
        id TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        fingerprint TEXT NOT NULL,
        confidence REAL NOT NULL DEFAULT 0.75,
        is_explicit INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'created',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        last_used_at INTEGER
      );
    `);

    // 记忆来源表（记录来自哪个会话/消息）。
    this.db.run(`
      CREATE TABLE IF NOT EXISTS user_memory_sources (
        id TEXT PRIMARY KEY,
        memory_id TEXT NOT NULL,
        session_id TEXT,
        message_id TEXT,
        role TEXT NOT NULL DEFAULT 'system',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (memory_id) REFERENCES user_memories(id) ON DELETE CASCADE
      );
    `);

    // 记忆查询相关索引。
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_user_memories_status_updated_at
      ON user_memories(status, updated_at DESC);
    `);
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_user_memories_fingerprint
      ON user_memories(fingerprint);
    `);
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_user_memory_sources_session_id
      ON user_memory_sources(session_id, is_active);
    `);
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_user_memory_sources_memory_id
      ON user_memory_sources(memory_id, is_active);
    `);

    // 定时任务主表。
    this.db.run(`
      CREATE TABLE IF NOT EXISTS scheduled_tasks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        enabled INTEGER NOT NULL DEFAULT 1,
        schedule_json TEXT NOT NULL,
        prompt TEXT NOT NULL,
        working_directory TEXT NOT NULL DEFAULT '',
        system_prompt TEXT NOT NULL DEFAULT '',
        execution_mode TEXT NOT NULL DEFAULT 'auto',
        expires_at TEXT,
        notify_platforms_json TEXT NOT NULL DEFAULT '[]',
        next_run_at_ms INTEGER,
        last_run_at_ms INTEGER,
        last_status TEXT,
        last_error TEXT,
        last_duration_ms INTEGER,
        running_at_ms INTEGER,
        consecutive_errors INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // 调度器扫描“可执行任务”时使用该索引。
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_next_run
        ON scheduled_tasks(enabled, next_run_at_ms);
    `);

    // 定时任务执行记录表。
    this.db.run(`
      CREATE TABLE IF NOT EXISTS scheduled_task_runs (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        session_id TEXT,
        status TEXT NOT NULL,
        started_at TEXT NOT NULL,
        finished_at TEXT,
        duration_ms INTEGER,
        error TEXT,
        trigger_type TEXT NOT NULL DEFAULT 'scheduled',
        FOREIGN KEY (task_id) REFERENCES scheduled_tasks(id) ON DELETE CASCADE
      );
    `);

    // 查询任务历史执行记录时使用该索引。
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_task_runs_task_id
        ON scheduled_task_runs(task_id, started_at DESC);
    `);

    // 迁移：给 cowork 表补充历史缺失字段。
    try {
      // 先读取 cowork_sessions 的列信息，再按需 ALTER TABLE。
      const colsResult = this.db.exec("PRAGMA table_info(cowork_sessions);");
      const columns = colsResult[0]?.values.map((row) => row[1]) || [];

      if (!columns.includes("execution_mode")) {
        this.db.run(
          "ALTER TABLE cowork_sessions ADD COLUMN execution_mode TEXT;",
        );
        this.save();
      }

      if (!columns.includes("pinned")) {
        this.db.run(
          "ALTER TABLE cowork_sessions ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0;",
        );
        this.save();
      }

      if (!columns.includes("active_skill_ids")) {
        this.db.run(
          "ALTER TABLE cowork_sessions ADD COLUMN active_skill_ids TEXT;",
        );
        this.save();
      }

      // 迁移：给 cowork_messages 增加 sequence。
      const msgColsResult = this.db.exec("PRAGMA table_info(cowork_messages);");
      const msgColumns = msgColsResult[0]?.values.map((row) => row[1]) || [];

      if (!msgColumns.includes("sequence")) {
        this.db.run("ALTER TABLE cowork_messages ADD COLUMN sequence INTEGER");

        // 为历史消息回填 sequence，确保同会话内顺序稳定。
        this.db.run(`
          WITH numbered AS (
            SELECT id, ROW_NUMBER() OVER (
              PARTITION BY session_id
              ORDER BY created_at ASC, ROWID ASC
            ) as seq
            FROM cowork_messages
          )
          UPDATE cowork_messages
          SET sequence = (SELECT seq FROM numbered WHERE numbered.id = cowork_messages.id)
        `);

        this.save();
      }
    } catch {
      // 列已存在或当前数据库无需迁移时忽略。
    }

    try {
      this.db.run(
        "UPDATE cowork_sessions SET pinned = 0 WHERE pinned IS NULL;",
      );
    } catch {
      // 某些旧版本可能没有 pinned 列，忽略即可。
    }

    try {
      // 历史值 container 统一迁移为 sandbox。
      this.db.run(
        `UPDATE cowork_sessions SET execution_mode = 'sandbox' WHERE execution_mode = 'container';`,
      );
      this.db.run(`
        UPDATE cowork_config
        SET value = 'sandbox'
        WHERE key = 'executionMode' AND value = 'container';
      `);
    } catch (error) {
      console.warn("Failed to migrate cowork execution mode:", error);
    }

    // 迁移：给 scheduled_tasks 增加 expires_at / notify_platforms_json。
    try {
      const stColsResult = this.db.exec("PRAGMA table_info(scheduled_tasks);");
      if (stColsResult[0]) {
        const stColumns = stColsResult[0].values.map((row) => row[1]) || [];

        if (!stColumns.includes("expires_at")) {
          this.db.run("ALTER TABLE scheduled_tasks ADD COLUMN expires_at TEXT");
          this.save();
        }

        if (!stColumns.includes("notify_platforms_json")) {
          this.db.run(
            "ALTER TABLE scheduled_tasks ADD COLUMN notify_platforms_json TEXT NOT NULL DEFAULT '[]'",
          );
          this.save();
        }
      }
    } catch {
      // 迁移不需要或表尚未创建时忽略。
    }

    // 迁移旧版 MEMORY.md 内容到结构化记忆表。
    this.migrateLegacyMemoryFileToUserMemories();
    // 迁移旧版 electron-store 配置数据到 kv 表。
    this.migrateFromElectronStore(basePath);
    // 初始化/迁移结束后统一落盘。
    this.save();
  }

  /**
   * 将旧版 MEMORY.md 的列表项迁移到 user_memories / user_memory_sources。
   * 使用 kv 标记保证该迁移只执行一次。
   */
  private migrateLegacyMemoryFileToUserMemories(): void {
    if (this.get<string>(USER_MEMORIES_MIGRATION_KEY) === "1") {
      return;
    }

    const content = this.tryReadLegacyMemoryText();
    if (!content.trim()) {
      this.set(USER_MEMORIES_MIGRATION_KEY, "1");
      return;
    }

    const entries = this.parseLegacyMemoryEntries(content);
    if (entries.length === 0) {
      this.set(USER_MEMORIES_MIGRATION_KEY, "1");
      return;
    }

    const now = Date.now();
    // 事务保证导入过程原子性，失败则整体回滚。
    this.db.run("BEGIN TRANSACTION;");
    try {
      for (const text of entries) {
        // 基于 fingerprint 去重，避免重复导入同一记忆。
        const fingerprint = this.memoryFingerprint(text);
        const existing = this.db.exec(
          `SELECT id FROM user_memories WHERE fingerprint = ? AND status != 'deleted' LIMIT 1`,
          [fingerprint],
        );
        if (existing[0]?.values?.[0]?.[0]) {
          continue;
        }

        const memoryId = crypto.randomUUID();
        // 导入为显式记忆（is_explicit = 1），并设置较高初始置信度。
        this.db.run(
          `
          INSERT INTO user_memories (
            id, text, fingerprint, confidence, is_explicit, status, created_at, updated_at, last_used_at
          ) VALUES (?, ?, ?, ?, 1, 'created', ?, ?, NULL)
        `,
          [memoryId, text, fingerprint, 0.9, now, now],
        );

        // 写入来源记录，旧数据来源统一标记为 system。
        this.db.run(
          `
          INSERT INTO user_memory_sources (id, memory_id, session_id, message_id, role, is_active, created_at)
          VALUES (?, ?, NULL, NULL, 'system', 1, ?)
        `,
          [crypto.randomUUID(), memoryId, now],
        );
      }

      this.db.run("COMMIT;");
    } catch (error) {
      this.db.run("ROLLBACK;");
      console.warn("Failed to migrate legacy MEMORY.md entries:", error);
    }

    // 即使出现异常也写入迁移标记，避免每次启动重复尝试同一批旧数据。
    this.set(USER_MEMORIES_MIGRATION_KEY, "1");
  }

  /**
   * 生成记忆文本指纹，用于迁移与去重。
   *
   * 处理步骤：
   * 1. 转小写，降低大小写差异带来的重复。
   * 2. 将标点/符号归一为空格，仅保留字母、数字和空白。
   * 3. 合并连续空白并 trim，减少格式噪声影响。
   * 4. 对规范化结果计算 SHA-1，得到稳定短指纹。
   *
   * 这里使用 SHA-1 不是用于安全场景，只用于内容相等性近似去重。
   */
  private memoryFingerprint(text: string): string {
    const normalized = text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
    return crypto.createHash("sha1").update(normalized).digest("hex");
  }

  /**
   * 将旧版 electron-store(config.json) 迁移到 kv 表。
   * 仅在 kv 当前为空时执行，避免覆盖已存在的新版本数据。
   */
  private migrateFromElectronStore(userDataPath: string) {
    const result = this.db.exec("SELECT COUNT(*) as count FROM kv");
    const count = result[0]?.values[0]?.[0] as number;
    if (count > 0) return;

    const legacyPath = path.join(userDataPath, "config.json");
    if (!fs.existsSync(legacyPath)) return;

    try {
      const raw = fs.readFileSync(legacyPath, "utf8");
      const data = JSON.parse(raw) as Record<string, unknown>;
      if (!data || typeof data !== "object") return;

      const entries = Object.entries(data);
      if (!entries.length) return;

      const now = Date.now();
      // 事务写入，保证迁移的一致性。
      this.db.run("BEGIN TRANSACTION;");
      try {
        entries.forEach(([key, value]) => {
          this.db.run(
            `
            INSERT INTO kv (key, value, updated_at)
            VALUES (?, ?, ?)
          `,
            [key, JSON.stringify(value), now],
          );
        });
        this.db.run("COMMIT;");
        this.save();
        console.info(`Migrated ${entries.length} entries from electron-store.`);
      } catch (error) {
        this.db.run("ROLLBACK;");
        throw error;
      }
    } catch (error) {
      console.warn("Failed to migrate electron-store data:", error);
    }
  }

  /**
   * 尝试读取旧版 MEMORY.md 内容。
   * 按候选路径顺序查找，命中后立即返回。
   */
  private tryReadLegacyMemoryText(): string {
    const candidates = [
      path.join(process.cwd(), "MEMORY.md"),
      path.join(app.getAppPath(), "MEMORY.md"),
      path.join(process.cwd(), "memory.md"),
      path.join(app.getAppPath(), "memory.md"),
    ];

    for (const candidate of candidates) {
      try {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          return fs.readFileSync(candidate, "utf8");
        }
      } catch {
        // Skip unreadable candidates.
      }
    }
    return "";
  }

  /**
   * 从旧版 MEMORY.md 文本中提取可迁移条目。
   *
   * 处理规则：
   * 1. 去掉代码块内容。
   * 2. 仅提取 markdown 列表项。
   * 3. 过滤空值、极短值、(empty) 伪值。
   * 4. 忽略重复项，并限制最大条目数。
   */
  private parseLegacyMemoryEntries(raw: string): string[] {
    const normalized = raw.replace(/```[\s\S]*?```/g, " ");
    const lines = normalized.split(/\r?\n/);
    const entries: string[] = [];
    const seen = new Set<string>();

    for (const line of lines) {
      const match = line.trim().match(/^-+\s*(?:\[[^\]]+\]\s*)?(.+)$/);
      if (!match?.[1]) continue;
      const text = match[1].replace(/\s+/g, " ").trim();
      if (!text || text.length < 6) continue;
      if (/^\(empty\)$/i.test(text)) continue;
      const key = text.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push(text.length > 360 ? `${text.slice(0, 359)}...` : text);
    }

    return entries.slice(0, 200);
  }

  /**
   * 将 sql.js 内存数据库导出并写回磁盘文件。
   * 当前为整库覆盖写入模式，简单稳定但在大库下写放大更明显。
   */
  save() {
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(this.dbPath, buffer);
  }

  /**
   * 从 kv 表读取并反序列化指定 key 的值。
   * 如果值不存在或 JSON 解析失败，返回 undefined。
   */
  get<T = unknown>(key: string): T | undefined {
    const result = this.db.exec("SELECT value FROM kv WHERE key = ?", [key]);
    if (!result[0]?.values[0]) return undefined;
    const value = result[0].values[0][0] as string;
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      console.warn(`Failed to parse store value for ${key}`, error);
      return undefined;
    }
  }

  /**
   * 写入 kv 值（UPSERT）。
   * 写入后立即落盘，并派发 change 事件（包含 old/new 值）。
   */
  set<T = unknown>(key: string, value: T): void {
    const oldValue = this.get<T>(key);
    const now = Date.now();
    this.db.run(
      `
      INSERT INTO kv (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `,
      [key, JSON.stringify(value), now],
    );
    this.save();
    this.emitter.emit("change", {
      key,
      newValue: value,
      oldValue,
    } as ChangePayload<T>);
  }

  /**
   * 删除 kv 值并派发 change 事件。
   */
  delete(key: string): void {
    const oldValue = this.get(key);
    this.db.run("DELETE FROM kv WHERE key = ?", [key]);
    this.save();
    this.emitter.emit("change", {
      key,
      newValue: undefined,
      oldValue,
    } as ChangePayload);
  }
}
