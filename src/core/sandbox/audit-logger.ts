/**
 * 审计日志器
 * 记录所有安全相关操作，确保完整的安全追溯能力
 */

import { AuditEvent, SecurityContext, SandboxMode, ToolRiskLevel } from './types';

export interface AuditLoggerConfig {
  enabled: boolean;
  logLevel: 'low' | 'medium' | 'high'; // 控制记录的事件级别
  storage: {
    type: 'file' | 'database' | 'console';
    path?: string; // 文件存储路径
    maxEntries?: number; // 最大记录数
    rotationInterval?: number; // 日志轮转间隔（小时）
  };
  alerting: {
    enabled: boolean;
    criticalEvents: string[]; // 触发警报的事件类型
    alertChannels: string[]; // 警报通道
  };
}

export class AuditLogger {
  private config: AuditLoggerConfig;
  private events: AuditEvent[] = [];
  private eventCallbacks: Map<string, ((event: AuditEvent) => void)[]> = new Map();

  constructor(config: AuditLoggerConfig) {
    this.config = config;
    this.initializeStorage();
  }

  /**
   * 记录容器创建事件
   */
  async logContainerCreated(
    containerId: string,
    agentId: string,
    sessionKey: string,
    sandboxMode: SandboxMode,
    config: any
  ): Promise<void> {
    const event: AuditEvent = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      eventType: 'container_created',
      agentId,
      sessionKey,
      action: 'created',
      reason: 'sandbox_container_creation',
      details: {
        containerId,
        sandboxMode,
        config,
      },
      auditId: this.generateAuditId(),
    };

    await this.recordEvent(event);
  }

  /**
   * 记录容器销毁事件
   */
  async logContainerDestroyed(
    containerId: string,
    agentId: string,
    sessionKey: string,
    reason: string
  ): Promise<void> {
    const event: AuditEvent = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      eventType: 'container_destroyed',
      agentId,
      sessionKey,
      action: 'destroyed',
      reason,
      details: {
        containerId,
      },
      auditId: this.generateAuditId(),
    };

    await this.recordEvent(event);
  }

  /**
   * 记录工具权限检查事件
   */
  async logToolPermissionCheck(
    toolName: string,
    context: SecurityContext,
    result: { action: string; reason: string },
    metadata?: Record<string, any>
  ): Promise<void> {
    const event: AuditEvent = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      eventType: 'tool_permission_check',
      agentId: context.agentId,
      sessionKey: context.sessionKey,
      toolName,
      action: result.action,
      reason: result.reason,
      details: {
        context: {
          sandboxMode: context.sandboxMode,
          trustLevel: context.trustLevel,
          userRole: context.userRole,
          sourceIp: context.sourceIp,
          channel: context.channel,
        },
        metadata,
      },
      securityContext: {
        agentId: context.agentId,
        sessionKey: context.sessionKey,
        sandboxMode: context.sandboxMode,
        trustLevel: context.trustLevel,
        userRole: context.userRole,
        capabilities: context.capabilities,
      },
      auditId: this.generateAuditId(),
    };

    await this.recordEvent(event);

    // 如果是拒绝或需要审批的高风险操作，可能需要触发警报
    if (result.action === 'deny' || (result.action === 'require_approval' && metadata?.riskLevel === 'high')) {
      await this.checkAndTriggerAlert(event);
    }
  }

  /**
   * 记录权限提升请求事件
   */
  async logElevationRequested(
    requestId: string,
    requester: { agentId: string; sessionKey: string; userId?: string },
    toolName: string,
    riskLevel: ToolRiskLevel,
    reason?: string
  ): Promise<void> {
    const event: AuditEvent = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      eventType: 'elevation_requested',
      agentId: requester.agentId,
      sessionKey: requester.sessionKey,
      toolName,
      action: 'requested',
      reason: reason || 'permission_elevation_request',
      details: {
        requestId,
        riskLevel,
        requester,
      },
      auditId: this.generateAuditId(),
    };

    await this.recordEvent(event);
    await this.checkAndTriggerAlert(event);
  }

  /**
   * 记录权限提升批准事件
   */
  async logElevationApproved(
    requestId: string,
    approverId: string,
    expiresAt: string,
    reason?: string
  ): Promise<void> {
    const event: AuditEvent = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      eventType: 'elevation_approved',
      action: 'approved',
      reason: reason || 'elevation_request_approved',
      details: {
        requestId,
        approverId,
        expiresAt,
      },
      auditId: this.generateAuditId(),
    };

    await this.recordEvent(event);
  }

  /**
   * 记录权限提升拒绝事件
   */
  async logElevationDenied(
    requestId: string,
    approverId: string,
    reason?: string
  ): Promise<void> {
    const event: AuditEvent = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      eventType: 'elevation_denied',
      action: 'denied',
      reason: reason || 'elevation_request_denied',
      details: {
        requestId,
        approverId,
      },
      auditId: this.generateAuditId(),
    };

    await this.recordEvent(event);
  }

  /**
   * 记录策略违反事件
   */
  async logPolicyViolation(
    violationType: string,
    context: SecurityContext,
    details: Record<string, any>
  ): Promise<void> {
    const event: AuditEvent = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      eventType: 'policy_violation',
      agentId: context.agentId,
      sessionKey: context.sessionKey,
      action: 'violated',
      reason: `security_policy_violation: ${violationType}`,
      details: {
        violationType,
        context: {
          agentId: context.agentId,
          sandboxMode: context.sandboxMode,
          trustLevel: context.trustLevel,
        },
        ...details,
      },
      securityContext: {
        agentId: context.agentId,
        sessionKey: context.sessionKey,
        sandboxMode: context.sandboxMode,
        trustLevel: context.trustLevel,
      },
      auditId: this.generateAuditId(),
    };

    await this.recordEvent(event);
    await this.checkAndTriggerAlert(event);
  }

  /**
   * 记录异常检测事件
   */
  async logAnomalyDetected(
    anomalyType: string,
    context: SecurityContext,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details: Record<string, any>
  ): Promise<void> {
    const event: AuditEvent = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      eventType: 'anomaly_detected',
      agentId: context.agentId,
      sessionKey: context.sessionKey,
      action: 'detected',
      reason: `security_anomaly_detected: ${anomalyType}`,
      details: {
        anomalyType,
        severity,
        context: {
          agentId: context.agentId,
          sandboxMode: context.sandboxMode,
        },
        ...details,
      },
      securityContext: {
        agentId: context.agentId,
        sessionKey: context.sessionKey,
        sandboxMode: context.sandboxMode,
      },
      auditId: this.generateAuditId(),
    };

    await this.recordEvent(event);
    
    if (severity === 'high' || severity === 'critical') {
      await this.checkAndTriggerAlert(event);
    }
  }

  /**
   * 记录安全警报事件
   */
  async logSecurityAlert(
    alertType: string,
    message: string,
    context?: Partial<SecurityContext>,
    details?: Record<string, any>
  ): Promise<void> {
    const event: AuditEvent = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      eventType: 'security_alert',
      agentId: context?.agentId,
      sessionKey: context?.sessionKey,
      action: 'alert',
      reason: message,
      details: {
        alertType,
        ...details,
      },
      securityContext: context,
      auditId: this.generateAuditId(),
    };

    await this.recordEvent(event);
    console.warn(`[SECURITY ALERT] ${alertType}: ${message}`);
  }

  /**
   * 查询审计事件
   */
  async queryEvents(
    filters: {
      eventType?: string | string[];
      agentId?: string;
      sessionKey?: string;
      toolName?: string;
      startTime?: string;
      endTime?: string;
      action?: string;
    },
    limit?: number
  ): Promise<AuditEvent[]> {
    let filtered = this.events;

    if (filters.eventType) {
      const types = Array.isArray(filters.eventType) ? filters.eventType : [filters.eventType];
      filtered = filtered.filter(event => types.includes(event.eventType));
    }

    if (filters.agentId) {
      filtered = filtered.filter(event => event.agentId === filters.agentId);
    }

    if (filters.sessionKey) {
      filtered = filtered.filter(event => event.sessionKey === filters.sessionKey);
    }

    if (filters.toolName) {
      filtered = filtered.filter(event => event.toolName === filters.toolName);
    }

    if (filters.startTime) {
      filtered = filtered.filter(event => event.timestamp >= filters.startTime!);
    }

    if (filters.endTime) {
      filtered = filtered.filter(event => event.timestamp <= filters.endTime!);
    }

    if (filters.action) {
      filtered = filtered.filter(event => event.action === filters.action);
    }

    if (limit && limit > 0) {
      filtered = filtered.slice(0, limit);
    }

    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * 获取事件统计信息
   */
  async getEventStats(timeRangeHours: number = 24): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    recentAlerts: number;
  }> {
    const cutoffTime = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000).toISOString();
    const recentEvents = this.events.filter(event => event.timestamp >= cutoffTime);

    const eventsByType: Record<string, number> = {};
    const eventsBySeverity: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    recentEvents.forEach(event => {
      eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;
      
      // 根据事件类型判断严重程度
      if (event.eventType.includes('violation') || event.eventType.includes('alert')) {
        eventsBySeverity.high++;
      } else if (event.eventType.includes('anomaly')) {
        eventsBySeverity.medium++;
      } else {
        eventsBySeverity.low++;
      }
    });

    const recentAlerts = recentEvents.filter(event => 
      event.eventType === 'security_alert' || 
      event.eventType === 'policy_violation'
    ).length;

    return {
      totalEvents: recentEvents.length,
      eventsByType,
      eventsBySeverity,
      recentAlerts,
    };
  }

  /**
   * 注册事件回调
   */
  on(eventType: string, callback: (event: AuditEvent) => void): void {
    const callbacks = this.eventCallbacks.get(eventType) || [];
    callbacks.push(callback);
    this.eventCallbacks.set(eventType, callbacks);
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<AuditLoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 私有方法
   */

  private async recordEvent(event: AuditEvent): Promise<void> {
    // 根据配置存储事件
    switch (this.config.storage.type) {
      case 'file':
        await this.storeToFile(event);
        break;
      case 'database':
        await this.storeToDatabase(event);
        break;
      case 'console':
      default:
        this.storeToConsole(event);
        break;
    }

    // 添加到内存列表
    this.events.push(event);

    // 触发回调
    this.triggerCallbacks(event);

    // 检查是否需要日志轮转
    await this.checkAndRotateLogs();
  }

  private async storeToFile(event: AuditEvent): Promise<void> {
    // 在实际实现中，这里会将事件写入文件
    const logEntry = JSON.stringify(event, null, 2);
    console.log(`[AuditLogger] Writing to file: ${logEntry}`);
    
    // 示例：将日志追加到文件
    // const fs = require('fs').promises;
    // await fs.appendFile(this.config.storage.path || 'audit.log', logEntry + '\n');
  }

  private async storeToDatabase(event: AuditEvent): Promise<void> {
    // 在实际实现中，这里会将事件存储到数据库
    console.log(`[AuditLogger] Storing to database: ${event.id}`);
  }

  private storeToConsole(event: AuditEvent): void {
    const logLevel = this.config.logLevel;
    const severity = this.getEventSeverity(event.eventType);
    
    // 根据配置的日志级别过滤
    if (
      (logLevel === 'low' && severity === 'low') ||
      (logLevel === 'medium' && (severity === 'low' || severity === 'medium')) ||
      (logLevel === 'high')
    ) {
      console.log(`[AuditLogger] ${event.timestamp} ${event.eventType} - ${event.action}: ${event.reason}`);
    }
  }

  private async checkAndTriggerAlert(event: AuditEvent): Promise<void> {
    if (!this.config.alerting.enabled) return;

    const isCritical = this.config.alerting.criticalEvents.includes(event.eventType);
    if (isCritical) {
      await this.logSecurityAlert(
        'critical_event',
        `Critical audit event detected: ${event.eventType}`,
        event.securityContext,
        { auditEvent: event }
      );

      // 在实际实现中，这里会通过配置的警报通道发送通知
      console.warn(`[AuditLogger] Critical event alert triggered: ${event.eventType}`);
    }
  }

  private async checkAndRotateLogs(): Promise<void> {
    if (!this.config.storage.maxEntries || this.config.storage.maxEntries <= 0) {
      return;
    }

    if (this.events.length > this.config.storage.maxEntries) {
      // 保留最新的 maxEntries 条记录
      this.events = this.events.slice(-this.config.storage.maxEntries);
      console.log(`[AuditLogger] Logs rotated, keeping latest ${this.config.storage.maxEntries} events`);
    }
  }

  private triggerCallbacks(event: AuditEvent): void {
    const callbacks = this.eventCallbacks.get(event.eventType) || [];
    callbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error(`[AuditLogger] Error in event callback for ${event.eventType}:`, error);
      }
    });
  }

  private generateEventId(): string {
    return `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAuditId(): string {
    return `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getEventSeverity(eventType: string): 'low' | 'medium' | 'high' {
    const highSeverity = [
      'policy_violation',
      'security_alert',
      'anomaly_detected',
    ];
    
    const mediumSeverity = [
      'elevation_requested',
      'elevation_denied',
      'tool_permission_check',
    ];

    if (highSeverity.some(type => eventType.includes(type))) return 'high';
    if (mediumSeverity.some(type => eventType.includes(type))) return 'medium';
    return 'low';
  }

  private initializeStorage(): void {
    console.log(`[AuditLogger] Initialized with storage type: ${this.config.storage.type}`);
    
    // 在实际实现中，这里会初始化文件、数据库连接等
    if (this.config.storage.type === 'file' && this.config.storage.path) {
      console.log(`[AuditLogger] Log file path: ${this.config.storage.path}`);
    }
  }
}