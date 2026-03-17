/**
 * HexaCore WhatsApp Baileys适配器
 * 基于WhatsApp Business API实现的企业级消息适配器
 */
import { BaseAdapter } from './base-adapter';
import { OutboundMessage, ChannelConfig, HealthStatus, Logger } from './interfaces';
/**
 * WhatsApp Baileys适配器实现
 */
export declare class WhatsAppAdapter extends BaseAdapter {
    private baileysClient;
    private connectionPool;
    private messageQueue;
    private isProcessingQueue;
    private lastMessageId;
    constructor(logger?: Logger);
    /**
     * WhatsApp特定的启动逻辑
     */
    protected onStart(config: ChannelConfig): Promise<void>;
    /**
     * WhatsApp特定的停止逻辑
     */
    protected onStop(): Promise<void>;
    /**
     * WhatsApp特定的消息发送逻辑
     */
    protected onSend(message: OutboundMessage): Promise<void>;
    /**
     * WhatsApp特定的健康检查逻辑
     */
    protected onHealthCheck(): Promise<HealthStatus>;
    /**
     * 验证WhatsApp配置
     */
    protected validateConfig(config: ChannelConfig): Promise<void>;
    /**
     * 验证输出消息格式
     */
    protected validateOutboundMessage(message: OutboundMessage): Promise<void>;
    /**
     * 初始化Baileys客户端
     */
    private initBaileysClient;
    /**
     * 初始化连接池
     */
    private initConnectionPool;
    /**
     * 注册消息处理器
     */
    private registerMessageHandlers;
    /**
     * 处理接收到的消息
     */
    private handleIncomingMessage;
    /**
     * 将WhatsApp原始消息转换为InboundMessage
     */
    private convertToInboundMessage;
    /**
     * 将标准化消息内容转换为WhatsApp消息格式
     */
    private convertToWhatsAppMessage;
    /**
     * 启动消息队列处理器
     */
    private startMessageQueueProcessor;
    /**
     * 获取连接
     */
    private acquireConnection;
    /**
     * 释放连接
     */
    private releaseConnection;
    /**
     * 关闭连接
     */
    private closeConnection;
    private normalizeJid;
    private isValidJid;
    private getMessageType;
    private extractText;
    private extractMedia;
    private getPeerKind;
    private isBusinessAccount;
    private extractCountryCode;
}
