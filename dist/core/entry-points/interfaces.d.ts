/**
* HexaCore 出入口适配器框架 - 公共接口定义
* 基于HexaCore Channel插件架构的标准化接口
*/
/**
 * HexaCore标准通道类型
 */
export type ChannelType = 'whatsapp' | 'wecom' | 'web' | 'discord' | 'telegram' | 'slack' | 'cli';
/**
 * Peer类型定义
 */
export type PeerKind = 'dm' | 'group' | 'channel' | 'anonymous' | 'authenticated' | 'internal' | 'external';
/**
 * 内容类型定义
 */
export type ContentType = 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'sticker' | 'interactive';
/**
 * 附件接口定义
 */
export interface Attachment {
    type: string;
    url?: string;
    data?: Buffer;
    filename?: string;
    size?: number;
    mimeType?: string;
}
/**
 * 消息内容接口
 */
export interface MessageContent {
    text?: string;
    type: ContentType;
    attachments?: Attachment[];
    originalMessageId?: string;
    typingIndicator?: boolean;
    readReceipt?: boolean;
}
/**
 * 对端信息接口
 */
export interface PeerInfo {
    kind: PeerKind;
    id: string;
    metadata: Record<string, any>;
}
/**
 * 渠道特定元数据接口
 */
export interface WhatsAppMetadata {
    messageType: string;
    hasMedia: boolean;
    isForwarded: boolean;
    isFromMe: boolean;
    quotedMessageId?: string;
}
export interface WeComMetadata {
    msgType: string;
    agentId: number;
    event?: string;
    eventKey?: string;
    isFromExternalContact: boolean;
}
export interface WebMetadata {
    sessionId: string;
    widgetVersion: string;
    pageUrl: string;
    pageTitle: string;
    scrollPosition?: number;
    timeOnPage?: number;
    interactions?: number;
}
/**
 * 通用元数据接口
 */
export interface CommonMetadata {
    traceId?: string;
    spanId?: string;
    parentSpanId?: string;
    priority?: number;
    retryCount?: number;
    agentId?: string;
    sessionId?: string;
}
/**
 * 完整元数据接口
 */
export interface MessageMetadata {
    whatsapp?: WhatsAppMetadata;
    wecom?: WeComMetadata;
    web?: WebMetadata;
    common?: CommonMetadata;
    location?: any;
    intent?: any;
    trust?: any;
}
/**
 * HexaCore标准InboundMessage接口
 */
export interface InboundMessage {
    id: string;
    channel: ChannelType;
    accountId: string;
    peer: PeerInfo;
    content: MessageContent;
    timestamp: number;
    metadata: MessageMetadata;
}
/**
 * HexaCore标准OutboundMessage接口
 */
export interface OutboundMessage {
    channel: ChannelType;
    accountId: string;
    peerId: string;
    content: MessageContent;
    metadata?: MessageMetadata;
}
/**
 * HexaCore Channel接口定义
 */
export interface HexaCoreChannel {
    /**
     * 启动渠道适配器
     */
    start(config: ChannelConfig): Promise<void>;
    /**
     * 停止渠道适配器
     */
    stop(): Promise<void>;
    /**
     * 发送消息到渠道
     */
    send(message: OutboundMessage): Promise<void>;
    /**
     * 注册消息接收回调
     */
    onMessage(callback: (message: InboundMessage) => void): void;
    /**
     * 健康检查
     */
    healthCheck(): Promise<HealthStatus>;
}
/**
 * 渠道配置基类
 */
export interface ChannelConfig {
    enabled: boolean;
    adapter: string;
    dmPolicy?: DMPolicyType;
    security?: SecurityConfig;
    [key: string]: any;
}
/**
 * WhatsApp渠道配置
 */
export interface WhatsAppConfig extends ChannelConfig {
    config: {
        businessAccountId: string;
        authDir: string;
        webhookUrl?: string;
        poolSize?: number;
        batchSize?: number;
        batchInterval?: number;
        maxRetries?: number;
        baseDelay?: number;
    };
    allowlist?: string[];
}
/**
 * 企业微信渠道配置
 */
export interface WeComConfig extends ChannelConfig {
    config: {
        corpId: string;
        agentId: number;
        secret: string;
        baseUrl?: string;
        timeout?: number;
        orgSyncInterval?: number;
        oauthConfig?: OAuthConfig;
    };
}
/**
 * Web渠道配置
 */
export interface WebConfig extends ChannelConfig {
    config: {
        widgetVersion: string;
        wsPort: number;
        wsPath?: string;
        maxConnections?: number;
        pingInterval?: number;
        sessionTimeout?: number;
        maxSessionsPerUser?: number;
        cleanupInterval?: number;
        apiEndpoint?: string;
        theme?: string;
        localization?: string;
    };
    pairingConfig?: PairingConfig;
}
/**
 * OAuth配置
 */
export interface OAuthConfig {
    clientId: string;
    redirectUri: string;
    scopes: string[];
}
/**
 * 配对配置
 */
export interface PairingConfig {
    requirePairing: boolean;
    pairingTimeout: number;
    maxPairingAttempts: number;
}
/**
 * 安全配置
 */
export interface SecurityConfig {
    contentFilters?: string[];
    attachmentScan?: {
        enabled: boolean;
        maxSize: number;
        allowedTypes: string[];
    };
    ipWhitelist?: string[];
    auditLogging?: {
        enabled: boolean;
        retentionDays: number;
    };
}
/**
 * DM策略类型
 */
export type DMPolicyType = 'allowlist' | 'pairing' | 'open';
/**
 * 健康状态接口
 */
export interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, any>;
    timestamp: number;
}
/**
 * 连接池状态
 */
export interface ConnectionPoolStatus {
    active: number;
    idle: number;
    maxSize: number;
    waiting: number;
}
/**
 * 批处理统计
 */
export interface BatchStatistics {
    processed: number;
    failed: number;
    avgProcessingTime: number;
    currentBatchSize: number;
}
/**
 * 错误类型定义
 */
export declare class ChannelError extends Error {
    readonly code: string;
    readonly retryable: boolean;
    readonly details?: Record<string, any> | undefined;
    constructor(message: string, code: string, retryable?: boolean, details?: Record<string, any> | undefined);
}
export declare class ValidationError extends ChannelError {
    constructor(message: string, details?: Record<string, any>);
}
export declare class SecurityError extends ChannelError {
    constructor(message: string, details?: Record<string, any>);
}
export declare class ConnectionError extends ChannelError {
    constructor(message: string, details?: Record<string, any>);
}
/**
 * 日志级别
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';
/**
 * 日志记录器接口
 */
export interface Logger {
    error(message: string, meta?: Record<string, any>): void;
    warn(message: string, meta?: Record<string, any>): void;
    info(message: string, meta?: Record<string, any>): void;
    debug(message: string, meta?: Record<string, any>): void;
    trace(message: string, meta?: Record<string, any>): void;
}
/**
 * 事件类型定义
 */
export type EventType = 'inbound_message' | 'outbound_message' | 'channel_started' | 'channel_stopped' | 'connection_established' | 'connection_lost' | 'message_processed' | 'message_failed' | 'security_violation';
/**
 * 事件接口
 */
export interface ChannelEvent {
    type: EventType;
    channel: ChannelType;
    timestamp: number;
    data: Record<string, any>;
}
