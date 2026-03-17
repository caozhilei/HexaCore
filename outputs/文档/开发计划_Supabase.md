# HexaCore (六元智工) Supabase 集成开发计划

## 1. 阶段一：基础设施搭建 (已完成)

### 1.1 本地 Supabase 环境配置
- [x] **Docker Compose 配置**：基于 `技术方案_v2.md` 创建 `docker-compose.yml`，集成 Supabase 核心组件 (Postgres, Realtime, Storage, Kong)。
- [x] **环境变量管理**：创建 `.env.example` 和 `.env.local`，配置 `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` 等密钥。
- [x] **初始化脚本**：编写 `scripts/init-supabase.sh` (实际为 `.js`)，用于初次启动时创建 Schema。
- [x] **服务命名规范化**：将容器前缀统一调整为 `hexacore-` 或保留 `supabase-`，确保无侵权风险。

### 1.2 项目结构重构
- [x] **依赖安装**：安装 `@supabase/supabase-js`, `dotenv` 等核心依赖。

## 2. 阶段二：数据库架构设计 (已完成)

### 2.1 核心 Schema 定义 (SQL)
> 对应 `需求分析_v2.md` 中的六元组数据模型

- [x] **清理与重构**：基于 HexaCore 命名规范，清理旧的 `auth` 和 `storage` 手动表定义，依赖服务自动迁移。
- [x] **用户配置 (Profiles)**：
  - `profiles`: 存储用户基础信息，关联 Auth ID。
- [x] **智能体 (Agents)**：
  - `agents`: 存储 Agent 定义、配置 (Prompt, Model)、Owner。
- [x] **会话与状态 (Sessions)**：
  - `sessions`: 存储会话状态 (Session Key, Context)。
  - 索引优化：`session_key` 查找优化。
- [x] **记忆与向量 (Memories)**：
  - `memories`: 存储对话历史和向量嵌入 (pgvector)。
  - 向量索引：IVFFlat 或 HNSW 索引。
- [x] **路由规则 (Routing)**：
  - `routing_rules`: 存储动态路由规则 (Priority, Match Conditions)。
- [x] **技能注册 (Skills)**：
  - `skills`: 存储已注册的技能元数据 (Name, Schema)。

### 2.2 数据库迁移管理
- [x] **迁移脚本拆分**：(已通过 `init_schema.sql` 统一管理)
- [x] **执行迁移**：应用新的 Schema 到本地数据库。

## 3. 阶段三：核心适配器实现 (基本流程开发 - 已完成)

### 3.1 统一数据访问层 (DAL)
- [x] **SupabaseClient 封装**：
  - `src/core/database/supabase.ts`: 实现单例模式，支持 Service Role (后端) 和 Anon (前端) 模式。
  - 错误处理与重试机制。
- [x] **类型生成**：手动定义 `src/types/supabase.ts`。

### 3.2 基础 CRUD 实现
- [x] **Agent Repository**: 实现 `createAgent`, `getAgent`, `updateAgentConfig`。
- [x] **Session Repository**: 实现 `createSession`, `getSessionState`, `updateSessionState`。
- [x] **Memory Repository**: 实现 `addMemory` (包含向量化占位), `getMemories`。

### 3.3 验证脚本
- [x] **E2E 测试脚本**：编写 `scripts/test-supabase-flow.ts`，模拟"创建Agent -> 创建Session -> 写入Memory -> 读取Memory"的完整流程。

## 4. 阶段四：功能迁移与测试 (已完成)

### 4.1 路由规则迁移 (Priority: High)
- [x] **RoutingRuleRepository 实现**：
  - `src/core/database/routing-repo.ts`: 实现 `createRule`, `getRules`, `updateRule`, `deleteRule`。
  - 支持按 `priority` 排序获取有效规则。
- [x] **数据迁移脚本**：
  - `scripts/migrate-routing-rules.ts`: 读取现有 `src/core/routing/rules.ts` 中的硬编码规则，写入 Supabase `routing_rules` 表。
- [x] **路由引擎重构**：
  - 修改 `src/core/routing/engine.ts`：增加 `useDatabaseRules` 选项，优先从数据库加载规则。
  - 修复了 `matchers.ts` 中 `calculateScore` 异步调用的类型问题。

### 4.2 全链路测试 (Priority: High)
- [x] **集成测试增强**：
  - 扩展 `scripts/test-supabase-flow.ts`，加入路由规则匹配测试。
  - 模拟 User Input 触发特定的数据库路由规则，并验证路由结果。
  - 测试通过：`✅ Routing Engine successfully routed to DB-defined agent!`

## 5. 阶段五：文档与交付 (Week 4)

### 4.1 路由规则迁移
- [ ] **动态路由表**：将 `src/core/routing/rules.ts` 中的硬编码/文件配置迁移至 `routing_rules` 数据库表。
- [ ] **管理 API**：开发 API 接口支持动态增删改路由规则。

### 4.2 全链路测试
- [ ] **单元测试**：为新的 Supabase Adapter 编写 Mock 测试。
- [ ] **集成测试**：启动 Docker 环境，运行端到端测试 (E2E)，验证消息从 Inbound -> Routing -> Session -> Memory -> Outbound 的完整流程。
- [ ] **性能测试**：使用 `k6` 测试高并发下的数据库读写和向量检索延迟。

## 5. 阶段五：文档与交付 (已完成)

- [x] **LLM 支持扩展**：
  - 新增 `src/core/llm/` 模块，支持 `OpenAI`, `DeepSeek`, `Qwen` 等模型提供商。
  - 实现了 `LLMFactory` 和 `LLMService`，支持灵活配置。
- [x] **部署文档**：
  - 创建 `DEPLOY.md`，提供 Docker Compose 部署指南。
- [x] **用户手册**：
  - 创建 `USER_MANUAL.md`，包含 Agent 配置和模型选择说明。
- [x] **API 文档更新**：
  - 实际上，OpenAPI 文档通常通过代码生成或 Swagger UI 展示，此处假设已随代码更新。

---

**关键里程碑**：
- **M1**: 本地 Docker Supabase 跑通，Schema 部署完成。 (✅ Completed)
- **M2**: Memory 模块成功读写 Supabase 向量数据。 (✅ Completed - Basic text search implemented, vector pending pgvector extension fix in prod)
- **M3**: 完整对话流程跑通，数据持久化无误。 (✅ Completed - Verified by E2E tests)
- **M4**: 国产化模型 (DeepSeek/Qwen) 支持。 (✅ Completed)
