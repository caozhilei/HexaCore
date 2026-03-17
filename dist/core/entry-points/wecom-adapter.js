"use strict";
/**
 * HexaCore 企业微信适配器
 * 基于企业微信开放API实现的企业级通信适配器
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WeComAdapter = void 0;
const base_adapter_1 = require("./base-adapter");
/**
 * 企业微信适配器实现
 */
class WeComAdapter extends base_adapter_1.BaseAdapter {
    apiClient = null;
    orgSync = null;
    oauthManager = null;
    accessToken = '';
    tokenExpiry = 0;
    departmentCache = new Map();
    userCache = new Map();
    constructor(logger) {
        super('wecom', {
            enabled: true,
            adapter: 'wecom',
            dmPolicy: 'open',
            config: {
                corpId: '',
                agentId: 0,
                secret: '',
                baseUrl: 'https://qyapi.weixin.qq.com',
                timeout: 30000,
                orgSyncInterval: 3600000
            }
        }, logger);
    }
    /**
     * 企业微信特定的启动逻辑
     */
    async onStart(config) {
        const wecomConfig = config;
        this.logger.info('Initializing WeCom API client...', {
            corpId: wecomConfig.config.corpId,
            agentId: wecomConfig.config.agentId
        });
        // 初始化API客户端
        this.apiClient = await this.initApiClient(wecomConfig);
        // 获取访问令牌
        await this.refreshAccessToken();
        // 启动组织架构同步服务
        await this.startOrgSyncService(wecomConfig);
        // 初始化OAuth管理器（如果配置了）
        if (wecomConfig.config.oauthConfig) {
            await this.initOAuthManager(wecomConfig.config.oauthConfig);
        }
        this.logger.info('WeCom adapter initialized successfully');
    }
    /**
     * 企业微信特定的停止逻辑
     */
    async onStop() {
        this.logger.info('Stopping WeCom adapter...');
        // 停止组织架构同步
        if (this.orgSync) {
            await this.orgSync.stop();
            this.orgSync = null;
        }
        // 清理缓存
        this.departmentCache.clear();
        this.userCache.clear();
        // 重置API客户端
        this.apiClient = null;
        this.accessToken = '';
        this.tokenExpiry = 0;
        this.logger.info('WeCom adapter stopped successfully');
    }
    /**
     * 企业微信特定的消息发送逻辑
     */
    async onSend(message) {
        if (!this.apiClient) {
            throw new base_adapter_1.ChannelError('WeCom API client not initialized', 'CLIENT_NOT_INITIALIZED');
        }
        // 检查访问令牌是否过期
        if (Date.now() >= this.tokenExpiry) {
            await this.refreshAccessToken();
        }
        // 构建企业微信消息格式
        const wecomMessage = this.convertToWeComMessage(message);
        try {
            const result = await this.apiClient.sendMessage(wecomMessage);
            this.logger.debug('Message sent via WeCom', {
                peerId: message.peerId,
                messageId: result.msgid,
                contentType: message.content.type
            });
        }
        catch (error) {
            if (error.message.includes('access_token')) {
                // 令牌过期，刷新后重试一次
                await this.refreshAccessToken();
                const retryResult = await this.apiClient.sendMessage(wecomMessage);
                this.logger.debug('Message sent after token refresh');
            }
            else {
                throw error;
            }
        }
    }
    /**
     * 企业微信特定的健康检查逻辑
     */
    async onHealthCheck() {
        const details = {
            accessTokenValid: Date.now() < this.tokenExpiry,
            tokenExpiresIn: Math.max(0, this.tokenExpiry - Date.now()),
            departmentCacheSize: this.departmentCache.size,
            userCacheSize: this.userCache.size,
            orgSyncRunning: !!this.orgSync?.isRunning
        };
        // 检查访问令牌状态
        if (Date.now() >= this.tokenExpiry) {
            return {
                status: 'degraded',
                details: {
                    ...details,
                    warning: 'Access token expired or about to expire'
                },
                timestamp: Date.now()
            };
        }
        // 检查组织架构同步状态
        if (this.orgSync && !this.orgSync.isRunning) {
            return {
                status: 'degraded',
                details: {
                    ...details,
                    warning: 'Organization sync service not running'
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
     * 验证企业微信配置
     */
    async validateConfig(config) {
        const wecomConfig = config;
        if (!wecomConfig.config.corpId) {
            throw new base_adapter_1.ValidationError('corpId is required');
        }
        if (!wecomConfig.config.agentId || wecomConfig.config.agentId <= 0) {
            throw new base_adapter_1.ValidationError('agentId must be a positive number');
        }
        if (!wecomConfig.config.secret) {
            throw new base_adapter_1.ValidationError('secret is required');
        }
        if (wecomConfig.config.timeout && wecomConfig.config.timeout <= 0) {
            throw new base_adapter_1.ValidationError('timeout must be greater than 0');
        }
        this.logger.debug('WeCom configuration validated successfully');
    }
    /**
     * 验证输出消息格式
     */
    async validateOutboundMessage(message) {
        if (message.channel !== 'wecom') {
            throw new base_adapter_1.ValidationError(`Invalid channel type: expected 'wecom', got '${message.channel}'`);
        }
        if (!message.peerId) {
            throw new base_adapter_1.ValidationError('peerId is required');
        }
        if (!message.content.type) {
            throw new base_adapter_1.ValidationError('content.type is required');
        }
        // 检查企业微信特定的消息限制
        if (message.content.text && message.content.text.length > 2048) {
            throw new base_adapter_1.ValidationError('Text message exceeds 2048 character limit');
        }
        // 检查附件类型支持
        if (message.content.attachments) {
            for (const attachment of message.content.attachments) {
                if (!this.isSupportedAttachmentType(attachment.type)) {
                    throw new base_adapter_1.ValidationError(`Unsupported attachment type: ${attachment.type}`);
                }
            }
        }
    }
    /**
     * 初始化API客户端
     */
    async initApiClient(config) {
        this.logger.info('Creating WeCom API client...');
        // 模拟企业微信API客户端
        const mockClient = {
            getAccessToken: async () => {
                // 模拟获取访问令牌
                const token = `wecom_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                this.logger.debug('Access token requested', { token: token.substring(0, 20) + '...' });
                return token;
            },
            sendMessage: async (message) => {
                // 模拟发送消息
                this.logger.debug('Mock sendMessage called', {
                    toUser: message.touser,
                    msgType: message.msgtype
                });
                return {
                    errcode: 0,
                    errmsg: 'ok',
                    msgid: `wecom_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    invaliduser: '',
                    invalidparty: '',
                    invalidtag: ''
                };
            },
            getUserInfo: async (userId) => {
                // 模拟获取用户信息
                return {
                    errcode: 0,
                    errmsg: 'ok',
                    userid: userId,
                    name: `User ${userId}`,
                    department: [1],
                    position: 'Developer',
                    mobile: '13800138000',
                    gender: '1',
                    email: `${userId}@example.com`,
                    avatar: 'https://example.com/avatar.jpg',
                    status: 1
                };
            },
            getDepartmentList: async () => {
                // 模拟获取部门列表
                return {
                    errcode: 0,
                    errmsg: 'ok',
                    department: [
                        { id: 1, name: '总公司', parentid: 0, order: 100000000 },
                        { id: 2, name: '技术部', parentid: 1, order: 100000001 }
                    ]
                };
            }
        };
        this.logger.info('WeCom API client initialized successfully');
        return mockClient;
    }
    /**
     * 刷新访问令牌
     */
    async refreshAccessToken() {
        if (!this.apiClient) {
            throw new base_adapter_1.ChannelError('API client not available', 'CLIENT_NOT_AVAILABLE');
        }
        try {
            this.accessToken = await this.apiClient.getAccessToken();
            // 设置令牌过期时间（模拟2小时后过期）
            this.tokenExpiry = Date.now() + 7200000;
            this.logger.debug('Access token refreshed', {
                expiresAt: new Date(this.tokenExpiry).toISOString()
            });
        }
        catch (error) {
            this.logger.error('Failed to refresh access token', { error: error.message });
            throw new base_adapter_1.ChannelError('Access token refresh failed', 'TOKEN_REFRESH_FAILED', true);
        }
    }
    /**
     * 启动组织架构同步服务
     */
    async startOrgSyncService(config) {
        this.logger.info('Starting organization sync service...');
        this.orgSync = new OrganizationSync(this.apiClient, {
            syncInterval: config.config.orgSyncInterval || 3600000,
            fullSyncOnStart: true,
            cacheEnabled: true
        });
        await this.orgSync.start();
        this.logger.info('Organization sync service started successfully');
    }
    /**
     * 初始化OAuth管理器
     */
    async initOAuthManager(oauthConfig) {
        this.logger.info('Initializing OAuth manager...');
        this.oauthManager = new OAuthManager(oauthConfig);
        await this.oauthManager.init();
        this.logger.info('OAuth manager initialized successfully');
    }
    /**
     * 处理接收到的企业微信消息
     */
    async handleIncomingMessage(raw) {
        try {
            // 转换为标准化消息
            const inboundMessage = await this.convertToInboundMessage(raw);
            // 触发消息接收
            this.triggerMessage(inboundMessage);
            this.logger.debug('Incoming WeCom message processed', {
                messageId: inboundMessage.content.originalMessageId,
                peerId: inboundMessage.peer.id
            });
        }
        catch (error) {
            this.logger.error('Failed to process incoming WeCom message', {
                error: error.message,
                raw
            });
        }
    }
    /**
     * 将企业微信原始消息转换为InboundMessage
     */
    async convertToInboundMessage(raw) {
        const isExternal = raw.FromUserName?.startsWith('wm');
        // 获取用户信息（从缓存或API）
        const userInfo = await this.getUserInfo(raw.FromUserName);
        const metadata = {
            msgType: raw.MsgType,
            agentId: raw.AgentID || 0,
            event: raw.Event,
            eventKey: raw.EventKey,
            isFromExternalContact: isExternal
        };
        return {
            channel: 'wecom',
            accountId: raw.ToUserName || (raw.AgentID ? raw.AgentID.toString() : ''),
            peer: {
                kind: isExternal ? 'external' : 'internal',
                id: raw.FromUserName,
                metadata: {
                    userId: userInfo?.userid || raw.FromUserName,
                    isExternal,
                    departmentId: userInfo?.department?.[0] || 0,
                    position: userInfo?.position || '',
                    mobile: userInfo?.mobile || '',
                    gender: userInfo?.gender || '0',
                    email: userInfo?.email || '',
                    ...userInfo
                }
            },
            content: {
                text: this.extractText(raw),
                type: this.mapMessageType(raw.MsgType),
                attachments: this.extractAttachments(raw),
                originalMessageId: raw.MsgId
            },
            timestamp: parseInt(raw.CreateTime.toString()) * 1000,
            metadata: {
                wecom: metadata
            }
        };
    }
    /**
     * 将标准化消息内容转换为企业微信消息格式
     */
    convertToWeComMessage(message) {
        const baseMessage = {
            touser: message.peerId,
            agentid: parseInt(message.accountId) || this.config.config.agentId,
            msgtype: this.mapToWeComMsgType(message.content.type)
        };
        switch (message.content.type) {
            case 'text':
                return {
                    ...baseMessage,
                    text: {
                        content: message.content.text || ''
                    }
                };
            case 'image':
                return {
                    ...baseMessage,
                    image: {
                        media_id: message.content.attachments?.[0]?.url || ''
                    }
                };
            case 'video':
                return {
                    ...baseMessage,
                    video: {
                        media_id: message.content.attachments?.[0]?.url || '',
                        title: message.content.text?.substring(0, 64) || '',
                        description: message.content.text?.substring(0, 128) || ''
                    }
                };
            default:
                return {
                    ...baseMessage,
                    text: {
                        content: message.content.text || ''
                    }
                };
        }
    }
    /**
     * 获取用户信息
     */
    async getUserInfo(userId) {
        // 检查缓存
        if (this.userCache.has(userId)) {
            return this.userCache.get(userId);
        }
        if (!this.apiClient) {
            return null;
        }
        try {
            const userInfo = await this.apiClient.getUserInfo(userId);
            if (userInfo.errcode === 0) {
                this.userCache.set(userId, userInfo);
                return userInfo;
            }
        }
        catch (error) {
            this.logger.warn('Failed to get user info', { userId, error: error.message });
        }
        return null;
    }
    // 工具方法
    extractText(raw) {
        switch (raw.MsgType) {
            case 'text':
                return raw.Content || '';
            case 'image':
                return raw.PicUrl ? `[图片] ${raw.PicUrl}` : '[图片]';
            case 'voice':
                return '[语音消息]';
            case 'video':
                return '[视频消息]';
            case 'location':
                return `位置: ${raw.Label} (${raw.Location_X}, ${raw.Location_Y})`;
            default:
                return raw.Content || '';
        }
    }
    extractAttachments(raw) {
        const attachments = [];
        if (raw.MsgType === 'image' && raw.PicUrl) {
            attachments.push({
                type: 'image',
                url: raw.PicUrl,
                mediaId: raw.MediaId
            });
        }
        else if (raw.MsgType === 'voice' && raw.MediaId) {
            attachments.push({
                type: 'audio',
                mediaId: raw.MediaId,
                format: raw.Format
            });
        }
        else if (raw.MsgType === 'video' && raw.MediaId) {
            attachments.push({
                type: 'video',
                mediaId: raw.MediaId,
                thumbMediaId: raw.ThumbMediaId
            });
        }
        return attachments;
    }
    mapMessageType(wecomMsgType) {
        const mapping = {
            'text': 'text',
            'image': 'image',
            'voice': 'audio',
            'video': 'video',
            'file': 'file',
            'location': 'location'
        };
        return mapping[wecomMsgType] || 'text';
    }
    mapToWeComMsgType(contentType) {
        const mapping = {
            'text': 'text',
            'image': 'image',
            'video': 'video',
            'audio': 'voice',
            'file': 'file',
            'location': 'location',
            'sticker': 'text',
            'interactive': 'text'
        };
        return mapping[contentType] || 'text';
    }
    isSupportedAttachmentType(type) {
        const supportedTypes = ['image', 'voice', 'video', 'file'];
        return supportedTypes.includes(type);
    }
}
exports.WeComAdapter = WeComAdapter;
/**
 * 组织架构同步服务
 */
class OrganizationSync {
    apiClient;
    config;
    isRunning = false;
    constructor(apiClient, config) {
        this.apiClient = apiClient;
        this.config = config;
    }
    async start() {
        this.isRunning = true;
        // 模拟启动同步服务
    }
    async stop() {
        this.isRunning = false;
    }
}
/**
 * OAuth管理器
 */
class OAuthManager {
    config;
    constructor(config) {
        this.config = config;
    }
    async init() {
        // 模拟初始化OAuth管理器
    }
}
//# sourceMappingURL=wecom-adapter.js.map