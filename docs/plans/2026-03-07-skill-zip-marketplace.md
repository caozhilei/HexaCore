# Skill Zip Marketplace (Install/Share/Enable) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 支持基于 zip 文件的技能上传与安装（兼容 OpenClaw 技能库的分发形态），实现“安装/共享/启用”闭环，但不接入对话执行链路；仅启用后前端可见/可选。

**Architecture:** 在 Web 管理台新增 Admin API：支持 zip 上传→安全解压→解析技能定义→写入 `skills`/`skill_packages` 表；前端 skills 页面提供上传/来源展示与启用开关；Agent 新建/编辑仅展示 enabled skills。技能执行链路保持不变（后续单独项目接入）。

**Tech Stack:** Next.js App Router (Route Handlers), Supabase (service role + Storage 可选), Node.js (zip 解压与安全校验), zod.

---

### Task 1: 数据模型（skill_packages）

**Files:**
- Modify: `c:\Users\caozl\Documents\HexaCore\supabase\migrations\20260228000000_init_schema.sql`
- Modify: `c:\Users\caozl\Documents\HexaCore\src\types\supabase.ts`（如该文件为生成文件，则改为补充本地类型文件）

**Step 1: 增加 packages 表**
- 新建 `public.skill_packages`（最小字段）：
  - `id uuid primary key default gen_random_uuid()`
  - `source_type text`（如 `zip_upload` / `github_zip`）
  - `source_ref text`（上传文件名或 repo/ref）
  - `checksum text`（sha256）
  - `storage_path text null`（如启用 Supabase Storage）
  - `install_path text`（服务器本地解压目录相对路径）
  - `status text`（installed/failed）
  - `created_at/updated_at`
- 启用 RLS（先保持 deny，写操作只走 service role）。

**Step 2: skills 表增加来源信息（不改 schema 的做法）**
- 不改 skills 表结构，统一写入 `skills.definition.source`：
  - `{ kind: 'zip_upload', package_id, install_path, skillDir, skillMdPath }`

**Step 3: 手动验证**
- 迁移执行后，在 Supabase SQL editor 确认表存在。

---

### Task 2: Zip 安装服务（安全解压 + 解析）

**Files:**
- Create: `c:\Users\caozl\Documents\HexaCore\src\core\skills\zip\installer.ts`
- Create: `c:\Users\caozl\Documents\HexaCore\src\core\skills\zip\security.ts`
- Test: `c:\Users\caozl\Documents\HexaCore\src\core\skills\zip\security.test.ts`

**Step 1: 写失败测试（ZipSlip 防护）**
- 构造包含 `../evil.txt` 的 zip 条目（或伪造条目列表）并断言被拒绝。
- 断言：所有输出路径必须落在 install_root 之下。

**Step 2: 实现安全校验**
- 校验点：
  - 禁止 `..`、绝对路径、盘符路径（Windows）
  - 限制文件数、总解压大小、单文件大小
  - 忽略/拒绝符号链接（如库能识别）

**Step 3: 实现 zip 解压与技能发现**
- 约定：解压到 `data/skill-packages/<packageId>/`
- 发现技能目录规则（最小）：
  - 解压根目录下的一级子目录中存在 `SKILL.md` 则视为一个 skill
  - 若解压根目录本身包含 `SKILL.md`，则根目录为一个 skill
- 解析 SKILL.md 复用现有 parser（`parseSkillFromDirectory`）。

**Step 4: 本地快速验证脚本**
- Create: `c:\Users\caozl\Documents\HexaCore\scripts\verify-skill-zip-install.js`
- 行为：读取一个 zip 路径 → 调用 installer → 输出发现的技能名列表。

---

### Task 3: Admin API（上传 zip → 安装 → 入库）

**Files:**
- Create: `c:\Users\caozl\Documents\HexaCore\apps\web\src\app\api\admin\skills\packages\upload\route.ts`
- Create: `c:\Users\caozl\Documents\HexaCore\apps\web\src\app\api\admin\skills\packages\[id]\enable\route.ts`
- Modify: `c:\Users\caozl\Documents\HexaCore\apps\web\src\app\api\skills\route.ts`

**Step 1: 上传接口（multipart/form-data）**
- 输入：`file`（zip）
- 服务端用 service role：
  - 计算 sha256
  - 创建 `skill_packages` 行（status=installed/failed）
  - 解压到 install_path
  - 解析出技能列表
  - upsert 到 `skills` 表（`name` 唯一，`enabled=false` 默认禁用，`definition` 写 source/manifest/markdown）
- 输出：package id + skills 列表。

**Step 2: 启用接口**
- 输入：`{ enabled: true/false }`
- 行为：
  - 更新对应 skills（按 package_id 过滤）为 enabled/disabled

**Step 3: 公共 skills 列表只返回 enabled**
- `/api/skills` 保持只返回 enabled=true（当前已有），确保“启用后才可见/可选”。

**Step 4: 手动验证**
- 上传一个 zip 包 → skills 页面应能看到新技能（disabled 状态）
- 启用后：`GET /api/skills` 返回包含该技能

---

### Task 4: 前端管理台（上传 + 启用）

**Files:**
- Modify: `c:\Users\caozl\Documents\HexaCore\apps\web\src\app\[locale]\(dashboard)\skills\page.tsx`

**Step 1: 增加“上传 zip”入口**
- 使用 `<input type="file" accept=".zip" />`
- 调用 `POST /api/admin/skills/packages/upload`
- 上传成功后刷新列表

**Step 2: 支持 enabled 开关（只改 enabled，不执行）**
- skills 卡片 Switch 改为可交互
- 调用 `POST /api/admin/skills/packages/<id>/enable` 或直接按 skill 更新的接口（看你选哪个实现更简）

**Step 3: 展示来源信息**
- 展示 `source_type/source_ref`（从 skills.definition.source 中取）

---

### Task 5: 回归验证

**Files:**
- Reuse: `c:\Users\caozl\Documents\HexaCore\apps\web\src\app\[locale]\(dashboard)\agents\new\page.tsx`
- Reuse: `c:\Users\caozl\Documents\HexaCore\apps\web\src\app\[locale]\(dashboard)\agents\[id]\page.tsx`
- Reuse: `c:\Users\caozl\Documents\HexaCore\scripts\sync-example-skills-to-db.js`

**Step 1: 回归验证 enabled skills**
- 确认示例 skills 仍可见（enabled=true）
- 确认 zip 安装的 skills 默认不出现在 Agent 选择里（enabled=false）

**Step 2: 启用后验证**
- 启用 zip 技能后：
  - skills 页面显示 enabled
  - 新建/编辑 Agent 技能列表包含该技能（来自 `/api/skills`）

**Step 3: 安全验证**
- 用 ZipSlip 测试 zip 上传应被拒绝，并返回 400 + 明确错误信息。

