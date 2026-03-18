/**
 * 这个文件负责定时任务的调度与执行。
 *
 * 主要职责：
 * 1. 根据 `ScheduledTaskStore` 里记录的下一次触发时间安排定时器。
 * 2. 到点后执行定时任务，并通过 `CoworkRunner` 拉起对应的 AI 会话。
 * 3. 维护任务运行态、运行历史、连续失败次数和自动停用逻辑。
 * 4. 在任务结束后向渲染层广播状态更新，并按配置发送 IM 通知。
 */

import { BrowserWindow } from 'electron'
import { ScheduledTaskStore, ScheduledTask, ScheduledTaskRun } from '../scheduledTaskStore'
import type { CoworkStore } from '../coworkStore'
import type { CoworkRunner } from './coworkRunner'
import type { IMGatewayManager } from '../im/imGatewayManager'

// Scheduler 启动和执行所需的外部依赖。
interface SchedulerDeps {
  scheduledTaskStore: ScheduledTaskStore
  coworkStore: CoworkStore
  getCoworkRunner: () => CoworkRunner
  getIMGatewayManager?: () => IMGatewayManager | null
  getSkillsPrompt?: () => Promise<string | null>
}

// 定时任务调度器，负责安排、执行和广播 scheduled task。
export class Scheduler {
  // 定时任务存储，用于查询和更新任务状态。
  private store: ScheduledTaskStore

  // Cowork 会话存储，用于为定时任务创建会话。
  private coworkStore: CoworkStore

  // 延迟获取 CoworkRunner，避免初始化阶段依赖顺序问题。
  private getCoworkRunner: () => CoworkRunner

  // 可选的 IM 网关管理器，用于发送执行完成通知。
  private getIMGatewayManager: (() => IMGatewayManager | null) | null

  // 可选的 skills prompt 构造器，用于补充定时任务的系统提示词。
  private getSkillsPrompt: (() => Promise<string | null>) | null

  // 当前挂起的调度定时器。
  private timer: ReturnType<typeof setTimeout> | null = null

  // 调度器是否已启动。
  private running = false

  // 正在执行中的任务及其 abort controller。
  private activeTasks: Map<string, AbortController> = new Map()

  // 记录运行中任务对应的 Cowork session ID，便于外部停止任务时连带终止会话。
  private taskSessionIds: Map<string, string> = new Map()

  // 单次 setTimeout 的最大等待时间，避免超长定时器带来的不确定性。
  private static readonly MAX_TIMER_INTERVAL_MS = 60_000

  // 连续失败达到该阈值后自动停用任务。
  private static readonly MAX_CONSECUTIVE_ERRORS = 5

  // 注入调度器依赖。
  constructor(deps: SchedulerDeps) {
    this.store = deps.scheduledTaskStore
    this.coworkStore = deps.coworkStore
    this.getCoworkRunner = deps.getCoworkRunner
    this.getIMGatewayManager = deps.getIMGatewayManager ?? null
    this.getSkillsPrompt = deps.getSkillsPrompt ?? null
  }

  // --- Lifecycle ---

  // 启动调度器并立即安排下一次检查。
  start(): void {
    if (this.running) return
    this.running = true
    console.log('[Scheduler] Started')
    this.scheduleNext()
  }

  // 停止调度器，清理定时器并中止所有正在运行的任务。
  stop(): void {
    this.running = false
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    for (const [, controller] of this.activeTasks) {
      controller.abort()
    }
    this.activeTasks.clear()
    console.log('[Scheduler] Stopped')
  }

  // 任务列表或任务状态变化后，重新计算下一次调度时间。
  reschedule(): void {
    if (!this.running) return
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.scheduleNext()
  }

  // --- Core Scheduling ---

  // 读取最近一条到期任务并安排下一次 tick。
  private scheduleNext(): void {
    if (!this.running) return

    const nextDueMs = this.store.getNextDueTimeMs()
    const now = Date.now()

    let delayMs: number
    if (nextDueMs === null) {
      delayMs = Scheduler.MAX_TIMER_INTERVAL_MS
    } else {
      delayMs = Math.min(Math.max(nextDueMs - now, 0), Scheduler.MAX_TIMER_INTERVAL_MS)
    }

    this.timer = setTimeout(() => {
      this.timer = null
      void this.tick()
    }, delayMs)
  }

  // 取出所有已到期任务并并发执行，然后继续安排下一轮调度。
  private async tick(): Promise<void> {
    if (!this.running) return

    const now = Date.now()
    const dueTasks = this.store.getDueTasks(now)

    const executions = dueTasks.map((task) => this.executeTask(task, 'scheduled'))
    await Promise.allSettled(executions)

    this.scheduleNext()
  }

  // --- Task Execution ---

  // 执行单个任务，统一处理运行记录、状态更新、自动停用和通知。
  async executeTask(task: ScheduledTask, trigger: 'scheduled' | 'manual'): Promise<void> {
    if (this.activeTasks.has(task.id)) {
      console.log(`[Scheduler] Task ${task.id} already running, skipping`)
      return
    }

    // 定时触发时要检查任务是否已过期；手动执行不受该限制。
    if (trigger === 'scheduled' && task.expiresAt) {
      const todayStr = new Date().toISOString().slice(0, 10)
      if (task.expiresAt <= todayStr) {
        console.log(`[Scheduler] Task ${task.id} expired (${task.expiresAt}), skipping`)
        return
      }
    }

    const startTime = Date.now()
    const run = this.store.createRun(task.id, trigger)

    this.store.markTaskRunning(task.id, startTime)
    this.emitTaskStatusUpdate(task.id)
    this.emitRunUpdate(run)

    const abortController = new AbortController()
    this.activeTasks.set(task.id, abortController)

    let sessionId: string | null = null
    let success = false
    let error: string | null = null

    try {
      // 真正的执行动作是启动一个对应的 Cowork 会话。
      sessionId = await this.startCoworkSession(task)
      success = true
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : String(err)
      console.error(`[Scheduler] Task ${task.id} failed:`, error)
    } finally {
      const durationMs = Date.now() - startTime
      this.activeTasks.delete(task.id)
      this.taskSessionIds.delete(task.id)

      // 任务运行期间可能被用户删除；删除后不再写回执行结果。
      const taskStillExists = this.store.getTask(task.id) !== null

      if (taskStillExists) {
        // 更新本次运行记录。
        this.store.completeRun(run.id, success ? 'success' : 'error', sessionId, durationMs, error)

        // 更新任务聚合状态。
        this.store.markTaskCompleted(task.id, success, durationMs, error, task.schedule)

        // 连续失败过多时自动停用，避免异常任务持续占用调度器。
        const updatedTask = this.store.getTask(task.id)
        if (updatedTask && updatedTask.state.consecutiveErrors >= Scheduler.MAX_CONSECUTIVE_ERRORS) {
          this.store.toggleTask(task.id, false)
          console.warn(`[Scheduler] Task ${task.id} auto-disabled after ${Scheduler.MAX_CONSECUTIVE_ERRORS} consecutive errors`)
        }

        // 一次性 `at` 任务执行完成后自动关闭。
        if (task.schedule.type === 'at') {
          this.store.toggleTask(task.id, false)
        }

        // 限制任务历史运行记录数量。
        this.store.pruneRuns(task.id, 100)

        // 按配置发送 IM 通知。
        if (task.notifyPlatforms && task.notifyPlatforms.length > 0) {
          await this.sendNotifications(task, success, durationMs, error, sessionId)
        }

        // 广播最终状态更新给渲染层。
        this.emitTaskStatusUpdate(task.id)
        const updatedRun = this.store.getRun(run.id)
        if (updatedRun) {
          this.emitRunUpdate(updatedRun)
        }
      } else {
        console.log(`[Scheduler] Task ${task.id} was deleted during execution, skipping post-run updates`)
      }

      this.reschedule()
    }
  }

  // 为定时任务创建一个 Cowork 会话，并交给 runner 执行。
  private async startCoworkSession(task: ScheduledTask): Promise<string> {
    const config = this.coworkStore.getConfig()
    const cwd = task.workingDirectory || config.workingDirectory
    const baseSystemPrompt = task.systemPrompt || config.systemPrompt
    let skillsPrompt: string | null = null

    if (this.getSkillsPrompt) {
      try {
        skillsPrompt = await this.getSkillsPrompt()
      } catch (error) {
        console.warn('[Scheduler] Failed to build skills prompt for scheduled task:', error)
      }
    }

    const systemPrompt = [skillsPrompt, baseSystemPrompt].filter((prompt): prompt is string => Boolean(prompt?.trim())).join('\n\n')
    const executionMode = task.executionMode || config.executionMode || 'auto'

    // 先创建会话实体，后续状态和消息都挂在这条 session 上。
    const session = this.coworkStore.createSession(`[定时] ${task.name}`, cwd, systemPrompt, executionMode, [])

    // 立即标记为运行中。
    this.coworkStore.updateSession(session.id, { status: 'running' })

    // 把任务 prompt 作为首条用户消息写入。
    this.coworkStore.addMessage(session.id, {
      type: 'user',
      content: task.prompt
    })

    // 使用正常权限确认流启动，不做自动批准。
    this.taskSessionIds.set(task.id, session.id)
    const runner = this.getCoworkRunner()
    await runner.startSession(session.id, task.prompt, {
      skipInitialUserMessage: true,
      confirmationMode: 'text'
    })

    return session.id
  }

  // --- IM Notifications ---

  // 在任务结束后向配置的平台发送通知消息。
  private async sendNotifications(
    task: ScheduledTask,
    success: boolean,
    durationMs: number,
    error: string | null,
    sessionId: string | null
  ): Promise<void> {
    const imManager = this.getIMGatewayManager?.()
    if (!imManager) return

    const status = success ? '成功' : '失败'
    const durationStr = durationMs < 1000 ? `${durationMs}ms` : `${(durationMs / 1000).toFixed(1)}s`

    let header = `定时任务通知\n\n任务: ${task.name}\n状态: ${status}\n耗时: ${durationStr}`
    if (error) {
      header += `\n错误: ${error}`
    }

    // 成功时尽量带上完整 AI 回复，方便在 IM 侧直接看到结果。
    let fullReplyText = ''
    if (sessionId && success) {
      try {
        const session = this.coworkStore.getSession(sessionId)
        if (session) {
          const assistantMessages = session.messages.filter((msg) => msg.type === 'assistant' && msg.content && !msg.metadata?.isThinking)
          fullReplyText = assistantMessages.map((message) => message.content).join('\n\n')
        }
      } catch (err: unknown) {
        console.warn('[Scheduler] Failed to extract session result for notification:', err)
      }
    }

    // 组装通知正文，并限制结果摘要长度。
    let message = header
    if (fullReplyText) {
      const maxResultLength = 1500
      const resultSnippet = fullReplyText.length > maxResultLength ? `${fullReplyText.slice(0, maxResultLength)}...` : fullReplyText
      message += `\n\n执行结果:\n${resultSnippet}`
    }

    for (const platform of task.notifyPlatforms) {
      try {
        // 使用支持媒体的通知接口，兼容 AI 回复中的媒体标记。
        await imManager.sendNotificationWithMedia(platform, message)
        console.log(`[Scheduler] Notification sent via ${platform} for task ${task.id}`)
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err)
        console.warn(`[Scheduler] Failed to send notification via ${platform}: ${errMsg}`)
      }
    }
  }

  // --- Manual Execution ---

  // 手动执行一个任务，复用统一的任务执行链路。
  async runManually(taskId: string): Promise<void> {
    const task = this.store.getTask(taskId)
    if (!task) throw new Error(`Task not found: ${taskId}`)
    await this.executeTask(task, 'manual')
  }

  // 停止正在运行的任务，并尽量连带停止其对应的 Cowork 会话。
  stopTask(taskId: string): boolean {
    const controller = this.activeTasks.get(taskId)
    if (controller) {
      const sessionId = this.taskSessionIds.get(taskId)
      if (sessionId) {
        try {
          this.getCoworkRunner().stopSession(sessionId)
        } catch (err) {
          console.warn(`[Scheduler] Failed to stop cowork session for task ${taskId}:`, err)
        }
      }
      controller.abort()
      return true
    }
    return false
  }

  // --- Event Emission ---

  // 向所有存活窗口广播任务聚合状态。
  private emitTaskStatusUpdate(taskId: string): void {
    const task = this.store.getTask(taskId)
    if (!task) return

    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send('scheduledTask:statusUpdate', {
          taskId: task.id,
          state: task.state
        })
      }
    })
  }

  // 向所有存活窗口广播单次运行记录更新。
  private emitRunUpdate(run: ScheduledTaskRun): void {
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send('scheduledTask:runUpdate', { run })
      }
    })
  }
}
