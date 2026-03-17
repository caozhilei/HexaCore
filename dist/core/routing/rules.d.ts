/**
 * 路由规则定义模块
 *
 * 本模块定义了路由引擎的核心数据结构和接口，包括：
 * 1. InboundMessage - 标准化输入消息结构
 * 2. RoutingRule - 路由规则定义
 * 3. RoutingResult - 路由匹配结果
 * 4. 各种匹配条件类型定义
 */
import { InboundMessage as EntryPointInboundMessage, PeerKind as EntryPointPeerKind } from '../entry-points/interfaces';
export type PeerKind = EntryPointPeerKind;
export type InboundMessage = EntryPointInboundMessage;
/**
 * Peer匹配条件
 */
export interface PeerMatchCondition {
    id?: string;
    kind?: PeerKind;
    metadata?: Record<string, any>;
}
/**
 * 内容关键词匹配条件
 */
export interface ContentKeywordCondition {
    keywords: string[];
    mode?: 'any' | 'all';
    regex?: boolean;
}
/**
 * 内容语义匹配条件
 */
export interface ContentSemanticCondition {
    query: string;
    threshold?: number;
}
/**
 * 内容匹配条件
 */
export interface ContentMatchCondition {
    keywords?: ContentKeywordCondition | string[];
    semantic?: ContentSemanticCondition;
}
/**
 * 时间匹配条件
 */
export interface TimeMatchCondition {
    weekdays?: number[];
    startHour?: number;
    endHour?: number;
    timezone?: string;
    businessHours?: boolean;
    excludeHolidays?: boolean;
}
/**
 * 位置匹配条件
 */
export interface LocationMatchCondition {
    country?: string;
    region?: string;
    city?: string;
    coordinates?: {
        lat: number;
        lng: number;
        radius?: number;
    };
}
/**
 * 意图匹配条件
 */
export interface IntentMatchCondition {
    categories?: string[];
    confidenceThreshold?: number;
}
/**
 * 信任级别匹配条件
 */
export interface TrustMatchCondition {
    level?: 'low' | 'medium' | 'high';
    scoreThreshold?: number;
    verified?: boolean;
}
/**
 * 路由规则匹配条件集合
 * 支持7级匹配：peer、content、channel、time、location、intent、trust
 */
export interface RoutingMatchConditions {
    accountId?: string;
    peer?: PeerMatchCondition;
    content?: ContentMatchCondition;
    channel?: string | string[];
    time?: TimeMatchCondition;
    location?: LocationMatchCondition;
    intent?: IntentMatchCondition;
    trust?: TrustMatchCondition;
    default?: boolean;
}
/**
 * 路由规则定义
 */
export interface RoutingRule {
    agentId: string;
    priority: number;
    match: RoutingMatchConditions;
    timeout?: number;
    fallbackAgent?: string;
    enabled?: boolean;
    metadata?: Record<string, any>;
}
/**
 * 路由匹配结果
 */
export interface RoutingResult {
    agentId: string;
    rulePriority: number;
    matchedConditions: Partial<RoutingMatchConditions>;
    score?: number;
    timestamp: Date;
}
/**
 * 路由引擎配置
 */
export interface RoutingEngineConfig {
    rules: RoutingRule[];
    settings?: {
        enableCaching?: boolean;
        cacheTTL?: number;
        enableParallelMatching?: boolean;
        parallelWorkers?: number;
        healthCheckInterval?: number;
        healthCheckTimeout?: number;
        enableAdaptiveTimeout?: boolean;
        minTimeout?: number;
        maxTimeout?: number;
    };
}
/**
 * 匹配得分计算器接口
 */
export interface MatchScorer {
    calculateScore(message: InboundMessage, rule: RoutingRule, matchedConditions: Partial<RoutingMatchConditions>): number;
}
/**
 * 规则加载器接口
 */
export interface RuleLoader {
    loadRules(): Promise<RoutingRule[]>;
    reloadRules(): Promise<void>;
}
/**
 * 健康检查器接口
 */
export interface HealthChecker {
    isAgentHealthy(agentId: string): Promise<boolean>;
    getAgentHealthStatus(agentId: string): Promise<{
        healthy: boolean;
        score: number;
        lastCheck: Date;
    }>;
}
