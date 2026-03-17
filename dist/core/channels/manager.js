"use strict";
/**
 * 频道管理器核心模块
 *
 * 集成Session Key生成、Redis存储和会话管理，提供完整的频道管理功能
 * 支持Agent级会话隔离、工作区管理和资源配额控制
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChannelManager = void 0;
const session_keys_1 = require("./session-keys");
const redis_store_1 = require("./redis-store");
const session_1 = require("./session");
/**
 * 频道管理器
 */
class ChannelManager {
    redisStore;
    sessionKeyGenerator;
    config;
    // 活跃会话映射
    activeSessions = new Map();
    // 会话池（用于复用）
    sessionPool = new Map();
    // 统计信息
    stats = {
        totalSessionsCreated: 0,
        totalSessionsDestroyed: 0,
        activeSessionCount: 0,
        peakConcurrentSessions: 0
    };
    /**
     * 构造函数
     *
     * @param redisClient Redis客户端实例
     * @param config 管理器配置
     * @param sessionKeyGenerator Session Key生成器（可选）
     */
    constructor(redisClient, config = {}, sessionKeyGenerator = session_keys_1.defaultSessionKeyGenerator) {
        this.redisStore = new redis_store_1.RedisStore(redisClient, sessionKeyGenerator);
        this.sessionKeyGenerator = sessionKeyGenerator;
        // 合并默认配置
        this.config = {
            defaultSessionTTL: 86400, // 24小时
            maxConcurrentSessions: 1000,
            sessionPoolSize: 100,
            enablePersistence: true,
            agentConfigs: {},
            ...config
        };
        // 初始化默认Agent配置
        this.initializeDefaultAgentConfigs();
        console.log('ChannelManager initialized with config:', {
            defaultSessionTTL: this.config.defaultSessionTTL,
            maxConcurrentSessions: this.config.maxConcurrentSessions,
            sessionPoolSize: this.config.sessionPoolSize
        });
    }
    /**
     * 初始化默认Agent配置
     */
    initializeDefaultAgentConfigs() {
        const defaultConfig = {
            type: 'default',
            model: 'claude-3-5-sonnet-20241022',
            temperature: 0.7,
            maxTokens: 4096,
            isolationLevel: 'non-main',
            resourceQuota: (0, session_1.createDefaultResourceQuota)(),
            networkPolicy: (0, session_1.createDefaultNetworkPolicy)(),
            toolPermissions: {
                default: 'deny',
                allowed: ['read', 'file_read'],
                requiresApproval: ['exec', 'network']
            }
        };
        const vipConfig = {
            ...defaultConfig,
            type: 'vip',
            temperature: 0.3,
            maxTokens: 8192,
            isolationLevel: 'all',
            resourceQuota: {
                ...defaultConfig.resourceQuota,
                memory: { maxRSS: '2g', maxHeap: '4g' },
                cpu: { shares: 2048, quota: '4.0' }
            },
            toolPermissions: {
                default: 'deny',
                allowed: ['read', 'write', 'exec', 'network'],
                requiresApproval: []
            }
        };
        const generalConfig = {
            ...defaultConfig,
            type: 'general',
            isolationLevel: 'non-main',
            resourceQuota: {
                ...defaultConfig.resourceQuota,
                memory: { maxRSS: '512m', maxHeap: '1g' },
                cpu: { shares: 512, quota: '1.0' }
            },
            toolPermissions: {
                default: 'deny',
                allowed: ['read'],
                requiresApproval: []
            }
        };
        this.config.agentConfigs = {
            default: defaultConfig,
            'vip-agent': vipConfig,
            'general-agent': generalConfig,
            ...this.config.agentConfigs
        };
    }
    /**
     * 创建或获取会话
     *
     * @param message InboundMessage对象
     * @param agentId 目标Agent ID
     * @param options 会话创建选项
     * @returns 频道容器实例
     */
    async createOrGetSession(message, agentId, options = {}) {
        // 1. 生成或使用自定义Session Key
        const sessionKey = options.customSessionKey ||
            this.sessionKeyGenerator.generateKey(message, agentId);
        console.log(`Creating/getting session: ${sessionKey}`);
        // 2. 检查是否已有活跃会话
        if (this.activeSessions.has(sessionKey)) {
            console.log(`Session already active: ${sessionKey}`);
            const container = this.activeSessions.get(sessionKey);
            // 更新最后活跃时间
            if (this.config.enablePersistence) {
                await this.redisStore.updateSession(sessionKey, {
                    lastActiveAt: new Date()
                });
            }
            return container;
        }
        // 3. 检查会话池中是否有可复用的会话
        if (this.sessionPool.has(sessionKey)) {
            console.log(`Reusing session from pool: ${sessionKey}`);
            const container = this.sessionPool.get(sessionKey);
            this.sessionPool.delete(sessionKey);
            this.activeSessions.set(sessionKey, container);
            // 更新统计
            this.stats.activeSessionCount++;
            this.updatePeakConcurrency();
            return container;
        }
        // 4. 检查并发会话限制
        this.checkConcurrencyLimits();
        // 5. 获取Agent配置
        const agentConfig = this.getAgentConfig(agentId);
        // 6. 合并资源配置
        const resourceQuota = this.mergeResourceQuota(agentConfig.resourceQuota, options.customResourceQuota);
        const networkPolicy = this.mergeNetworkPolicy(agentConfig.networkPolicy, options.customNetworkPolicy);
        // 7. 创建新的频道容器
        const container = new session_1.ChannelContainerImpl(sessionKey, agentId, agentConfig.isolationLevel, resourceQuota, networkPolicy, options.workspacePath);
        // 8. 启动容器
        await container.start();
        // 9. 保存到活跃会话映射
        this.activeSessions.set(sessionKey, container);
        // 10. 持久化会话状态
        if (this.config.enablePersistence) {
            const sessionState = container.getState();
            if (options.metadata) {
                sessionState.metadata = { ...sessionState.metadata, ...options.metadata };
            }
            await this.redisStore.saveSession(sessionState, this.config.defaultSessionTTL);
        }
        // 11. 更新统计
        this.stats.totalSessionsCreated++;
        this.stats.activeSessionCount++;
        this.updatePeakConcurrency();
        console.log(`Session created successfully: ${sessionKey}`);
        return container;
    }
    /**
     * 根据Session Key获取会话
     *
     * @param sessionKey Session Key
     * @returns 频道容器实例，如果不存在则返回null
     */
    async getSession(sessionKey) {
        // 1. 检查活跃会话
        if (this.activeSessions.has(sessionKey)) {
            return this.activeSessions.get(sessionKey);
        }
        // 2. 检查会话池
        if (this.sessionPool.has(sessionKey)) {
            const container = this.sessionPool.get(sessionKey);
            this.sessionPool.delete(sessionKey);
            this.activeSessions.set(sessionKey, container);
            this.stats.activeSessionCount++;
            return container;
        }
        // 3. 如果启用持久化，尝试从Redis恢复
        if (this.config.enablePersistence) {
            const sessionState = await this.redisStore.getSession(sessionKey);
            if (sessionState) {
                console.log(`Restoring session from persistence: ${sessionKey}`);
                // 解析Session Key获取Agent ID
                const parts = this.sessionKeyGenerator.parseKey(sessionKey);
                // 获取Agent配置
                const agentConfig = this.getAgentConfig(parts.agentId);
                // 创建容器
                const container = new session_1.ChannelContainerImpl(sessionKey, parts.agentId, agentConfig.isolationLevel, agentConfig.resourceQuota, agentConfig.networkPolicy, sessionState.workspacePath);
                // 恢复状态
                container.updateState(sessionState);
                // 添加到活跃会话
                this.activeSessions.set(sessionKey, container);
                this.stats.activeSessionCount++;
                this.updatePeakConcurrency();
                return container;
            }
        }
        return null;
    }
    /**
     * 销毁会话
     *
     * @param sessionKey Session Key
     * @param force 是否强制销毁（即使会话正在运行）
     * @returns 是否成功销毁
     */
    async destroySession(sessionKey, force = false) {
        console.log(`Destroying session: ${sessionKey}, force: ${force}`);
        // 1. 获取会话
        const container = this.activeSessions.get(sessionKey) ||
            this.sessionPool.get(sessionKey);
        if (!container) {
            console.log(`Session not found: ${sessionKey}`);
            return false;
        }
        // 2. 如果会话正在运行且未强制销毁，先停止
        if (container.status === 'running' && !force) {
            console.log(`Stopping session before destruction: ${sessionKey}`);
            await container.stop();
        }
        // 3. 销毁容器
        await container.destroy();
        // 4. 从映射中移除
        if (this.activeSessions.has(sessionKey)) {
            this.activeSessions.delete(sessionKey);
            this.stats.activeSessionCount--;
        }
        else if (this.sessionPool.has(sessionKey)) {
            this.sessionPool.delete(sessionKey);
        }
        // 5. 从持久化存储中删除
        if (this.config.enablePersistence) {
            await this.redisStore.deleteSession(sessionKey);
        }
        // 6. 更新统计
        this.stats.totalSessionsDestroyed++;
        console.log(`Session destroyed: ${sessionKey}`);
        return true;
    }
    /**
     * 暂停会话（移动到会话池）
     *
     * @param sessionKey Session Key
     * @returns 是否成功暂停
     */
    async pauseSession(sessionKey) {
        const container = this.activeSessions.get(sessionKey);
        if (!container) {
            console.log(`Session not active: ${sessionKey}`);
            return false;
        }
        // 1. 暂停容器
        await container.pause();
        // 2. 移动到会话池
        this.activeSessions.delete(sessionKey);
        this.sessionPool.set(sessionKey, container);
        // 3. 更新统计
        this.stats.activeSessionCount--;
        // 4. 检查会话池大小，如果超过限制则清理最旧的会话
        if (this.sessionPool.size > this.config.sessionPoolSize) {
            await this.cleanupSessionPool();
        }
        console.log(`Session paused and moved to pool: ${sessionKey}`);
        return true;
    }
    /**
     * 恢复会话（从会话池移出）
     *
     * @param sessionKey Session Key
     * @returns 是否成功恢复
     */
    async resumeSession(sessionKey) {
        const container = this.sessionPool.get(sessionKey);
        if (!container) {
            console.log(`Session not in pool: ${sessionKey}`);
            return false;
        }
        // 1. 恢复容器
        await container.resume();
        // 2. 移动到活跃会话
        this.sessionPool.delete(sessionKey);
        this.activeSessions.set(sessionKey, container);
        // 3. 更新统计
        this.stats.activeSessionCount++;
        this.updatePeakConcurrency();
        console.log(`Session resumed from pool: ${sessionKey}`);
        return true;
    }
    /**
     * 根据Agent ID查找所有活跃会话
     *
     * @param agentId Agent ID
     * @returns 会话容器数组
     */
    async findSessionsByAgentId(agentId) {
        const sessions = [];
        // 检查活跃会话
        for (const [sessionKey, container] of this.activeSessions.entries()) {
            if (container.agentId === agentId) {
                sessions.push(container);
            }
        }
        // 检查会话池
        for (const [sessionKey, container] of this.sessionPool.entries()) {
            if (container.agentId === agentId) {
                sessions.push(container);
            }
        }
        return sessions;
    }
    /**
     * 清理过期会话
     *
     * @returns 清理的会话数量
     */
    async cleanupExpiredSessions() {
        let cleanedCount = 0;
        // 1. 清理持久化存储中的过期会话
        if (this.config.enablePersistence) {
            cleanedCount += await this.redisStore.cleanupExpiredSessions();
        }
        // 2. 清理会话池中的过期会话（基于最后活跃时间）
        const now = new Date();
        const maxAge = this.config.defaultSessionTTL * 1000; // 转换为毫秒
        for (const [sessionKey, container] of this.sessionPool.entries()) {
            const sessionState = container.getState();
            const age = now.getTime() - sessionState.lastActiveAt.getTime();
            if (age > maxAge) {
                await this.destroySession(sessionKey, true);
                cleanedCount++;
            }
        }
        console.log(`Cleaned ${cleanedCount} expired sessions`);
        return cleanedCount;
    }
    /**
     * 清理会话池（LRU策略）
     */
    async cleanupSessionPool() {
        const excess = this.sessionPool.size - this.config.sessionPoolSize;
        if (excess <= 0) {
            return;
        }
        console.log(`Cleaning up ${excess} sessions from pool`);
        // 简单的实现：销毁最旧的一半超额会话
        // 在实际生产环境中，应使用LRU缓存策略
        const sessionsToDestroy = Array.from(this.sessionPool.entries())
            .slice(0, Math.floor(excess / 2));
        for (const [sessionKey] of sessionsToDestroy) {
            await this.destroySession(sessionKey, true);
        }
    }
    /**
     * 获取统计信息
     */
    getStats() {
        return {
            ...this.stats,
            activeSessions: this.activeSessions.size,
            sessionPoolSize: this.sessionPool.size,
            config: {
                maxConcurrentSessions: this.config.maxConcurrentSessions,
                sessionPoolSize: this.config.sessionPoolSize
            }
        };
    }
    /**
     * 关闭管理器（清理资源）
     */
    async close() {
        console.log('Closing ChannelManager...');
        // 1. 停止所有活跃会话
        for (const [sessionKey, container] of this.activeSessions.entries()) {
            try {
                await container.stop();
            }
            catch (error) {
                console.error(`Error stopping session ${sessionKey}:`, error);
            }
        }
        // 2. 清理会话池
        for (const [sessionKey] of this.sessionPool.entries()) {
            await this.destroySession(sessionKey, true);
        }
        // 3. 关闭Redis连接
        await this.redisStore.close();
        console.log('ChannelManager closed');
    }
    /**
     * 获取Agent配置
     */
    getAgentConfig(agentId) {
        const config = this.config.agentConfigs[agentId] || this.config.agentConfigs.default;
        if (!config) {
            throw new Error(`No configuration found for agent: ${agentId}`);
        }
        return config;
    }
    /**
     * 合并资源配额
     */
    mergeResourceQuota(base, custom) {
        if (!custom) {
            return base;
        }
        return {
            memory: { ...base.memory, ...custom.memory },
            cpu: { ...base.cpu, ...custom.cpu },
            storage: { ...base.storage, ...custom.storage },
            network: { ...base.network, ...custom.network }
        };
    }
    /**
     * 合并网络策略
     */
    mergeNetworkPolicy(base, custom) {
        if (!custom) {
            return base;
        }
        return {
            inbound: custom.inbound ?? base.inbound,
            outbound: custom.outbound ?? base.outbound,
            allowedDomains: custom.allowedDomains ?? base.allowedDomains
        };
    }
    /**
     * 检查并发会话限制
     */
    checkConcurrencyLimits() {
        const totalActive = this.activeSessions.size + this.sessionPool.size;
        if (totalActive >= this.config.maxConcurrentSessions) {
            throw new Error(`Maximum concurrent sessions limit reached: ${totalActive}/${this.config.maxConcurrentSessions}`);
        }
    }
    /**
     * 更新峰值并发数
     */
    updatePeakConcurrency() {
        const totalActive = this.activeSessions.size + this.sessionPool.size;
        if (totalActive > this.stats.peakConcurrentSessions) {
            this.stats.peakConcurrentSessions = totalActive;
        }
    }
}
exports.ChannelManager = ChannelManager;
//# sourceMappingURL=manager.js.map