---
name: customer-service
description: 智能客服应答技能，支持多轮对话、意图识别、知识库检索和工单创建
version: 1.0.0
tools: [http, database_query, file_write]
environment: [KNOWLEDGE_BASE_URL, TICKET_SYSTEM_API_KEY]
parameters:
  message:
    type: string
    description: 用户当前消息内容
    required: true
  session_history:
    type: array
    description: 会话历史记录（可选）
output:
  type: object
  properties:
    response:
      type: string
    actions:
      type: array
    metadata:
      type: object
---

# 客服应答技能

## 功能描述
提供智能客服应答服务，支持意图识别、多轮对话管理、知识库检索和工单系统集成。

## 支持功能
1. **常见问题自动应答**：基于知识库快速回答常见问题
2. **多轮对话上下文管理**：维护会话状态和历史记录
3. **工单创建和状态查询**：与工单系统集成，支持问题跟进
4. **知识库实时检索**：从文档库中查找相关信息
5. **意图识别和分类**：自动识别用户需求并分类处理

## 使用示例
```javascript
// 调用客服应答技能
const result = await skillManager.executeSkill('customer-service', {
  message: '我的订单为什么还没发货？',
  session_history: [
    {
      role: 'user',
      content: '你好',
      timestamp: '2024-05-15T10:00:00.000Z'
    },
    {
      role: 'assistant',
      content: '您好！请问有什么可以帮助您的？',
      timestamp: '2024-05-15T10:00:02.000Z'
    }
  ]
}, {
  callerAgentId: 'support-agent',
  validatePermissions: true
});
```

## 返回示例
```json
{
  "success": true,
  "data": {
    "response": "您好！您的订单号#ORD123456目前处于已确认状态，预计今天下午4点前安排发货。您可以通过订单详情页面查看实时物流信息。",
    "actions": [
      {
        "type": "knowledge_search",
        "data": {
          "query": "订单发货延迟",
          "results": ["发货政策", "物流时效说明"]
        },
        "priority": "low"
      }
    ],
    "metadata": {
      "intent": "order_status_query",
      "confidence": 0.92,
      "processing_time": 850,
      "session_id": "session_abc123"
    }
  },
  "metadata": {
    "timestamp": "2024-05-15T10:30:00.000Z",
    "processingTime": 900,
    "cacheable": true,
    "ttl": 300
  }
}
```

## 意图分类
技能支持以下主要意图：
- `faq_query`: 常见问题查询
- `order_status`: 订单状态查询
- `ticket_create`: 创建工单
- `ticket_status`: 工单状态查询
- `escalation_request`: 升级请求
- `general_query`: 一般咨询

## 配置要求
- KNOWLEDGE_BASE_URL: 知识库服务地址
- TICKET_SYSTEM_API_KEY: 工单系统API密钥
- 需要网络访问、数据库查询和文件写入权限

## 性能优化
- 实现会话缓存，提高多轮对话响应速度
- 支持批量知识库检索，减少API调用次数
- 提供异步工单创建，避免阻塞用户交互