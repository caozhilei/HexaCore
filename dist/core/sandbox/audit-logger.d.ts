/**
 * 审计日志器
 * 记录所有安全相关操作，确保完整的安全追溯能力
 */
import { AuditEvent, SecurityContext, SandboxMode, ToolRiskLevel } from './types';
export interface AuditLoggerConfig {
    enabled: boolean;
    logLevel: 'low' | 'medium' | 'high';
    storage: {
        type: 'file' | 'database' | 'console';
        path?: string;
        maxEntries?: number;
        rotationInterval?: number;
    };
    alerting: {
        enabled: boolean;
        criticalEvents: string[];
        alertChannels: string[];
    };
}
export declare class AuditLogger {
    private config;
    private events;
    private eventCallbacks;
    constructor(config: AuditLoggerConfig);
    /**
     * 记录容器创建事件
     */
    logContainerCreated(containerId: string, agentId: string, sessionKey: string, sandboxMode: SandboxMode, config: any): Promise<void>;
    /**
     * 记录容器销毁事件
     */
    logContainerDestroyed(containerId: string, agentId: string, sessionKey: string, reason: string): Promise<void>;
    /**
     * 记录工具权限检查事件
     */
    logToolPermissionCheck(toolName: string, context: SecurityContext, result: {
        action: string;
        reason: string;
    }, metadata?: Record<string, any>): Promise<void>;
    /**
     * 记录权限提升请求事件
     */
    logElevationRequested(requestId: string, requester: {
        agentId: string;
        sessionKey: string;
        userId?: string;
    }, toolName: string, riskLevel: ToolRiskLevel, reason?: string): Promise<void>;
    /**
     * 记录权限提升批准事件
     */
    logElevationApproved(requestId: string, approverId: string, expiresAt: string, reason?: string): Promise<void>;
    /**
     * 记录权限提升拒绝事件
     */
    logElevationDenied(requestId: string, approverId: string, reason?: string): Promise<void>;
    /**
     * 记录策略违反事件
     */
    logPolicyViolation(violationType: string, context: SecurityContext, details: Record<string, any>): Promise<void>;
    /**
     * 记录异常检测事件
     */
    logAnomalyDetected(anomalyType: string, context: SecurityContext, severity: 'low' | 'medium' | 'high' | 'critical', details: Record<string, any>): Promise<void>;
    /**
     * 记录安全警报事件
     */
    logSecurityAlert(alertType: string, message: string, context?: Partial<SecurityContext>, details?: Record<string, any>): Promise<void>;
    /**
     * 查询审计事件
     */
    queryEvents(filters: {
        eventType?: string | string[];
        agentId?: string;
        sessionKey?: string;
        toolName?: string;
        startTime?: string;
        endTime?: string;
        action?: string;
    }, limit?: number): Promise<AuditEvent[]>;
    /**
     * 获取事件统计信息
     */
    getEventStats(timeRangeHours?: number): Promise<{
        totalEvents: number;
        eventsByType: Record<string, number>;
        eventsBySeverity: Record<string, number>;
        recentAlerts: number;
    }>;
    /**
     * 注册事件回调
     */
    on(eventType: string, callback: (event: AuditEvent) => void): void;
    /**
     * 更新配置
     */
    updateConfig(config: Partial<AuditLoggerConfig>): void;
    /**
     * 私有方法
     */
    private recordEvent;
    private storeToFile;
    private storeToDatabase;
    private storeToConsole;
    private checkAndTriggerAlert;
    private checkAndRotateLogs;
    private triggerCallbacks;
    private generateEventId;
    private generateAuditId;
    private getEventSeverity;
    private initializeStorage;
}
