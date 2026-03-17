"use strict";
/**
 * Redis存储适配器
 *
 * 基于Redis的会话存储实现，提供会话状态的持久化和检索功能
 * 支持Session Key前缀查询、TTL管理和批量操作
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisStore = void 0;
const session_keys_1 = require("./session-keys");
/**
 * Redis存储适配器
 */
class RedisStore {
    redis;
    keyGenerator;
    defaultTTL;
    /**
     * 构造函数
     *
     * @param redis Redis客户端实例
     * @param keyGenerator Session Key生成器（可选，默认使用defaultSessionKeyGenerator）
     * @param defaultTTL 默认TTL（秒），默认24小时（86400秒）
     */
    constructor(redis, keyGenerator = session_keys_1.defaultSessionKeyGenerator, defaultTTL = 86400) {
        this.redis = redis;
        this.keyGenerator = keyGenerator;
        this.defaultTTL = defaultTTL;
    }
    /**
     * 生成Redis存储键
     *
     * @param sessionKey Session Key
     * @returns Redis键
     */
    getStorageKey(sessionKey) {
        return `session:${sessionKey}`;
    }
    /**
     * 保存会话状态
     *
     * @param sessionState 会话状态对象
     * @param ttl TTL（秒，可选，默认使用defaultTTL）
     * @returns Promise<void>
     */
    async saveSession(sessionState, ttl) {
        const key = this.getStorageKey(sessionState.sessionKey);
        const data = this.serializeSessionState(sessionState);
        const sessionTTL = ttl ?? this.defaultTTL;
        try {
            await this.redis.hset(key, data);
            await this.redis.expire(key, sessionTTL);
        }
        catch (error) {
            throw new Error(`Failed to save session ${sessionState.sessionKey}: ${error}`);
        }
    }
    /**
     * 获取会话状态
     *
     * @param sessionKey Session Key
     * @returns 会话状态对象，如果不存在则返回null
     */
    async getSession(sessionKey) {
        const key = this.getStorageKey(sessionKey);
        try {
            const data = await this.redis.hgetall(key);
            if (!data || Object.keys(data).length === 0) {
                return null;
            }
            return this.deserializeSessionState(data);
        }
        catch (error) {
            throw new Error(`Failed to get session ${sessionKey}: ${error}`);
        }
    }
    /**
     * 删除会话状态
     *
     * @param sessionKey Session Key
     * @returns Promise<void>
     */
    async deleteSession(sessionKey) {
        const key = this.getStorageKey(sessionKey);
        try {
            await this.redis.del(key);
        }
        catch (error) {
            throw new Error(`Failed to delete session ${sessionKey}: ${error}`);
        }
    }
    /**
     * 检查会话是否存在
     *
     * @param sessionKey Session Key
     * @returns 是否存在
     */
    async sessionExists(sessionKey) {
        const key = this.getStorageKey(sessionKey);
        try {
            return await this.redis.exists(key);
        }
        catch (error) {
            throw new Error(`Failed to check session existence ${sessionKey}: ${error}`);
        }
    }
    /**
     * 更新会话状态
     *
     * @param sessionKey Session Key
     * @param updates 要更新的字段
     * @returns 更新后的会话状态
     */
    async updateSession(sessionKey, updates) {
        const existing = await this.getSession(sessionKey);
        if (!existing) {
            return null;
        }
        const updated = {
            ...existing,
            ...updates,
            // 确保某些字段不被覆盖
            sessionKey: existing.sessionKey,
            createdAt: existing.createdAt,
            // 更新最后活跃时间
            lastActiveAt: new Date()
        };
        await this.saveSession(updated);
        return updated;
    }
    /**
     * 根据Agent ID查找所有会话
     *
     * @param agentId Agent ID
     * @returns 会话状态数组
     */
    async findSessionsByAgentId(agentId) {
        const pattern = `session:agent:${agentId}:*`;
        try {
            const keys = await this.redis.keys(pattern);
            const sessions = [];
            for (const key of keys) {
                const data = await this.redis.hgetall(key);
                if (data && Object.keys(data).length > 0) {
                    sessions.push(this.deserializeSessionState(data));
                }
            }
            return sessions;
        }
        catch (error) {
            throw new Error(`Failed to find sessions for agent ${agentId}: ${error}`);
        }
    }
    /**
     * 根据前缀查找会话（支持按渠道、账户等过滤）
     *
     * @param prefix Session Key前缀（如 "agent:vip:whatsapp"）
     * @returns 会话状态数组
     */
    async findSessionsByPrefix(prefix) {
        const pattern = `session:${prefix}:*`;
        try {
            const keys = await this.redis.keys(pattern);
            const sessions = [];
            for (const key of keys) {
                const data = await this.redis.hgetall(key);
                if (data && Object.keys(data).length > 0) {
                    sessions.push(this.deserializeSessionState(data));
                }
            }
            return sessions;
        }
        catch (error) {
            throw new Error(`Failed to find sessions by prefix ${prefix}: ${error}`);
        }
    }
    /**
     * 续期会话TTL
     *
     * @param sessionKey Session Key
     * @param ttl TTL（秒，可选，默认使用defaultTTL）
     * @returns 是否成功续期
     */
    async renewSessionTTL(sessionKey, ttl) {
        const key = this.getStorageKey(sessionKey);
        const sessionTTL = ttl ?? this.defaultTTL;
        try {
            const exists = await this.redis.exists(key);
            if (!exists) {
                return false;
            }
            await this.redis.expire(key, sessionTTL);
            return true;
        }
        catch (error) {
            throw new Error(`Failed to renew TTL for session ${sessionKey}: ${error}`);
        }
    }
    /**
     * 清理过期会话
     *
     * @returns 清理的会话数量
     */
    async cleanupExpiredSessions() {
        // 注意：在实际生产环境中，应使用Redis的过期键功能自动清理
        // 此方法仅用于清理那些因某种原因未正确过期的键
        const pattern = 'session:*';
        try {
            const keys = await this.redis.keys(pattern);
            let cleanedCount = 0;
            for (const key of keys) {
                const ttl = await this.redis.expire(key, this.defaultTTL); // 重新设置TTL会返回是否成功
                if (!ttl) {
                    // 如果键不存在或已过期，删除它
                    await this.redis.del(key);
                    cleanedCount++;
                }
            }
            return cleanedCount;
        }
        catch (error) {
            throw new Error(`Failed to cleanup expired sessions: ${error}`);
        }
    }
    /**
     * 序列化会话状态为Redis哈希格式
     */
    serializeSessionState(state) {
        return {
            sessionKey: state.sessionKey,
            agentId: state.agentId,
            status: state.status,
            createdAt: state.createdAt.toISOString(),
            lastActiveAt: state.lastActiveAt.toISOString(),
            metadata: JSON.stringify(state.metadata),
            workspacePath: state.workspacePath || '',
            resourceUsage: state.resourceUsage ? JSON.stringify(state.resourceUsage) : ''
        };
    }
    /**
     * 反序列化Redis哈希数据为会话状态
     */
    deserializeSessionState(data) {
        return {
            sessionKey: data.sessionKey,
            agentId: data.agentId,
            status: data.status,
            createdAt: new Date(data.createdAt),
            lastActiveAt: new Date(data.lastActiveAt),
            metadata: data.metadata ? JSON.parse(data.metadata) : {},
            workspacePath: data.workspacePath || undefined,
            resourceUsage: data.resourceUsage ? JSON.parse(data.resourceUsage) : undefined
        };
    }
    /**
     * 关闭Redis连接
     */
    async close() {
        try {
            await this.redis.quit();
        }
        catch (error) {
            console.warn('Error closing Redis connection:', error);
        }
    }
}
exports.RedisStore = RedisStore;
//# sourceMappingURL=redis-store.js.map