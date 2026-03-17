# Admin Auth & Agent Save (Service Role) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 用 Supabase 登录 + 角色校验（super_admin），让管理员通过服务端 API 保存/修改任意智能体配置，并提供脚本把 `caozhilei@gmail.com` 设置为 super_admin。

**Architecture:** 前端只做展示与提交；所有“管理员写操作”走 Next.js Route Handler（`/api/admin/...`）。Route Handler 使用 Supabase Server Client 校验当前用户与 `app_metadata.role`，再用 Service Role client 执行数据库更新（不依赖/绕过 RLS 的复杂性）。

**Tech Stack:** Next.js App Router, next-intl, Supabase Auth (SSR), @supabase/supabase-js (service role), Node scripts (pg/supabase-js)

---

## Prereqs (一次性配置)

1) 在 `apps/web/.env.local` 添加（不要提交到仓库）：
- `SUPABASE_URL=http://localhost:8000`（或你的 Supabase URL）
- `SUPABASE_SERVICE_ROLE_KEY=...`（service_role key）

2) 确保你能在页面登录成功（否则浏览器没有 session，管理员 API 也会 401）。

---

### Task 1: 让管理员账号可登录 + 设置 super_admin

**Files:**
- Modify: [create-admin.js](file:///c:/Users/caozl/Documents/HexaCore/scripts/create-admin.js)
- Create: `c:\Users\caozl\Documents\HexaCore\scripts\set-super-admin.js`
- (Optional) Create: `c:\Users\caozl\Documents\HexaCore\scripts\verify-login.js`

**Step 1: 移除脚本中的明文密码**

将 [create-admin.js](file:///c:/Users/caozl/Documents/HexaCore/scripts/create-admin.js) 改为：
- email/password 从命令行参数或环境变量读取（例如 `ADMIN_EMAIL/ADMIN_PASSWORD`），不再写死
- 支持只更新 metadata（不强制重置密码）

**Step 2: 新增 set-super-admin 脚本**

创建 `scripts/set-super-admin.js`：
- 使用 `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
- 根据 email 查用户（admin API）
- `updateUserById(userId, { app_metadata: { role: 'super_admin' } })`
- 输出 userId 与最终 role

**Step 3: 运行脚本验证**

运行（示例）：
- `node scripts/create-admin.js --email caozhilei@gmail.com --password <your-password>`
- `node scripts/set-super-admin.js --email caozhilei@gmail.com`

期望：
- 不再出现 “Invalid login credentials”
- `app_metadata.role` 为 `super_admin`

---

### Task 2: 提供 service-role 的 Supabase 管理客户端（服务端专用）

**Files:**
- Create: `c:\Users\caozl\Documents\HexaCore\apps\web\src\lib\supabase\admin.ts`

**Step 1: 写一个只在服务端使用的 client 工厂**

`admin.ts` 导出 `createAdminClient()`：
- 读取 `process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL`
- 读取 `process.env.SUPABASE_SERVICE_ROLE_KEY`
- 如果缺失则 throw（避免静默失败）
- 用 `@supabase/supabase-js` 的 `createClient(url, serviceKey)` 创建 client

**Step 2: 快速验证（Node 环境）**

新增（可选）脚本 `scripts/verify-admin-client.js`：
- 调用 `createAdminClient()`（注意运行环境是 Node，不是 Next；也可以直接在脚本里 createClient）
- select agents 一条，确保能读

---

### Task 3: 新增管理员 API：更新任意 Agent 配置

**Files:**
- Create: `c:\Users\caozl\Documents\HexaCore\apps\web\src\app\api\admin\agents\[id]\route.ts`
- Modify: [server.ts](file:///c:/Users/caozl/Documents/HexaCore/apps/web/src/lib/supabase/server.ts)（如果需要补充 helper）

**Step 1: 定义请求 schema（zod）**

在 route handler 内：
- 校验 body：`name`, `description`, `config`（包含 model/system_prompt/skills/temperature 等）
- `id` 必须是 uuid

**Step 2: 鉴权与角色校验**

在 `POST`（或 `PUT/PATCH`）里：
- 用 [server.ts](file:///c:/Users/caozl/Documents/HexaCore/apps/web/src/lib/supabase/server.ts) 的 `createClient()` 获取当前用户 `supabase.auth.getUser()`
- 无用户 → 401
- `user.app_metadata.role !== 'super_admin'` → 403

**Step 3: 用 service role 更新 agents**

调用 `createAdminClient()`：
- `.from('agents').update({...}).eq('id', id).select().single()`
- 成功返回 JSON（更新后的 agent）
- 失败返回带 `code/message/details` 的 JSON，便于前端展示

**Step 4: curl/脚本验证**

用浏览器登录后（带 cookies），在 DevTools/或脚本里请求：
- `fetch('/api/admin/agents/<id>', { method:'POST', body: JSON.stringify(payload) })`

期望：
- 403/401/200 行为符合预期
- 200 时数据库确实更新

---

### Task 4: 前端编辑页改为调用管理员 API（不直连 Supabase update）

**Files:**
- Modify: [page.tsx](file:///c:/Users/caozl/Documents/HexaCore/apps/web/src/app/%5Blocale%5D/(dashboard)/agents/%5Bid%5D/page.tsx)

**Step 1: 读操作保持不变**

仍可用 anon client select（或也走服务端，后续再统一）。

**Step 2: 保存改为 fetch /api/admin/agents/:id**

在 `handleSubmit`：
- `await fetch(...)`
- 非 2xx：toast 显示后端返回错误（包含 code/message）
- 2xx：toast success + `router.push({ pathname: '/agents' })`

**Step 3: UI 验证**

在浏览器：
- 用 `caozhilei@gmail.com` 登录
- 打开任意 agent 编辑页
- 修改 model/prompt/skills → 保存成功

---

### Task 5: 回归验证脚本（保存 + 模型对接）

**Files:**
- Reuse: [verify-agent-save.js](file:///c:/Users/caozl/Documents/HexaCore/scripts/verify-agent-save.js)
- Reuse: [verify-model-qwen.js](file:///c:/Users/caozl/Documents/HexaCore/scripts/verify-model-qwen.js)
- Create: `c:\Users\caozl\Documents\HexaCore\scripts\verify-admin-api-save.js`

**Step 1: verify-admin-api-save.js**

脚本思路：
- 使用 `@supabase/supabase-js` 用邮箱密码登录（`signInWithPassword`）
- 带着 session token 调用 `POST http://localhost:3001/api/admin/agents/<id>`（用 fetch）
- 断言返回 200 且 agents 行被更新

**Step 2: 运行回归**

- `node scripts/verify-agent-save.js`（DB 写入仍通）
- `node scripts/verify-model-qwen.js`（模型仍通）
- `node scripts/verify-admin-api-save.js`（管理员 API 通）

---

## Notes / Security

- `SUPABASE_SERVICE_ROLE_KEY` 必须只在服务端使用，不得暴露到浏览器（不要用 NEXT_PUBLIC 前缀，不要打到客户端 bundle）。
- 生产环境不建议 “禁用 RLS / 允许 anon 更新”。推荐回归到最小权限策略，让管理员写操作只走服务端 API。

