/**
 * 路由规则示例集
 * 
 * 本模块提供了3个不同匹配维度的路由规则示例：
 * 1. VIP客户专属路由规则 - 演示Peer元数据匹配
 * 2. 价格咨询路由规则 - 演示Content关键词匹配和时间条件
 * 3. 技术支持路由规则 - 演示Guild/Team匹配和内容关键词匹配
 * 4. 工作时间路由规则 - 演示时间条件匹配
 * 5. 默认路由规则 - 演示兜底规则
 */

import { RoutingRule } from './rules';

/**
 * VIP客户专属路由规则示例
 * 
 * 匹配条件：
 * - Channel: whatsapp
 * - Peer Metadata: tier=premium, totalSpending>10000, customerSince>=2025-01-01
 * 
 * 适用场景：VIP客户享受专属服务通道
 */
export const vipCustomerRule: RoutingRule = {
  agentId: 'vip-agent',
  priority: 100,
  match: {
    channel: 'whatsapp',
    peer: {
      kind: 'dm',
      metadata: {
        tier: 'premium',
        totalSpending: { gt: 10000 },
        customerSince: { gte: '2025-01-01' }
      }
    }
  },
  timeout: 30000,
  fallbackAgent: 'general-agent',
  enabled: true,
  metadata: {
    description: 'VIP客户专属服务通道',
    createdBy: 'admin',
    createdAt: '2026-02-27T10:00:00Z'
  }
};

/**
 * 价格咨询路由规则示例
 * 
 * 匹配条件：
 * - Channels: whatsapp, wecom, web
 * - Content Keywords: 报价, 价格, 多少钱, cost, price, 费用, 收费
 * - Time: 工作日9:00-18:00，排除节假日
 * 
 * 适用场景：处理产品价格相关咨询
 */
export const pricingInquiryRule: RoutingRule = {
  agentId: 'pricing-agent',
  priority: 90,
  match: {
    channel: ['whatsapp', 'wecom', 'web'],
    content: {
      keywords: {
        keywords: ['报价', '价格', '多少钱', 'cost', 'price', '费用', '收费'],
        mode: 'any',
        regex: false
      },
      semantic: {
        query: '询问产品或服务价格',
        threshold: 0.7
      }
    },
    time: {
      businessHours: true,
      excludeHolidays: true
    }
  },
  timeout: 20000,
  fallbackAgent: 'general-agent',
  enabled: true,
  metadata: {
    description: '价格相关咨询处理',
    category: 'sales'
  }
};

/**
 * 技术支持路由规则示例
 * 
 * 匹配条件：
 * - Guild/Team: tech-guild-123
 * - Peer Metadata: department=engineering, role in [developer, engineer, architect]
 * - Content Keywords: bug, 错误, 故障, 问题, help, 支持
 * 
 * 适用场景：企业内部技术支持
 */
export const techSupportRule: RoutingRule = {
  agentId: 'tech-support',
  priority: 80,
  match: {
    peer: {
      metadata: {
        department: 'engineering',
        role: { in: ['developer', 'engineer', 'architect'] }
      }
    },
    content: {
      keywords: ['bug', '错误', '故障', '问题', 'help', '支持']
    }
  },
  timeout: 60000,
  fallbackAgent: 'general-agent',
  enabled: true,
  metadata: {
    description: '技术支持路由',
    internalOnly: true
  }
};

/**
 * 工作时间路由规则示例
 * 
 * 匹配条件：
 * - Time: 周一至周五 9:00-18:00 (上海时区)
 * 
 * 适用场景：工作时间内的常规客服
 */
export const businessHoursRule: RoutingRule = {
  agentId: 'duty-agent',
  priority: 60,
  match: {
    time: {
      weekdays: [1, 2, 3, 4, 5], // 周一至周五
      startHour: 9,
      endHour: 18,
      timezone: 'Asia/Shanghai'
    }
  },
  fallbackAgent: 'general-agent',
  enabled: true,
  metadata: {
    description: '工作时间客服路由'
  }
};

/**
 * 账户级路由规则示例
 * 
 * 匹配条件：
 * - Account ID: premium-business
 * - Channel: wecom
 * 
 * 适用场景：特定企业账户的专属服务
 */
export const accountSpecificRule: RoutingRule = {
  agentId: 'account-specific-agent',
  priority: 50,
  match: {
    accountId: 'premium-business',
    channel: 'wecom'
  },
  enabled: true,
  metadata: {
    description: '特定企业账户专属路由'
  }
};

/**
 * 位置敏感路由规则示例
 * 
 * 匹配条件：
 * - Location: 中国上海市，或坐标附近1公里内
 * 
 * 适用场景：基于地理位置的服务分发
 */
export const locationSensitiveRule: RoutingRule = {
  agentId: 'local-agent',
  priority: 70,
  match: {
    location: {
      country: '中国',
      city: '上海',
      coordinates: {
        lat: 31.2304,
        lng: 121.4737,
        radius: 1000 // 1公里半径
      }
    }
  },
  timeout: 25000,
  fallbackAgent: 'general-agent',
  enabled: true,
  metadata: {
    description: '上海地区本地化服务'
  }
};

/**
 * 意图识别路由规则示例
 * 
 * 匹配条件：
 * - Intent: 投诉, 反馈, 建议
 * - Intent Confidence: > 0.8
 * 
 * 适用场景：基于意图识别的智能路由
 */
export const intentBasedRule: RoutingRule = {
  agentId: 'complaint-handler',
  priority: 85,
  match: {
    intent: {
      categories: ['投诉', '反馈', '建议'],
      confidenceThreshold: 0.8
    }
  },
  timeout: 45000,
  fallbackAgent: 'general-agent',
  enabled: true,
  metadata: {
    description: '投诉和建议处理专线'
  }
};

/**
 * 信任级别路由规则示例
 * 
 * 匹配条件：
 * - Trust Level: high
 * - Trust Score: > 0.9
 * - Verified: true
 * 
 * 适用场景：高信任级别用户的特殊处理
 */
export const trustBasedRule: RoutingRule = {
  agentId: 'trusted-agent',
  priority: 95,
  match: {
    trust: {
      level: 'high',
      scoreThreshold: 0.9,
      verified: true
    }
  },
  timeout: 35000,
  fallbackAgent: 'general-agent',
  enabled: true,
  metadata: {
    description: '高信任级别用户专属服务'
  }
};

/**
 * 默认路由规则示例
 * 
 * 匹配条件：default=true（兜底规则）
 * 
 * 适用场景：处理所有未匹配的请求
 */
export const defaultRule: RoutingRule = {
  agentId: 'general-agent',
  priority: 0,
  match: { default: true },
  timeout: 15000,
  enabled: true,
  metadata: {
    description: '通用客服路由，处理所有未匹配的请求'
  }
};

/**
 * 完整的示例规则集合
 */
export const exampleRules: RoutingRule[] = [
  vipCustomerRule,
  pricingInquiryRule,
  techSupportRule,
  businessHoursRule,
  accountSpecificRule,
  locationSensitiveRule,
  intentBasedRule,
  trustBasedRule,
  defaultRule
];

/**
 * 简化的示例规则集合（3个核心规则）
 */
export const simplifiedExampleRules: RoutingRule[] = [
  vipCustomerRule,
  pricingInquiryRule,
  techSupportRule,
  defaultRule
];

/**
 * 企业级路由配置示例
 */
export const enterpriseRoutingConfig = {
  rules: exampleRules,
  settings: {
    enableCaching: true,
    cacheTTL: 3600,
    enableParallelMatching: true,
    parallelWorkers: 4,
    healthCheckInterval: 30000,
    healthCheckTimeout: 5000,
    enableAdaptiveTimeout: true,
    minTimeout: 5000,
    maxTimeout: 120000,
    enableDeterministicRouting: true
  }
};

/**
 * 创建测试用的消息示例
 */
export const createTestMessage = (overrides: Partial<any> = {}): any => {
  const defaultMessage = {
    id: 'msg-123456',
    channel: 'whatsapp',
    accountId: 'premium-business',
    peer: {
      id: 'user-789',
      kind: 'dm' as const,
      metadata: {
        tier: 'premium',
        totalSpending: 15000,
        customerSince: '2025-03-15',
        department: 'engineering',
        role: 'developer'
      }
    },
    content: {
      text: '请问这个产品的价格是多少？',
      type: 'text' as const
    },
    timestamp: new Date('2026-02-28T14:30:00Z'),
    metadata: {
      location: {
        country: '中国',
        city: '上海',
        latitude: 31.2305,
        longitude: 121.4738
      },
      intent: {
        category: '价格咨询',
        confidence: 0.85
      },
      trust: {
        level: 'high',
        score: 0.95,
        verified: true
      }
    }
  };
  
  return { ...defaultMessage, ...overrides };
};

/**
 * 演示路由匹配过程
 */
export async function demonstrateRoutingMatching(): Promise<void> {
  console.log('=== 路由规则匹配演示 ===\n');
  
  // 创建测试消息
  const testMessage = createTestMessage();
  
  console.log('测试消息特征:');
  console.log(`- Channel: ${testMessage.channel}`);
  console.log(`- Account ID: ${testMessage.accountId}`);
  console.log(`- Peer ID: ${testMessage.peer.id}`);
  console.log(`- Peer Tier: ${testMessage.peer.metadata.tier}`);
  console.log(`- Content: ${testMessage.content.text}`);
  console.log(`- Location: ${testMessage.metadata.location.city}, ${testMessage.metadata.location.country}`);
  console.log(`- Intent: ${testMessage.metadata.intent.category} (confidence: ${testMessage.metadata.intent.confidence})`);
  console.log(`- Trust: ${testMessage.metadata.trust.level} (score: ${testMessage.metadata.trust.score}, verified: ${testMessage.metadata.trust.verified})\n`);
  
  console.log('匹配结果预测:');
  
  // VIP客户规则匹配
  if (testMessage.channel === 'whatsapp' && 
      testMessage.peer.metadata.tier === 'premium' &&
      testMessage.peer.metadata.totalSpending > 10000 &&
      testMessage.peer.metadata.customerSince >= '2025-01-01') {
    console.log('✅ 匹配VIP客户规则 -> vip-agent');
  }
  
  // 价格咨询规则匹配
  const pricingKeywords = ['报价', '价格', '多少钱', 'cost', 'price', '费用', '收费'];
  const hasPricingKeyword = pricingKeywords.some(keyword => 
    testMessage.content.text.includes(keyword)
  );
  const isBusinessHours = new Date(testMessage.timestamp).getHours() >= 9 && 
                         new Date(testMessage.timestamp).getHours() < 18;
  
  if (hasPricingKeyword && isBusinessHours) {
    console.log('✅ 匹配价格咨询规则 -> pricing-agent');
  }
  
  // 技术支持规则匹配
  const techKeywords = ['bug', '错误', '故障', '问题', 'help', '支持'];
  const hasTechKeyword = techKeywords.some(keyword => 
    testMessage.content.text.includes(keyword)
  );
  const isEngineeringDept = testMessage.peer.metadata.department === 'engineering';
  const isTechRole = ['developer', 'engineer', 'architect'].includes(testMessage.peer.metadata.role);
  
  if ((hasTechKeyword || isEngineeringDept) && isTechRole) {
    console.log('✅ 匹配技术支持规则 -> tech-support');
  }
  
  // 位置敏感规则匹配
  if (testMessage.metadata.location.city === '上海' && 
      testMessage.metadata.location.country === '中国') {
    console.log('✅ 匹配位置敏感规则 -> local-agent');
  }
  
  // 意图规则匹配
  if (['投诉', '反馈', '建议'].includes(testMessage.metadata.intent.category) &&
      testMessage.metadata.intent.confidence > 0.8) {
    console.log('✅ 匹配意图规则 -> complaint-handler');
  }
  
  // 信任规则匹配
  if (testMessage.metadata.trust.level === 'high' &&
      testMessage.metadata.trust.score > 0.9 &&
      testMessage.metadata.trust.verified) {
    console.log('✅ 匹配信任规则 -> trusted-agent');
  }
  
  console.log('\n最终路由决策:');
  console.log('根据优先级顺序，VIP客户规则（priority: 100）将优先匹配');
  console.log('预期路由结果: agentId="vip-agent", priority=100');
}