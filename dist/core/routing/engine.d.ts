/**
* 路由引擎核心模块
*
* 本模块实现了基于7级匹配规则的智能分发引擎，包括：
* 1. 规则优先级处理
* 2. 匹配得分计算
* 3. 路由链决策机制
* 4. 确定性哈希路由
* 5. 健康检查与降级处理
*/
import { InboundMessage, RoutingResult, RoutingEngineConfig, HealthChecker } from './rules';
/**
 * 路由引擎状态
 */
export declare enum RoutingEngineState {
    IDLE = "idle",
    MATCHING = "matching",
    HEALTH_CHECKING = "health_checking",
    ROUTING = "routing",
    ERROR = "error"
}
/**
 * 路由引擎选项
 */
export interface RoutingEngineOptions {
    enableCaching?: boolean;
    cacheTTL?: number;
    enableParallelMatching?: boolean;
    enableHealthCheck?: boolean;
    healthCheckTimeout?: number;
    enableDeterministicRouting?: boolean;
    enableAdaptiveTimeout?: boolean;
    useDatabaseRules?: boolean;
}
/**
 * 路由引擎核心实现
 */
export declare class RoutingEngine {
    private config;
    private matcher;
    private healthChecker?;
    private options;
    private state;
    private routingRepo?;
    private cache;
    private cacheHits;
    private cacheMisses;
    private totalMatches;
    private successfulMatches;
    private averageMatchTime;
    constructor(config: RoutingEngineConfig, options?: RoutingEngineOptions);
    /**
     * 从数据库加载规则
     */
    loadRulesFromDatabase(): Promise<void>;
    /**
     * 设置健康检查器
     */
    setHealthChecker(healthChecker: HealthChecker): void;
    /**
     * 路由消息
     */
    route(message: InboundMessage): Promise<RoutingResult>;
    /**
     * 批量路由消息
     */
    routeBatch(messages: InboundMessage[]): Promise<RoutingResult[]>;
    /**
     * 重新加载配置
     */
    reloadConfig(newConfig: RoutingEngineConfig): Promise<void>;
    /**
     * 获取引擎状态
     */
    getState(): RoutingEngineState;
    /**
     * 获取统计信息
     */
    getStatistics(): {
        totalMatches: number;
        successfulMatches: number;
        successRate: number;
        averageMatchTime: number;
        cacheHitRate: number;
    };
    /**
     * 获取缓存信息
     */
    getCacheInfo(): {
        size: number;
        hits: number;
        misses: number;
        items: Array<{
            key: string;
            hits: number;
            age: number;
        }>;
    };
    /**
     * 清空缓存
     */
    clearCache(): void;
    private initializeRuleIndex;
    private sortRulesByPriority;
    private matchRules;
    private calculateOverallScore;
    private checkAgentHealth;
    private createDefaultResult;
    private createFallbackResult;
    private applyDeterministicRouting;
    private generateSessionKey;
    private murmurHash3;
    private getAvailableAgents;
    private generateCacheKey;
    private cleanupExpiredCache;
    private updateStatistics;
}
