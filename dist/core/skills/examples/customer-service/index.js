"use strict";
/**
 * 客服应答技能实现
 * 支持多轮对话、意图识别和工单管理
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerServiceSkill = void 0;
exports.default = createSkill;
const framework_1 = require("../../framework");
const axios_1 = __importDefault(require("axios"));
/**
 * 客服应答技能
 */
class CustomerServiceSkill extends framework_1.SkillBase {
    knowledgeBaseUrl;
    ticketSystemApiKey;
    sessionCache = new Map();
    /**
     * 构造函数
     */
    constructor() {
        super('customer-service', '1.0.0', '智能客服应答技能，支持多轮对话、意图识别和工单管理');
        // 获取配置
        this.knowledgeBaseUrl = process.env.KNOWLEDGE_BASE_URL || 'http://localhost:8000/api/knowledge';
        this.ticketSystemApiKey = process.env.TICKET_SYSTEM_API_KEY || '';
        if (!this.knowledgeBaseUrl) {
            console.warn('KNOWLEDGE_BASE_URL环境变量未设置，知识库功能将受限');
        }
    }
    /**
     * 技能初始化
     */
    async initialize() {
        console.log('客服应答技能初始化完成');
    }
    /**
     * 执行客服应答
     */
    async execute(input) {
        const startTime = Date.now();
        try {
            const { message, session_history = [] } = input.parameters;
            // 验证参数
            if (!message || message.trim().length === 0) {
                return this.createErrorResponse('用户消息不能为空');
            }
            // 生成会话ID
            const sessionId = this.generateSessionId(input.metadata.callerAgentId);
            // 识别意图
            const intentResult = await this.identifyIntent(message, session_history);
            // 根据意图生成响应
            let response;
            let actions = [];
            switch (intentResult.intent) {
                case 'faq_query':
                    const faqResult = await this.handleFaqQuery(message, sessionId);
                    response = faqResult.response;
                    if (faqResult.related_questions.length > 0) {
                        actions.push({
                            type: 'knowledge_search',
                            data: { queries: faqResult.related_questions },
                            priority: 'low',
                        });
                    }
                    break;
                case 'order_status':
                    const orderResult = await this.handleOrderStatus(message, sessionId);
                    response = orderResult.response;
                    if (orderResult.needs_ticket) {
                        actions.push({
                            type: 'ticket_create',
                            data: { issue: message, priority: 'medium' },
                            priority: 'medium',
                        });
                    }
                    break;
                case 'ticket_create':
                    const ticketResult = await this.handleTicketCreation(message, sessionId);
                    response = ticketResult.response;
                    actions.push({
                        type: 'ticket_create',
                        data: ticketResult.ticket_data,
                        priority: 'high',
                    });
                    break;
                case 'ticket_status':
                    const statusResult = await this.handleTicketStatus(message);
                    response = statusResult.response;
                    break;
                case 'escalation_request':
                    const escalationResult = await this.handleEscalationRequest(message);
                    response = escalationResult.response;
                    actions.push({
                        type: 'escalate',
                        data: escalationResult.escalation_data,
                        priority: 'urgent',
                    });
                    break;
                default:
                    response = await this.handleGeneralQuery(message);
            }
            // 更新会话缓存
            await this.updateSessionCache(sessionId, {
                message,
                response,
                intent: intentResult.intent,
                timestamp: new Date().toISOString(),
            });
            // 构建结果
            const result = {
                response,
                actions,
                metadata: {
                    intent: intentResult.intent,
                    confidence: intentResult.confidence,
                    processing_time: Date.now() - startTime,
                    session_id: sessionId,
                },
            };
            return this.createSuccessResponse(result, {
                processingTime: Date.now() - startTime,
                cacheable: true,
                ttl: 300, // 5分钟会话缓存
            });
        }
        catch (error) {
            return this.createErrorResponse(`客服应答失败: ${error.message}`, { processingTime: Date.now() - startTime });
        }
    }
    /**
     * 生成会话ID
     */
    generateSessionId(callerAgentId) {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `session_${callerAgentId}_${timestamp}_${random}`;
    }
    /**
     * 识别意图
     */
    async identifyIntent(message, sessionHistory) {
        // 基于规则和关键词的意图识别
        const lowerMessage = message.toLowerCase();
        // 规则匹配
        const rules = [
            {
                keywords: ['如何', '怎么', '怎样', '步骤', '教程'],
                intent: 'faq_query',
                confidence: 0.85,
            },
            {
                keywords: ['订单', '物流', '发货', '配送', '快递'],
                intent: 'order_status',
                confidence: 0.9,
            },
            {
                keywords: ['问题', '故障', '错误', 'bug', '无法'],
                intent: 'ticket_create',
                confidence: 0.92,
            },
            {
                keywords: ['状态', '进度', '查询', '查看', '跟踪'],
                intent: 'ticket_status',
                confidence: 0.8,
            },
            {
                keywords: ['投诉', '举报', '紧急', '加急', '马上'],
                intent: 'escalation_request',
                confidence: 0.95,
            },
        ];
        // 查找匹配的规则
        for (const rule of rules) {
            if (rule.keywords.some(keyword => lowerMessage.includes(keyword))) {
                return {
                    intent: rule.intent,
                    confidence: rule.confidence,
                };
            }
        }
        // 默认意图
        return {
            intent: 'general_query',
            confidence: 0.7,
        };
    }
    /**
     * 处理常见问题查询
     */
    async handleFaqQuery(message, sessionId) {
        let response;
        let relatedQuestions = [];
        try {
            // 查询知识库
            const knowledgeResult = await this.searchKnowledgeBase(message);
            if (knowledgeResult.answers.length > 0) {
                response = knowledgeResult.answers[0].content;
                relatedQuestions = knowledgeResult.related_questions;
            }
            else {
                response = '感谢您的提问。我已经记录了您的问题，稍后会有专员为您详细解答。';
            }
        }
        catch (error) {
            console.warn('知识库查询失败:', error.message);
            response = this.getDefaultFaqResponse(message);
        }
        return { response, related_questions: relatedQuestions };
    }
    /**
     * 搜索知识库
     */
    async searchKnowledgeBase(query) {
        try {
            const response = await axios_1.default.post(this.knowledgeBaseUrl, {
                query,
                limit: 5,
            });
            return response.data;
        }
        catch (error) {
            // 返回模拟数据
            return {
                answers: [
                    {
                        id: 'faq_001',
                        content: '常见问题解答：系统使用说明请参考用户手册第3章。',
                        score: 0.85,
                    },
                ],
                related_questions: ['如何注册账号？', '如何修改密码？', '如何联系客服？'],
            };
        }
    }
    /**
     * 处理订单状态查询
     */
    async handleOrderStatus(message, sessionId) {
        // 提取订单号（模拟）
        const orderMatch = message.match(/订单[：:]\s*([A-Z0-9]+)/i) ||
            message.match(/#([A-Z0-9]+)/i) ||
            message.match(/订单号\s*([A-Z0-9]+)/i);
        const orderNumber = orderMatch ? orderMatch[1] : 'ORD' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
        // 模拟订单状态
        const statuses = ['已确认', '备货中', '已发货', '运输中', '已送达'];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        let response;
        let needsTicket = false;
        if (status === '已送达') {
            response = `您的订单 #${orderNumber} 已于今天上午10点送达，签收人：本人。感谢您的惠顾！`;
        }
        else if (status === '已发货') {
            const carriers = ['顺丰', '圆通', '中通', '韵达'];
            const carrier = carriers[Math.floor(Math.random() * carriers.length)];
            response = `您的订单 #${orderNumber} 已于昨天下午发货，承运快递：${carrier}，物流单号：SF${Math.floor(Math.random() * 10000000000).toString().padStart(11, '0')}。`;
        }
        else if (status === '运输中') {
            response = `您的订单 #${orderNumber} 正在运输途中，预计明天下午4点前送达。`;
        }
        else {
            response = `您的订单 #${orderNumber} 当前状态：${status}，预计24小时内发货。`;
            needsTicket = Math.random() > 0.5; // 模拟可能需要创建工单的情况
        }
        return { response, needs_ticket: needsTicket };
    }
    /**
     * 处理工单创建
     */
    async handleTicketCreation(message, sessionId) {
        // 模拟工单创建
        const ticketId = 'TICKET_' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
        const ticketData = {
            id: ticketId,
            subject: message.substring(0, 50),
            priority: 'high',
            created_at: new Date().toISOString(),
            status: '待处理',
            assigned_to: '技术支持团队',
        };
        const response = `已为您创建工单 #${ticketId}，技术支持团队将在2小时内联系您处理。您可以通过工单号查询处理进度。`;
        return { response, ticket_data: ticketData };
    }
    /**
     * 处理工单状态查询
     */
    async handleTicketStatus(message) {
        // 模拟工单状态
        const statuses = [
            { status: '待处理', response: '工单已接收，等待技术支持处理。' },
            { status: '处理中', response: '工单正在处理中，工程师已联系用户。' },
            { status: '已解决', response: '工单已解决，问题已修复。' },
            { status: '已关闭', response: '工单已关闭，用户确认问题解决。' },
        ];
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
        return { response: `工单状态：${randomStatus.status}。${randomStatus.response}` };
    }
    /**
     * 处理升级请求
     */
    async handleEscalationRequest(message) {
        const escalationData = {
            level: '紧急',
            reason: message,
            escalation_time: new Date().toISOString(),
            handler: '高级技术支持',
            expected_response_time: '30分钟内',
        };
        const response = '已收到您的紧急请求，问题已升级至高级技术支持团队，他们将尽快联系您处理。';
        return { response, escalation_data: escalationData };
    }
    /**
     * 处理一般查询
     */
    async handleGeneralQuery(message) {
        // 使用AI生成响应或返回默认响应
        const defaultResponses = [
            '我明白了，请提供更多细节以便我更好地帮助您。',
            '感谢您的咨询，我将为您查找相关信息。',
            '这个问题我需要进一步了解，请您详细描述一下具体情况。',
            '我已记录您的问题，稍后会有专员为您解答。',
        ];
        return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
    }
    /**
     * 获取默认FAQ响应
     */
    getDefaultFaqResponse(message) {
        const faqResponses = {
            '注册': '注册账号请访问官网首页，点击"注册"按钮，按照提示填写信息即可。',
            '登录': '登录请使用注册时的用户名和密码，如忘记密码可点击"忘记密码"重置。',
            '支付': '我们支持支付宝、微信支付、银联等多种支付方式。',
            '退款': '退款申请请进入订单详情页，点击"申请退款"按照流程操作。',
            '客服': '客服工作时间：周一至周五9:00-18:00，节假日除外。',
        };
        for (const [keyword, response] of Object.entries(faqResponses)) {
            if (message.includes(keyword)) {
                return response;
            }
        }
        return '感谢您的提问。我已经记录了您的问题，稍后会有专员为您详细解答。';
    }
    /**
     * 更新会话缓存
     */
    async updateSessionCache(sessionId, data) {
        // 简化实现，实际应使用Redis等缓存
        const existingData = this.sessionCache.get(sessionId) || { history: [] };
        existingData.history.push(data);
        existingData.last_updated = Date.now();
        this.sessionCache.set(sessionId, existingData);
        // 限制缓存大小
        if (this.sessionCache.size > 1000) {
            const oldestKey = Array.from(this.sessionCache.keys())[0];
            this.sessionCache.delete(oldestKey);
        }
    }
    /**
     * 技能清理
     */
    async cleanup() {
        console.log('客服应答技能清理完成');
    }
}
exports.CustomerServiceSkill = CustomerServiceSkill;
/**
 * 导出工厂函数
 */
function createSkill() {
    return new CustomerServiceSkill();
}
//# sourceMappingURL=index.js.map