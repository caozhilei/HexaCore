# 使用指南

HexaCore 智能体工作平台支持通过 CLI (命令行界面) 和 Web 接口进行访问。

## 1. 命令行界面 (CLI)

CLI 是开发者调试和测试 Agent 的主要方式。

### 1.1 启动 CLI
确保已安装依赖并配置好 `.env.local` 文件。

```bash
# 启动交互式 CLI
npx ts-node src/cli.ts
```

### 1.2 CLI 交互
启动后，您将看到 `User>` 提示符。直接输入文本即可与 Agent 对话。

示例：
```text
User> Hello, who are you?
Agent> I am Qwen, a large language model developed by Alibaba Cloud.
User> Help me write a python script to list files.
Agent> Here is a python script...
```

### 1.3 退出 CLI
输入 `exit` 或 `quit` 即可退出。

## 2. Web 访问

Web 访问依赖于 `web-adapter`，目前支持通过 WebSocket 或 HTTP API 进行交互。

### 2.1 启动服务
确保 Docker 服务已启动：

```bash
docker-compose up -d
```

### 2.2 前端集成
Web Adapter 监听在 `ws://localhost:18790/ws/chat`。您可以使用任意 WebSocket 客户端或集成到您的前端项目中。

消息格式 (JSON):
```json
{
  "sessionId": "session-123",
  "message": "Hello Agent",
  "userAgent": "Mozilla/5.0..."
}
```

## 3. 模型配置

### 3.1 切换模型
修改 `.env.local` 文件中的 `LLM_PROVIDER` 和 `LLM_MODEL`。

**使用 Qwen (通义千问):**
```env
LLM_PROVIDER=qwen
LLM_MODEL=qwen3.5-plus
QWEN_API_KEY=sk-xxxxxxxx
```

**使用 DeepSeek:**
```env
LLM_PROVIDER=deepseek
LLM_MODEL=deepseek-chat
DEEPSEEK_API_KEY=sk-xxxxxxxx
```

### 3.2 验证配置
运行测试脚本验证模型连接：

```bash
npx ts-node scripts/test-qwen.ts
```
