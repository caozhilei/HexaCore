# HexaCore Web 管理系统设计方案

## 1. 概述
HexaCore Web 管理系统旨在为用户提供可视化的智能体管理、调试和监控界面。基于 Next.js + shadcn/ui 构建，采用 Supabase 进行认证和数据存储。

## 2. 技术栈
- **Framework**: Next.js 14 (App Router)
- **UI Components**: shadcn/ui (Tailwind CSS)
- **State Management**: Zustand / React Query
- **Authentication**: Supabase Auth (Email/Password, OAuth)
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Docker Compose

## 3. 功能模块

### 3.1 认证与用户管理 (Auth)
- **登录/注册页**: 支持邮箱密码登录。
- **个人中心**: 修改头像、密码。
- **权限控制**: 基于 Supabase RLS (Row Level Security)。
  - `admin`: 可管理所有 Agent。
  - `user`: 仅管理自己创建的 Agent。

### 3.2 仪表盘 (Dashboard)
- **概览**: Agent 总数、活跃 Session 数、今日 Token 消耗。
- **系统状态**: 各服务健康状态 (Redis, Supabase, LLM)。

### 3.3 智能体管理 (Agent Management)
- **Agent 列表**: 展示所有 Agent，支持搜索和筛选。
- **Agent 编辑器**:
  - 基础信息: Name, Description, Avatar.
  - 模型配置: Provider (OpenAI/DeepSeek/Qwen), Model, Temperature.
  - 提示词: System Prompt 编辑 (支持 Markdown/Syntax Highlighting).
  - 技能绑定: 选择启用的 Skills。
- **Agent 测试**: 内嵌聊天窗口，实时调试 Agent 回复。

### 3.4 技能市场 (Skill Market)
- **技能列表**: 展示可用技能 (如 Calculator, WebSearch)。
- **技能详情**: 查看技能参数、描述和使用示例。

### 3.5 会话管理 (Session History)
- **会话列表**: 查看历史对话记录。
- **详情查看**: 查看完整对话内容和 Token 消耗。

## 4. 目录结构
```
apps/web/
├── app/
│   ├── (auth)/          # 登录注册路由
│   ├── (dashboard)/     # 管理后台路由
│   │   ├── agents/
│   │   ├── sessions/
│   │   └── settings/
│   ├── api/             # 后端 API (如需)
│   └── layout.tsx
├── components/
│   ├── ui/              # shadcn 组件
│   ├── agents/          # Agent 相关组件
│   └── chat/            # 聊天组件
├── lib/
│   ├── supabase/        # Supabase 客户端
│   └── utils.ts
└── public/
```

## 5. 权限设计 (RLS 策略)
- `agents` 表:
  - `SELECT`: `auth.uid() == owner_id` OR `role == 'admin'`
  - `INSERT`: `auth.uid() == owner_id`
  - `UPDATE`: `auth.uid() == owner_id`
  - `DELETE`: `auth.uid() == owner_id`

## 6. 开发计划
1.  **初始化项目**: 创建 Next.js 项目，安装依赖。
2.  **配置 Supabase**: 集成 Auth 和 Database Client。
3.  **实现基础 UI**: 布局、导航栏、登录页。
4.  **实现 Agent CRUD**: 列表、创建、编辑表单。
5.  **集成 Chat**: WebSocket 连接后端进行实时对话。
6.  **容器化**: 编写 Dockerfile。
