---
name: "superpowers"
description: "提供 Superpowers 工作流（设计→计划→子代理→TDD→审查）。在需要规划、实现、调试、评审或结构化开发流程时调用。"
---

# SuperpowersSuperpowers 工作流

为编码代理提供一套完整的软件工程方法论与执行流程，贯穿「设计 → 计划 → 子代理实现 → TDD → 审查 → 完成分支」，确保以规格驱动与测试驱动交付变更。

## HexaCore 当前阶段速览
- 当前阶段：本地可运行 + 管理台可用 + 网关 WebSocket 可用
- 已打通链路：Dashboard 实数统计、WebSocket 聊天收发、技能目录入库与展示
- 重要限制：技能尚未接入对话编排（勾选技能只会写入 Agent 配置，不会自动工具调用执行）
- 运行手册：详见 [docs/runbook.md](file:///c:/Users/caozl/Documents/HexaCore/docs/runbook.md)
- 安全约束：任何 API Key 仅放本地 env，不要写入仓库文件或复制到工单/聊天

## 本地启动速查
- 前端（Next.js）：http://localhost:3001（启动：apps/web 目录运行 `npx next dev -p 3001`）
- 网关（WebSocket）：ws://localhost:18790/ws/chat（启动：项目根目录运行 `npx ts-node src/server.ts`）
- Supabase（本地）：http://localhost:8000（需先启动本地 Supabase/DB）
- 环境文件：
  - 项目根目录 [.env.local](file:///c:/Users/caozl/Documents/HexaCore/.env.local)（网关读取）
  - 前端目录 [apps/web/.env.local](file:///c:/Users/caozl/Documents/HexaCore/apps/web/.env.local)（Next 读取）

## 常见问题排查入口
- 聊天 Offline：先确认网关进程在跑且 18790 端口可连；再检查浏览器是否 ws/wss 混用
- 聊天发不出去：检查前端发送 payload 是否包含 message/content 字段；后端 WebAdapter 是否在解析到 messageText
- Dashboard Skills 为 0：确认 skills 表已有 enabled 数据；可运行 `node scripts/sync-example-skills-to-db.js` 进行同步
- 技能列表为空：检查 /api/skills 是否返回 200；以及 skills 表是否有 enabled 数据

## 何时触发
- 用户提出：规划/设计功能、调试问题、撰写详细实现计划、按 TDD 实现、请求代码审查、完成开发分支。
- 代理判断：在进入编码前需要先产出设计或将任务拆解为可执行步骤时。

## 流程总览
- 设计（brainstorming）：提出关键澄清点，探索备选方案；分节输出设计文档并征求确认。
- 工作区（using-git-worktrees）：在独立分支/工作区上进行变更并验证基线测试通过。（需要执行外部命令时先征求用户许可）
- 计划（writing-plans）：将工作拆分为 2–5 分钟粒度任务；每个任务包含明确文件路径、完整代码片段、验证步骤。
- 实施（subagent-driven-development / executing-plans）：按计划逐任务执行；每个任务两阶段检查（规格一致性 → 代码质量）。
- 测试驱动（test-driven-development）：严格 RED→GREEN→REFACTOR；先写失败测试，再写最小实现，使测试通过，最后重构。
- 评审（requesting-code-review）：依据检查清单进行自检；关键问题阻断继续推进。
- 完成（finishing-a-development-branch）：验证全部测试；提供合并/PR/保留/丢弃选项；清理工作区。

## 在 Trae IDE 中的执行要点
- 任务管理：使用待办列表跟踪，标记进行中/完成，保持粒度清晰一致。
- 搜索与理解：优先使用搜索子代理探索代码结构；定位后再精读具体文件。
- 验证：优先复用现有测试框架；若缺失则创建最小可行测试/脚本；Web 项目使用可视预览验证。
- 安全：不泄露密钥与敏感信息；不记录凭据。
- 提交：未获用户明确授权不进行提交/合并。
- 外部命令：git/包管理/长运行进程需事先说明并获得允许。

## 常见触发短语示例
- 「帮我规划这个功能……」
- 「按 TDD 修复这个 bug……」
- 「写一份详细实现计划」
- 「做一次自检/代码审查」
- 「完成开发分支并准备合并」

## 输出约定
- 采用短节分段；每组 4–6 条要点；先概要后细节。
- 引用代码时提供明确文件路径与行号。
- 在任务验证通过前持续推进，避免中途停滞。

## 参考原则
- 真正的红-绿-重构（RED-GREEN-REFACTOR）；YAGNI；DRY。
- 系统化优先于即兴；两阶段评审；防御式调试与条件等待。
