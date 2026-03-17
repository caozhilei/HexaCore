---
name: weather-query
description: 实时天气查询技能，支持全球城市天气信息查询
version: 1.0.0
tools: [http, json]
environment: [WEATHER_API_KEY]
parameters:
  city:
    type: string
    description: 城市名称，支持中文、英文
    required: true
  days:
    type: number
    description: 预报天数（1-7），默认1
    default: 1
    min: 1
    max: 7
output:
  type: object
  properties:
    city:
      type: string
    current:
      type: object
    forecast:
      type: array
---

# 天气查询技能

## 功能描述
基于天气API提供实时天气查询和短期天气预报服务。

## API密钥配置
需要配置WEATHER_API_KEY环境变量，支持以下服务商：
- OpenWeatherMap
- 和风天气
- AccuWeather

## 使用示例
```javascript
// 调用天气查询技能
const result = await skillManager.executeSkill('weather-query', {
  city: '北京',
  days: 3
}, {
  callerAgentId: 'test-agent',
  validatePermissions: true
});
```

## 返回示例
```json
{
  "success": true,
  "data": {
    "city": "北京市",
    "current": {
      "temp": 25.5,
      "feels_like": 26.0,
      "humidity": 65,
      "pressure": 1013,
      "wind_speed": 3.2,
      "description": "晴",
      "icon": "https://openweathermap.org/img/wn/01d@2x.png"
    },
    "forecast": [
      {
        "date": "2024-05-15",
        "temp_min": 20.0,
        "temp_max": 28.0,
        "description": "多云",
        "precipitation": 10
      }
    ]
  },
  "metadata": {
    "timestamp": "2024-05-15T10:30:00.000Z",
    "processingTime": 1200,
    "cacheable": true,
    "ttl": 1800
  }
}
```

## 错误处理
- 缺少API密钥：返回错误信息"天气API密钥未配置"
- 城市不存在：返回错误信息"城市名称无效，请检查城市名称拼写"
- 网络错误：返回错误信息"天气服务暂时不可用"

## 配置要求
- 必须设置WEATHER_API_KEY环境变量
- 需要http和json工具权限
- 建议设置合理的请求超时时间