/**
 * 沙箱管理器
 * 六元组架构中的安全隔离与权限控制核心模块
 * 基于HexaCore安全模型 v2.0
 */
import { SandboxMode, SecurityContext, ContainerInstance, ToolPolicy, FilterResult, SandboxConfig } from './types';
export declare class SandboxManager {
    private config;
    private dockerManager;
    private toolFilter;
    private elevationManager;
    private auditLogger;
    private activeContainers;
    private containerSessions;
    private sessionContainers;
    constructor(config: SandboxConfig);
    /**
     * 初始化所有组件
     */
    private initializeComponents;
    /**
     * 创建沙箱环境
     */
    createSandbox(agentId: string, sessionKey: string, mode?: SandboxMode): Promise<ContainerInstance>;
    /**
     * 检查工具权限
     */
    checkToolPermission(toolName: string, context: SecurityContext, options?: {
        skipElevation?: boolean;
        requestElevationIfRequired?: boolean;
    }): Promise<{
        allowed: boolean;
        reason: string;
        requiresElevation: boolean;
        elevationRequestId?: string;
        filterResult?: FilterResult;
    }>;
    /**
     * 在沙箱中执行命令
     */
    executeInSandbox(containerId: string, command: string[], context: SecurityContext): Promise<{
        stdout: string;
        stderr: string;
        exitCode: number;
    }>;
    /**
     * 停止并清理沙箱
     */
    destroySandbox(containerId: string, reason?: string): Promise<void>;
    /**
     * 获取Agent的所有容器
     */
    getAgentContainers(agentId: string): ContainerInstance[];
    /**
     * 获取会话的容器
     */
    getSessionContainer(sessionKey: string): ContainerInstance | undefined;
    /**
     * 获取所有活跃容器
     */
    getAllActiveContainers(): ContainerInstance[];
    /**
     * 更新工具策略
     */
    updateToolPolicies(policies: ToolPolicy[]): void;
    /**
     * 更新沙箱配置
     */
    updateConfig(newConfig: Partial<SandboxConfig>): void;
    /**
     * 获取审计日志
     */
    getAuditLogs(filters: any, limit?: number): Promise<any[]>;
    /**
     * 获取事件统计
     */
    getEventStats(timeRangeHours?: number): Promise<any>;
    /**
     * 健康检查
     */
    healthCheck(): Promise<{
        docker: boolean;
        auditLogger: boolean;
        toolFilter: boolean;
        elevationManager: boolean;
    }>;
    /**
     * 私有方法
     */
    /**
     * 根据沙箱模式创建容器配置
     */
    private createContainerConfig;
    /**
     * 根据工具风险等级确定所需的沙箱模式
     */
    private getRequiredSandboxMode;
}
