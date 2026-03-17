/**
 * HexaCore WhatsApp Baileys适配器
 * 基于WhatsApp Business API实现的企业级消息适配器
 */

import {
  BaseAdapter,
  ChannelError,
  ConnectionError,
  ValidationError
} from './base-adapter';
import {
  ChannelType,
  InboundMessage,
  OutboundMessage,
  ChannelConfig,
  HealthStatus,
  WhatsAppConfig,
  WhatsAppMetadata,
  PeerKind,
  ContentType,
  Logger
} from './interfaces';

// 类型声明 - 模拟Baileys库
interface BaileysClient {
  sendMessage(jid: string, content: any, options?: any): Promise<any>;
  on(event: string, handler: (data: any) => void): void;
  ev: any;
  ws: any;
}

interface WhatsAppRawMessage {
  key: {
    id: string;
    remoteJid: string;
    fromMe: boolean;
  };
  pushName: string;
  message: any;
  messageTimestamp: number;
}

/**
 * WhatsApp Baileys适配器实现
 */
export class WhatsAppAdapter extends BaseAdapter {
  private baileysClient: BaileysClient | null = null;
  private connectionPool: Map<string, BaileysClient> = new Map();
  private messageQueue: Array<{message: OutboundMessage, resolve: Function, reject: Function}> = [];
  private isProcessingQueue: boolean = false;
  private lastMessageId: string = '';
  
  constructor(logger?: Logger) {
    super('whatsapp', {
      enabled: true,
      adapter: 'baileys',
      dmPolicy: 'allowlist',
      config: {
        businessAccountId: '',
        authDir: './data/whatsapp/auth',
        poolSize: 10,
        batchSize: 50,
        batchInterval: 100,
        maxRetries: 3,
        baseDelay: 100
      },
      allowlist: []
    }, logger);
  }
  
  /**
   * WhatsApp特定的启动逻辑
   */
  protected async onStart(config: ChannelConfig): Promise<void> {
    const whatsappConfig = config as WhatsAppConfig;
    
    this.logger.info('Initializing WhatsApp Baileys client...', {
      businessAccountId: whatsappConfig.config.businessAccountId,
      poolSize: whatsappConfig.config.poolSize
    });
    
    // 模拟初始化Baileys客户端
    this.baileysClient = await this.initBaileysClient(whatsappConfig);
    
    // 初始化连接池
    await this.initConnectionPool(whatsappConfig);
    
    // 注册消息处理器
    this.registerMessageHandlers();
    
    // 启动消息队列处理器
    this.startMessageQueueProcessor(whatsappConfig);
    
    this.logger.info('WhatsApp adapter initialized successfully');
  }
  
  /**
   * WhatsApp特定的停止逻辑
   */
  protected async onStop(): Promise<void> {
    this.logger.info('Stopping WhatsApp adapter...');
    
    // 停止消息队列处理器
    this.messageQueue = [];
    this.isProcessingQueue = false;
    
    // 关闭所有连接
    for (const [jid, client] of this.connectionPool) {
      await this.closeConnection(client);
      this.logger.debug(`Connection closed for ${jid}`);
    }
    this.connectionPool.clear();
    
    // 关闭主客户端
    if (this.baileysClient) {
      await this.closeConnection(this.baileysClient);
      this.baileysClient = null;
    }
    
    this.logger.info('WhatsApp adapter stopped successfully');
  }
  
  /**
   * WhatsApp特定的消息发送逻辑
   */
  protected async onSend(message: OutboundMessage): Promise<void> {
    if (!this.baileysClient) {
      throw new ChannelError('WhatsApp client not initialized', 'CLIENT_NOT_INITIALIZED');
    }
    
    const jid = this.normalizeJid(message.peerId);
    
    // 检查是否在白名单中（如果启用了allowlist策略）
    if (this.config.dmPolicy === 'allowlist') {
      const allowlist = (this.config as WhatsAppConfig).allowlist || [];
      if (!allowlist.includes(jid)) {
        throw new SecurityError('Peer not in allowlist', { jid, allowlist });
      }
    }
    
    // 构建WhatsApp消息内容
    const whatsappMessage = this.convertToWhatsAppMessage(message.content);
    
    // 使用连接池发送消息
    const client = await this.acquireConnection(jid);
    
    try {
      const result = await client.sendMessage(jid, whatsappMessage, {
        quoted: message.metadata?.whatsapp?.quotedMessageId
      });
      
      this.logger.debug('Message sent via WhatsApp', {
        jid,
        messageId: result.key.id,
        contentType: message.content.type
      });
      
      this.lastMessageId = result.key.id;
    } finally {
      await this.releaseConnection(jid, client);
    }
  }
  
  /**
   * WhatsApp特定的健康检查逻辑
   */
  protected async onHealthCheck(): Promise<HealthStatus> {
    const details: Record<string, any> = {
      connectionPoolSize: this.connectionPool.size,
      messageQueueLength: this.messageQueue.length,
      lastMessageId: this.lastMessageId,
      wsStatus: this.baileysClient?.ws?.readyState || 'unknown'
    };
    
    // 检查WebSocket连接状态
    if (this.baileysClient?.ws?.readyState !== 1) {
      return {
        status: 'degraded',
        details: {
          ...details,
          warning: 'WebSocket connection not established'
        },
        timestamp: Date.now()
      };
    }
    
    return {
      status: 'healthy',
      details,
      timestamp: Date.now()
    };
  }
  
  /**
   * 验证WhatsApp配置
   */
  protected async validateConfig(config: ChannelConfig): Promise<void> {
    const whatsappConfig = config as WhatsAppConfig;
    
    if (!whatsappConfig.config.businessAccountId) {
      throw new ValidationError('businessAccountId is required');
    }
    
    if (!whatsappConfig.config.authDir) {
      throw new ValidationError('authDir is required');
    }
    
    if (whatsappConfig.config.poolSize && whatsappConfig.config.poolSize <= 0) {
      throw new ValidationError('poolSize must be greater than 0');
    }
    
    this.logger.debug('WhatsApp configuration validated successfully');
  }
  
  /**
   * 验证输出消息格式
   */
  protected async validateOutboundMessage(message: OutboundMessage): Promise<void> {
    if (message.channel !== 'whatsapp') {
      throw new ValidationError(`Invalid channel type: expected 'whatsapp', got '${message.channel}'`);
    }
    
    if (!message.peerId) {
      throw new ValidationError('peerId is required');
    }
    
    if (!this.isValidJid(message.peerId)) {
      throw new ValidationError(`Invalid WhatsApp JID: ${message.peerId}`);
    }
    
    if (!message.content.type) {
      throw new ValidationError('content.type is required');
    }
    
    // 检查附件大小限制
    if (message.content.attachments) {
      for (const attachment of message.content.attachments) {
        if (attachment.size && attachment.size > 16 * 1024 * 1024) { // 16MB限制
          throw new ValidationError(`Attachment size exceeds 16MB limit: ${attachment.filename}`);
        }
      }
    }
  }
  
  /**
   * 初始化Baileys客户端
   */
  private async initBaileysClient(config: WhatsAppConfig): Promise<BaileysClient> {
    // 模拟Baileys客户端初始化
    this.logger.info('Creating Baileys socket connection...');
    
    // 在实际实现中，这里会调用 makeWASocket 等函数
    const mockClient: BaileysClient = {
      sendMessage: async (jid: string, content: any, options?: any) => {
        this.logger.debug('Mock sendMessage called', { jid, contentType: content.type });
        return {
          key: {
            id: `wa_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            remoteJid: jid,
            fromMe: true
          }
        };
      },
      
      on: (event: string, handler: (data: any) => void) => {
        this.logger.debug(`Event handler registered for: ${event}`);
      },
      
      ev: {},
      ws: {
        readyState: 1 // CONNECTED
      }
    };
    
    // 模拟连接建立
    await new Promise(resolve => setTimeout(resolve, 100));
    
    this.logger.info('Baileys client initialized successfully');
    return mockClient;
  }
  
  /**
   * 初始化连接池
   */
  private async initConnectionPool(config: WhatsAppConfig): Promise<void> {
    const poolSize = config.config.poolSize || 10;
    
    this.logger.info(`Initializing connection pool with size ${poolSize}...`);
    
    for (let i = 0; i < poolSize; i++) {
      const client = await this.initBaileysClient(config);
      const jid = `pool_connection_${i}`;
      this.connectionPool.set(jid, client);
    }
    
    this.logger.info(`Connection pool initialized with ${poolSize} connections`);
  }
  
  /**
   * 注册消息处理器
   */
  private registerMessageHandlers(): void {
    if (!this.baileysClient) return;
    
    // 模拟注册消息接收处理器
    this.baileysClient.on('messages.upsert', (data: any) => {
      const messages = data.messages || [];
      
      for (const rawMessage of messages) {
        this.handleIncomingMessage(rawMessage);
      }
    });
    
    this.logger.debug('Message handlers registered');
  }
  
  /**
   * 处理接收到的消息
   */
  private async handleIncomingMessage(rawMessage: WhatsAppRawMessage): Promise<void> {
    try {
      // 转换为标准化消息
      const inboundMessage = await this.convertToInboundMessage(rawMessage);
      
      // 触发消息接收
      this.triggerMessage(inboundMessage);
      
      this.logger.debug('Incoming message processed', {
        messageId: inboundMessage.content.originalMessageId,
        peerId: inboundMessage.peer.id
      });
    } catch (error) {
      this.logger.error('Failed to process incoming message', {
        error: error.message,
        rawMessage
      });
    }
  }
  
  /**
   * 将WhatsApp原始消息转换为InboundMessage
   */
  private async convertToInboundMessage(raw: WhatsAppRawMessage): Promise<InboundMessage> {
    const messageType = this.getMessageType(raw.message);
    const text = this.extractText(raw.message);
    const media = this.extractMedia(raw.message);
    
    const metadata: WhatsAppMetadata = {
      messageType,
      hasMedia: !!media,
      isForwarded: raw.message?.forwarded || false,
      isFromMe: raw.key?.fromMe || false,
      quotedMessageId: raw.message?.quotedMessage?.key?.id
    };
    
    return {
      channel: 'whatsapp',
      accountId: this.config.config.businessAccountId,
      peer: {
        kind: this.getPeerKind(raw.key.remoteJid),
        id: raw.key.remoteJid,
        metadata: {
          pushName: raw.pushName,
          isBusiness: this.isBusinessAccount(raw.key.remoteJid),
          countryCode: this.extractCountryCode(raw.key.remoteJid)
        }
      },
      content: {
        text,
        type: messageType as ContentType,
        attachments: media ? [media] : [],
        originalMessageId: raw.key.id
      },
      timestamp: raw.messageTimestamp * 1000,
      metadata: {
        whatsapp: metadata
      }
    };
  }
  
  /**
   * 将标准化消息内容转换为WhatsApp消息格式
   */
  private convertToWhatsAppMessage(content: any): any {
    switch (content.type) {
      case 'text':
        return { text: content.text };
      case 'image':
        return {
          image: { url: content.attachments?.[0]?.url },
          caption: content.text
        };
      case 'video':
        return {
          video: { url: content.attachments?.[0]?.url },
          caption: content.text
        };
      case 'audio':
        return { audio: { url: content.attachments?.[0]?.url } };
      case 'file':
        return { document: { url: content.attachments?.[0]?.url } };
      default:
        return { text: content.text || '' };
    }
  }
  
  /**
   * 启动消息队列处理器
   */
  private startMessageQueueProcessor(config: WhatsAppConfig): void {
    const batchSize = config.config.batchSize || 50;
    const batchInterval = config.config.batchInterval || 100;
    
    setInterval(async () => {
      if (this.isProcessingQueue || this.messageQueue.length === 0) {
        return;
      }
      
      this.isProcessingQueue = true;
      
      try {
        // 提取当前批次
        const batch = this.messageQueue.splice(0, Math.min(batchSize, this.messageQueue.length));
        
        if (batch.length > 0) {
          this.logger.debug(`Processing batch of ${batch.length} messages`);
          
          // 在实际实现中，这里会批量处理消息
          for (const item of batch) {
            try {
              await this.onSend(item.message);
              item.resolve();
            } catch (error) {
              this.logger.error('Failed to process queued message', { error: error.message });
              item.reject(error);
            }
          }
        }
      } finally {
        this.isProcessingQueue = false;
      }
    }, batchInterval);
  }
  
  /**
   * 获取连接
   */
  private async acquireConnection(jid: string): Promise<BaileysClient> {
    // 简化实现：返回主客户端
    if (!this.baileysClient) {
      throw new ConnectionError('No WhatsApp client available', { jid });
    }
    
    return this.baileysClient;
  }
  
  /**
   * 释放连接
   */
  private async releaseConnection(jid: string, client: BaileysClient): Promise<void> {
    // 在连接池实现中，这里会将连接标记为空闲
    this.logger.debug(`Connection released for ${jid}`);
  }
  
  /**
   * 关闭连接
   */
  private async closeConnection(client: BaileysClient): Promise<void> {
    // 模拟关闭连接
    client.ws.readyState = 3; // CLOSED
    this.logger.debug('Connection closed');
  }
  
  // 工具方法
  
  private normalizeJid(jid: string): string {
    // 简单的JID规范化
    if (!jid.includes('@')) {
      return `${jid}@s.whatsapp.net`;
    }
    return jid;
  }
  
  private isValidJid(jid: string): boolean {
    return /^[0-9]+@[a-zA-Z0-9.-]+$/.test(jid) || /^[0-9]+$/.test(jid);
  }
  
  private getMessageType(message: any): string {
    if (message.conversation) return 'conversation';
    if (message.imageMessage) return 'image';
    if (message.videoMessage) return 'video';
    if (message.audioMessage) return 'audio';
    if (message.documentMessage) return 'document';
    return 'unknown';
  }
  
  private extractText(message: any): string {
    if (message.conversation) return message.conversation;
    if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
    if (message.imageMessage?.caption) return message.imageMessage.caption;
    if (message.videoMessage?.caption) return message.videoMessage.caption;
    return '';
  }
  
  private extractMedia(message: any): any {
    if (message.imageMessage) {
      return {
        type: 'image',
        url: message.imageMessage.url,
        mimeType: message.imageMessage.mimetype,
        size: message.imageMessage.fileLength
      };
    }
    if (message.videoMessage) {
      return {
        type: 'video',
        url: message.videoMessage.url,
        mimeType: message.videoMessage.mimetype,
        size: message.videoMessage.fileLength
      };
    }
    return null;
  }
  
  private getPeerKind(jid: string): PeerKind {
    if (jid.includes('@g.us')) return 'group';
    if (jid.includes('@broadcast')) return 'channel';
    return 'dm';
  }
  
  private isBusinessAccount(jid: string): boolean {
    // 简化实现
    return jid.includes('@s.whatsapp.net');
  }
  
  private extractCountryCode(jid: string): string {
    const match = jid.match(/^(\+?[0-9]+)/);
    return match ? match[1] : '';
  }
}
