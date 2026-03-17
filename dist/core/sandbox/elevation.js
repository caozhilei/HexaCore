"use strict";
/**
 * 权限提升管理器
 * 实现基于发送者的权限提升机制，支持白名单自动授权和审批流程
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElevationManager = void 0;
class ElevationManager {
    config;
    pendingRequests = new Map();
    approvals = new Map();
    whitelistCache = new Map();
    constructor(config) {
        this.config = config;
        this.initializeWhitelistCache();
    }
    /**
     * 请求权限提升
     */
    async requestElevation(request, context) {
        if (!this.config.enabled) {
            return { approved: false, reason: 'elevation_disabled' };
        }
        const fullRequest = {
            ...request,
            id: `elevation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            requestedAt: new Date().toISOString(),
        };
        // 1. 检查白名单
        const whitelistCheck = await this.checkWhitelist(fullRequest, context);
        if (whitelistCheck.approved) {
            await this.recordApproval(fullRequest, {
                approverId: 'system',
                approved: true,
                reason: 'whitelisted',
                timestamp: new Date().toISOString(),
            });
            return {
                approved: true,
                reason: 'whitelisted',
                approvalId: whitelistCheck.approvalId,
                expiresAt: whitelistCheck.expiresAt,
            };
        }
        // 2. 根据风险等级选择审批流程
        const flowType = this.determineFlowType(request.tool.riskLevel);
        const flowConfig = this.config.approvalFlows[flowType];
        // 3. 启动审批流程
        const approvalId = await this.startApprovalFlow(fullRequest, flowConfig, context);
        this.pendingRequests.set(approvalId, fullRequest);
        // 4. 等待审批结果
        const result = await this.waitForApproval(approvalId, flowConfig.timeout);
        // 5. 清理待处理请求
        this.pendingRequests.delete(approvalId);
        if (result.approved) {
            return {
                approved: true,
                reason: result.reason || 'approved_by_human',
                approvalId,
                expiresAt: result.expiresAt,
            };
        }
        else {
            return {
                approved: false,
                reason: result.reason || 'rejected_or_timeout',
                approvalId,
            };
        }
    }
    /**
     * 审批请求（模拟审批人操作）
     */
    async approveRequest(approvalId, approverId, approved, reason) {
        const request = this.pendingRequests.get(approvalId);
        if (!request) {
            return { success: false, message: 'Approval request not found or already processed' };
        }
        // 检查审批人是否在授权列表中
        const flowType = this.determineFlowType(request.tool.riskLevel);
        const approvers = this.config.approvalFlows[flowType].approvers;
        if (!approvers.includes(approverId) && !approvers.includes('all')) {
            return { success: false, message: 'Approver not authorized for this request' };
        }
        const decision = {
            approverId,
            approved,
            reason,
            timestamp: new Date().toISOString(),
        };
        await this.recordApproval(request, decision);
        // 触发等待中的promise（在实际实现中，这里会使用事件或回调）
        this.triggerApprovalResult(approvalId, {
            approved,
            reason,
            expiresAt: this.calculateExpiryTime(approved ? 3600 : 0), // 批准则1小时有效期
        });
        return {
            success: true,
            message: `Request ${approved ? 'approved' : 'rejected'} successfully`,
        };
    }
    /**
     * 获取待审批请求列表
     */
    getPendingRequests() {
        return Array.from(this.pendingRequests.values());
    }
    /**
     * 获取请求的审批历史
     */
    getRequestHistory(requestId) {
        return this.approvals.get(requestId) || [];
    }
    /**
     * 更新配置
     */
    updateConfig(config) {
        this.config = { ...this.config, ...config };
        this.initializeWhitelistCache();
    }
    /**
     * 添加用户到白名单
     */
    addToWhitelist(userId, expirySeconds) {
        const expiry = expirySeconds || this.config.whitelist.expiry;
        this.whitelistCache.set(userId, {
            expiry: Date.now() + expiry * 1000,
        });
    }
    /**
     * 从白名单移除用户
     */
    removeFromWhitelist(userId) {
        this.whitelistCache.delete(userId);
    }
    /**
     * 检查用户是否在白名单中
     */
    isWhitelisted(userId) {
        const entry = this.whitelistCache.get(userId);
        if (!entry)
            return false;
        if (entry.expiry < Date.now()) {
            this.whitelistCache.delete(userId);
            return false;
        }
        return true;
    }
    /**
     * 私有方法
     */
    async checkWhitelist(request, context) {
        // 检查用户白名单
        if (context.userId && this.isWhitelisted(context.userId)) {
            const approvalId = `auto-${request.id}`;
            const expiresAt = new Date(Date.now() + this.config.whitelist.expiry * 1000).toISOString();
            return { approved: true, approvalId, expiresAt };
        }
        // 检查Agent白名单
        if (this.isWhitelisted(context.agentId)) {
            const approvalId = `auto-${request.id}`;
            const expiresAt = new Date(Date.now() + this.config.whitelist.expiry * 1000).toISOString();
            return { approved: true, approvalId, expiresAt };
        }
        // 检查工具白名单
        if (this.config.whitelist.tools.includes(request.tool.name)) {
            const approvalId = `auto-${request.id}`;
            const expiresAt = new Date(Date.now() + this.config.whitelist.expiry * 1000).toISOString();
            return { approved: true, approvalId, expiresAt };
        }
        return { approved: false };
    }
    determineFlowType(riskLevel) {
        switch (riskLevel) {
            case 'critical':
            case 'high':
                return 'delayed';
            case 'medium':
            case 'low':
            default:
                return 'immediate';
        }
    }
    async startApprovalFlow(request, flowConfig, context) {
        const approvalId = `approval-${request.id}`;
        // 在实际实现中，这里会：
        // 1. 创建审批记录
        // 2. 发送通知给审批人
        // 3. 记录审计日志
        console.log(`[ElevationManager] Started approval flow ${approvalId} for tool ${request.tool.name}`);
        console.log(`[ElevationManager] Approvers: ${flowConfig.approvers.join(', ')}`);
        console.log(`[ElevationManager] Timeout: ${flowConfig.timeout} seconds`);
        return approvalId;
    }
    async waitForApproval(approvalId, timeoutSeconds) {
        // 模拟等待审批结果
        // 在实际实现中，这里会使用事件监听或轮询检查审批状态
        console.log(`[ElevationManager] Waiting for approval decision (timeout: ${timeoutSeconds}s)`);
        // 模拟延迟
        await this.delay(100);
        // 模拟审批结果（在实际系统中，这里会返回实际审批结果）
        // 为了测试目的，我们模拟一个批准结果
        const shouldApprove = Math.random() > 0.3; // 70%批准率
        if (shouldApprove) {
            return {
                approved: true,
                reason: 'approved_by_simulated_approver',
                expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(), // 1小时后过期
            };
        }
        else {
            return {
                approved: false,
                reason: 'rejected_by_simulated_approver',
            };
        }
    }
    async recordApproval(request, decision) {
        const approval = {
            id: `approval-record-${Date.now()}`,
            requestId: request.id,
            approved: decision.approved,
            approver: {
                userId: decision.approverId,
                role: this.getApproverRole(decision.approverId),
            },
            reason: decision.reason,
            approvedAt: decision.timestamp,
            expiresAt: decision.approved
                ? new Date(Date.now() + 3600 * 1000).toISOString() // 批准后1小时过期
                : new Date(Date.now()).toISOString(),
            auditId: `audit-${Date.now()}`,
        };
        const existing = this.approvals.get(request.id) || [];
        existing.push(approval);
        this.approvals.set(request.id, existing);
        console.log(`[ElevationManager] Recorded approval decision for request ${request.id}: ${decision.approved ? 'APPROVED' : 'REJECTED'}`);
    }
    triggerApprovalResult(approvalId, result) {
        // 在实际实现中，这里会触发事件或解析等待的promise
        console.log(`[ElevationManager] Approval result triggered for ${approvalId}:`, result);
    }
    calculateExpiryTime(ttlSeconds) {
        return new Date(Date.now() + ttlSeconds * 1000).toISOString();
    }
    getApproverRole(approverId) {
        // 简单的角色映射
        if (approverId.includes('admin'))
            return 'administrator';
        if (approverId.includes('manager'))
            return 'manager';
        if (approverId.includes('system'))
            return 'system';
        return 'reviewer';
    }
    initializeWhitelistCache() {
        // 初始化时添加配置中的白名单用户
        this.whitelistCache.clear();
        this.config.whitelist.users.forEach(userId => {
            this.addToWhitelist(userId, this.config.whitelist.expiry);
        });
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.ElevationManager = ElevationManager;
//# sourceMappingURL=elevation.js.map