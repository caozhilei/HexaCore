/**
 * 沙箱管理器
 * 六元组架构中的安全隔离与权限控制核心模块
 * 基于HexaCore安全模型 v2.0
 */

import { DockerManagerImpl } from './docker-manager';
import { ToolPermissionFilter } from './tool-filter';
import { ElevationManager, ElevationConfig } from './elevation';
import { AuditLogger, AuditLoggerConfig } from './audit-logger';
import {
  SandboxMode,
  SecurityContext,
  ContainerConfig,
  ContainerInstance,
  ToolPolicy,
  FilterResult,
  SandboxConfig,
  ToolRiskLevel,
} from './types';

export class SandboxManager {
  private config: SandboxConfig;
  private dockerManager: DockerManagerImpl;
  private toolFilter: ToolPermissionFilter;
  private elevationManager: ElevationManager;
  private auditLogger: AuditLogger;
  
  private activeContainers: Map<string, ContainerInstance> = new Map();
  private containerSessions: Map<string, Set<string>> = new Map(); // agentId -> containerIds
  private sessionContainers: Map<string, string> = new Map(); // sessionKey -> containerId

  constructor(config: SandboxConfig) {
    this.config = config;
    this.initializeComponents();
  }

  /**
   * 初始化所有组件
   */
  private initializeComponents(): void {
    // 初始化Docker管理器
    this.dockerManager = new DockerManagerImpl(this.config.docker);

    // 初始化工具权限过滤器
    this.toolFilter = new ToolPermissionFilter(this.config.toolPolicies);

    // 初始化权限提升管理器
    this.elevationManager = new ElevationManager(this.config.elevation);

    // 初始化审计日志器
    const auditConfig: AuditLoggerConfig = {
      enabled: this.config.monitoring.auditLogging,
      logLevel: 'high',
      storage: {
        type: 'console', // 在实际系统中可以是file或database
        maxEntries: 10000,
      },
      alerting: {
        enabled: this.config.monitoring.securityEvents,
        criticalEvents: [
          'policy_violation',
          'security_alert',
          'container_escape',
        ],
        alertChannels: ['console', 'email'],
      },
    };
    this.auditLogger = new AuditLogger(auditConfig);

    console.log('[SandboxManager] Initialized with config:', {
      defaultMode: this.config.defaultMode,
      toolPolicies: this.config.toolPolicies.length,
      elevationEnabled: this.config.elevation.enabled,
    });
  }

  /**
   * 创建沙箱环境
   */
  async createSandbox(
    agentId: string,
    sessionKey: string,
    mode?: SandboxMode
  ): Promise<ContainerInstance> {
    const sandboxMode = mode || this.config.defaultMode;
    
    // 检查是否已有该会话的容器
    const existingContainerId = this.sessionContainers.get(sessionKey);
    if (existingContainerId) {
      const container = this.activeContainers.get(existingContainerId);
      if (container && container.status === 'running') {
        console.log(`[SandboxManager] Session ${sessionKey} already has running container ${existingContainerId}`);
        return container;
      }
    }

    // 根据沙箱模式创建容器配置
    const containerConfig = this.createContainerConfig(sandboxMode, agentId, sessionKey);
    
    // 记录审计日志
    await this.auditLogger.logContainerCreated(
      `container-${Date.now()}`,
      agentId,
      sessionKey,
      sandboxMode,
      containerConfig
    );

    // 创建容器
    const container = await this.dockerManager.createContainer(containerConfig);
    
    // 更新容器信息
    container.agentId = agentId;
    container.sessionKey = sessionKey;
    container.sandboxMode = sandboxMode;
    
    // 更新内部状态
    this.activeContainers.set(container.id, container);
    
    const agentContainers = this.containerSessions.get(agentId) || new Set();
    agentContainers.add(container.id);
    this.containerSessions.set(agentId, agentContainers);
    
    this.sessionContainers.set(sessionKey, container.id);

    console.log(`[SandboxManager] Created sandbox container ${container.id} for agent ${agentId}, mode: ${sandboxMode}`);
    
    return container;
  }

  /**
   * 检查工具权限
   */
  async checkToolPermission(
    toolName: string,
    context: SecurityContext,
    options: {
      skipElevation?: boolean;
      requestElevationIfRequired?: boolean;
    } = {}
  ): Promise<{
    allowed: boolean;
    reason: string;
    requiresElevation: boolean;
    elevationRequestId?: string;
    filterResult?: FilterResult;
  }> {
    // 执行7层过滤链检查
    const filterResult = await this.toolFilter.filterToolAccess(toolName, context, {
      globalPolicyEnabled: true,
      providerPolicyEnabled: true,
      agentPolicyEnabled: true,
      sandboxPolicyEnabled: true,
    });

    // 记录审计日志
    await this.auditLogger.logToolPermissionCheck(
      toolName,
      context,
      { action: filterResult.action, reason: filterResult.reason },
      filterResult.metadata
    );

    if (filterResult.action === 'allow') {
      return {
        allowed: true,
        reason: filterResult.reason,
        requiresElevation: false,
        filterResult,
      };
    }

    if (filterResult.action === 'require_approval') {
      if (options.skipElevation) {
        return {
          allowed: false,
          reason: 'requires_elevation_but_skipped',
          requiresElevation: true,
          filterResult,
        };
      }

      if (options.requestElevationIfRequired) {
        // 创建权限提升请求
        const policy = this.config.toolPolicies.find(p => p.toolName === toolName);
        const request = {
          requester: {
            agentId: context.agentId,
            sessionKey: context.sessionKey,
            userId: context.userId,
            trustLevel: context.trustLevel,
          },
          tool: {
            name: toolName,
            riskLevel: policy?.riskLevel || 'medium',
            description: policy?.description || 'Tool execution',
          },
          context: {
            sandboxMode: context.sandboxMode,
            timestamp: new Date().toISOString(),
            resource: toolName,
          },
          reason: `Permission elevation required for ${toolName}`,
        };

        const elevationResult = await this.elevationManager.requestElevation(request, context);
        
        if (elevationResult.approved) {
          return {
            allowed: true,
            reason: `elevation_approved: ${elevationResult.reason}`,
            requiresElevation: true,
            elevationRequestId: elevationResult.approvalId,
            filterResult,
          };
        } else {
          return {
            allowed: false,
            reason: `elevation_denied: ${elevationResult.reason}`,
            requiresElevation: true,
            elevationRequestId: elevationResult.approvalId,
            filterResult,
          };
        }
      }

      return {
        allowed: false,
        reason: 'requires_elevation',
        requiresElevation: true,
        filterResult,
      };
    }

    // filterResult.action === 'deny'
    return {
      allowed: false,
      reason: filterResult.reason,
      requiresElevation: false,
      filterResult,
    };
  }

  /**
   * 在沙箱中执行命令
   */
  async executeInSandbox(
    containerId: string,
    command: string[],
    context: SecurityContext
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const container = this.activeContainers.get(containerId);
    if (!container) {
      throw new Error(`Container ${containerId} not found`);
    }

    if (container.status !== 'running') {
      throw new Error(`Container ${containerId} is not running`);
    }

    // 记录执行审计
    await this.auditLogger.logSecurityAlert(
      'container_execution',
      `Executing command in container ${containerId}: ${command.join(' ')}`,
      context,
      { command }
    );

    // 执行命令
    const result = await this.dockerManager.execInContainer(containerId, command);
    
    console.log(`[SandboxManager] Executed command in container ${containerId}, exit code: ${result.exitCode}`);
    
    return result;
  }

  /**
   * 停止并清理沙箱
   */
  async destroySandbox(
    containerId: string,
    reason: string = 'session_ended'
  ): Promise<void> {
    const container = this.activeContainers.get(containerId);
    if (!container) {
      console.warn(`[SandboxManager] Container ${containerId} not found, skipping destruction`);
      return;
    }

    // 记录审计日志
    await this.auditLogger.logContainerDestroyed(
      containerId,
      container.agentId,
      container.sessionKey,
      reason
    );

    // 停止并删除容器
    try {
      await this.dockerManager.stopContainer(containerId);
      await this.dockerManager.removeContainer(containerId);
    } catch (error) {
      console.error(`[SandboxManager] Failed to destroy container ${containerId}:`, error);
      await this.auditLogger.logSecurityAlert(
        'container_destruction_failed',
        `Failed to destroy container ${containerId}: ${error}`,
        { agentId: container.agentId, sessionKey: container.sessionKey },
        { error: error.message, containerId }
      );
      throw error;
    }

    // 清理内部状态
    this.activeContainers.delete(containerId);
    
    const agentContainers = this.containerSessions.get(container.agentId);
    if (agentContainers) {
      agentContainers.delete(containerId);
      if (agentContainers.size === 0) {
        this.containerSessions.delete(container.agentId);
      }
    }
    
    this.sessionContainers.delete(container.sessionKey);

    console.log(`[SandboxManager] Destroyed sandbox container ${containerId}, reason: ${reason}`);
  }

  /**
   * 获取Agent的所有容器
   */
  getAgentContainers(agentId: string): ContainerInstance[] {
    const containerIds = this.containerSessions.get(agentId);
    if (!containerIds) return [];
    
    return Array.from(containerIds)
      .map(id => this.activeContainers.get(id))
      .filter((c): c is ContainerInstance => c !== undefined);
  }

  /**
   * 获取会话的容器
   */
  getSessionContainer(sessionKey: string): ContainerInstance | undefined {
    const containerId = this.sessionContainers.get(sessionKey);
    if (!containerId) return undefined;
    
    return this.activeContainers.get(containerId);
  }

  /**
   * 获取所有活跃容器
   */
  getAllActiveContainers(): ContainerInstance[] {
    return Array.from(this.activeContainers.values());
  }

  /**
   * 更新工具策略
   */
  updateToolPolicies(policies: ToolPolicy[]): void {
    this.toolFilter.updateToolPolicies(policies);
    this.config.toolPolicies = policies;
    
    console.log(`[SandboxManager] Updated tool policies, total: ${policies.length}`);
  }

  /**
   * 更新沙箱配置
   */
  updateConfig(newConfig: Partial<SandboxConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // 重新初始化受影响的组件
    if (newConfig.docker) {
      this.dockerManager = new DockerManagerImpl(this.config.docker);
    }
    
    if (newConfig.elevation) {
      this.elevationManager.updateConfig(this.config.elevation);
    }
    
    console.log('[SandboxManager] Configuration updated');
  }

  /**
   * 获取审计日志
   */
  async getAuditLogs(filters: any, limit?: number): Promise<any[]> {
    return this.auditLogger.queryEvents(filters, limit);
  }

  /**
   * 获取事件统计
   */
  async getEventStats(timeRangeHours?: number): Promise<any> {
    return this.auditLogger.getEventStats(timeRangeHours);
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{
    docker: boolean;
    auditLogger: boolean;
    toolFilter: boolean;
    elevationManager: boolean;
  }> {
    const checks = {
      docker: false,
      auditLogger: true, // 审计日志器通常是本地的
      toolFilter: true, // 工具过滤器是本地的
      elevationManager: true, // 权限提升管理器是本地的
    };

    try {
      checks.docker = await this.dockerManager.healthCheck();
    } catch (error) {
      console.error('[SandboxManager] Docker health check failed:', error);
    }

    return checks;
  }

  /**
   * 私有方法
   */

  /**
   * 根据沙箱模式创建容器配置
   */
  private createContainerConfig(
    mode: SandboxMode,
    agentId: string,
    sessionKey: string
  ): ContainerConfig {
    const baseConfig: ContainerConfig = {
      image: 'HexaCore/sandbox:latest',
      env: {
        AGENT_ID: agentId,
        SESSION_KEY: sessionKey,
        SANDBOX_MODE: mode,
        NODE_ENV: 'production',
      },
      network: 'bridge',
      memoryLimit: '1g',
      cpuQuota: 2.0,
      readOnlyRootFs: false,
      capabilities: ['CHOWN', 'DAC_OVERRIDE'],
    };

    switch (mode) {
      case 'off':
        // off模式理论上不应该创建容器，但这里返回一个最小配置
        return {
          ...baseConfig,
          image: 'alpine:latest',
          memoryLimit: '128m',
          cpuQuota: 0.5,
          readOnlyRootFs: true,
          capabilities: [],
        };

      case 'non-main':
        // 非主模式：适中的安全级别
        return {
          ...baseConfig,
          memoryLimit: '512m',
          cpuQuota: 1.0,
          readOnlyRootFs: false,
          volumes: [
            {
              hostPath: `/tmp/sandbox/${agentId}/${sessionKey}`,
              containerPath: '/workspace',
              readonly: false,
            },
          ],
        };

      case 'all':
        // 全容器模式：最高安全级别
        return {
          ...baseConfig,
          network: 'none', // 无网络访问
          memoryLimit: '256m',
          cpuQuota: 0.5,
          readOnlyRootFs: true, // 只读根文件系统
          capabilities: [], // 无特殊权限
          volumes: [
            {
              hostPath: `/tmp/sandbox/${agentId}/${sessionKey}`,
              containerPath: '/workspace',
              readonly: true, // 只读工作空间
            },
          ],
        };

      default:
        throw new Error(`Unsupported sandbox mode: ${mode}`);
    }
  }

  /**
   * 根据工具风险等级确定所需的沙箱模式
   */
  private getRequiredSandboxMode(riskLevel: ToolRiskLevel): SandboxMode {
    switch (riskLevel) {
      case 'critical':
      case 'high':
        return 'all';
      case 'medium':
        return 'non-main';
      case 'low':
      default:
        return 'off';
    }
  }
}
