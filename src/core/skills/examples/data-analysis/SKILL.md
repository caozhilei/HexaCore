---
name: data-analysis
description: 数据分析技能，支持CSV/JSON数据导入、统计分析、可视化图表生成
version: 1.0.0
tools: [file_read, exec, http]
environment: [DATABASE_URL, REDIS_URL]
parameters:
  file_url:
    type: string
    description: 数据文件URL或路径
    required: true
  analysis_type:
    type: string
    enum: [descriptive, correlation, trend, clustering]
    description: 分析类型
    default: descriptive
  output_format:
    type: string
    enum: [json, csv, chart, report]
    description: 输出格式
    default: json
output:
  type: object
  properties:
    summary:
      type: object
    visualizations:
      type: array
    recommendations:
      type: array
---

# 数据分析技能

## 功能描述
提供数据导入、清洗、分析、可视化一站式服务，支持多种数据格式和分析方法。

## 数据格式支持
- CSV（逗号分隔、分号分隔）
- JSON（数组、对象嵌套）
- Excel（.xlsx, .xls）

## 分析类型说明
1. **descriptive**（描述性统计）：均值、中位数、标准差、分布等
2. **correlation**（相关性分析）：计算变量间相关系数
3. **trend**（趋势分析）：时间序列趋势检测
4. **clustering**（聚类分析）：数据分组和模式识别

## 使用示例
```javascript
// 调用数据分析技能
const result = await skillManager.executeSkill('data-analysis', {
  file_url: 'https://example.com/data.csv',
  analysis_type: 'descriptive',
  output_format: 'json'
}, {
  callerAgentId: 'analytics-agent',
  validatePermissions: true
});
```

## 返回示例
```json
{
  "success": true,
  "data": {
    "summary": {
      "row_count": 1000,
      "column_count": 8,
      "missing_values": 45,
      "data_types": {
        "age": "numeric",
        "income": "numeric",
        "education": "string"
      }
    },
    "visualizations": [
      {
        "type": "histogram",
        "data": {
          "column": "age",
          "values": [25, 30, 35, 40],
          "bin_count": 10
        },
        "title": "年龄分布直方图"
      }
    ],
    "recommendations": [
      "数据缺失值较多，建议进行数据清洗或补充",
      "年龄变量存在异常值，建议检查数据质量"
    ]
  },
  "metadata": {
    "timestamp": "2024-05-15T10:30:00.000Z",
    "processingTime": 2500,
    "cacheable": true,
    "ttl": 3600
  }
}
```

## 性能优化
- 支持数据分块处理，避免内存溢出
- 实现结果缓存，提高重复查询响应速度
- 支持异步处理，长时间分析任务可后台执行

## 配置要求
- 建议配置Redis用于结果缓存
- 大数据集处理需要足够内存
- 需要文件读取和执行权限