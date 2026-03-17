---
name: document-generation
description: 文档生成技能，支持自动生成技术文档、报告、说明书等
version: 1.0.0
tools: [file_write, exec, http]
environment: [OPENAI_API_KEY, TEMPLATE_DIR]
parameters:
  document_type:
    type: string
    enum: [technical, report, manual, proposal]
    description: 文档类型
    required: true
  topic:
    type: string
    description: 文档主题
    required: true
  output_format:
    type: string
    enum: [markdown, html, pdf, word]
    description: 输出格式
    default: markdown
  template_name:
    type: string
    description: 模板名称（可选）
output:
  type: object
  properties:
    document_url:
      type: string
    metadata:
      type: object
---

# 文档生成技能

## 功能描述
基于模板和AI模型自动生成专业文档，支持多种格式输出。

## 文档类型说明
1. **technical**（技术文档）：API文档、架构设计、开发指南等
2. **report**（分析报告）：数据分析报告、项目总结报告等
3. **manual**（使用手册）：产品说明书、操作指南、用户手册等
4. **proposal**（项目提案）：商业计划书、项目建议书、解决方案等

## 模板系统
- 支持自定义Jinja2模板
- 变量插值和条件逻辑
- 多语言模板支持

## 使用示例
```javascript
// 调用文档生成技能
const result = await skillManager.executeSkill('document-generation', {
  document_type: 'technical',
  topic: '六元组架构设计',
  output_format: 'pdf',
  template_name: 'tech-doc-template'
}, {
  callerAgentId: 'doc-agent',
  validatePermissions: true
});
```

## 返回示例
```json
{
  "success": true,
  "data": {
    "document_url": "/tmp/documents/六元组架构设计_2024-05-15.pdf",
    "metadata": {
      "generation_time": 3200,
      "word_count": 1250,
      "template_used": "tech-doc-template",
      "format": "pdf"
    }
  },
  "metadata": {
    "timestamp": "2024-05-15T10:30:00.000Z",
    "processingTime": 3500,
    "cacheable": false,
    "ttl": 0
  }
}
```

## 模板变量
文档生成支持以下通用变量：
- `{{ topic }}`: 文档主题
- `{{ date }}`: 生成日期
- `{{ author }}`: 作者/生成者
- `{{ version }}`: 文档版本

## 自定义模板
用户可以在`TEMPLATE_DIR`目录下放置自定义模板文件，文件命名格式：`{template_name}.ejs`

## 配置要求
- OPENAI_API_KEY：用于AI生成内容（可选）
- TEMPLATE_DIR：模板文件目录
- 需要文件写入和执行权限