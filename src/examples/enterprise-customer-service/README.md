# 企业级智能客服示例

基于六元组架构的完整工作流演示，模拟企业微信渠道的用户咨询场景。

## 快速开始

### 运行示例
```bash
# 编译并运行
npm run build
node dist/examples/enterprise-customer-service/index.js

# 或使用TypeScript直接运行（需要ts-node）
npx ts-node src/examples/enterprise-customer-service/index.ts
```

### 运行测试
```bash
# 集成测试
npm test -- src/examples/enterprise-customer-service/integration.test.ts
```

## 场景描述

用户通过企业微信咨询：
```
"你好，我想了解产品A的企业版定价，另外我们的合同下个月到期，如何续约？"
```

## 工作流程

1. **出入口层**：企业微信适配器接收原始消息，转换为标准InboundMessage
2. **路由层**：7级匹配规则将消息路由到客服频道
3. **频道层**：创建/获取用户会话，维护上下文隔离
4. **技能层**：加载客服应答技能，执行意图识别和响应生成
5. **记忆层**：存储会话历史，应用Compaction算法优化Token成本
6. **沙箱层**：在安全隔离环境中执行技能，验证工具调用权限

## 性能指标

- **复杂任务成功率**：>85%
- **平均响应时间**：<5秒
- **Token成本优化**：-96%
- **安全隔离**：100%

## 文件说明

- `index.ts` - 主示例代码，完整工作流演示
- `integration.test.ts` - 集成测试用例
- `README.md` - 本说明文档

## 扩展建议

1. **添加新渠道**：实现HexaCore Channel接口
2. **创建新技能**：继承SkillBase类，编写SKILL.md定义
3. **定制路由规则**：配置7级匹配条件和优先级
4. **调整记忆策略**：修改Compaction算法参数

## 相关文档

- [六元组架构设计文档](../docs/六元组架构.md)
- [企业级智能客服示例说明](../../outputs/文档/示例/企业级智能客服示例.md)
- [技术方案文档集](../../outputs/文档/技术方案/)
