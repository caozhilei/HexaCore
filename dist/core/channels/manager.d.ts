/**
 * 频道管理器核心模块
 *
 * 集成Session Key生成、Redis存储和会话管理，提供完整的频道管理功能
 * 支持Agent级会话隔离、工作区管理和资源配额控制
 */
import { InboundMessage, SessionKeyGenerator } from './session-keys';
import { RedisClient } from './redis-store';
import { ChannelContainer, ResourceQuota, NetworkPolicy } from './session';
/**
 * 频道管理器配置
 */
export interface ChannelManagerConfig {
    /** 默认会话TTL（秒） */
    defaultSessionTTL: number;
    /** 最大并发会话数 */
    maxConcurrentSessions: number;
    /** 会话池大小 */
    sessionPoolSize: number;
    /** 是否启用会话持久化 */
    enablePersistence: boolean;
    /** Agent配置映射 */
    agentConfigs: Record<string, AgentConfig>;
}
/**
 * Agent配置
 */
export interface AgentConfig {
    /** Agent类型 */
    type: string;
    /** 模型配置 */
    model: string;
    /** 温度参数 */
    temperature: number;
    /** 最大Token数 */
    maxTokens: number;
    /** 隔离级别 */
    isolationLevel: 'off' | 'non-main' | 'all';
    /** 资源配额 */
    resourceQuota: ResourceQuota;
    /** 网络策略 */
    networkPolicy: NetworkPolicy;
    /** 工具权限 */
    toolPermissions: {
        default: 'allow' | 'deny';
        allowed: string[];
        requiresApproval: string[];
    };
}
/**
 * 会话创建选项
 */
export interface SessionCreateOptions {
    /** 自定义Session Key（可选） */
    customSessionKey?: string;
    /** 自定义资源配额（可选） */
    customResourceQuota?: Partial<ResourceQuota>;
    /** 自定义网络策略（可选） */
    customNetworkPolicy?: Partial<NetworkPolicy>;
    /** 会话元数据（可选） */
    metadata?: Record<string, any>;
    /** 工作区路径（可选） */
    workspacePath?: string;
}
/**
 * 频道管理器
 */
export declare class ChannelManager {
    private redisStore;
    private sessionKeyGenerator;
    private config;
    private activeSessions;
    private sessionPool;
    private stats;
    /**
     * 构造函数
     *
     * @param redisClient Redis客户端实例
     * @param config 管理器配置
     * @param sessionKeyGenerator Session Key生成器（可选）
     */
    constructor(redisClient: RedisClient, config?: Partial<ChannelManagerConfig>, sessionKeyGenerator?: SessionKeyGenerator);
    /**
     * 初始化默认Agent配置
     */
    private initializeDefaultAgentConfigs;
    /**
     * 创建或获取会话
     *
     * @param message InboundMessage对象
     * @param agentId 目标Agent ID
     * @param options 会话创建选项
     * @returns 频道容器实例
     */
    createOrGetSession(message: InboundMessage, agentId: string, options?: SessionCreateOptions): Promise<ChannelContainer>;
    /**
     * 根据Session Key获取会话
     *
     * @param sessionKey Session Key
     * @returns 频道容器实例，如果不存在则返回null
     */
    getSession(sessionKey: string): Promise<ChannelContainer | null>;
    /**
     * 销毁会话
     *
     * @param sessionKey Session Key
     * @param force 是否强制销毁（即使会话正在运行）
     * @returns 是否成功销毁
     */
    destroySession(sessionKey: string, force?: boolean): Promise<boolean>;
    /**
     * 暂停会话（移动到会话池）
     *
     * @param sessionKey Session Key
     * @returns 是否成功暂停
     */
    pauseSession(sessionKey: string): Promise<boolean>;
    /**
     * 恢复会话（从会话池移出）
     *
     * @param sessionKey Session Key
     * @returns 是否成功恢复
     */
    resumeSession(sessionKey: string): Promise<boolean>;
    /**
     * 根据Agent ID查找所有活跃会话
     *
     * @param agentId Agent ID
     * @returns 会话容器数组
     */
    findSessionsByAgentId(agentId: string): Promise<ChannelContainer[]>;
    /**
     * 清理过期会话
     *
     * @returns 清理的会话数量
     */
    cleanupExpiredSessions(): Promise<number>;
    /**
     * 清理会话池（LRU策略）
     */
    private cleanupSessionPool;
    /**
     * 获取统计信息
     */
    getStats(): {
        activeSessions: number;
        sessionPoolSize: number;
        config: {
            maxConcurrentSessions: number;
            sessionPoolSize: number;
        };
        totalSessionsCreated: number;
        totalSessionsDestroyed: number;
        activeSessionCount: number;
        peakConcurrentSessions: number;
    };
    /**
     * 关闭管理器（清理资源）
     */
    close(): Promise<void>;
    /**
     * 获取Agent配置
     */
    private getAgentConfig;
    /**
     * 合并资源配额
     */
    private mergeResourceQuota;
    /**
     * 合并网络策略
     */
    private mergeNetworkPolicy;
    /**
     * 检查并发会话限制
     */
    private checkConcurrencyLimits;
    /**
     * 更新峰值并发数
     */
    private updatePeakConcurrency;
}
