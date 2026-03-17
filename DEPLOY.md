# HexaCore 部署指南

本指南介绍如何使用 Docker Compose 在本地或服务器上部署 HexaCore 智能体工作平台。

## 前置要求

- **Docker**: v24.0+
- **Docker Compose**: v2.20+
- **Node.js**: v18+ (用于运行辅助脚本)
- **Git**

## 快速开始

### 1. 克隆代码库

```bash
git clone https://github.com/your-org/hexacore.git
cd hexacore
```

### 2. 配置环境变量

复制示例配置文件并根据需要修改：

```bash
cp .env.example .env.local
```

主要配置项说明：
- `SUPABASE_URL`: Supabase 服务地址 (本地部署通常为 http://kong:8000)
- `SUPABASE_ANON_KEY`: Supabase 匿名密钥
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase 服务端密钥
- `OPENAI_API_KEY`: OpenAI API 密钥 (如果使用 OpenAI)
- `DEEPSEEK_API_KEY`: DeepSeek API 密钥 (如果使用 DeepSeek)
- `QWEN_API_KEY`: 通义千问 API 密钥 (如果使用 Qwen)

### 3. 启动基础服务 (Supabase)

使用 Docker Compose 启动数据库、网关等基础服务：

```bash
docker-compose up -d
```

等待服务启动完全（约 1-2 分钟）。可以通过以下命令检查状态：

```bash
docker-compose ps
```

确保所有服务（尤其是 `supabase-db`, `supabase-auth`, `supabase-rest`）均处于 `Up (healthy)` 状态。

### 4. 初始化数据库

运行初始化脚本以创建必要的表结构和扩展：

```bash
npm install
npm run init:supabase
```

此脚本会执行 `supabase/migrations` 下的 SQL 文件，创建 `agents`, `sessions`, `memories` 等核心表，并启用 `pgvector` 扩展。

### 5. 验证安装

运行测试脚本验证核心流程是否正常：

```bash
npx ts-node scripts/test-supabase-flow.ts
```

如果看到 `✅ Test Completed`，说明基础环境部署成功。

## 生产环境部署建议

1.  **修改默认密钥**: 务必修改 `.env.local` 中的 Supabase JWT Secret 和 Key。
2.  **持久化存储**: 确保 `supabase/volumes` 目录挂载到持久化磁盘。
3.  **网络安全**: 生产环境建议通过 Nginx 反向代理 `kong:8000`，并配置 SSL 证书。
4.  **资源限制**: 在 `docker-compose.yml` 中为各个服务配置 CPU 和内存限制。

## 国产化模型支持

HexaCore 原生支持以下国产大模型：

- **DeepSeek (深度求索)**:
  - 配置 `LLM_PROVIDER=deepseek`
  - 设置 `DEEPSEEK_API_KEY`
  - 默认 Base URL: `https://api.deepseek.com/v1`

- **Qwen (通义千问)**:
  - 配置 `LLM_PROVIDER=qwen`
  - 设置 `QWEN_API_KEY`
  - 默认 Base URL: `https://dashscope.aliyuncs.com/compatible-mode/v1`

在 `src/core/llm/config.ts` 或 Agent 配置中指定模型名称即可使用。
