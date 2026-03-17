"use strict";
/**
 * Session Pruning实现
 * 基于HexaCore框架的修剪机制，优化缓存命中率和Token成本
 * 实现时间衰减、频率分析、相关性评估等价值评估算法
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionPruner = void 0;
/**
 * Session修剪器
 * 实现HexaCore框架的Pruning算法
 */
class SessionPruner {
    config;
    constructor(config = {}) {
        this.config = {
            enabled: config.enabled ?? true,
            mode: config.mode ?? 'soft',
            ttl: config.ttl ?? 86400, // 24小时
            valueThreshold: config.valueThreshold ?? 0.3,
            cacheOptimization: {
                enabled: config.cacheOptimization?.enabled ?? true,
                targetHitRate: config.cacheOptimization?.targetHitRate ?? 0.8,
                evictionPolicy: config.cacheOptimization?.evictionPolicy ?? 'lru',
            },
            costReductionTarget: config.costReductionTarget ?? 0.6,
        };
    }
    /**
     * 修剪会话数据
     */
    async pruneSession(sessionKey, sessionData, configOverride) {
        const config = configOverride ? { ...this.config, ...configOverride } : this.config;
        if (!config.enabled || sessionData.length === 0) {
            return {
                action: 'skipped',
                segmentsRemoved: 0,
                tokenReduction: 0,
                costReductionPercent: 0,
                segmentsRemovedIds: [],
                reason: 'disabled_or_empty',
            };
        }
        // 1. 识别低价值内容
        const lowValueSegments = this.identifyLowValueContent(sessionData, config.valueThreshold, config.ttl);
        if (lowValueSegments.length === 0) {
            return {
                action: 'skipped',
                segmentsRemoved: 0,
                tokenReduction: 0,
                costReductionPercent: 0,
                segmentsRemovedIds: [],
                reason: 'no_low_value_segments',
            };
        }
        // 2. 根据模式执行修剪
        if (config.mode === 'soft') {
            return this.softPrune(sessionData, lowValueSegments);
        }
        else if (config.mode === 'hard') {
            return this.hardReplace(sessionData, lowValueSegments);
        }
        else {
            // Hybrid模式：结合软硬修剪
            return this.hybridPrune(sessionData, lowValueSegments);
        }
    }
    /**
     * 识别低价值内容
     */
    identifyLowValueContent(segments, valueThreshold, ttl) {
        const now = Date.now();
        const lowValueSegments = [];
        for (const segment of segments) {
            // 计算综合价值得分
            const valueMetrics = this.calculateValueMetrics(segment, now, ttl);
            console.log(`[Pruning] 段 ${segment.id} 价值得分: ${valueMetrics.compositeScore.toFixed(2)}`);
            if (valueMetrics.compositeScore < valueThreshold) {
                lowValueSegments.push(segment);
            }
        }
        console.log(`[Pruning] 识别出 ${lowValueSegments.length}/${segments.length} 个低价值段`);
        return lowValueSegments;
    }
    /**
     * 计算价值指标
     */
    calculateValueMetrics(segment, now, ttl) {
        const segmentAge = now - segment.timestamp.getTime();
        // 1. 时间衰减得分：exp(-λ * age)
        const lambda = 0.001; // 衰减系数
        const timeDecayScore = Math.exp(-lambda * segmentAge / 1000); // 转换为秒
        // 2. 使用频率得分：log(accessCount + 1) 归一化
        const frequencyScore = Math.min(Math.log(segment.accessCount + 1) / Math.log(100), // 假设最大100次访问
        1.0);
        // 3. 相关性得分（基于元数据）
        const relevanceScore = this.calculateRelevanceScore(segment);
        // 4. 重要性得分（基于类别和工具类型）
        const importanceScore = this.calculateImportanceScore(segment);
        // 5. TTL检查：超过TTL的得分直接降低
        const ttlFactor = segmentAge > ttl * 1000 ? 0.3 : 1.0;
        // 6. 综合得分：加权平均
        const compositeScore = (timeDecayScore * 0.3 +
            frequencyScore * 0.25 +
            relevanceScore * 0.2 +
            importanceScore * 0.25) * ttlFactor;
        return {
            timeDecayScore,
            frequencyScore,
            relevanceScore,
            importanceScore,
            compositeScore,
        };
    }
    /**
     * 计算相关性得分
     */
    calculateRelevanceScore(segment) {
        // 基于元数据中的相关性标记
        if (segment.metadata?.relevance) {
            return Math.min(segment.metadata.relevance, 1.0);
        }
        // 基于类别
        switch (segment.category) {
            case 'tool_result':
                return 0.6;
            case 'conversation':
                return 0.8;
            case 'knowledge':
                return 0.9;
            case 'metadata':
                return 0.4;
            default:
                return 0.5;
        }
    }
    /**
     * 计算重要性得分
     */
    calculateImportanceScore(segment) {
        // 基于工具类型权重
        if (segment.toolType) {
            switch (segment.toolType) {
                case 'query':
                    return 0.8; // 查询结果通常很重要
                case 'write':
                    return 0.5; // 写入操作中等重要
                case 'execution':
                    return 0.3; // 执行结果可能较不重要
                default:
                    return 0.5;
            }
        }
        // 基于内容长度（简化）
        const contentLength = JSON.stringify(segment.content).length;
        const lengthScore = Math.min(contentLength / 10000, 1.0); // 假设最大10k字符
        return lengthScore * 0.7 + 0.3; // 基础重要性
    }
    /**
     * 软修剪：保留关键信息头尾
     */
    softPrune(originalSegments, lowValueSegments) {
        const lowValueIds = new Set(lowValueSegments.map(s => s.id));
        // 软修剪：将低价值段的内容替换为摘要
        const retainedSegments = originalSegments.map(segment => {
            if (!lowValueIds.has(segment.id)) {
                return segment;
            }
            // 创建摘要版本
            const summary = this.generateSegmentSummary(segment);
            return {
                ...segment,
                content: summary,
                tokenCount: this.estimateTokenCount(JSON.stringify(summary)),
                metadata: {
                    ...segment.metadata,
                    pruned: true,
                    pruningType: 'soft',
                    originalTokenCount: segment.tokenCount,
                    pruningTimestamp: new Date().toISOString(),
                },
            };
        });
        const tokenReduction = lowValueSegments.reduce((sum, seg) => sum + seg.tokenCount, 0) - retainedSegments
            .filter(seg => lowValueIds.has(seg.id))
            .reduce((sum, seg) => sum + seg.tokenCount, 0);
        const costReductionPercent = Math.min(tokenReduction /
            originalSegments.reduce((sum, seg) => sum + seg.tokenCount, 0), 1.0);
        return {
            action: 'soft_pruned',
            segmentsRemoved: lowValueSegments.length,
            tokenReduction,
            costReductionPercent,
            retainedData: retainedSegments,
            segmentsRemovedIds: lowValueSegments.map(s => s.id),
        };
    }
    /**
     * 硬清除：完全移除低价值内容
     */
    hardReplace(originalSegments, lowValueSegments) {
        const lowValueIds = new Set(lowValueSegments.map(s => s.id));
        // 直接过滤掉低价值段
        const replacedSegments = originalSegments.filter(segment => !lowValueIds.has(segment.id));
        const tokenReduction = lowValueSegments.reduce((sum, seg) => sum + seg.tokenCount, 0);
        const totalTokens = originalSegments.reduce((sum, seg) => sum + seg.tokenCount, 0);
        const costReductionPercent = totalTokens > 0 ?
            tokenReduction / totalTokens : 0;
        return {
            action: 'hard_replaced',
            segmentsRemoved: lowValueSegments.length,
            tokenReduction,
            costReductionPercent,
            replacedData: replacedSegments,
            segmentsRemovedIds: lowValueSegments.map(s => s.id),
        };
    }
    /**
     * 混合修剪：结合软硬策略
     */
    hybridPrune(originalSegments, lowValueSegments) {
        // 将低价值段分为两类：可摘要化和应完全移除
        const segmentsForSummary = [];
        const segmentsForRemoval = [];
        for (const segment of lowValueSegments) {
            if (this.canBeSummarized(segment)) {
                segmentsForSummary.push(segment);
            }
            else {
                segmentsForRemoval.push(segment);
            }
        }
        // 对可摘要化段进行软修剪
        const summarySegmentIds = new Set(segmentsForSummary.map(s => s.id));
        const retainedSegments = originalSegments.map(segment => {
            if (!summarySegmentIds.has(segment.id)) {
                return segment;
            }
            const summary = this.generateSegmentSummary(segment);
            return {
                ...segment,
                content: summary,
                tokenCount: this.estimateTokenCount(JSON.stringify(summary)),
                metadata: {
                    ...segment.metadata,
                    pruned: true,
                    pruningType: 'hybrid_soft',
                    originalTokenCount: segment.tokenCount,
                },
            };
        });
        // 对应移除段进行硬清除
        const removalIds = new Set(segmentsForRemoval.map(s => s.id));
        const finalSegments = retainedSegments.filter(segment => !removalIds.has(segment.id));
        const originalTokens = originalSegments.reduce((sum, seg) => sum + seg.tokenCount, 0);
        const finalTokens = finalSegments.reduce((sum, seg) => sum + seg.tokenCount, 0);
        const tokenReduction = originalTokens - finalTokens;
        const costReductionPercent = originalTokens > 0 ?
            tokenReduction / originalTokens : 0;
        return {
            action: 'hard_replaced', // 最终效果是硬清除
            segmentsRemoved: lowValueSegments.length,
            tokenReduction,
            costReductionPercent,
            replacedData: finalSegments,
            segmentsRemovedIds: lowValueSegments.map(s => s.id),
        };
    }
    /**
     * 生成段摘要
     */
    generateSegmentSummary(segment) {
        const content = segment.content;
        if (typeof content === 'string') {
            return `摘要：${content.substring(0, 100)}...（原长：${content.length}字符）`;
        }
        if (Array.isArray(content)) {
            return {
                summary: `数组摘要，共 ${content.length} 项`,
                sample: content.slice(0, 3),
                originalLength: content.length,
            };
        }
        if (typeof content === 'object' && content !== null) {
            const keys = Object.keys(content);
            return {
                summary: `对象摘要，共 ${keys.length} 个字段`,
                fieldCount: keys.length,
                sampleFields: keys.slice(0, 3),
                originalType: 'object',
            };
        }
        return { summary: `内容已修剪，原类型：${typeof content}` };
    }
    /**
     * 判断段是否可被摘要化
     */
    canBeSummarized(segment) {
        // 根据内容类型判断
        const content = segment.content;
        if (typeof content === 'string' && content.length > 50) {
            return true; // 长文本可摘要
        }
        if (Array.isArray(content) && content.length > 5) {
            return true; // 长数组可摘要
        }
        if (typeof content === 'object' && content !== null) {
            const keyCount = Object.keys(content).length;
            return keyCount > 3; // 复杂对象可摘要
        }
        return false;
    }
    /**
     * 估算Token数量
     */
    estimateTokenCount(text) {
        // 简单估算
        return Math.ceil(text.length / 4);
    }
    /**
     * 缓存优化分析
     */
    async analyzeCachePerformance(accessPatterns, currentHitRate) {
        if (!this.config.cacheOptimization.enabled) {
            return {
                recommendedPolicy: this.config.cacheOptimization.evictionPolicy,
                expectedHitRate: currentHitRate,
                segmentsToEvict: [],
            };
        }
        // 分析访问模式
        const accessCounts = new Map();
        const lastAccessTimes = new Map();
        for (const access of accessPatterns) {
            const count = accessCounts.get(access.segmentId) || 0;
            accessCounts.set(access.segmentId, count + 1);
            if (!lastAccessTimes.has(access.segmentId) ||
                access.timestamp > lastAccessTimes.get(access.segmentId)) {
                lastAccessTimes.set(access.segmentId, access.timestamp);
            }
        }
        // 确定最佳淘汰策略
        const variance = this.calculateAccessVariance(Array.from(accessCounts.values()));
        let recommendedPolicy;
        if (variance > 0.7) {
            recommendedPolicy = 'lfu'; // 访问频率差异大，用LFU
        }
        else if (this.config.ttl < 3600) {
            recommendedPolicy = 'ttl'; // 短期TTL，用TTL策略
        }
        else {
            recommendedPolicy = 'lru'; // 默认LRU
        }
        // 识别应淘汰的段
        const segmentsToEvict = [];
        const now = new Date();
        for (const [segmentId, lastAccess] of lastAccessTimes.entries()) {
            const age = now.getTime() - lastAccess.getTime();
            if (age > this.config.ttl * 1000) {
                segmentsToEvict.push(segmentId);
            }
        }
        // 估计命中率提升
        const expectedHitRate = Math.min(currentHitRate * 1.2, // 预计提升20%
        this.config.cacheOptimization.targetHitRate);
        return {
            recommendedPolicy,
            expectedHitRate,
            segmentsToEvict,
        };
    }
    /**
     * 计算访问频率方差
     */
    calculateAccessVariance(accessCounts) {
        if (accessCounts.length === 0)
            return 0;
        const mean = accessCounts.reduce((a, b) => a + b) / accessCounts.length;
        const variance = accessCounts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / accessCounts.length;
        return variance / (mean * mean); // 相对方差
    }
    /**
     * 获取配置
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * 更新配置
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    /**
     * 计算成本节约报告
     */
    calculateCostSavingsReport(originalTokens, prunedTokens, tokenPricePerMillion = 20 // 假设$20/百万tokens
    ) {
        const tokenSavings = originalTokens - prunedTokens;
        const costSavings = (tokenSavings / 1000000) * tokenPricePerMillion;
        const savingsPercent = originalTokens > 0 ? (tokenSavings / originalTokens) * 100 : 0;
        // 简化ROI计算：假设每次修剪操作成本为$0.01
        const operationCost = 0.01;
        const roi = operationCost > 0 ? (costSavings - operationCost) / operationCost : 0;
        return {
            tokenSavings,
            costSavings,
            savingsPercent,
            roi,
        };
    }
}
exports.SessionPruner = SessionPruner;
//# sourceMappingURL=pruning.js.map