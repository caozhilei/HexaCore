# HexaCore 出入口适配器框架

## 概述

出入口适配器框架是基于HexaCore Channel插件架构的统一协议转换层，负责将所有异构输入标准化为统一的内部事件对象（InboundMessage）。本框架支持WhatsApp、企业微信、Web等多种渠道的协议转换，提供企业级安全、高性能处理和热插拔扩展能力。

## 核心架构

### 插件架构

基于HexaCore的Channel插件架构，每个渠道作为独立插件加载到HexaCore Gateway：

```
src/core/entry-points/
├── interfaces.ts              # 公共接口定义
├── base-adapter.ts           # 基础适配器抽象类
├── whatsapp-adapter.ts       # WhatsApp适配器实现
├── wecom-adapter.ts          # 企业微信适配器实现
├── web-adapter.ts            # Web适配器实现
├── message-converter.ts      # 消息转换器
├── security-validator.ts     # 安全验证器
├── connection-pool.ts        # 连接池管理
├── message-batcher.ts        # 消息批处理器
└── README.md                 # 框架文档
```

### 核心组件

1. **BaseAdapter**：适配器基类，定义标准Channel接口
2. **MessageConverter**：协议转换器，将原始消息转换为InboundMessage
3. **SecurityValidator**：安全验证器，实现输入验证和DM策略
4. **ConnectionPool**：连接池管理器，优化资源利用
5. **MessageBatcher**：消息批处理器，提高吞吐量

## 接口定义

### HexaCore Channel接口

所有适配器必须实现以下核心方法：

```typescript
interface HexaCoreChannel {
  start(config: ChannelConfig): Promise<void>;
  stop(): Promise<void>;
  send(message: OutboundMessage): Promise<void>;
  onMessage(callback: (message: InboundMessage) => void): void;
  healthCheck(): Promise<HealthStatus>;
}
```

### InboundMessage对象

标准化消息对象定义详见 `interfaces.ts`，包含以下核心字段：

- `channel`: 渠道类型（whatsapp, wecom, web等）
- `accountId`: 业务账号标识
- `peer`: 对端信息（类型、ID、元数据）
- `content`: 消息内容（文本、类型、附件等）
- `timestamp`: 消息时间戳
- `metadata`: 扩展元数据

## 扩展点

### 新增渠道适配器

1. 创建新的适配器类，继承 `BaseAdapter`
2. 实现渠道特定的协议解析逻辑
3. 注册到Gateway插件加载器
4. 配置渠道安全策略和连接参数

### 自定义安全策略

1. 实现自定义DM策略类
2. 注册到安全验证器
3. 配置渠道使用自定义策略

### 性能优化扩展

1. 自定义连接池实现
2. 扩展消息批处理策略
3. 集成第三方缓存系统

## 配置示例

### HexaCore.json 配置

```json5
{
  "gateway": {
    "port": 18789,
    "host": "127.0.0.1",
    "logLevel": "info"
  },
  
  "channels": {
    "whatsapp": {
      "enabled": true,
      "adapter": "baileys",
      "dmPolicy": "allowlist",
      "config": {
        "businessAccountId": "business_12345",
        "authDir": "./data/whatsapp/auth",
        "poolSize": 10
      }
    },
    
    "wecom": {
      "enabled": true,
      "adapter": "wecom",
      "dmPolicy": "open",
      "config": {
        "corpId": "ww_corp_123",
        "agentId": 1000002,
        "secret": "${WECOM_SECRET}"
      }
    },
    
    "web": {
      "enabled": true,
      "adapter": "widget",
      "dmPolicy": "pairing",
      "config": {
        "widgetVersion": "2.0.0",
        "wsPort": 18790
      }
    }
  }
}
```

## 使用示例

### 启动Gateway

```typescript
import { HexaCoreGateway } from './gateway/server';

const gateway = new HexaCoreGateway();
await gateway.start({
  configPath: './config/HexaCore.json',
  env: 'production'
});
```

### 注册自定义适配器

```typescript
import { PluginLoader } from './gateway/plugin-loader';
import { CustomAdapter } from './channels/custom-adapter';

const pluginLoader = new PluginLoader();
pluginLoader.register('custom', CustomAdapter);
```

### 监听消息事件

```typescript
gateway.on('inbound_message', (message: InboundMessage) => {
  console.log(`Received message from ${message.peer.id}: ${message.content.text}`);
});
```

## 测试指南

### 单元测试

运行渠道适配器的单元测试：

```bash
npm test -- --testPathPattern=whatsapp-adapter.test.ts
```

### 集成测试

启动测试Gateway并验证消息流：

```bash
npm run test:integration
```

### 性能测试

使用Artillery进行负载测试：

```bash
npm run test:performance
```

## 部署建议

### 开发环境

单节点部署，使用内存缓存和本地存储：

```bash
npm run dev
```

### 生产环境

Kubernetes集群部署，配置高可用和监控：

```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: HexaCore-gateway
spec:
  replicas: 3
  # ... 生产配置
```

## 故障排除

### 常见问题

1. **连接池耗尽**：检查 `poolSize` 配置，增加连接数或优化连接复用
2. **消息延迟过高**：启用消息批处理，调整 `batchSize` 和 `batchInterval`
3. **安全策略拒绝**：验证DM策略配置和用户权限

### 监控指标

关键监控指标：

- `gateway_messages_received_total`：接收消息总数
- `gateway_message_processing_duration_seconds`：消息处理耗时
- `connection_pool_usage_percent`：连接池使用率
- `security_policy_rejects_total`：安全策略拒绝次数

## 版本兼容性

### HexaCore版本

- v2.0.0+：完全兼容
- v1.x：需要适配层转换

### Node.js版本

- Node.js 18.x：推荐版本
- Node.js 16.x：支持但有限制
- Node.js 14.x：不再支持

## 贡献指南

欢迎提交Issue和Pull Request：

1. Fork仓库
2. 创建功能分支
3. 提交更改
4. 运行测试
5. 提交Pull Request

## 许可证

Apache License 2.0
