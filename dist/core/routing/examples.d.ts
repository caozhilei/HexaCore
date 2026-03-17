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
export declare const vipCustomerRule: RoutingRule;
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
export declare const pricingInquiryRule: RoutingRule;
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
export declare const techSupportRule: RoutingRule;
/**
 * 工作时间路由规则示例
 *
 * 匹配条件：
 * - Time: 周一至周五 9:00-18:00 (上海时区)
 *
 * 适用场景：工作时间内的常规客服
 */
export declare const businessHoursRule: RoutingRule;
/**
 * 账户级路由规则示例
 *
 * 匹配条件：
 * - Account ID: premium-business
 * - Channel: wecom
 *
 * 适用场景：特定企业账户的专属服务
 */
export declare const accountSpecificRule: RoutingRule;
/**
 * 位置敏感路由规则示例
 *
 * 匹配条件：
 * - Location: 中国上海市，或坐标附近1公里内
 *
 * 适用场景：基于地理位置的服务分发
 */
export declare const locationSensitiveRule: RoutingRule;
/**
 * 意图识别路由规则示例
 *
 * 匹配条件：
 * - Intent: 投诉, 反馈, 建议
 * - Intent Confidence: > 0.8
 *
 * 适用场景：基于意图识别的智能路由
 */
export declare const intentBasedRule: RoutingRule;
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
export declare const trustBasedRule: RoutingRule;
/**
 * 默认路由规则示例
 *
 * 匹配条件：default=true（兜底规则）
 *
 * 适用场景：处理所有未匹配的请求
 */
export declare const defaultRule: RoutingRule;
/**
 * 完整的示例规则集合
 */
export declare const exampleRules: RoutingRule[];
/**
 * 简化的示例规则集合（3个核心规则）
 */
export declare const simplifiedExampleRules: RoutingRule[];
/**
 * 企业级路由配置示例
 */
export declare const enterpriseRoutingConfig: {
    rules: RoutingRule[];
    settings: {
        enableCaching: boolean;
        cacheTTL: number;
        enableParallelMatching: boolean;
        parallelWorkers: number;
        healthCheckInterval: number;
        healthCheckTimeout: number;
        enableAdaptiveTimeout: boolean;
        minTimeout: number;
        maxTimeout: number;
        enableDeterministicRouting: boolean;
    };
};
/**
 * 创建测试用的消息示例
 */
export declare const createTestMessage: (overrides?: Partial<any>) => any;
/**
 * 演示路由匹配过程
 */
export declare function demonstrateRoutingMatching(): Promise<void>;
