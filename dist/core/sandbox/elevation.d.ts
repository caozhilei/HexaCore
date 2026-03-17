/**
 * 权限提升管理器
 * 实现基于发送者的权限提升机制，支持白名单自动授权和审批流程
 */
import { ElevationRequest, ElevationApproval, SecurityContext } from './types';
export interface ElevationConfig {
    enabled: boolean;
    approvalFlows: {
        immediate: {
            timeout: number;
            approvers: string[];
        };
        delayed: {
            timeout: number;
            approvers: string[];
            quorum: number;
        };
    };
    whitelist: {
        users: string[];
        tools: string[];
        expiry: number;
    };
}
export interface ApprovalDecision {
    approverId: string;
    approved: boolean;
    reason?: string;
    timestamp: string;
}
export declare class ElevationManager {
    private config;
    private pendingRequests;
    private approvals;
    private whitelistCache;
    constructor(config: ElevationConfig);
    /**
     * 请求权限提升
     */
    requestElevation(request: Omit<ElevationRequest, 'id' | 'requestedAt'>, context: SecurityContext): Promise<{
        approved: boolean;
        reason: string;
        approvalId?: string;
        expiresAt?: string;
    }>;
    /**
     * 审批请求（模拟审批人操作）
     */
    approveRequest(approvalId: string, approverId: string, approved: boolean, reason?: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * 获取待审批请求列表
     */
    getPendingRequests(): ElevationRequest[];
    /**
     * 获取请求的审批历史
     */
    getRequestHistory(requestId: string): ElevationApproval[];
    /**
     * 更新配置
     */
    updateConfig(config: Partial<ElevationConfig>): void;
    /**
     * 添加用户到白名单
     */
    addToWhitelist(userId: string, expirySeconds?: number): void;
    /**
     * 从白名单移除用户
     */
    removeFromWhitelist(userId: string): void;
    /**
     * 检查用户是否在白名单中
     */
    isWhitelisted(userId: string): boolean;
    /**
     * 私有方法
     */
    private checkWhitelist;
    private determineFlowType;
    private startApprovalFlow;
    private waitForApproval;
    private recordApproval;
    private triggerApprovalResult;
    private calculateExpiryTime;
    private getApproverRole;
    private initializeWhitelistCache;
    private delay;
}
