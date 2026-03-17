"use strict";
/**
 * HexaCore 出入口适配器框架 - 基础适配器抽象类
 * 提供所有渠道适配器的通用实现和生命周期管理
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAdapter = void 0;
const interfaces_1 = require("./interfaces");
/**
 * 基础适配器抽象类
 * 所有渠道适配器都应继承此类并实现抽象方法
 */
class BaseAdapter {
    channelType;
    defaultConfig;
    config;
    logger;
    messageCallbacks = [];
    eventListeners = new Map();
    isRunning = false;
    startTime = 0;
    /**
     * 构造函数
     * @param channelType 渠道类型
     * @param defaultConfig 默认配置
     * @param logger 日志记录器
     */
    constructor(channelType, defaultConfig, logger) {
        this.channelType = channelType;
        this.defaultConfig = defaultConfig;
        this.config = { ...defaultConfig };
        this.logger = logger || this.createDefaultLogger();
    }
    /**
     * 启动渠道适配器
     * @param config 渠道配置
     */
    async start(config) {
        try {
            this.logger.info(`Starting ${this.channelType} adapter...`);
            // 合并配置
            this.config = { ...this.defaultConfig, ...config };
            // 验证配置
            await this.validateConfig(this.config);
            // 执行具体渠道的启动逻辑
            await this.onStart(this.config);
            this.isRunning = true;
            this.startTime = Date.now();
            this.logger.info(`${this.channelType} adapter started successfully`);
            this.emitEvent('channel_started', {
                config: this.config,
                startTime: this.startTime
            });
        }
        catch (error) {
            this.logger.error(`Failed to start ${this.channelType} adapter: ${error.message}`, {
                error,
                config: this.config
            });
            throw new interfaces_1.ChannelError(`Failed to start ${this.channelType} adapter`, 'START_FAILED', false, { originalError: error.message });
        }
    }
    /**
     * 停止渠道适配器
     */
    async stop() {
        try {
            if (!this.isRunning) {
                this.logger.warn(`${this.channelType} adapter is not running`);
                return;
            }
            this.logger.info(`Stopping ${this.channelType} adapter...`);
            // 执行具体渠道的停止逻辑
            await this.onStop();
            this.isRunning = false;
            const uptime = Date.now() - this.startTime;
            this.logger.info(`${this.channelType} adapter stopped successfully`, {
                uptime,
                startTime: this.startTime
            });
            this.emitEvent('channel_stopped', {
                uptime,
                startTime: this.startTime,
                stopTime: Date.now()
            });
        }
        catch (error) {
            this.logger.error(`Failed to stop ${this.channelType} adapter: ${error.message}`, {
                error
            });
            throw new interfaces_1.ChannelError(`Failed to stop ${this.channelType} adapter`, 'STOP_FAILED', false, { originalError: error.message });
        }
    }
    /**
     * 发送消息到渠道
     * @param message 输出消息
     */
    async send(message) {
        if (!this.isRunning) {
            throw new interfaces_1.ChannelError(`${this.channelType} adapter is not running`, 'ADAPTER_NOT_RUNNING');
        }
        try {
            this.logger.debug(`Sending message via ${this.channelType} adapter`, {
                peerId: message.peerId,
                messageType: message.content.type
            });
            // 验证消息格式
            await this.validateOutboundMessage(message);
            // 执行具体渠道的发送逻辑
            await this.onSend(message);
            this.logger.info(`Message sent successfully via ${this.channelType} adapter`, {
                peerId: message.peerId,
                messageId: message.content.originalMessageId
            });
            this.emitEvent('outbound_message', {
                message,
                timestamp: Date.now()
            });
        }
        catch (error) {
            this.logger.error(`Failed to send message via ${this.channelType} adapter: ${error.message}`, {
                error,
                message
            });
            if (error instanceof interfaces_1.ChannelError) {
                throw error;
            }
            throw new interfaces_1.ChannelError(`Failed to send message via ${this.channelType} adapter`, 'SEND_FAILED', true, { originalError: error.message });
        }
    }
    /**
     * 注册消息接收回调
     * @param callback 消息回调函数
     */
    onMessage(callback) {
        this.messageCallbacks.push(callback);
        this.logger.debug(`Message callback registered for ${this.channelType} adapter`);
    }
    /**
     * 健康检查
     */
    async healthCheck() {
        try {
            const basicHealth = {
                status: (this.isRunning ? 'healthy' : 'unhealthy'),
                details: {
                    isRunning: this.isRunning,
                    uptime: this.isRunning ? Date.now() - this.startTime : 0,
                    startTime: this.startTime,
                    channelType: this.channelType
                },
                timestamp: Date.now()
            };
            if (!this.isRunning) {
                return basicHealth;
            }
            // 执行具体渠道的健康检查
            const channelHealth = await this.onHealthCheck();
            return {
                ...basicHealth,
                status: channelHealth.status,
                details: {
                    ...basicHealth.details,
                    ...channelHealth.details
                }
            };
        }
        catch (error) {
            this.logger.error(`Health check failed for ${this.channelType} adapter: ${error.message}`, {
                error
            });
            return {
                status: 'unhealthy',
                details: {
                    error: error.message,
                    channelType: this.channelType,
                    isRunning: this.isRunning
                },
                timestamp: Date.now()
            };
        }
    }
    /**
     * 触发消息接收
     * @param message 输入消息
     */
    triggerMessage(message) {
        this.logger.debug(`Message received via ${this.channelType} adapter`, {
            peerId: message.peer.id,
            messageType: message.content.type
        });
        // 调用所有注册的回调
        for (const callback of this.messageCallbacks) {
            try {
                callback(message);
            }
            catch (error) {
                this.logger.error(`Message callback error: ${error.message}`, {
                    error,
                    message
                });
            }
        }
        this.emitEvent('inbound_message', {
            message,
            timestamp: Date.now()
        });
    }
    /**
     * 注册事件监听器
     * @param eventType 事件类型
     * @param listener 监听器函数
     */
    onEvent(eventType, listener) {
        if (!this.eventListeners.has(eventType)) {
            this.eventListeners.set(eventType, []);
        }
        this.eventListeners.get(eventType).push(listener);
    }
    /**
     * 触发事件
     * @param eventType 事件类型
     * @param data 事件数据
     */
    emitEvent(eventType, data) {
        const event = {
            type: eventType,
            channel: this.channelType,
            timestamp: Date.now(),
            data
        };
        this.logger.debug(`Event emitted: ${eventType}`, { event });
        const listeners = this.eventListeners.get(eventType) || [];
        for (const listener of listeners) {
            try {
                listener(event);
            }
            catch (error) {
                this.logger.error(`Event listener error: ${error.message}`, {
                    error,
                    event
                });
            }
        }
    }
    /**
     * 创建默认日志记录器
     */
    createDefaultLogger() {
        return {
            error: (message, meta) => console.error(`[ERROR] ${this.channelType}: ${message}`, meta || ''),
            warn: (message, meta) => console.warn(`[WARN] ${this.channelType}: ${message}`, meta || ''),
            info: (message, meta) => console.log(`[INFO] ${this.channelType}: ${message}`, meta || ''),
            debug: (message, meta) => console.debug(`[DEBUG] ${this.channelType}: ${message}`, meta || ''),
            trace: (message, meta) => console.trace(`[TRACE] ${this.channelType}: ${message}`, meta || '')
        };
    }
    // 工具方法
    /**
     * 获取运行状态
     */
    get isRunningStatus() {
        return this.isRunning;
    }
    /**
     * 获取渠道类型
     */
    get channelTypeName() {
        return this.channelType;
    }
    /**
     * 获取配置
     */
    get currentConfig() {
        return { ...this.config };
    }
    /**
     * 获取运行时间（毫秒）
     */
    get uptime() {
        if (!this.isRunning || !this.startTime) {
            return 0;
        }
        return Date.now() - this.startTime;
    }
}
exports.BaseAdapter = BaseAdapter;
//# sourceMappingURL=base-adapter.js.map