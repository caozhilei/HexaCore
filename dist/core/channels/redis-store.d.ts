/**
 * Redis存储适配器
 *
 * 基于Redis的会话存储实现，提供会话状态的持久化和检索功能
 * 支持Session Key前缀查询、TTL管理和批量操作
 */
import { SessionKeyGenerator } from './session-keys';
/**
 * Redis客户端接口（抽象，便于测试和替换）
 */
export interface RedisClient {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ttl?: number): Promise<void>;
    del(key: string): Promise<void>;
    keys(pattern: string): Promise<string[]>;
    exists(key: string): Promise<boolean>;
    expire(key: string, ttl: number): Promise<void>;
    hgetall(key: string): Promise<Record<string, string>>;
    hset(key: string, data: Record<string, string>): Promise<void>;
    hdel(key: string, fields: string[]): Promise<void>;
    quit(): Promise<void>;
}
/**
 * 会话状态数据结构
 */
export interface SessionState {
    /** Session Key（唯一标识符） */
    sessionKey: string;
    /** Agent ID */
    agentId: string;
    /** 会话状态：creating | running | paused | stopped | error */
    status: 'creating' | 'running' | 'paused' | 'stopped' | 'error';
    /** 创建时间 */
    createdAt: Date;
    /** 最后活跃时间 */
    lastActiveAt: Date;
    /** 会话元数据 */
    metadata: Record<string, any>;
    /** 工作区路径 */
    workspacePath?: string;
    /** 资源使用统计 */
    resourceUsage?: {
        memoryUsage?: number;
        cpuUsage?: number;
        diskUsage?: number;
    };
}
/**
 * Redis存储适配器
 */
export declare class RedisStore {
    private redis;
    private keyGenerator;
    private defaultTTL;
    /**
     * 构造函数
     *
     * @param redis Redis客户端实例
     * @param keyGenerator Session Key生成器（可选，默认使用defaultSessionKeyGenerator）
     * @param defaultTTL 默认TTL（秒），默认24小时（86400秒）
     */
    constructor(redis: RedisClient, keyGenerator?: SessionKeyGenerator, defaultTTL?: number);
    /**
     * 生成Redis存储键
     *
     * @param sessionKey Session Key
     * @returns Redis键
     */
    private getStorageKey;
    /**
     * 保存会话状态
     *
     * @param sessionState 会话状态对象
     * @param ttl TTL（秒，可选，默认使用defaultTTL）
     * @returns Promise<void>
     */
    saveSession(sessionState: SessionState, ttl?: number): Promise<void>;
    /**
     * 获取会话状态
     *
     * @param sessionKey Session Key
     * @returns 会话状态对象，如果不存在则返回null
     */
    getSession(sessionKey: string): Promise<SessionState | null>;
    /**
     * 删除会话状态
     *
     * @param sessionKey Session Key
     * @returns Promise<void>
     */
    deleteSession(sessionKey: string): Promise<void>;
    /**
     * 检查会话是否存在
     *
     * @param sessionKey Session Key
     * @returns 是否存在
     */
    sessionExists(sessionKey: string): Promise<boolean>;
    /**
     * 更新会话状态
     *
     * @param sessionKey Session Key
     * @param updates 要更新的字段
     * @returns 更新后的会话状态
     */
    updateSession(sessionKey: string, updates: Partial<Omit<SessionState, 'sessionKey' | 'createdAt'>>): Promise<SessionState | null>;
    /**
     * 根据Agent ID查找所有会话
     *
     * @param agentId Agent ID
     * @returns 会话状态数组
     */
    findSessionsByAgentId(agentId: string): Promise<SessionState[]>;
    /**
     * 根据前缀查找会话（支持按渠道、账户等过滤）
     *
     * @param prefix Session Key前缀（如 "agent:vip:whatsapp"）
     * @returns 会话状态数组
     */
    findSessionsByPrefix(prefix: string): Promise<SessionState[]>;
    /**
     * 续期会话TTL
     *
     * @param sessionKey Session Key
     * @param ttl TTL（秒，可选，默认使用defaultTTL）
     * @returns 是否成功续期
     */
    renewSessionTTL(sessionKey: string, ttl?: number): Promise<boolean>;
    /**
     * 清理过期会话
     *
     * @returns 清理的会话数量
     */
    cleanupExpiredSessions(): Promise<number>;
    /**
     * 序列化会话状态为Redis哈希格式
     */
    private serializeSessionState;
    /**
     * 反序列化Redis哈希数据为会话状态
     */
    private deserializeSessionState;
    /**
     * 关闭Redis连接
     */
    close(): Promise<void>;
}
