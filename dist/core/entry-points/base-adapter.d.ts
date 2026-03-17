/**
 * HexaCore 出入口适配器框架 - 基础适配器抽象类
 * 提供所有渠道适配器的通用实现和生命周期管理
 */
import { ChannelType, HexaCoreChannel, InboundMessage, OutboundMessage, ChannelConfig, HealthStatus, Logger, ChannelEvent, EventType } from './interfaces';
/**
 * 基础适配器抽象类
 * 所有渠道适配器都应继承此类并实现抽象方法
 */
export declare abstract class BaseAdapter implements HexaCoreChannel {
    protected readonly channelType: ChannelType;
    protected readonly defaultConfig: Partial<ChannelConfig>;
    protected config: ChannelConfig;
    protected logger: Logger;
    protected messageCallbacks: Array<(message: InboundMessage) => void>;
    protected eventListeners: Map<EventType, Array<(event: ChannelEvent) => void>>;
    protected isRunning: boolean;
    protected startTime: number;
    /**
     * 构造函数
     * @param channelType 渠道类型
     * @param defaultConfig 默认配置
     * @param logger 日志记录器
     */
    constructor(channelType: ChannelType, defaultConfig: Partial<ChannelConfig>, logger?: Logger);
    /**
     * 启动渠道适配器
     * @param config 渠道配置
     */
    start(config: ChannelConfig): Promise<void>;
    /**
     * 停止渠道适配器
     */
    stop(): Promise<void>;
    /**
     * 发送消息到渠道
     * @param message 输出消息
     */
    send(message: OutboundMessage): Promise<void>;
    /**
     * 注册消息接收回调
     * @param callback 消息回调函数
     */
    onMessage(callback: (message: InboundMessage) => void): void;
    /**
     * 健康检查
     */
    healthCheck(): Promise<HealthStatus>;
    /**
     * 触发消息接收
     * @param message 输入消息
     */
    protected triggerMessage(message: InboundMessage): void;
    /**
     * 注册事件监听器
     * @param eventType 事件类型
     * @param listener 监听器函数
     */
    onEvent(eventType: EventType, listener: (event: ChannelEvent) => void): void;
    /**
     * 触发事件
     * @param eventType 事件类型
     * @param data 事件数据
     */
    protected emitEvent(eventType: EventType, data: Record<string, any>): void;
    /**
     * 创建默认日志记录器
     */
    private createDefaultLogger;
    /**
     * 具体渠道的启动逻辑
     * @param config 渠道配置
     */
    protected abstract onStart(config: ChannelConfig): Promise<void>;
    /**
     * 具体渠道的停止逻辑
     */
    protected abstract onStop(): Promise<void>;
    /**
     * 具体渠道的消息发送逻辑
     * @param message 输出消息
     */
    protected abstract onSend(message: OutboundMessage): Promise<void>;
    /**
     * 具体渠道的健康检查逻辑
     */
    protected abstract onHealthCheck(): Promise<HealthStatus>;
    /**
     * 验证渠道配置
     * @param config 渠道配置
     */
    protected abstract validateConfig(config: ChannelConfig): Promise<void>;
    /**
     * 验证输出消息格式
     * @param message 输出消息
     */
    protected abstract validateOutboundMessage(message: OutboundMessage): Promise<void>;
    /**
     * 获取运行状态
     */
    get isRunningStatus(): boolean;
    /**
     * 获取渠道类型
     */
    get channelTypeName(): ChannelType;
    /**
     * 获取配置
     */
    get currentConfig(): ChannelConfig;
    /**
     * 获取运行时间（毫秒）
     */
    get uptime(): number;
}
