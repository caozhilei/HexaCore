# 智能体工作组记忆共享设计方案 (Memory Spaces)

## 1. 目标
为了实现 HexaCore 平台中不同智能体（工作组）之间的记忆共享与协作，打破当前基于 `session_key` 的孤立记忆限制。方案采用“记忆空间 (Memory Spaces)”架构，并结合严格的 `read`/`write` 授权机制。

## 2. 架构设计
核心思想：将“记忆”与“会话”解耦。记忆不再强制归属于一个特定的对话会话，而是归属于一个“记忆空间”。智能体通过被授权访问特定的记忆空间，实现跨会话、跨智能体的信息共享。

### 2.1 数据库结构 (Supabase Schema)
引入两个新表，并扩展现有的 `memories` 表。

1.  **`memory_spaces`**: 存储记忆空间的元数据。
    *   `id`: UUID (Primary Key)
    *   `name`: 空间名称 (e.g., "Research Team Blackboard")
    *   `type`: enum `('session', 'shared')`。`session` 为会话私有空间，`shared` 为工作组共享空间。
    *   `owner_id`: UUID (创建者 ID)
    *   `created_at`, `updated_at`: Timestamps

2.  **`memory_space_grants`**: 存储智能体对空间的访问权限。
    *   `id`: UUID (Primary Key)
    *   `space_id`: UUID (Foreign Key to `memory_spaces`)
    *   `agent_id`: UUID (Foreign Key to `agents`)
    *   `permission`: enum `('read', 'write')`
    *   `created_at`: Timestamp
    *   *Constraint*: `UNIQUE(space_id, agent_id)`

3.  **`memories` (修改现有表)**:
    *   新增 `space_id`: UUID (Foreign Key to `memory_spaces`)。
    *   现有的 `session_key` 字段变为可选（Nullable），用于向下兼容或标识来源。
    *   如果 `space_id` 存在，则此记忆受该空间的权限控制。

### 2.2 权限控制 (Row Level Security - RLS)
利用 Supabase 的 RLS 策略，确保数据的安全性（主要防范前端或低权限客户端越权）。

*   **SELECT 策略**: 允许用户/智能体读取 `memories`，前提是其对应的 `agent_id` 在 `memory_space_grants` 中拥有对应 `space_id` 的记录（`permission` 为 `read` 或 `write`）。
*   **INSERT/UPDATE/DELETE 策略**: 仅允许在 `memory_space_grants` 中拥有 `write` 权限的 `agent_id` 执行写入操作。
*   *(注: 后端 Node.js 使用 Service Role 时默认绕过 RLS，因此必须在 Repository 层代码中同步实现权限校验逻辑。)*

## 3. 后端逻辑改造 (Core Services)

### 3.1 `MemoryRepository` (`src/core/database/memory-repo.ts`)
*   **管理接口**:
    *   `createSpace(name: string, type: 'session'|'shared', ownerId?: string)`
    *   `grantAccess(spaceId: string, agentId: string, permission: 'read'|'write')`
    *   `revokeAccess(spaceId: string, agentId: string)`
*   **读写接口改造**:
    *   `addMemory(..., spaceId?: string)`: 增加 `spaceId` 参数。在插入前，校验当前上下文中的 Agent 是否有 `write` 权限。
    *   `getMemories(..., spaceId?: string)`: 增加按 `spaceId` 查询的能力。在查询前，校验当前上下文中的 Agent 是否有 `read` 或 `write` 权限。
    *   `getAgentSharedMemories(agentId: string)`: 新增方法，一次性拉取该 Agent 被授权的所有 `shared` 空间的最新记忆。

### 3.2 编排器 (`Orchestrator`)
*   在 `handleMessage` 构建系统 Prompt 时：
    1.  不仅拉取当前会话 (`session_key`) 的记忆。
    2.  同时调用 `MemoryRepository.getAgentSharedMemories(agent.id)` 拉取该智能体所属的所有共享空间的记忆。
    3.  将共享记忆作为一个独立的 Context Block 注入到 LLM Prompt 中（例如 `<Shared_Knowledge>...</Shared_Knowledge>`）。

## 4. 后续演进 (Future Extensions)
*   **主动写入**: 未来可为 Agent 提供一个 Tool/Skill (如 `write_to_shared_memory`)，允许大模型在推理过程中，自主决定将关键结论写入某个特定的共享空间。
*   **向量检索**: 当 `pgvector` 完全启用后，可以在共享空间内进行语义搜索，而不仅是按时间倒序加载。

---
*版本: 1.0*
*状态: 已确认 (待实施)*
