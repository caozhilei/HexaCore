# 共享记忆空间 (Shared Memory Spaces) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现一个基于 `memory_spaces` 和 `memory_space_grants` 表的记忆共享与授权机制，允许智能体跨会话共享上下文。

**Architecture:** 
1. 在 Supabase 增加 `memory_spaces` 和 `memory_space_grants` 表，并修改 `memories` 表关联 `space_id`。
2. 更新 TypeScript 类型定义 (`types/supabase.ts`)。
3. 改造 `MemoryRepository`，增加空间管理与基于权限的读写控制。
4. 改造 `Orchestrator`，在对话上下文中注入智能体被授权的共享记忆。

**Tech Stack:** PostgreSQL (Supabase), TypeScript, Node.js

---

### Task 1: 数据库 Schema 迁移

**Files:**
- Modify: `supabase/migrations/20260228000000_init_schema.sql`

**Step 1: Write the minimal SQL implementation**

在 `20260228000000_init_schema.sql` 文件的末尾（在 `search_memories` 函数注释上方）添加：

```sql
-- Create memory_spaces table
create table if not exists public.memory_spaces (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  type text check (type in ('session', 'shared')) not null default 'session',
  owner_id uuid,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.memory_spaces enable row level security;

-- Create memory_space_grants table
create table if not exists public.memory_space_grants (
  id uuid default gen_random_uuid() primary key,
  space_id uuid references public.memory_spaces(id) on delete cascade,
  agent_id uuid references public.agents(id) on delete cascade,
  permission text check (permission in ('read', 'write')) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(space_id, agent_id)
);

alter table public.memory_space_grants enable row level security;

-- Alter memories table to add space_id and make session_key nullable
alter table public.memories add column if not exists space_id uuid references public.memory_spaces(id) on delete cascade;
alter table public.memories alter column session_key drop not null;
```

**Step 2: Apply the migration**

Run: `node scripts/init-supabase.js`
Expected: 成功执行，无报错。

### Task 2: 更新 TypeScript 类型定义

**Files:**
- Modify: `src/types/supabase.ts`

**Step 1: Write the updated types**

在 `src/types/supabase.ts` 中，为 `memory_spaces` 和 `memory_space_grants` 添加类型，并更新 `memories`。

```typescript
        memory_spaces: {
          Row: {
            id: string
            name: string
            type: 'session' | 'shared'
            owner_id: string | null
            created_at: string
            updated_at: string
          }
          Insert: {
            id?: string
            name: string
            type?: 'session' | 'shared'
            owner_id?: string | null
            created_at?: string
            updated_at?: string
          }
          Update: {
            id?: string
            name?: string
            type?: 'session' | 'shared'
            owner_id?: string | null
            created_at?: string
            updated_at?: string
          }
        }
        memory_space_grants: {
          Row: {
            id: string
            space_id: string
            agent_id: string
            permission: 'read' | 'write'
            created_at: string
          }
          Insert: {
            id?: string
            space_id: string
            agent_id: string
            permission: 'read' | 'write'
            created_at?: string
          }
          Update: {
            id?: string
            space_id?: string
            agent_id?: string
            permission?: 'read' | 'write'
            created_at?: string
          }
        }
```
并且在 `memories` 的 `Row`, `Insert`, `Update` 中：
```typescript
            session_key: string | null
            space_id: string | null
```

**Step 2: Run TypeScript compiler to verify**

Run: `npx tsc --noEmit`
Expected: 编译通过。

### Task 3: 改造 MemoryRepository

**Files:**
- Modify: `src/core/database/memory-repo.ts`

**Step 1: Implement space management and authorization methods**

在 `MemoryRepository` 中添加：

```typescript
  async createSpace(name: string, type: 'session' | 'shared' = 'shared', ownerId?: string) {
    const { data, error } = await supabase
      .from('memory_spaces')
      .insert({ name, type, owner_id: ownerId })
      .select()
      .single();
    if (error) throw new Error(`Failed to create memory space: ${error.message}`);
    return data;
  }

  async grantAccess(spaceId: string, agentId: string, permission: 'read' | 'write') {
    const { data, error } = await supabase
      .from('memory_space_grants')
      .upsert({ space_id: spaceId, agent_id: agentId, permission }, { onConflict: 'space_id,agent_id' })
      .select()
      .single();
    if (error) throw new Error(`Failed to grant access: ${error.message}`);
    return data;
  }

  async checkPermission(spaceId: string, agentId: string, requiredPermission: 'read' | 'write'): Promise<boolean> {
    const { data, error } = await supabase
      .from('memory_space_grants')
      .select('permission')
      .eq('space_id', spaceId)
      .eq('agent_id', agentId)
      .single();
      
    if (error || !data) return false;
    if (requiredPermission === 'read') return true; // write implies read
    return data.permission === 'write';
  }

  async getAgentSharedMemories(agentId: string, limit: number = 20) {
    // First get all spaces the agent has access to
    const { data: grants } = await supabase
      .from('memory_space_grants')
      .select('space_id')
      .eq('agent_id', agentId);
      
    if (!grants || grants.length === 0) return [];
    
    const spaceIds = grants.map(g => g.space_id);
    
    // Then get memories for those spaces
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .in('space_id', spaceIds)
      .order('created_at', { ascending: false })
      .limit(limit);
      
    if (error) throw new Error(`Failed to get shared memories: ${error.message}`);
    return data;
  }
```

**Step 2: Update existing methods**

修改 `addMemory`：
```typescript
  async addMemory(
    sessionKey: string | null,
    content: string,
    type: 'short' | 'long' = 'short',
    metadata: any = {},
    spaceId: string | null = null,
    agentId?: string // Needed for auth check if writing to space
  ): Promise<Memory> {
    if (spaceId && agentId) {
      const hasAccess = await this.checkPermission(spaceId, agentId, 'write');
      if (!hasAccess) throw new Error(`Agent ${agentId} lacks write permission for space ${spaceId}`);
    }

    const { data, error } = await supabase
      .from('memories')
      .insert({
        session_key: sessionKey,
        space_id: spaceId,
        content: content,
        type: type,
        metadata: metadata,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to add memory: ${error.message}`);
    return data;
  }
```

### Task 4: 编排器 (Orchestrator) 注入共享记忆

**Files:**
- Modify: `src/core/orchestrator.ts`

**Step 1: Inject shared memories into Prompt**

在 `handleMessage` 方法中，在获取 `sessionMemories` 之后：

```typescript
      // 4. Get session memories
      const sessionMemories = await this.memoryRepo.getMemories(sessionKey, 10);
      
      // NEW: Get shared memories for this agent
      const sharedMemories = await this.memoryRepo.getAgentSharedMemories(agent.id, 10);
      
      let sharedContext = '';
      if (sharedMemories.length > 0) {
        sharedContext = `\n\n<Shared_Knowledge_Base>\n${sharedMemories.map(m => `- ${m.content}`).join('\n')}\n</Shared_Knowledge_Base>\n`;
      }

      // 5. Build prompt
      const systemPrompt = agent.config.prompt || 'You are a helpful assistant.';
      const prompt = `${systemPrompt}${sharedContext}`;
```

**Step 2: Run TypeScript compiler**

Run: `npx tsc --noEmit`
Expected: 编译通过。

### Task 5: 编写测试/验证脚本

**Files:**
- Create: `scripts/test-shared-memory.js`

**Step 1: Write a script to verify the flow**

创建一个脚本，模拟：
1. 创建两个 Agent (A 和 B)。
2. 创建一个 Shared Space。
3. 给 A 赋予 write 权限，B 赋予 read 权限。
4. A 写入一条记忆。
5. 验证 B 能通过 `getAgentSharedMemories` 读到这条记忆。
6. 验证 A 没有权限写入未经授权的 Space。

**Step 2: Run the script**

Run: `node scripts/test-shared-memory.js`
Expected: 脚本输出全绿，验证通过。
