/**
 * 沙箱层类型定义
 * 基于HexaCore安全模型 v2.0
 */
/**
 * 沙箱模式
 */
export type SandboxMode = 'off' | 'non-main' | 'all';
/**
 * 工具风险等级
 */
export type ToolRiskLevel = 'low' | 'medium' | 'high' | 'critical';
/**
 * 工具权限操作结果
 */
export type PermissionAction = 'allow' | 'deny' | 'require_approval';
/**
 * 权限提升请求
 */
export interface ElevationRequest {
    id: string;
    requester: {
        agentId: string;
        sessionKey: string;
        userId?: string;
        trustLevel: number;
    };
    tool: {
        name: string;
        riskLevel: ToolRiskLevel;
        description: string;
    };
    context: {
        sandboxMode: SandboxMode;
        timestamp: string;
        resource: string;
    };
    reason?: string;
    requestedAt: string;
}
/**
 * 权限提升审批结果
 */
export interface ElevationApproval {
    id: string;
    requestId: string;
    approved: boolean;
    approver: {
        userId: string;
        role: string;
    };
    reason?: string;
    approvedAt: string;
    expiresAt: string;
    auditId: string;
}
/**
 * 安全上下文
 */
export interface SecurityContext {
    agentId: string;
    sessionKey: string;
    sandboxMode: SandboxMode;
    trustLevel: number;
    userRole?: string;
    sourceIp?: string;
    channel?: string;
    capabilities: string[];
}
/**
 * 工具策略配置
 */
export interface ToolPolicy {
    toolName: string;
    riskLevel: ToolRiskLevel;
    allowedInModes: SandboxMode[];
    allowedAgents?: string[];
    requiresApproval: boolean;
    approvalTimeout?: number;
    whitelist?: string[];
    auditLevel: 'low' | 'medium' | 'high';
}
/**
 * 沙箱配置
 */
export interface SandboxConfig {
    defaultMode: SandboxMode;
    docker: {
        socketPath: string;
        apiVersion: string;
        timeout: number;
    };
    toolPolicies: ToolPolicy[];
    elevation: {
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
    };
    monitoring: {
        containerMetrics: boolean;
        securityEvents: boolean;
        auditLogging: boolean;
    };
}
/**
 * 容器配置
 */
export interface ContainerConfig {
    image: string;
    command?: string[];
    env: Record<string, string>;
    network: string;
    memoryLimit: string;
    cpuQuota: number;
    readOnlyRootFs: boolean;
    capabilities: string[];
    volumes?: {
        hostPath: string;
        containerPath: string;
        readonly: boolean;
    }[];
}
/**
 * 容器实例
 */
export interface ContainerInstance {
    id: string;
    agentId: string;
    sessionKey: string;
    sandboxMode: SandboxMode;
    config: ContainerConfig;
    status: 'creating' | 'running' | 'stopped' | 'failed';
    createdAt: string;
    startedAt?: string;
    stoppedAt?: string;
    exitCode?: number;
    metrics?: ContainerMetrics;
}
/**
 * 容器性能指标
 */
export interface ContainerMetrics {
    cpuUsage: number;
    memoryUsage: number;
    memoryLimit: number;
    networkRx: number;
    networkTx: number;
    diskRead: number;
    diskWrite: number;
    timestamp: string;
}
/**
 * 审计事件
 */
export interface AuditEvent {
    id: string;
    timestamp: string;
    eventType: 'container_created' | 'container_destroyed' | 'tool_permission_check' | 'elevation_requested' | 'elevation_approved' | 'elevation_denied' | 'policy_violation' | 'anomaly_detected' | 'security_alert';
    agentId?: string;
    sessionKey?: string;
    toolName?: string;
    action: string;
    reason?: string;
    details?: Record<string, any>;
    securityContext?: Partial<SecurityContext>;
    auditId: string;
}
/**
 * 工具权限过滤链结果
 */
export interface FilterResult {
    action: PermissionAction;
    reason: string;
    filterName: string;
    metadata?: Record<string, any>;
}
/**
 * Docker管理器接口
 */
export interface DockerManager {
    createContainer(config: ContainerConfig): Promise<ContainerInstance>;
    startContainer(containerId: string): Promise<void>;
    stopContainer(containerId: string): Promise<void>;
    removeContainer(containerId: string): Promise<void>;
    execInContainer(containerId: string, command: string[]): Promise<{
        stdout: string;
        stderr: string;
        exitCode: number;
    }>;
    getContainerStats(containerId: string): Promise<ContainerMetrics>;
    listContainers(): Promise<ContainerInstance[]>;
    healthCheck(): Promise<boolean>;
}
