/**
 * HexaCore 出入口适配器框架 - 基础适配器抽象类
 * 提供所有渠道适配器的通用实现和生命周期管理
 */

import {
  ChannelType,
  HexaCoreChannel,
  InboundMessage,
  OutboundMessage,
  ChannelConfig,
  HealthStatus,
  ChannelError,
  Logger,
  ChannelEvent,
  EventType
} from './interfaces';

/**
 * 基础适配器抽象类
 * 所有渠道适配器都应继承此类并实现抽象方法
 */
export abstract class BaseAdapter implements HexaCoreChannel {
  protected config: ChannelConfig;
  protected logger: Logger;
  protected messageCallbacks: Array<(message: InboundMessage) => void> = [];
  protected eventListeners: Map<EventType, Array<(event: ChannelEvent) => void>> = new Map();
  protected isRunning: boolean = false;
  protected startTime: number = 0;
  
  /**
   * 构造函数
   * @param channelType 渠道类型
   * @param defaultConfig 默认配置
   * @param logger 日志记录器
   */
  constructor(
    protected readonly channelType: ChannelType,
    protected readonly defaultConfig: Partial<ChannelConfig>,
    logger?: Logger
  ) {
    this.config = { ...defaultConfig } as ChannelConfig;
    this.logger = logger || this.createDefaultLogger();
  }
  
  /**
   * 启动渠道适配器
   * @param config 渠道配置
   */
  async start(config: ChannelConfig): Promise<void> {
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
    } catch (error: any) {
      this.logger.error(`Failed to start ${this.channelType} adapter: ${error.message}`, {
        error,
        config: this.config
      });
      throw new ChannelError(
        `Failed to start ${this.channelType} adapter`,
        'START_FAILED',
        false,
        { originalError: error.message }
      );
    }
  }
  
  /**
   * 停止渠道适配器
   */
  async stop(): Promise<void> {
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
    } catch (error: any) {
      this.logger.error(`Failed to stop ${this.channelType} adapter: ${error.message}`, {
        error
      });
      throw new ChannelError(
        `Failed to stop ${this.channelType} adapter`,
        'STOP_FAILED',
        false,
        { originalError: error.message }
      );
    }
  }
  
  /**
   * 发送消息到渠道
   * @param message 输出消息
   */
  async send(message: OutboundMessage): Promise<void> {
    if (!this.isRunning) {
      throw new ChannelError(
        `${this.channelType} adapter is not running`,
        'ADAPTER_NOT_RUNNING'
      );
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
    } catch (error: any) {
      this.logger.error(`Failed to send message via ${this.channelType} adapter: ${error.message}`, {
        error,
        message
      });
      
      if (error instanceof ChannelError) {
        throw error;
      }
      
      throw new ChannelError(
        `Failed to send message via ${this.channelType} adapter`,
        'SEND_FAILED',
        true,
        { originalError: error.message }
      );
    }
  }
  
  /**
   * 注册消息接收回调
   * @param callback 消息回调函数
   */
  onMessage(callback: (message: InboundMessage) => void): void {
    this.messageCallbacks.push(callback);
    this.logger.debug(`Message callback registered for ${this.channelType} adapter`);
  }
  
  /**
   * 健康检查
   */
  async healthCheck(): Promise<HealthStatus> {
    try {
      const basicHealth: HealthStatus = {
        status: (this.isRunning ? 'healthy' : 'unhealthy') as any,
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
    } catch (error: any) {
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
  protected triggerMessage(message: InboundMessage): void {
    this.logger.debug(`Message received via ${this.channelType} adapter`, {
      peerId: message.peer.id,
      messageType: message.content.type
    });
    
    // 调用所有注册的回调
    for (const callback of this.messageCallbacks) {
      try {
        callback(message);
      } catch (error: any) {
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
  onEvent(eventType: EventType, listener: (event: ChannelEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }
  
  /**
   * 触发事件
   * @param eventType 事件类型
   * @param data 事件数据
   */
  protected emitEvent(eventType: EventType, data: Record<string, any>): void {
    const event: ChannelEvent = {
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
      } catch (error: any) {
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
  private createDefaultLogger(): Logger {
    return {
      error: (message, meta) => console.error(`[ERROR] ${this.channelType}: ${message}`, meta || ''),
      warn: (message, meta) => console.warn(`[WARN] ${this.channelType}: ${message}`, meta || ''),
      info: (message, meta) => console.log(`[INFO] ${this.channelType}: ${message}`, meta || ''),
      debug: (message, meta) => console.debug(`[DEBUG] ${this.channelType}: ${message}`, meta || ''),
      trace: (message, meta) => console.trace(`[TRACE] ${this.channelType}: ${message}`, meta || '')
    };
  }
  
  // 抽象方法 - 具体适配器必须实现
  
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
  
  // 工具方法
  
  /**
   * 获取运行状态
   */
  get isRunningStatus(): boolean {
    return this.isRunning;
  }
  
  /**
   * 获取渠道类型
   */
  get channelTypeName(): ChannelType {
    return this.channelType;
  }
  
  /**
   * 获取配置
   */
  get currentConfig(): ChannelConfig {
    return { ...this.config };
  }
  
  /**
   * 获取运行时间（毫秒）
   */
  get uptime(): number {
    if (!this.isRunning || !this.startTime) {
      return 0;
    }
    return Date.now() - this.startTime;
  }
}
