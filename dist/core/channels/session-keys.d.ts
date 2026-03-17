/**
 * Session Key 工具模块
 *
 * 基于HexaCore标准生成和解析Session Key，格式：
 * agent:{agentId}:{channel}:{accountId}:{peerType}:{peerId}
 *
 * 提供确定性生成算法，确保同一会话在不同时间、不同实例中生成相同的Key
 */
export interface SessionKeyParts {
    /** Agent唯一标识符，由路由层确定 */
    agentId: string;
    /** 消息来源渠道（whatsapp、wecom、web等） */
    channel: string;
    /** 渠道账户标识符（企业ID、Bot ID等） */
    accountId: string;
    /** 会话类型：direct（直接消息）、group（群组）、channel（频道） */
    peerType: string;
    /** 对端标识符（用户ID、群组ID、频道ID等） */
    peerId: string;
}
export interface InboundMessage {
    /** 消息来源渠道 */
    channel: string;
    /** 渠道账户标识符 */
    accountId: string;
    /** 对端信息 */
    peer: PeerInfo;
    /** 消息内容（可选，用于生成key时不需要） */
    content?: string;
    /** 消息时间戳（可选） */
    timestamp?: Date;
}
export interface PeerInfo {
    /** 对端ID */
    id: string;
    /** 对端类型：dm（直接消息）、group（群组）、channel（频道） */
    kind: 'dm' | 'group' | 'channel';
    /** 对端名称（可选） */
    name?: string;
    /** 元数据（可选） */
    metadata?: Record<string, any>;
}
/**
 * Session Key 生成器
 *
 * 遵循HexaCore标准格式，提供确定性生成算法
 */
export declare class SessionKeyGenerator {
    /**
     * 基于HexaCore标准生成Session Key
     *
     * @param message InboundMessage对象，包含渠道、账户和对端信息
     * @param agentId 目标Agent的唯一标识符，由路由层确定
     * @returns 标准格式的Session Key
     */
    generateKey(message: InboundMessage, agentId: string): string;
    /**
     * 确定Peer类型
     *
     * @param peer PeerInfo对象
     * @returns 标准化的peer类型字符串
     */
    private getPeerType;
    /**
     * 从Session Key解析各组成部分
     *
     * @param sessionKey 标准格式的Session Key
     * @returns 解析后的SessionKeyParts对象
     * @throws {Error} 当Session Key格式无效时
     */
    parseKey(sessionKey: string): SessionKeyParts;
    /**
     * 验证Session Key格式是否有效
     *
     * @param sessionKey 要验证的Session Key
     * @returns 是否有效
     */
    isValidKey(sessionKey: string): boolean;
    /**
     * 根据Session Key生成Redis键前缀
     *
     * @param sessionKey Session Key
     * @returns Redis键前缀（格式：session:{agentId}:{channel}:{accountId}）
     */
    getRedisKeyPrefix(sessionKey: string): string;
    /**
     * 根据Session Key生成工作区目录路径
     *
     * @param sessionKey Session Key
     * @returns 工作区目录路径（格式：~/.HexaCore/workspace/{agentId}/{peerType}/{peerId}）
     */
    getWorkspacePath(sessionKey: string): string;
}
/**
 * 默认的Session Key生成器实例
 */
export declare const defaultSessionKeyGenerator: SessionKeyGenerator;
