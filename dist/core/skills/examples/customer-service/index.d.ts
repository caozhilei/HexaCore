/**
 * 客服应答技能实现
 * 支持多轮对话、意图识别和工单管理
 */
import { SkillBase, SkillInput, SkillOutput } from '../../framework';
/**
 * 客服应答参数
 */
interface CustomerServiceParams {
    message: string;
    session_history?: Array<{
        role: 'user' | 'assistant';
        content: string;
        timestamp: string;
    }>;
}
/**
 * 客服动作
 */
interface CustomerAction {
    type: 'knowledge_search' | 'ticket_create' | 'escalate' | 'follow_up';
    data: any;
    priority: 'low' | 'medium' | 'high' | 'urgent';
}
/**
 * 客服应答结果
 */
interface CustomerServiceResult {
    response: string;
    actions: CustomerAction[];
    metadata: {
        intent: string;
        confidence: number;
        processing_time: number;
        session_id?: string;
    };
}
/**
 * 客服应答技能
 */
export declare class CustomerServiceSkill extends SkillBase {
    private knowledgeBaseUrl;
    private ticketSystemApiKey;
    private sessionCache;
    /**
     * 构造函数
     */
    constructor();
    /**
     * 技能初始化
     */
    initialize(): Promise<void>;
    /**
     * 执行客服应答
     */
    execute(input: SkillInput<CustomerServiceParams>): Promise<SkillOutput<CustomerServiceResult>>;
    /**
     * 生成会话ID
     */
    private generateSessionId;
    /**
     * 识别意图
     */
    private identifyIntent;
    /**
     * 处理常见问题查询
     */
    private handleFaqQuery;
    /**
     * 搜索知识库
     */
    private searchKnowledgeBase;
    /**
     * 处理订单状态查询
     */
    private handleOrderStatus;
    /**
     * 处理工单创建
     */
    private handleTicketCreation;
    /**
     * 处理工单状态查询
     */
    private handleTicketStatus;
    /**
     * 处理升级请求
     */
    private handleEscalationRequest;
    /**
     * 处理一般查询
     */
    private handleGeneralQuery;
    /**
     * 获取默认FAQ响应
     */
    private getDefaultFaqResponse;
    /**
     * 更新会话缓存
     */
    private updateSessionCache;
    /**
     * 技能清理
     */
    cleanup(): Promise<void>;
}
/**
 * 导出工厂函数
 */
export default function createSkill(): CustomerServiceSkill;
export {};
