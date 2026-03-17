# HexaCore - 自主进化智能体工作平台

HexaCore 是一个基于**六元组架构 (6-Tuple Architecture)** 的企业级自主进化智能体工作平台，旨在解决多渠道接入、智能路由、上下文隔离、技能扩展、记忆持久化和安全沙箱等核心挑战，为企业提供可控、可扩展的 AI 智能体解决方案。

## 核心特性 (Core Features)

本项目目前已开发并集成了以下核心模块：

*   **统一接入与多模态网关 (Multi-modal Gateway)**
    *   屏蔽 Web、CLI、API 等多渠道差异，统一转化为 `InboundMessage` 格式。
    *   基于 WebSocket (`src/server.ts`) 的高并发消息网关，支持前端与智能体的实时双向通信。
*   **智能调度与路由 (Intelligent Routing)**
    *   基于规则和语义的精准路由分发。
    *   支持 Priority 优先级、Metadata、Content Keywords 等多级匹配。
    *   路由规则存储于 Supabase `routing_rules` 表，支持热更新。
*   **管理后台 (Admin Dashboard)**
    *   基于 Next.js 的现代化管理界面，支持智能体配置、技能管理及系统监控。
    *   **实时统计**: 仪表盘集成 Supabase 实时数据，展示 Agent、Session、Memory 及 Skill 的真实统计信息。
    *   **安全鉴权**: 集成 Supabase Auth，采用服务端 Service Role 进行高权限操作，确保安全性。
*   **技能市场 (Skill Marketplace)**
    *   **Zip 包上传**: 支持通过 Zip 文件上传并安装技能（兼容 OpenClaw 格式）。
    *   **安全解压**: 内置路径遍历防护（ZipSlip）及文件校验。
    *   **启用/禁用管理**: 提供技能的启用/禁用开关，灵活控制智能体可调用的能力。
*   **自主进化与记忆架构**
    *   基于 Postgres + pgvector 的长期记忆与知识库支持。
    *   基于 `SessionKey` (Agent:Channel:Peer) 实现会话级上下文隔离与持久化。
*   **多模型支持**
    *   原生支持 OpenAI、DeepSeek (深度求索)、Qwen (通义千问) 等主流大模型。

## 功能模块 (Functional Modules)

HexaCore 管理后台提供以下核心功能模块（按菜单顺序）：

1.  **概览 (Dashboard)**
    *   实时监控系统核心指标，包括 Agent 数量、活跃 Session、技能启用状态及记忆条目统计。
2.  **智能体 (Agents)**
    *   智能体全生命周期管理。支持创建、配置（Prompt、模型参数）、调试及发布 AI 智能体。
    *   支持多模型切换（OpenAI, DeepSeek, Qwen）。
3.  **出入口 (Entry Points)**
    *   统一接入层配置。管理 WebAdapter (WebSocket)、CLI 及 API Webhook 等多渠道接入适配器。
4.  **路由 (Routing)**
    *   智能分发引擎。配置基于优先级、元数据或语义内容的路由规则，将消息精准分发至目标 Agent。
5.  **频道 (Channels)**
    *   会话上下文管理。监控活跃的会话通道，管理基于 `SessionKey` 的上下文隔离与状态同步。
6.  **技能 (Skills)**
    *   能力扩展中心。支持通过 Zip 包上传安装技能（兼容 OpenClaw），管理技能的启用/禁用状态及元数据。
7.  **记忆 (Memory)**
    *   长期记忆与知识库。管理基于 pgvector 的向量索引与会话历史归档，赋予 Agent 长期记忆能力。
8.  **沙箱 (Sandbox)**
    *   安全运行时环境。配置代码执行的隔离策略与资源限制，确保第三方技能的安全运行。
9.  **设置 (Settings)**
    *   平台全局配置。管理系统级参数、API 密钥及环境变量。

## 系统架构 (System Architecture)

HexaCore 采用微服务与模块化相结合的架构，后端核心服务通过 Docker 编排，前端管理后台基于 Next.js 构建。

### 架构概览

```
[User] <--> [Kong Gateway :8000] <--> [Supabase Services]
                  ^                          ^
                  |                          |
[Web Dashboard] --+                          |
(:3000)                                      |
                                             v
                                     [HexaCore Backend]
                                     (Node.js/TS)
                                     - Orchestrator (六元组编排)
                                     - Routing Engine (路由引擎)
                                     - LLM Service (模型服务)
                                     - Skill Manager (技能管理)
```

### 六元组实现映射

| 元组 | HexaCore 实现 |
| :--- | :--- |
| **Entry Points** | `src/core/entry-points/` (WebAdapter, CLIAdapter) |
| **Routing** | `src/core/routing/` (RoutingEngine, Matchers, DatabaseRules) |
| **Channels** | `src/core/database/session-repo.ts` (Session Management) |
| **Skills** | `src/core/skills/` (SkillManager, BaseSkill) |
| **Memory** | `src/core/database/memory-repo.ts` (Supabase Storage) |
| **Sandbox** | Docker Isolation (部署层级) |

## 技术栈 (Tech Stack)

*   **后端核心**: Node.js 18+, TypeScript 5.x
*   **数据库**: Supabase (PostgreSQL 15+, pgvector)
*   **前端**: Next.js 14 (App Router), shadcn/ui, Tailwind CSS
*   **ORM**: Supabase JS Client
*   **部署**: Docker Compose

## 项目结构 (Project Structure)

```
HexaCore/
├── apps/
│   └── web/              # Next.js 前端应用 (App Router)
├── src/
│   ├── core/             # 核心逻辑 (Orchestrator, LLM, Skills, Routing)
│   ├── server.ts         # WebSocket 网关入口
│   └── types/            # TypeScript 类型定义
├── supabase/
│   └── migrations/       # 数据库迁移文件 (Schema)
├── scripts/              # 运维与测试脚本 (Init, Verify, Admin Tools)
├── docs/                 # 项目文档与设计方案
└── .env.local            # 网关环境变量配置
```

## 快速开始 (Getting Started)

详细的操作指南请参考 **[运行手册 (Runbook)](docs/runbook.md)**。

### 前置要求
*   Node.js (v18+)
*   Supabase (本地运行或云端实例)

### 1. 环境配置
复制并配置环境变量：
*   **网关**: 根目录 `.env.local`
    ```bash
    SUPABASE_URL=...
    SUPABASE_SERVICE_ROLE_KEY=...
    LLM_PROVIDER=...
    ```
*   **前端**: `apps/web/.env.local`
    ```bash
    NEXT_PUBLIC_SUPABASE_URL=...
    NEXT_PUBLIC_SUPABASE_ANON_KEY=...
    ```

### 2. 启动服务

**后端网关 (WebSocket)**:
```bash
npx ts-node src/server.ts
# 启动在端口 18790
```

**前端应用 (Next.js)**:
```bash
cd apps/web
npx next dev -p 3001
# 启动在 http://localhost:3001
```

### 3. 验证运行
*   访问 `http://localhost:3001/zh/login` 进行登录。
*   访问 `http://localhost:3001/zh/dashboard` 查看实时统计。
*   运行 `node scripts/verify-ws.js` 验证网关连接。

## 文档资源 (Documentation)

*   **[运行手册 (Runbook)](docs/runbook.md)**: 包含详细的启动步骤、端口列表及常见故障排查指南。
*   **设计文档**:
    *   [需求分析文档 (v3)](outputs/文档/需求分析_v3.md)
    *   [技术方案文档 (v3)](outputs/文档/技术方案_v3.md)
*   **开发计划 (Implementation Plans)**:
    *   [Admin Auth & Agent Save](docs/plans/2026-03-02-admin-auth-agent-save.md): 管理员鉴权与配置保存方案。
    *   [Dashboard Real Stats](docs/plans/2026-03-03-dashboard-real-stats.md): 仪表盘实时统计实现。
    *   [Skill Zip Marketplace](docs/plans/2026-03-07-skill-zip-marketplace.md): 技能 Zip 上传与市场功能。

## 常用脚本 (Scripts)

*   `npm run init:supabase`: 初始化数据库 Schema。
*   `node scripts/create-admin.js`: 创建管理员账号。
*   `node scripts/set-super-admin.js`: 提升用户为 Super Admin。
*   `node scripts/verify-ws-chat.js`: 验证 WebSocket 聊天功能。
*   `node scripts/sync-example-skills-to-db.js`: 同步示例技能到数据库。

## 许可证 (License)

MIT
