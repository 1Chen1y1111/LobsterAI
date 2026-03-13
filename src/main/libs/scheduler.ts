import { BrowserWindow } from 'electron'
import { ScheduledTaskStore, ScheduledTask, ScheduledTaskRun, Schedule, NotifyPlatform } from '../scheduledTaskStore'
import type { CoworkStore } from '../coworkStore'

interface SchedulerDeps {
  scheduledTaskStore: ScheduledTaskStore
  coworkStore: CoworkStore
  getSkillsPrompt?: () => Promise<string | null>
}

export class Scheduler {
  private store: ScheduledTaskStore
  private coworkStore: CoworkStore
  private getSkillsPrompt: (() => Promise<string | null>) | null
  private timer: ReturnType<typeof setTimeout> | null = null
  private running = false
  private activeTasks: Map<string, AbortController> = new Map()
  // Track cowork session IDs for running tasks so we can stop them
  private taskSessionIds: Map<string, string> = new Map()

  private static readonly MAX_TIMER_INTERVAL_MS = 60_000
  private static readonly MAX_CONSECUTIVE_ERRORS = 5

  constructor(deps: SchedulerDeps) {
    this.store = deps.scheduledTaskStore
    this.coworkStore = deps.coworkStore
    this.getSkillsPrompt = deps.getSkillsPrompt ?? null
  }

  // --- Lifecycle ---

  start(): void {
    if (this.running) return
    this.running = true
    console.log('[Scheduler] Started')
    this.scheduleNext()
  }

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

  reschedule(): void {
    if (!this.running) return
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.scheduleNext()
  }

  // --- Core Scheduling ---

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
      this.tick()
    }, delayMs)
  }

  private async tick(): Promise<void> {
    if (!this.running) return

    const now = Date.now()
    const dueTasks = this.store.getDueTasks(now)

    // const executions = dueTasks.map((task) => this.executeTask(task, 'scheduled'));
    // await Promise.allSettled(executions);

    // this.scheduleNext();
  }
}
