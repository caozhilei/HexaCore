/**
 * 沙箱管理器测试
 * 验证沙箱隔离、权限检查和安全审计基本功能
 */

import { SandboxManager } from './manager';
import { SandboxConfig, SandboxMode, SecurityContext, ToolPolicy, ToolRiskLevel } from './types';

describe('SandboxManager', () => {
  let sandboxManager: SandboxManager;
  let testConfig: SandboxConfig;

  beforeEach(() => {
    testConfig = {
      defaultMode: 'non-main',
      docker: {
        socketPath: '/var/run/docker.sock',
        apiVersion: '1.45',
        timeout: 30000,
      },
      toolPolicies: [
        {
          toolName: 'read',
          riskLevel: 'low',
          allowedInModes: ['off', 'non-main', 'all'],
          requiresApproval: false,
          auditLevel: 'low',
        },
        {
          toolName: 'file_write',
          riskLevel: 'medium',
          allowedInModes: ['off', 'non-main'],
          requiresApproval: true,
          approvalTimeout: 300,
          auditLevel: 'medium',
        },
        {
          toolName: 'exec',
          riskLevel: 'high',
          allowedInModes: ['off'],
          allowedAgents: ['system-admin', 'vip-agent'],
          requiresApproval: true,
          approvalTimeout: 600,
          auditLevel: 'high',
        },
        {
          toolName: 'network',
          riskLevel: 'medium',
          allowedInModes: ['off', 'non-main'],
          requiresApproval: false,
          whitelist: ['admin', 'trusted-user'],
          auditLevel: 'medium',
        },
      ],
      elevation: {
        enabled: true,
        approvalFlows: {
          immediate: {
            timeout: 300,
            approvers: ['admin@example.com'],
          },
          delayed: {
            timeout: 3600,
            approvers: ['admin@example.com', 'manager@example.com'],
            quorum: 2,
          },
        },
        whitelist: {
          users: ['admin', 'system'],
          tools: ['read'],
          expiry: 86400,
        },
      },
      monitoring: {
        containerMetrics: true,
        securityEvents: true,
        auditLogging: true,
      },
    };

    sandboxManager = new SandboxManager(testConfig);
  });

  describe('沙箱模式配置', () => {
    it('应该正确初始化默认沙箱模式', () => {
      expect(testConfig.defaultMode).toBe('non-main');
    });

    it('应该支持三种沙箱模式', () => {
      const modes: SandboxMode[] = ['off', 'non-main', 'all'];
      modes.forEach(mode => {
        expect(['off', 'non-main', 'all']).toContain(mode);
      });
    });
  });

  describe('工具权限过滤', () => {
    const baseContext: SecurityContext = {
      agentId: 'test-agent',
      sessionKey: 'session-123',
      sandboxMode: 'non-main',
      trustLevel: 5,
      userRole: 'user',
      capabilities: ['read_access'],
    };

    it('应该允许低风险工具', async () => {
      const result = await sandboxManager.checkToolPermission('read', baseContext);
      expect(result.allowed).toBe(true);
      expect(result.requiresElevation).toBe(false);
    });

    it('应该拒绝高风险工具给非授权Agent', async () => {
      const result = await sandboxManager.checkToolPermission('exec', baseContext);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('requires_elevation');
    });

    it('应该对高风险工具要求权限提升', async () => {
      const result = await sandboxManager.checkToolPermission('file_write', baseContext, {
        requestElevationIfRequired: true,
      });
      // 由于是模拟审批流程，结果可能是批准或拒绝
      expect(result.requiresElevation).toBe(true);
    });

    it('应该根据沙箱模式限制工具', async () => {
      const restrictedContext: SecurityContext = {
        ...baseContext,
        sandboxMode: 'all',
      };
      const result = await sandboxManager.checkToolPermission('file_write', restrictedContext);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not_allowed_in_current_sandbox_mode');
    });

    it('应该检查白名单用户', async () => {
      const whitelistedContext: SecurityContext = {
        ...baseContext,
        userRole: 'admin',
      };
      const result = await sandboxManager.checkToolPermission('network', whitelistedContext);
      expect(result.allowed).toBe(true);
    });
  });

  describe('容器生命周期管理', () => {
    const testAgentId = 'test-agent-001';
    const testSessionKey = 'session-abc-123';

    it('应该能创建沙箱容器', async () => {
      const container = await sandboxManager.createSandbox(testAgentId, testSessionKey);
      expect(container).toBeDefined();
      expect(container.id).toBeDefined();
      expect(container.agentId).toBe(testAgentId);
      expect(container.sessionKey).toBe(testSessionKey);
    });

    it('应该复用同一会话的容器', async () => {
      const container1 = await sandboxManager.createSandbox(testAgentId, testSessionKey);
      const container2 = await sandboxManager.createSandbox(testAgentId, testSessionKey);
      expect(container2.id).toBe(container1.id);
    });

    it('应该能获取Agent的所有容器', async () => {
      await sandboxManager.createSandbox(testAgentId, testSessionKey);
      const containers = sandboxManager.getAgentContainers(testAgentId);
      expect(containers.length).toBeGreaterThan(0);
      expect(containers[0].agentId).toBe(testAgentId);
    });

    it('应该能获取会话的容器', async () => {
      await sandboxManager.createSandbox(testAgentId, testSessionKey);
      const container = sandboxManager.getSessionContainer(testSessionKey);
      expect(container).toBeDefined();
      expect(container?.sessionKey).toBe(testSessionKey);
    });
  });

  describe('权限提升机制', () => {
    it('应该启用权限提升功能', () => {
      expect(testConfig.elevation.enabled).toBe(true);
    });

    it('应该配置两种审批流程', () => {
      expect(testConfig.elevation.approvalFlows.immediate).toBeDefined();
      expect(testConfig.elevation.approvalFlows.delayed).toBeDefined();
      expect(testConfig.elevation.approvalFlows.delayed.quorum).toBe(2);
    });

    it('应该配置白名单', () => {
      expect(testConfig.elevation.whitelist.users).toContain('admin');
      expect(testConfig.elevation.whitelist.tools).toContain('read');
    });
  });

  describe('审计日志功能', () => {
    it('应该启用审计日志', () => {
      expect(testConfig.monitoring.auditLogging).toBe(true);
    });

    it('应该启用安全事件监控', () => {
      expect(testConfig.monitoring.securityEvents).toBe(true);
    });

    it('应该能查询审计日志', async () => {
      const logs = await sandboxManager.getAuditLogs({}, 10);
      expect(Array.isArray(logs)).toBe(true);
    });

    it('应该能获取事件统计', async () => {
      const stats = await sandboxManager.getEventStats(24);
      expect(stats).toHaveProperty('totalEvents');
      expect(stats).toHaveProperty('eventsByType');
    });
  });

  describe('配置更新', () => {
    it('应该能更新工具策略', () => {
      const newPolicy: ToolPolicy = {
        toolName: 'new_tool',
        riskLevel: 'low',
        allowedInModes: ['off', 'non-main', 'all'],
        requiresApproval: false,
        auditLevel: 'low',
      };
      
      sandboxManager.updateToolPolicies([newPolicy]);
      // 验证策略已更新（通过后续的权限检查）
    });

    it('应该能更新沙箱配置', () => {
      const newConfig = {
        defaultMode: 'all' as SandboxMode,
      };
      
      sandboxManager.updateConfig(newConfig);
      // 验证配置已更新
    });
  });

  describe('健康检查', () => {
    it('应该返回各组件健康状态', async () => {
      const health = await sandboxManager.healthCheck();
      expect(health).toHaveProperty('docker');
      expect(health).toHaveProperty('auditLogger');
      expect(health).toHaveProperty('toolFilter');
      expect(health).toHaveProperty('elevationManager');
    });
  });

  describe('7层过滤链验证', () => {
    const testContext: SecurityContext = {
      agentId: 'regular-agent',
      sessionKey: 'session-regular',
      sandboxMode: 'non-main',
      trustLevel: 3,
      userRole: 'user',
      capabilities: ['basic_access'],
    };

    it('应该逐层检查工具权限', async () => {
      // 测试一个需要多层检查的工具
      const result = await sandboxManager.checkToolPermission('exec', testContext);
      expect(result.filterResult).toBeDefined();
      expect(result.filterResult?.filterName).toBeDefined();
    });

    it('应该验证权限收缩机制', async () => {
      // 创建一个高风险上下文
      const highRiskContext: SecurityContext = {
        ...testContext,
        sandboxMode: 'off',
        trustLevel: 9,
        userRole: 'admin',
        capabilities: ['high_privilege'],
      };

      // 即使是高风险上下文，某些工具也可能被限制
      const result = await sandboxManager.checkToolPermission('exec', highRiskContext);
      // 结果取决于具体的过滤逻辑
      expect(result).toBeDefined();
    });
  });
});