/**
 * Session Pruning实现
 * 基于HexaCore框架的修剪机制，优化缓存命中率和Token成本
 * 实现时间衰减、频率分析、相关性评估等价值评估算法
 */
export interface PruningConfig {
    enabled: boolean;
    mode: 'soft' | 'hard' | 'hybrid';
    ttl: number;
    valueThreshold: number;
    cacheOptimization: {
        enabled: boolean;
        targetHitRate: number;
        evictionPolicy: 'lru' | 'lfu' | 'ttl';
    };
    costReductionTarget: number;
}
export interface SessionSegment {
    id: string;
    content: any;
    timestamp: Date;
    lastAccessed: Date;
    accessCount: number;
    tokenCount: number;
    category: 'tool_result' | 'conversation' | 'knowledge' | 'metadata';
    toolType?: 'query' | 'write' | 'execution';
    metadata?: Record<string, any>;
}
export interface ValueMetrics {
    timeDecayScore: number;
    frequencyScore: number;
    relevanceScore: number;
    importanceScore: number;
    compositeScore: number;
}
export interface PruningResult {
    action: 'soft_pruned' | 'hard_replaced' | 'skipped';
    segmentsRemoved: number;
    tokenReduction: number;
    costReductionPercent: number;
    retainedData?: any;
    replacedData?: any;
    segmentsRemovedIds: string[];
    reason?: string;
}
/**
 * Session修剪器
 * 实现HexaCore框架的Pruning算法
 */
export declare class SessionPruner {
    private config;
    constructor(config?: Partial<PruningConfig>);
    /**
     * 修剪会话数据
     */
    pruneSession(sessionKey: string, sessionData: SessionSegment[], configOverride?: Partial<PruningConfig>): Promise<PruningResult>;
    /**
     * 识别低价值内容
     */
    private identifyLowValueContent;
    /**
     * 计算价值指标
     */
    private calculateValueMetrics;
    /**
     * 计算相关性得分
     */
    private calculateRelevanceScore;
    /**
     * 计算重要性得分
     */
    private calculateImportanceScore;
    /**
     * 软修剪：保留关键信息头尾
     */
    private softPrune;
    /**
     * 硬清除：完全移除低价值内容
     */
    private hardReplace;
    /**
     * 混合修剪：结合软硬策略
     */
    private hybridPrune;
    /**
     * 生成段摘要
     */
    private generateSegmentSummary;
    /**
     * 判断段是否可被摘要化
     */
    private canBeSummarized;
    /**
     * 估算Token数量
     */
    private estimateTokenCount;
    /**
     * 缓存优化分析
     */
    analyzeCachePerformance(accessPatterns: Array<{
        segmentId: string;
        timestamp: Date;
    }>, currentHitRate: number): Promise<{
        recommendedPolicy: 'lru' | 'lfu' | 'ttl';
        expectedHitRate: number;
        segmentsToEvict: string[];
    }>;
    /**
     * 计算访问频率方差
     */
    private calculateAccessVariance;
    /**
     * 获取配置
     */
    getConfig(): PruningConfig;
    /**
     * 更新配置
     */
    updateConfig(newConfig: Partial<PruningConfig>): void;
    /**
     * 计算成本节约报告
     */
    calculateCostSavingsReport(originalTokens: number, prunedTokens: number, tokenPricePerMillion?: number): {
        tokenSavings: number;
        costSavings: number;
        savingsPercent: number;
        roi: number;
    };
}
