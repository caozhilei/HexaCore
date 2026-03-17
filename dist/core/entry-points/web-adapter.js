"use strict";
/**
 * HexaCore Web Widget适配器
 * 基于WebSocket和WebRTC实现的现代Web聊天组件适配器
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebAdapter = void 0;
const base_adapter_1 = require("./base-adapter");
const interfaces_1 = require("./interfaces");
const ws_1 = require("ws");
/**
 * Web Widget适配器实现
 */
class WebAdapter extends base_adapter_1.BaseAdapter {
    webSocketServer = null;
    sessionManager = null;
    widgetRenderer = null;
    activeSessions = new Map();
    pairingManager = null;
    constructor(logger) {
        super('web', {
            enabled: true,
            adapter: 'widget',
            dmPolicy: 'pairing',
            config: {
                widgetVersion: '2.0.0',
                wsPort: 18790,
                wsPath: '/ws/chat',
                maxConnections: 10000,
                pingInterval: 30000,
                sessionTimeout: 3600000,
                maxSessionsPerUser: 5,
                cleanupInterval: 60000,
                apiEndpoint: 'https://platform.example.com/api/webchat',
                theme: 'light',
                localization: 'zh-CN'
            }
        }, logger);
    }
    /**
     * Web特定的启动逻辑
     */
    async onStart(config) {
        const webConfig = config;
        this.logger.info('Initializing Web Widget adapter...', {
            wsPort: webConfig.config.wsPort,
            widgetVersion: webConfig.config.widgetVersion
        });
        // 启动WebSocket服务器
        this.webSocketServer = await this.initWebSocketServer(webConfig);
        // 初始化会话管理器
        this.sessionManager = await this.initSessionManager(webConfig);
        // 初始化Widget渲染器
        this.widgetRenderer = await this.initWidgetRenderer(webConfig);
        // 初始化配对管理器（如果启用了配对策略）
        if (webConfig.dmPolicy === 'pairing') {
            this.pairingManager = await this.initPairingManager(webConfig.pairingConfig);
        }
        // 注册WebSocket事件处理器
        this.registerWebSocketHandlers();
        this.logger.info('Web Widget adapter initialized successfully');
    }
    /**
     * Web特定的停止逻辑
     */
    async onStop() {
        this.logger.info('Stopping Web Widget adapter...');
        // 关闭WebSocket服务器
        if (this.webSocketServer) {
            await this.webSocketServer.close();
            this.webSocketServer = null;
        }
        // 清理会话
        if (this.sessionManager) {
            await this.sessionManager.cleanup();
            this.sessionManager = null;
        }
        // 清理配对管理器
        this.pairingManager = null;
        // 清理活动会话
        this.activeSessions.clear();
        this.logger.info('Web Widget adapter stopped successfully');
    }
    /**
     * Web特定的消息发送逻辑
     */
    async onSend(message) {
        if (!this.webSocketServer) {
            throw new interfaces_1.ChannelError('WebSocket server not initialized', 'SERVER_NOT_INITIALIZED');
        }
        // 查找目标会话
        const activeSession = this.activeSessions.get(message.peerId);
        if (!activeSession) {
            throw new interfaces_1.ChannelError(`Session not found: ${message.peerId}`, 'SESSION_NOT_FOUND');
        }
        const { session, socket } = activeSession;
        // 检查配对状态（如果启用了配对策略）
        if (this.config.dmPolicy === 'pairing' && this.pairingManager) {
            const pairingStatus = await this.pairingManager.checkPairingStatus(session.userId || session.sessionId);
            if (pairingStatus !== 'paired') {
                throw new interfaces_1.SecurityError('Session not paired', { sessionId: session.sessionId, pairingStatus });
            }
        }
        // 构建Web消息格式
        const webMessage = this.convertToWebMessage(message);
        try {
            // 通过WebSocket发送消息
            if (socket.readyState === ws_1.WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    sessionId: session.sessionId,
                    ...webMessage
                }));
            }
            else {
                throw new Error('WebSocket is not open');
            }
            this.logger.debug('Message sent via Web Widget', {
                sessionId: session.sessionId,
                peerId: message.peerId,
                contentType: message.content.type
            });
        }
        catch (error) {
            this.logger.error('Failed to send Web message', {
                error: error.message,
                sessionId: session.sessionId
            });
            throw new interfaces_1.ChannelError('Failed to send Web message', 'SEND_FAILED', true, { originalError: error.message });
        }
    }
    /**
     * Web特定的健康检查逻辑
     */
    async onHealthCheck() {
        const details = {
            activeSessions: this.activeSessions.size,
            wsConnections: 0, // 在实际实现中会从WebSocket服务器获取
            sessionManagerRunning: !!this.sessionManager?.isRunning,
            pairingEnabled: !!this.pairingManager,
            serverStatus: this.webSocketServer ? 'running' : 'stopped'
        };
        // 检查会话管理器状态
        if (!this.sessionManager?.isRunning) {
            return {
                status: 'degraded',
                details: {
                    ...details,
                    warning: 'Session manager not running'
                },
                timestamp: Date.now()
            };
        }
        // 检查WebSocket服务器状态
        if (!this.webSocketServer) {
            return {
                status: 'unhealthy',
                details: {
                    ...details,
                    error: 'WebSocket server not available'
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
     * 验证Web配置
     */
    async validateConfig(config) {
        const webConfig = config;
        if (!webConfig.config.wsPort || webConfig.config.wsPort <= 0 || webConfig.config.wsPort > 65535) {
            throw new interfaces_1.ValidationError('wsPort must be a valid port number (1-65535)');
        }
        if (!webConfig.config.widgetVersion) {
            throw new interfaces_1.ValidationError('widgetVersion is required');
        }
        if (webConfig.config.maxConnections && webConfig.config.maxConnections <= 0) {
            throw new interfaces_1.ValidationError('maxConnections must be greater than 0');
        }
        if (webConfig.config.sessionTimeout && webConfig.config.sessionTimeout <= 0) {
            throw new interfaces_1.ValidationError('sessionTimeout must be greater than 0');
        }
        if (webConfig.config.maxSessionsPerUser && webConfig.config.maxSessionsPerUser <= 0) {
            throw new interfaces_1.ValidationError('maxSessionsPerUser must be greater than 0');
        }
        this.logger.debug('Web configuration validated successfully');
    }
    /**
     * 验证输出消息格式
     */
    async validateOutboundMessage(message) {
        if (message.channel !== 'web') {
            throw new interfaces_1.ValidationError(`Invalid channel type: expected 'web', got '${message.channel}'`);
        }
        if (!message.peerId) {
            throw new interfaces_1.ValidationError('peerId is required');
        }
        if (!message.content.type) {
            throw new interfaces_1.ValidationError('content.type is required');
        }
        // 检查Web消息特定限制
        if (message.content.text && message.content.text.length > 10000) {
            throw new interfaces_1.ValidationError('Text message exceeds 10000 character limit');
        }
        // 检查附件数量和大小
        if (message.content.attachments) {
            if (message.content.attachments.length > 10) {
                throw new interfaces_1.ValidationError('Maximum 10 attachments allowed');
            }
            for (const attachment of message.content.attachments) {
                if (attachment.size && attachment.size > 10 * 1024 * 1024) { // 10MB限制
                    throw new interfaces_1.ValidationError(`Attachment size exceeds 10MB limit: ${attachment.filename}`);
                }
            }
        }
    }
    /**
     * 初始化WebSocket服务器
     */
    async initWebSocketServer(config) {
        this.logger.info(`Starting WebSocket server on port ${config.config.wsPort}...`);
        return new Promise((resolve, reject) => {
            const wss = new ws_1.WebSocketServer({ port: config.config.wsPort });
            wss.on('listening', () => {
                this.logger.info('WebSocket server started successfully');
                resolve(wss);
            });
            wss.on('error', (err) => {
                this.logger.error('WebSocket server error', { error: err.message });
                reject(err);
            });
        });
    }
    /**
     * 初始化会话管理器
     */
    async initSessionManager(config) {
        this.logger.info('Initializing session manager...');
        const sessionManager = new WebSessionManager({
            sessionTimeout: config.config.sessionTimeout || 3600000,
            maxSessionsPerUser: config.config.maxSessionsPerUser || 5,
            cleanupInterval: config.config.cleanupInterval || 60000
        });
        await sessionManager.start();
        this.logger.info('Session manager initialized successfully');
        return sessionManager;
    }
    /**
     * 初始化Widget渲染器
     */
    async initWidgetRenderer(config) {
        this.logger.info('Initializing widget renderer...');
        const renderer = new WidgetRenderer({
            widgetVersion: config.config.widgetVersion || '2.0.0',
            theme: config.config.theme || 'light',
            localization: config.config.localization || 'zh-CN',
            customCss: config.config.customCss,
            customJs: config.config.customJs
        });
        await renderer.init();
        this.logger.info('Widget renderer initialized successfully');
        return renderer;
    }
    /**
     * 初始化配对管理器
     */
    async initPairingManager(config) {
        this.logger.info('Initializing pairing manager...');
        const pairingManager = new PairingManager({
            requirePairing: config?.requirePairing ?? true,
            pairingTimeout: config?.pairingTimeout ?? 300000,
            maxPairingAttempts: config?.maxPairingAttempts ?? 3
        });
        await pairingManager.init();
        this.logger.info('Pairing manager initialized successfully');
        return pairingManager;
    }
    /**
     * 注册WebSocket事件处理器
     */
    registerWebSocketHandlers() {
        if (!this.webSocketServer)
            return;
        // 注册连接处理器
        this.webSocketServer.on('connection', (socket, req) => {
            // Generate ID for socket
            const socketId = Math.random().toString(36).substring(2, 15);
            socket.id = socketId;
            this.handleWebSocketConnection(socket);
            socket.on('message', (data) => {
                try {
                    const parsedData = JSON.parse(data.toString());
                    this.handleWebSocketMessage(socket, parsedData);
                }
                catch (e) {
                    this.logger.error('Failed to parse WebSocket message', { error: e });
                }
            });
            socket.on('close', () => {
                this.logger.debug('WebSocket connection closed', { socketId });
                this.activeSessions.delete(socketId);
            });
        });
        this.logger.debug('WebSocket handlers registered');
    }
    /**
     * 处理WebSocket连接
     */
    async handleWebSocketConnection(socket) {
        try {
            // 创建新会话
            const socketId = socket.id;
            const session = await this.sessionManager.createSession(socketId);
            socket.sessionId = session.sessionId;
            this.activeSessions.set(session.sessionId, { session, socket });
            this.logger.debug('New WebSocket connection established', {
                sessionId: session.sessionId,
                socketId: socketId
            });
            // 发送欢迎消息
            await this.sendWelcomeMessage(session);
        }
        catch (error) {
            this.logger.error('Failed to handle WebSocket connection', {
                error: error.message,
                socketId: socket.id
            });
            socket.close();
        }
    }
    /**
     * 处理WebSocket消息
     */
    async handleWebSocketMessage(socket, data) {
        try {
            const sessionId = socket.sessionId;
            const activeSession = this.activeSessions.get(sessionId);
            if (!activeSession) {
                throw new interfaces_1.ChannelError('Session not found', 'SESSION_NOT_FOUND');
            }
            const { session } = activeSession;
            // 更新会话活动时间
            await this.sessionManager.updateSessionActivity(session.sessionId);
            const messageText = data.message ?? data.content?.text ?? '';
            // 转换为标准化消息
            const inboundMessage = await this.convertToInboundMessage({
                sessionId: session.sessionId,
                message: messageText,
                userAgent: data.userAgent || 'unknown',
                ipAddress: data.ipAddress || 'unknown',
                ...data
            });
            // 触发消息接收
            this.triggerMessage(inboundMessage);
            this.logger.debug('WebSocket message processed', {
                sessionId: session.sessionId,
                messageLength: messageText?.length || 0
            });
        }
        catch (error) {
            this.logger.error('Failed to handle WebSocket message', {
                error: error.message,
                socketId: socket.id,
                data
            });
        }
    }
    /**
     * 发送欢迎消息
     */
    async sendWelcomeMessage(session) {
        const welcomeMessage = {
            channel: 'web',
            accountId: this.config.config.accountId || 'default',
            peerId: session.sessionId,
            content: {
                text: `欢迎使用HexaCore Web Widget! 您的会话ID是: ${session.sessionId}`,
                type: 'text'
            }
        };
        await this.onSend(welcomeMessage);
    }
    /**
     * 将Web原始消息转换为InboundMessage
     */
    async convertToInboundMessage(raw) {
        const session = await this.sessionManager.getSession(raw.sessionId);
        const metadata = {
            sessionId: session.sessionId,
            widgetVersion: this.config.config.widgetVersion,
            pageUrl: raw.location?.pageUrl || 'unknown',
            pageTitle: raw.location?.pageTitle || 'unknown',
            scrollPosition: raw.location?.scrollPosition,
            timeOnPage: raw.location?.timeOnPage,
            interactions: raw.location?.interactions
        };
        const rawCommon = raw?.metadata?.common || {};
        const rawAgentId = rawCommon?.agentId ?? raw?.metadata?.targetAgentId;
        return {
            id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            channel: 'web',
            accountId: session.accountId,
            peer: {
                kind: session.userId ? 'authenticated' : 'anonymous',
                id: session.userId || session.sessionId,
                metadata: {
                    sessionId: session.sessionId,
                    userAgent: raw.userAgent,
                    ipAddress: raw.ipAddress,
                    location: raw.location,
                    browser: raw.browser,
                    os: raw.os,
                    device: raw.device,
                    screenResolution: raw.location?.screenResolution,
                    timezone: raw.location?.timezone,
                    language: raw.location?.language,
                    referrer: raw.location?.referrer,
                    utmSource: raw.location?.utmSource,
                    utmMedium: raw.location?.utmMedium,
                    utmCampaign: raw.location?.utmCampaign
                }
            },
            content: {
                text: raw.message,
                type: this.getContentType(raw),
                attachments: raw.attachments || [],
                typingIndicator: raw.typingIndicator,
                readReceipt: raw.readReceipt
            },
            timestamp: Date.now(),
            metadata: {
                web: metadata,
                common: {
                    ...rawCommon,
                    agentId: rawAgentId,
                    sessionId: rawCommon?.sessionId ?? session.sessionId
                }
            }
        };
    }
    /**
     * 将标准化消息内容转换为Web消息格式
     */
    convertToWebMessage(message) {
        return {
            type: 'message',
            data: {
                content: message.content.text || '',
                contentType: message.content.type,
                attachments: message.content.attachments || [],
                timestamp: Date.now(),
                metadata: message.metadata
            }
        };
    }
    // 工具方法
    getContentType(raw) {
        if (raw.attachments && raw.attachments.length > 0) {
            const firstAttachment = raw.attachments[0];
            if (firstAttachment.type === 'image')
                return 'image';
            if (firstAttachment.type === 'video')
                return 'video';
            if (firstAttachment.type === 'audio')
                return 'audio';
            return 'file';
        }
        return 'text';
    }
}
exports.WebAdapter = WebAdapter;
/**
 * 会话管理器
 */
class WebSessionManager {
    config;
    isRunning = false;
    constructor(config) {
        this.config = config;
    }
    async start() {
        this.isRunning = true;
        // 模拟启动会话管理器
    }
    async createSession(socketId) {
        return {
            sessionId: `web_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            accountId: 'default',
            userAgent: 'unknown',
            ipAddress: 'unknown',
            createdAt: Date.now(),
            lastActivity: Date.now()
        };
    }
    async getSession(sessionId) {
        // 简化实现
        return {
            sessionId,
            accountId: 'default',
            userAgent: 'unknown',
            ipAddress: 'unknown',
            createdAt: Date.now(),
            lastActivity: Date.now()
        };
    }
    async updateSessionActivity(sessionId) {
        // 模拟更新会话活动时间
    }
    async cleanup() {
        // 模拟清理过期会话
    }
}
/**
 * Widget渲染器
 */
class WidgetRenderer {
    config;
    constructor(config) {
        this.config = config;
    }
    async init() {
        // 模拟初始化Widget渲染器
    }
}
/**
 * 配对管理器
 */
class PairingManager {
    config;
    constructor(config) {
        this.config = config;
    }
    async init() {
        // 模拟初始化配对管理器
    }
    async checkPairingStatus(userId) {
        // 简化实现
        return 'paired';
    }
}
//# sourceMappingURL=web-adapter.js.map