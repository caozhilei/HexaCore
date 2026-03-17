/**
 * HexaCore Web Widget适配器
 * 基于WebSocket和WebRTC实现的现代Web聊天组件适配器
 */
import { BaseAdapter } from './base-adapter';
import { OutboundMessage, ChannelConfig, HealthStatus, Logger } from './interfaces';
/**
 * Web Widget适配器实现
 */
export declare class WebAdapter extends BaseAdapter {
    private webSocketServer;
    private sessionManager;
    private widgetRenderer;
    private activeSessions;
    private pairingManager;
    constructor(logger?: Logger);
    /**
     * Web特定的启动逻辑
     */
    protected onStart(config: ChannelConfig): Promise<void>;
    /**
     * Web特定的停止逻辑
     */
    protected onStop(): Promise<void>;
    /**
     * Web特定的消息发送逻辑
     */
    protected onSend(message: OutboundMessage): Promise<void>;
    /**
     * Web特定的健康检查逻辑
     */
    protected onHealthCheck(): Promise<HealthStatus>;
    /**
     * 验证Web配置
     */
    protected validateConfig(config: ChannelConfig): Promise<void>;
    /**
     * 验证输出消息格式
     */
    protected validateOutboundMessage(message: OutboundMessage): Promise<void>;
    /**
     * 初始化WebSocket服务器
     */
    private initWebSocketServer;
    /**
     * 初始化会话管理器
     */
    private initSessionManager;
    /**
     * 初始化Widget渲染器
     */
    private initWidgetRenderer;
    /**
     * 初始化配对管理器
     */
    private initPairingManager;
    /**
     * 注册WebSocket事件处理器
     */
    private registerWebSocketHandlers;
    /**
     * 处理WebSocket连接
     */
    private handleWebSocketConnection;
    /**
     * 处理WebSocket消息
     */
    private handleWebSocketMessage;
    /**
     * 发送欢迎消息
     */
    private sendWelcomeMessage;
    /**
     * 将Web原始消息转换为InboundMessage
     */
    private convertToInboundMessage;
    /**
     * 将标准化消息内容转换为Web消息格式
     */
    private convertToWebMessage;
    private getContentType;
}
