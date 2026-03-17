"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoutingEngine = exports.RoutingEngineState = void 0;
const matchers_1 = require("./matchers");
const routing_repo_1 = require("../database/routing-repo");
/**
 * 路由引擎状态
 */
var RoutingEngineState;
(function (RoutingEngineState) {
    RoutingEngineState["IDLE"] = "idle";
    RoutingEngineState["MATCHING"] = "matching";
    RoutingEngineState["HEALTH_CHECKING"] = "health_checking";
    RoutingEngineState["ROUTING"] = "routing";
    RoutingEngineState["ERROR"] = "error";
})(RoutingEngineState || (exports.RoutingEngineState = RoutingEngineState = {}));
/**
 * 路由引擎核心实现
 */
class RoutingEngine {
    config;
    matcher;
    healthChecker;
    options;
    state = RoutingEngineState.IDLE;
    routingRepo;
    // 缓存相关
    cache = new Map();
    cacheHits = 0;
    cacheMisses = 0;
    // 统计信息
    totalMatches = 0;
    successfulMatches = 0;
    averageMatchTime = 0;
    constructor(config, options) {
        this.config = config;
        this.matcher = new matchers_1.CompositeMatcher();
        this.options = {
            enableCaching: true,
            cacheTTL: 3600, // 1小时
            enableParallelMatching: true,
            enableHealthCheck: true,
            healthCheckTimeout: 5000,
            enableDeterministicRouting: true,
            enableAdaptiveTimeout: true,
            useDatabaseRules: true,
            ...options
        };
        if (this.options.useDatabaseRules) {
            this.routingRepo = new routing_repo_1.RoutingRuleRepository();
            // Load initial rules from DB
            this.loadRulesFromDatabase().catch(err => console.error('Failed to load rules from DB:', err));
        }
        // 初始化规则索引
        this.initializeRuleIndex();
    }
    /**
     * 从数据库加载规则
     */
    async loadRulesFromDatabase() {
        if (!this.routingRepo)
            return;
        try {
            const dbRules = await this.routingRepo.getActiveRules();
            if (dbRules && dbRules.length > 0) {
                // Convert DB rules to RoutingRule format
                const rules = dbRules.map(r => ({
                    agentId: r.target_agent_id, // Assuming target_agent_id is UUID, but RoutingRule expects string (which UUID is)
                    priority: r.priority,
                    match: r.match_condition, // Cast JSON to RoutingMatchConditions
                    enabled: r.is_active === true,
                    metadata: {
                        description: r.description,
                        dbId: r.id
                    }
                }));
                // Merge or replace config rules? For now, let's replace or append.
                // Let's replace to make DB the source of truth if enabled.
                this.config.rules = rules;
                console.log(`Loaded ${rules.length} routing rules from database.`);
            }
        }
        catch (error) {
            console.error('Error loading routing rules from database:', error);
        }
    }
    /**
     * 设置健康检查器
     */
    setHealthChecker(healthChecker) {
        this.healthChecker = healthChecker;
    }
    /**
     * 路由消息
     */
    async route(message) {
        const startTime = Date.now();
        this.state = RoutingEngineState.MATCHING;
        try {
            // 1. 检查缓存
            let result;
            const cacheKey = this.generateCacheKey(message);
            if (this.options.enableCaching) {
                const cached = this.cache.get(cacheKey);
                if (cached && (Date.now() - cached.timestamp) < (this.options.cacheTTL * 1000)) {
                    this.cacheHits++;
                    cached.hits++;
                    this.state = RoutingEngineState.IDLE;
                    // 更新统计
                    this.updateStatistics(Date.now() - startTime, true);
                    return cached.result;
                }
                this.cacheMisses++;
            }
            // 2. 按优先级排序规则
            const sortedRules = this.sortRulesByPriority();
            // 3. 执行匹配
            const matchResult = await this.matchRules(message, sortedRules);
            if (!matchResult.matchedRule) {
                // 没有匹配任何规则，使用默认路由
                result = this.createDefaultResult(message);
            }
            else {
                // 4. 健康检查
                if (this.options.enableHealthCheck && this.healthChecker) {
                    const isHealthy = await this.checkAgentHealth(matchResult.matchedRule.agentId);
                    if (!isHealthy && matchResult.matchedRule.fallbackAgent) {
                        // 使用备用Agent
                        result = this.createFallbackResult(message, matchResult.matchedRule);
                    }
                    else if (!isHealthy) {
                        // 没有备用Agent，使用默认路由
                        result = this.createDefaultResult(message);
                    }
                    else {
                        // 健康，使用匹配的规则
                        result = {
                            agentId: matchResult.matchedRule.agentId,
                            rulePriority: matchResult.matchedRule.priority,
                            matchedConditions: matchResult.matchedConditions,
                            score: matchResult.score,
                            timestamp: new Date()
                        };
                    }
                }
                else {
                    // 不使用健康检查，直接使用匹配结果
                    result = {
                        agentId: matchResult.matchedRule.agentId,
                        rulePriority: matchResult.matchedRule.priority,
                        matchedConditions: matchResult.matchedConditions,
                        score: matchResult.score,
                        timestamp: new Date()
                    };
                }
                // 5. 应用确定性哈希路由（如果需要）
                if (this.options.enableDeterministicRouting && result.agentId) {
                    result.agentId = this.applyDeterministicRouting(message, result.agentId);
                }
            }
            // 6. 缓存结果
            if (this.options.enableCaching) {
                this.cache.set(cacheKey, {
                    result,
                    timestamp: Date.now(),
                    hits: 1
                });
                // 清理过期缓存
                this.cleanupExpiredCache();
            }
            this.state = RoutingEngineState.IDLE;
            // 更新统计
            this.updateStatistics(Date.now() - startTime, true);
            return result;
        }
        catch (error) {
            this.state = RoutingEngineState.ERROR;
            // 更新统计
            this.updateStatistics(Date.now() - startTime, false);
            // 返回默认结果
            return this.createDefaultResult(message);
        }
    }
    /**
     * 批量路由消息
     */
    async routeBatch(messages) {
        if (this.options.enableParallelMatching) {
            // 并行处理
            const promises = messages.map(msg => this.route(msg));
            return Promise.all(promises);
        }
        else {
            // 串行处理
            const results = [];
            for (const message of messages) {
                const result = await this.route(message);
                results.push(result);
            }
            return results;
        }
    }
    /**
     * 重新加载配置
     */
    async reloadConfig(newConfig) {
        this.state = RoutingEngineState.MATCHING;
        try {
            this.config = newConfig;
            this.initializeRuleIndex();
            // 清空缓存
            this.cache.clear();
            this.cacheHits = 0;
            this.cacheMisses = 0;
            this.state = RoutingEngineState.IDLE;
        }
        catch (error) {
            this.state = RoutingEngineState.ERROR;
            throw error;
        }
    }
    /**
     * 获取引擎状态
     */
    getState() {
        return this.state;
    }
    /**
     * 获取统计信息
     */
    getStatistics() {
        const totalCacheRequests = this.cacheHits + this.cacheMisses;
        const cacheHitRate = totalCacheRequests > 0 ? this.cacheHits / totalCacheRequests : 0;
        const successRate = this.totalMatches > 0 ? this.successfulMatches / this.totalMatches : 0;
        return {
            totalMatches: this.totalMatches,
            successfulMatches: this.successfulMatches,
            successRate,
            averageMatchTime: this.averageMatchTime,
            cacheHitRate
        };
    }
    /**
     * 获取缓存信息
     */
    getCacheInfo() {
        const items = Array.from(this.cache.entries()).map(([key, item]) => ({
            key,
            hits: item.hits,
            age: Date.now() - item.timestamp
        }));
        return {
            size: this.cache.size,
            hits: this.cacheHits,
            misses: this.cacheMisses,
            items
        };
    }
    /**
     * 清空缓存
     */
    clearCache() {
        this.cache.clear();
        this.cacheHits = 0;
        this.cacheMisses = 0;
    }
    // 私有方法
    initializeRuleIndex() {
        // 这里可以构建规则索引以加速匹配
        // 简化实现：暂时不需要复杂索引
    }
    sortRulesByPriority() {
        // 按优先级降序排序，优先级相同按规则定义顺序
        return [...this.config.rules]
            .filter(rule => rule.enabled !== false)
            .sort((a, b) => {
            if (b.priority !== a.priority) {
                return b.priority - a.priority;
            }
            // 优先级相同，保持原始顺序
            return 0;
        });
    }
    async matchRules(message, sortedRules) {
        // 按优先级顺序尝试匹配
        for (const rule of sortedRules) {
            const matchResult = await this.matcher.match(message, rule.match);
            if (matchResult.matched) {
                // 计算综合得分
                const score = this.calculateOverallScore(matchResult.scores);
                return {
                    matchedRule: rule,
                    matchedConditions: matchResult.matchedConditions,
                    score
                };
            }
        }
        // 没有匹配任何规则
        return {
            matchedRule: undefined,
            matchedConditions: {},
            score: 0
        };
    }
    calculateOverallScore(scores) {
        const scoreKeys = Object.keys(scores);
        if (scoreKeys.length === 0)
            return 1.0; // 默认规则
        // 简单平均
        const sum = scoreKeys.reduce((total, key) => total + scores[key], 0);
        return sum / scoreKeys.length;
    }
    async checkAgentHealth(agentId) {
        if (!this.healthChecker)
            return true;
        try {
            return await this.healthChecker.isAgentHealthy(agentId);
        }
        catch (error) {
            console.warn(`Health check failed for agent ${agentId}:`, error);
            return false;
        }
    }
    createDefaultResult(message) {
        // 查找默认规则
        const defaultRule = this.config.rules.find(rule => rule.enabled !== false && rule.match.default === true);
        if (defaultRule) {
            return {
                agentId: defaultRule.agentId,
                rulePriority: defaultRule.priority,
                matchedConditions: { default: true },
                score: 1.0,
                timestamp: new Date()
            };
        }
        // 没有默认规则，返回通用Agent
        return {
            agentId: '54951470-1212-4a89-bebd-cbf44b03a4e0', // ID of 'general-agent' from DB
            rulePriority: 0,
            matchedConditions: { default: true },
            score: 1.0,
            timestamp: new Date()
        };
    }
    createFallbackResult(message, originalRule) {
        return {
            agentId: originalRule.fallbackAgent,
            rulePriority: originalRule.priority,
            matchedConditions: originalRule.match,
            score: 0.8, // 降级得分
            timestamp: new Date()
        };
    }
    applyDeterministicRouting(message, agentId) {
        // 简化的一致性哈希实现
        const sessionKey = this.generateSessionKey(message);
        const hash = this.murmurHash3(sessionKey);
        // 获取所有可用Agent
        const availableAgents = this.getAvailableAgents();
        if (availableAgents.length === 0)
            return agentId;
        // 一致性哈希查找
        const sortedAgents = [...availableAgents].sort();
        const index = hash % sortedAgents.length;
        return sortedAgents[index];
    }
    generateSessionKey(message) {
        // HexaCore标准格式的简化版本
        const factors = [
            message.channel,
            message.accountId || 'unknown',
            message.peer.id,
            message.peer.kind
        ].join(':');
        return `routing:${factors}`;
    }
    murmurHash3(key) {
        // MurmurHash3的简化实现
        let hash = 0x811c9dc5;
        for (let i = 0; i < key.length; i++) {
            hash ^= key.charCodeAt(i);
            hash = (hash * 0x01000193) & 0xffffffff;
        }
        return hash >>> 0;
    }
    getAvailableAgents() {
        // 从配置中提取所有唯一的Agent ID
        const agentSet = new Set();
        this.config.rules.forEach(rule => {
            if (rule.enabled !== false) {
                agentSet.add(rule.agentId);
                if (rule.fallbackAgent) {
                    agentSet.add(rule.fallbackAgent);
                }
            }
        });
        return Array.from(agentSet);
    }
    generateCacheKey(message) {
        // 基于消息特征生成缓存键
        const features = [
            message.channel,
            message.accountId || '',
            message.peer.id,
            message.peer.kind,
            message.content.text?.substring(0, 50) || ''
        ];
        return features.join('|');
    }
    cleanupExpiredCache() {
        if (!this.options.enableCaching)
            return;
        const now = Date.now();
        const ttlMs = this.options.cacheTTL * 1000;
        for (const [key, item] of this.cache.entries()) {
            if (now - item.timestamp > ttlMs) {
                this.cache.delete(key);
            }
        }
        // 限制缓存大小
        const maxSize = 10000;
        if (this.cache.size > maxSize) {
            // 移除最少使用的项
            const entries = Array.from(this.cache.entries());
            entries.sort((a, b) => a[1].hits - b[1].hits);
            const toRemove = entries.slice(0, this.cache.size - maxSize);
            toRemove.forEach(([key]) => this.cache.delete(key));
        }
    }
    updateStatistics(matchTime, success) {
        this.totalMatches++;
        if (success)
            this.successfulMatches++;
        // 更新平均匹配时间（指数移动平均）
        const alpha = 0.1;
        this.averageMatchTime = alpha * matchTime + (1 - alpha) * this.averageMatchTime;
    }
}
exports.RoutingEngine = RoutingEngine;
//# sourceMappingURL=engine.js.map