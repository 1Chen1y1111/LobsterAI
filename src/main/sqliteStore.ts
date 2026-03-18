import { app } from 'electron'
import { EventEmitter } from 'events'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import initSqlJs, { Database, SqlJsStatic } from 'sql.js'
import { DB_FILENAME } from './appConstants'

type ChangePayload<T = unknown> = {
  key: string
  newValue: T | undefined
  oldValue: T | undefined
}

// 标记“旧版记忆文件迁移到 user_memories”是否已完成。
const USER_MEMORIES_MIGRATION_KEY = 'userMemories.migration.v1.completed'

// 预先从磁盘读取 sql.js 的 WASM 二进制。
// 使用 fs.readFileSync（Windows 下可正确处理非 ASCII 路径）后直接传给 initSqlJs，
// 可绕过 Emscripten 默认的文件加载流程，避免安装路径含中文时出现失败或卡死。
function loadWasmBinary(): ArrayBuffer {
  const wasmPath = app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked/node_modules/sql.js/dist/sql-wasm.wasm')
    : path.join(app.getAppPath(), 'node_modules/sql.js/dist/sql-wasm.wasm')
  const buf = fs.readFileSync(wasmPath)
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
}

export class SqliteStore {
  // SQL.js 数据库实例。
  private db: Database
  // SQLite 文件落盘路径。
  private dbPath: string
  // 键值变更事件分发器。
  private emitter = new EventEmitter()
  // SQL.js 初始化 Promise 缓存，避免重复初始化 WASM。
  private static sqlPromise: Promise<SqlJsStatic> | null = null

  // 构造函数：通过静态工厂 create 统一创建实例。
  private constructor(db: Database, dbPath: string) {
    this.db = db
    this.dbPath = dbPath
  }

  // 创建并初始化存储实例（含建表与迁移）。
  static async create(userDataPath?: string): Promise<SqliteStore> {
    const basePath = userDataPath ?? app.getPath('userData')
    const dbPath = path.join(basePath, DB_FILENAME)

    // 初始化 SQL.js（复用缓存 Promise，避免多次加载 WASM）。
    if (!SqliteStore.sqlPromise) {
      const wasmBinary = loadWasmBinary()
      SqliteStore.sqlPromise = initSqlJs({
        wasmBinary
      })
    }
    const SQL = await SqliteStore.sqlPromise

    // 优先加载已有数据库文件，不存在则新建数据库。
    let db: Database
    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath)
      db = new SQL.Database(buffer)
    } else {
      db = new SQL.Database()
    }

    const store = new SqliteStore(db, dbPath)
    store.initializeTables(basePath)
    return store
  }

  // 初始化所有业务表、索引与历史迁移逻辑。
  private initializeTables(basePath: string) {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS kv (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `)

    // 创建协作会话相关表。
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
    `)

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
    `)

    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_cowork_messages_session_id ON cowork_messages(session_id);
    `)

    this.db.run(`
      CREATE TABLE IF NOT EXISTS cowork_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `)

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
    `)

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
    `)

    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_user_memories_status_updated_at
      ON user_memories(status, updated_at DESC);
    `)
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_user_memories_fingerprint
      ON user_memories(fingerprint);
    `)
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_user_memory_sources_session_id
      ON user_memory_sources(session_id, is_active);
    `)
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_user_memory_sources_memory_id
      ON user_memory_sources(memory_id, is_active);
    `)

    // 创建定时任务相关表。
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
    `)

    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_next_run
        ON scheduled_tasks(enabled, next_run_at_ms);
    `)

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
    `)

    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_task_runs_task_id
        ON scheduled_task_runs(task_id, started_at DESC);
    `)

    // 创建 MCP 服务配置表。
    this.db.run(`
      CREATE TABLE IF NOT EXISTS mcp_servers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL DEFAULT '',
        enabled INTEGER NOT NULL DEFAULT 1,
        transport_type TEXT NOT NULL DEFAULT 'stdio',
        config_json TEXT NOT NULL DEFAULT '{}',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `)

    // 迁移：按需补齐缺失字段（幂等执行）。
    try {
      // 检查 cowork_sessions 的字段。
      const colsResult = this.db.exec('PRAGMA table_info(cowork_sessions);')
      const columns = colsResult[0]?.values.map((row) => row[1]) || []

      if (!columns.includes('execution_mode')) {
        this.db.run('ALTER TABLE cowork_sessions ADD COLUMN execution_mode TEXT;')
        this.save()
      }

      if (!columns.includes('pinned')) {
        this.db.run('ALTER TABLE cowork_sessions ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0;')
        this.save()
      }

      if (!columns.includes('active_skill_ids')) {
        this.db.run('ALTER TABLE cowork_sessions ADD COLUMN active_skill_ids TEXT;')
        this.save()
      }

      // 迁移：为 cowork_messages 增加 sequence 字段。
      const msgColsResult = this.db.exec('PRAGMA table_info(cowork_messages);')
      const msgColumns = msgColsResult[0]?.values.map((row) => row[1]) || []

      if (!msgColumns.includes('sequence')) {
        this.db.run('ALTER TABLE cowork_messages ADD COLUMN sequence INTEGER')

        // 为现有消息按 created_at 和 ROWID 分配序列号
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
        `)

        this.save()
      }
    } catch {
      // 字段已存在或当前版本无需迁移。
    }

    try {
      this.db.run('UPDATE cowork_sessions SET pinned = 0 WHERE pinned IS NULL;')
    } catch {
      // 旧版本可能尚未包含 pinned 字段。
    }

    try {
      this.db.run(`UPDATE cowork_sessions SET execution_mode = 'sandbox' WHERE execution_mode = 'container';`)
      this.db.run(`
        UPDATE cowork_config
        SET value = 'sandbox'
        WHERE key = 'executionMode' AND value = 'container';
      `)
    } catch (error) {
      console.warn('Failed to migrate cowork execution mode:', error)
    }

    // 迁移：为 scheduled_tasks 增加 expires_at 与 notify_platforms_json 字段。
    try {
      const stColsResult = this.db.exec('PRAGMA table_info(scheduled_tasks);')
      if (stColsResult[0]) {
        const stColumns = stColsResult[0].values.map((row) => row[1]) || []

        if (!stColumns.includes('expires_at')) {
          this.db.run('ALTER TABLE scheduled_tasks ADD COLUMN expires_at TEXT')
          this.save()
        }

        if (!stColumns.includes('notify_platforms_json')) {
          this.db.run("ALTER TABLE scheduled_tasks ADD COLUMN notify_platforms_json TEXT NOT NULL DEFAULT '[]'")
          this.save()
        }
      }
    } catch {
      // 当前无需迁移，或表尚未创建。
    }

    this.migrateLegacyMemoryFileToUserMemories()
    this.migrateFromElectronStore(basePath)
    this.save()
  }

  // 将内存数据库完整导出并同步写入磁盘文件。
  save() {
    const data = this.db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(this.dbPath, buffer)
  }

  // 订阅指定 key 的值变更，返回取消订阅函数。
  onDidChange<T = unknown>(key: string, callback: (newValue: T | undefined, oldValue: T | undefined) => void) {
    const handler = (payload: ChangePayload<T>) => {
      if (payload.key !== key) return
      callback(payload.newValue, payload.oldValue)
    }
    this.emitter.on('change', handler)
    return () => this.emitter.off('change', handler)
  }

  // 从 kv 表读取并反序列化指定 key 的值。
  get<T = unknown>(key: string): T | undefined {
    const result = this.db.exec('SELECT value FROM kv WHERE key = ?', [key])
    if (!result[0]?.values[0]) return undefined
    const value = result[0].values[0][0] as string
    try {
      return JSON.parse(value) as T
    } catch (error) {
      console.warn(`Failed to parse store value for ${key}`, error)
      return undefined
    }
  }

  // 向 kv 表写入指定 key 的值（不存在则插入，存在则更新）。
  set<T = unknown>(key: string, value: T): void {
    const oldValue = this.get<T>(key)
    const now = Date.now()
    this.db.run(
      `
      INSERT INTO kv (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `,
      [key, JSON.stringify(value), now]
    )
    this.save()
    this.emitter.emit('change', { key, newValue: value, oldValue } as ChangePayload<T>)
  }

  // 删除 kv 表中的指定 key，并触发变更事件。
  delete(key: string): void {
    const oldValue = this.get(key)
    this.db.run('DELETE FROM kv WHERE key = ?', [key])
    this.save()
    this.emitter.emit('change', { key, newValue: undefined, oldValue } as ChangePayload)
  }

  // 对外暴露底层数据库实例（供协作模块直接操作）。
  getDatabase(): Database {
    return this.db
  }

  // 对外暴露保存函数（例如供 CoworkStore 复用）。
  getSaveFunction(): () => void {
    return () => this.save()
  }

  // 读取历史 MEMORY.md/memory.md 内容（按候选路径顺序尝试）。
  private tryReadLegacyMemoryText(): string {
    const candidates = [
      path.join(process.cwd(), 'MEMORY.md'),
      path.join(app.getAppPath(), 'MEMORY.md'),
      path.join(process.cwd(), 'memory.md'),
      path.join(app.getAppPath(), 'memory.md')
    ]

    for (const candidate of candidates) {
      try {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          return fs.readFileSync(candidate, 'utf8')
        }
      } catch {
        // 跳过不可读取的候选文件。
      }
    }
    return ''
  }

  // 从历史记忆文本中提取条目，去重并裁剪长度。
  private parseLegacyMemoryEntries(raw: string): string[] {
    const normalized = raw.replace(/```[\s\S]*?```/g, ' ')
    const lines = normalized.split(/\r?\n/)
    const entries: string[] = []
    const seen = new Set<string>()

    for (const line of lines) {
      const match = line.trim().match(/^-+\s*(?:\[[^\]]+\]\s*)?(.+)$/)
      if (!match?.[1]) continue
      const text = match[1].replace(/\s+/g, ' ').trim()
      if (!text || text.length < 6) continue
      if (/^\(empty\)$/i.test(text)) continue
      const key = text.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      entries.push(text.length > 360 ? `${text.slice(0, 359)}…` : text)
    }

    return entries.slice(0, 200)
  }

  // 生成记忆指纹（用于去重匹配）。
  private memoryFingerprint(text: string): string {
    const normalized = text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    return crypto.createHash('sha1').update(normalized).digest('hex')
  }

  // 将历史 MEMORY.md 条目迁移到 user_memories/user_memory_sources 表。
  private migrateLegacyMemoryFileToUserMemories(): void {
    if (this.get<string>(USER_MEMORIES_MIGRATION_KEY) === '1') {
      return
    }

    const content = this.tryReadLegacyMemoryText()
    if (!content.trim()) {
      this.set(USER_MEMORIES_MIGRATION_KEY, '1')
      return
    }

    const entries = this.parseLegacyMemoryEntries(content)
    if (entries.length === 0) {
      this.set(USER_MEMORIES_MIGRATION_KEY, '1')
      return
    }

    const now = Date.now()
    this.db.run('BEGIN TRANSACTION;')
    try {
      // 已存在相同指纹的未删除记忆则跳过。
      for (const text of entries) {
        const fingerprint = this.memoryFingerprint(text)
        const existing = this.db.exec(`SELECT id FROM user_memories WHERE fingerprint = ? AND status != 'deleted' LIMIT 1`, [fingerprint])
        if (existing[0]?.values?.[0]?.[0]) {
          continue
        }

        const memoryId = crypto.randomUUID()
        // 插入主记忆记录。
        this.db.run(
          `
          INSERT INTO user_memories (
            id, text, fingerprint, confidence, is_explicit, status, created_at, updated_at, last_used_at
          ) VALUES (?, ?, ?, ?, 1, 'created', ?, ?, NULL)
        `,
          [memoryId, text, fingerprint, 0.9, now, now]
        )

        // 插入来源记录，标记为系统来源。
        this.db.run(
          `
          INSERT INTO user_memory_sources (id, memory_id, session_id, message_id, role, is_active, created_at)
          VALUES (?, ?, NULL, NULL, 'system', 1, ?)
        `,
          [crypto.randomUUID(), memoryId, now]
        )
      }

      this.db.run('COMMIT;')
    } catch (error) {
      this.db.run('ROLLBACK;')
      console.warn('Failed to migrate legacy MEMORY.md entries:', error)
    }

    // 无论是否迁移到新数据，都写入完成标记避免重复处理。
    this.set(USER_MEMORIES_MIGRATION_KEY, '1')
  }

  // 当 kv 为空时，从历史 electron-store(config.json) 迁移配置数据。
  private migrateFromElectronStore(userDataPath: string) {
    const result = this.db.exec('SELECT COUNT(*) as count FROM kv')
    const count = result[0]?.values[0]?.[0] as number
    if (count > 0) return

    const legacyPath = path.join(userDataPath, 'config.json')
    if (!fs.existsSync(legacyPath)) return

    try {
      const raw = fs.readFileSync(legacyPath, 'utf8')
      const data = JSON.parse(raw) as Record<string, unknown>
      if (!data || typeof data !== 'object') return

      const entries = Object.entries(data)
      if (!entries.length) return

      const now = Date.now()
      this.db.run('BEGIN TRANSACTION;')
      try {
        entries.forEach(([key, value]) => {
          this.db.run(
            `
            INSERT INTO kv (key, value, updated_at)
            VALUES (?, ?, ?)
          `,
            [key, JSON.stringify(value), now]
          )
        })
        this.db.run('COMMIT;')
        this.save()
        console.info(`Migrated ${entries.length} entries from electron-store.`)
      } catch (error) {
        this.db.run('ROLLBACK;')
        throw error
      }
    } catch (error) {
      console.warn('Failed to migrate electron-store data:', error)
    }
  }
}
