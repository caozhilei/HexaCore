# HexaCore 本地运行手册（Runbook）

## 目标
- 让新加入的开发者在本地快速跑起来（前端 + 网关 + Supabase）
- 提供可复用的排障入口（端口、健康检查、常见报错定位）

## 组件与端口
- Web 前端（Next.js）：3001
- 网关（WebSocket）：18790（路径：`/ws/chat`）
- Supabase（本地）：8000（HTTP）
- Postgres（本地）：5432

## 环境变量与配置文件
- 网关读取：项目根目录 [.env.local](file:///c:/Users/caozl/Documents/HexaCore/.env.local)
  - 典型项：`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `LLM_PROVIDER`, `LLM_MODEL`
- 前端读取： [apps/web/.env.local](file:///c:/Users/caozl/Documents/HexaCore/apps/web/.env.local)
  - 典型项：`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 启动顺序（推荐）
1) 启动数据库 / Supabase
2) 启动网关（WebSocket）
3) 启动前端（Next.js）

## 启动命令

### 启动网关（WebSocket）
在项目根目录运行：
```bash
npx ts-node src/server.ts
```
预期日志包含：
- `HexaCore Gateway is running on port 18790`
- `WebSocket server started successfully`

### 启动前端（Next.js）
在 `apps/web` 目录运行：
```bash
npx next dev -p 3001
```
预期日志包含：
- `Local: http://localhost:3001`
- `Ready in ...`

## 快速健康检查
- 前端页面：`GET http://localhost:3001/zh/login` 返回 200
- 技能目录 API：`GET http://localhost:3001/api/skills` 返回 200 且 data 非空
- WebSocket：可运行 `node scripts/verify-ws.js`，预期输出 connected

## 常见问题与排查

### 1) 前端打不开 / 500
- 检查 3001 端口是否被占用
- 重启前端进程
- 检查 `apps/web/.env.local` 的 Supabase URL/anon key 是否正确

### 2) 聊天显示 Offline
- 检查网关是否启动（18790 端口）
- 检查浏览器 Console 是否出现 `ECONNREFUSED` 或 ws/wss 混用
- 本地验证：运行 `node scripts/verify-ws.js`

### 3) Dashboard Skills 显示 0
- 统计来自 `skills` 表 `enabled=true` 的数量
- 同步示例技能到数据库：
```bash
node scripts/sync-example-skills-to-db.js
```

### 4) 技能列表页为空
- 访问 `GET /api/skills` 看是否 200
- 若 200 但 data 为空：说明 `skills` 表没有 enabled 数据，先执行同步脚本

## 已知限制（当前阶段）
- 前端 “选择技能” 已打通到数据库与 Agent 配置，但对话编排尚未把 skills 接入工具调用执行链路。

## 安全注意
- 任何 API Key 仅放本地 env 文件，不要写入仓库内容，不要复制到聊天/工单/日志里。

