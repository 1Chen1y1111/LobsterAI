# `coworkRunner.ts` 阅读说明

## 这是什么

`src/main/libs/coworkRunner.ts` 是 Cowork 功能的执行引擎。

它不负责渲染 UI，也不是纯存储层；它负责把一轮用户输入真正跑起来，并把运行过程同步回存储层和前端。

可以把它理解成：

- `CoworkStore`：保存 session / message / config / memory
- `CoworkRunner`：驱动一次会话如何执行、如何流式返回、如何请求权限、如何结束
- `main.ts`：把 `CoworkRunner` 产生的事件转发给 renderer

在 `src/main/main.ts` 里，`getCoworkRunner()` 会创建它，并监听这些事件：

- `message`
- `messageUpdate`
- `permissionRequest`
- `complete`
- `error`

然后通过 IPC 转发给前端。

## 这个文件主要解决什么问题

这个文件把下面几类复杂度都收口到了一个地方：

1. 会话生命周期
2. 本地执行和沙箱执行的分流
3. Claude SDK / Claude Code 子进程启动
4. 工具权限确认
5. 流式文本、thinking、tool result 的拼装
6. MCP server 注入
7. 附件、工作区、技能路径的处理
8. 用户记忆的自动更新

所以它会显得很大，但核心职责其实只有一句话：

“协调一轮 Cowork 会话从启动到结束的所有运行时行为。”

## 对外接口

类：`CoworkRunner extends EventEmitter`

外部真正会调用的主要只有这些方法：

- `setMcpServerProvider()`
  - 注入“当前启用了哪些 MCP server”的提供函数
- `startSession(sessionId, prompt, options)`
  - 启动一轮新的 cowork 会话
- `continueSession(sessionId, prompt, options)`
  - 在已有会话上下文里继续下一轮
- `stopSession(sessionId)`
  - 主动停止当前会话
- `respondToPermission(requestId, result)`
  - 用户在 UI 里点了“允许/拒绝”之后，把结果喂回运行器
- `isSessionActive(sessionId)`
  - 查询会话是否还在运行
- `getSessionConfirmationMode(sessionId)`
  - 查询当前权限确认模式
- `getActiveSessionIds()`
  - 查询所有活跃会话
- `stopAllSessions()`
  - 停止所有活跃会话

## Runner 内部维护的核心状态

### `store`

`CoworkStore` 实例。

运行器不会自己维护持久化数据，而是通过 `store`：

- 更新 session 状态
- 追加 message
- 更新 message 内容
- 读取 config
- 写入 / 查询 memory

### `activeSessions`

`Map<string, ActiveSession>`，是这个文件最关键的运行时状态表。

每个 `ActiveSession` 里记录：

- `sessionId`
- `claudeSessionId`
- `workspaceRoot`
- `confirmationMode`
- `pendingPermission`
- `abortController`
- 当前流式输出相关字段
- 当前 execution mode
- 当前 sandbox 进程 / IPC bridge

理解这个文件时，可以把 `activeSessions` 当成“当前所有正在跑的会话上下文”。

### `pendingPermissions` / `sandboxPermissions`

这两个表专门用来处理权限请求：

- `pendingPermissions`
  - 本地执行模式下，等待用户响应的权限请求
- `sandboxPermissions`
  - 沙箱模式下，等待把结果写回 VM 的权限请求

### turn memory 队列

- `turnMemoryQueue`
- `turnMemoryQueueKeys`
- `lastTurnMemoryKeyBySession`

这几项用于把“最近一轮 user / assistant 对话”转成 memory 更新任务，并做去重、串行消费。

## 一次会话是怎么跑起来的

### 1. `startSession()`

入口是 `startSession()`。

它会做这些事情：

1. 把 session 状态改成 `running`
2. 把用户消息写入 `store`
3. 创建 `AbortController`
4. 解析本轮真正使用的 `cwd` / `workspaceRoot`
5. 组装 `effectiveSystemPrompt`
6. 必要时把历史消息注入 prompt
7. 调 `runClaudeCode()`

如果是继续对话，则入口变成 `continueSession()`，逻辑类似，只是会尽量复用已有的 `ActiveSession`。

### 2. `runClaudeCode()`

这是总分流入口，负责决定：

- 走本地执行：`runClaudeCodeLocal()`
- 走沙箱执行：`runClaudeCodeInSandbox()`
- 如果沙箱已存在，则走 `continueSandboxTurn()`

这里会综合考虑：

- session / config 里的 `executionMode`
- sandbox 是否可用
- 附件是否在工作区内
- 当前是否已有活着的 sandbox VM

所以阅读执行流程时，通常先看 `startSession()`，再看 `runClaudeCode()`。

## 本地执行路径

### `runClaudeCodeLocal()`

本地执行模式下，这个方法是主体。

它负责：

1. 读取 API 配置
2. 构建环境变量
3. 定位 Claude Code / SDK 入口
4. 准备注入的 MCP server
5. 配置工具权限校验逻辑
6. 启动 Claude SDK 进程
7. 消费 Claude SDK 事件流
8. 把事件转成 message / messageUpdate / complete / error

这里的复杂点主要有三块：

- Windows 环境兼容
  - Git Bash
  - Electron 作为 Node runtime
  - 隐藏子进程控制台
- 用户自定义 MCP server 注入
- Claude SDK 事件的增量消费

如果你在排查“为什么本地模式跑不起来”，第一站通常就是这个方法。

## 沙箱执行路径

### `runClaudeCodeInSandbox()`

沙箱模式下，这个方法负责：

1. 准备 sandbox 目录和 IPC
2. 把工作区映射到 guest 路径
3. 处理附件同步
4. 改写 system prompt / 技能路径
5. 启动 VM
6. 等待 VM ready
7. 发送首次请求
8. 读取沙箱流输出
9. 把结果转换回本地 session message

### `continueSandboxTurn()`

如果 VM 已经在跑，后续轮次不会重新起一个新的 VM，而是尽量复用已有 sandbox，通过 bridge 发 continuation request。

这能减少：

- VM 启动开销
- 多轮对话的上下文丢失

## 事件流是怎么转成消息的

### `handleClaudeEvent()`

这是 Claude SDK 事件消费的主入口。

它会识别不同事件类型，例如：

- assistant message
- stream delta
- tool use
- tool result
- completion
- error

然后把事件继续分发给：

- `handleStreamEvent()`
- `persistFinalResult()`
- `applyTurnMemoryUpdatesForSession()`
- `handleError()`

### `handleStreamEvent()`

专门处理流式内容。

它会维护两类流：

- `thinking`
- `text`

并通过：

- `appendStreamingDelta()`
- `shouldEmitStreamingUpdate()`
- `finalizeStreamingContent()`

来保证：

- 前端看到的是增量更新
- 不会因为太频繁而刷爆 IPC
- 最终消息会从 streaming 状态收束到 final 状态

## 权限处理是怎么走的

权限相关的关键链路是：

1. Claude / sandbox 请求某个 tool
2. `CoworkRunner` 判断是否需要用户确认
3. 发出 `permissionRequest` 事件
4. 前端显示权限弹窗
5. 用户操作后调用 `respondToPermission()`
6. 运行器把结果回写给本地 SDK 或 sandbox VM

关键方法：

- `enforceToolSafetyPolicy()`
- `requestSafetyApproval()`
- `waitForPermissionResponse()`
- `respondToPermission()`

如果你在排查“权限弹窗为什么没出来”或“点了允许后为什么没继续跑”，就沿这条链看。

## Memory 是怎么挂进来的

这个文件本身不负责 memory 存储，但负责“触发更新”。

核心入口是：

- `applyTurnMemoryUpdatesForSession()`
- `drainTurnMemoryQueue()`

它会在合适时机取最近一轮：

- 最后一条 user message
- 最后一条有效 assistant message

然后把这一轮送给 `CoworkStore.applyTurnMemoryUpdates()`。

所以：

- memory 的“规则和落库”在 `coworkStore.ts`
- memory 的“触发时机”在 `coworkRunner.ts`

## MCP / 技能 / 附件

这个文件还有三块经常让人迷路：

### 1. MCP

本地模式会注入：

- 内建的 memory 相关工具
- 用户配置的 MCP server

MCP 相关逻辑大多集中在 `runClaudeCodeLocal()`。

### 2. 技能路径改写

沙箱模式下，宿主机路径不能直接拿进 VM 用，所以需要：

- 识别技能根目录
- 建立 host/guest 映射
- 改写 system prompt 里的技能路径

相关方法有：

- `collectHostSkillsRoots()`
- `resolveSandboxSkillsConfig()`
- `rewriteSkillReferencesForSandbox()`
- `resolveAutoRoutingForSandbox()`

### 3. 附件

附件逻辑同时存在于本地和沙箱路径里，但沙箱更复杂，因为工作区外附件需要先暂存再同步。

重点方法：

- `parseAttachmentEntries()`
- `resolveAttachmentPath()`
- `stageExternalAttachment()`
- `pushStagedAttachmentsToSandbox()`
- `findAttachmentsOutsideCwd()`

## 推荐阅读顺序

如果你是第一次读这个文件，建议按下面顺序：

1. `ActiveSession`
2. `startSession()`
3. `continueSession()`
4. `runClaudeCode()`
5. `runClaudeCodeLocal()`
6. `runClaudeCodeInSandbox()`
7. `continueSandboxTurn()`
8. `handleClaudeEvent()`
9. `handleStreamEvent()`
10. 权限链路
11. memory / MCP / 技能 / 附件细节

不要一上来从文件头往文件尾硬读，这样最容易迷失。

## 调试时先看哪里

### 本地模式启动失败

先看：

- `runClaudeCodeLocal()`
- `getEnhancedEnvWithTmpdir()` / `getEnhancedEnv()`
- `getClaudeCodePath()`
- `cowork.log`

重点关注：

- PATH
- `ELECTRON_RUN_AS_NODE`
- `LOBSTERAI_ELECTRON_PATH`
- `claudeCodePath`
- MCP server command

### 沙箱模式失败

先看：

- `runClaudeCodeInSandbox()`
- `continueSandboxTurn()`
- `waitForVmReady()`
- sandbox 目录下的 stream / heartbeat / serial log

### 流式输出异常

先看：

- `handleClaudeEvent()`
- `handleStreamEvent()`
- `finalizeStreamingContent()`
- `persistFinalResult()`

### 权限弹窗异常

先看：

- `enforceToolSafetyPolicy()`
- `requestSafetyApproval()`
- `waitForPermissionResponse()`
- `respondToPermission()`

## 一句话总结

`coworkRunner.ts` 最难的地方不是某一个算法，而是它把“会话执行、环境兼容、权限、流式事件、沙箱、MCP、记忆更新”这些运行时问题都汇聚到了一个类里。

读这个文件时，抓住两条主线就够了：

1. “这一轮 prompt 是怎么被执行的”
2. “执行过程中的事件是怎么变成 session message 的”

只要这两条主线清楚了，剩下的大部分辅助方法都能自然归位。
