/**
 * 工具权限过滤器
 * 实现7层过滤链，基于HexaCore安全策略模型
 */

import { SecurityContext, ToolPolicy, FilterResult, PermissionAction, SandboxMode } from './types';

export class ToolPermissionFilter {
  private toolPolicies: Map<string, ToolPolicy>;
  
  constructor(policies: ToolPolicy[]) {
    this.toolPolicies = new Map();
    policies.forEach(policy => {
      this.toolPolicies.set(policy.toolName, policy);
    });
  }

  /**
   * 执行7层过滤链检查
   */
  async filterToolAccess(
    toolName: string,
    context: SecurityContext,
    config: {
      globalPolicyEnabled: boolean;
      providerPolicyEnabled: boolean;
      agentPolicyEnabled: boolean;
      sandboxPolicyEnabled: boolean;
    }
  ): Promise<FilterResult> {
    const filters = [
      // 1. Tool Profile过滤 - 基于HexaCore工具组定义
      this.filterByToolProfile.bind(this),
      // 2. Provider Tool Profile过滤 - HexaCore Provider级策略
      this.filterByProviderProfile.bind(this),
      // 3. Global Tool Policy过滤 - HexaCore.json全局配置
      config.globalPolicyEnabled ? this.filterByGlobalPolicy.bind(this) : this.passFilter.bind(this),
      // 4. Provider Tool Policy过滤 - HexaCore Provider认证模型
      config.providerPolicyEnabled ? this.filterByProviderPolicy.bind(this) : this.passFilter.bind(this),
      // 5. Agent-specific Tool Policy过滤 - HexaCore Agent配置
      config.agentPolicyEnabled ? this.filterByAgentPolicy.bind(this) : this.passFilter.bind(this),
      // 6. Agent Provider Policy过滤 - HexaCore Agent级Provider设置
      config.agentPolicyEnabled ? this.filterByAgentProviderPolicy.bind(this) : this.passFilter.bind(this),
      // 7. Sandbox Tool Policy过滤 - HexaCore Docker沙箱权限控制
      config.sandboxPolicyEnabled ? this.filterBySandboxPolicy.bind(this) : this.passFilter.bind(this),
    ];

    for (let i = 0; i < filters.length; i++) {
      const filter = filters[i];
      const result = await filter(toolName, context);
      if (result.action !== 'allow') {
        return {
          ...result,
          filterName: this.getFilterName(i),
        };
      }
    }

    return {
      action: 'allow',
      reason: 'passed_all_filters',
      filterName: 'all_filters',
    };
  }

  /**
   * 1. Tool Profile过滤
   * 检查工具是否在允许的工具组内
   */
  private async filterByToolProfile(toolName: string, context: SecurityContext): Promise<FilterResult> {
    const policy = this.toolPolicies.get(toolName);
    if (!policy) {
      return {
        action: 'deny',
        reason: 'tool_not_in_allowed_profiles',
        filterName: 'tool_profile',
      };
    }

    // 检查工具是否在Agent的能力列表中
    if (policy.allowedAgents && !policy.allowedAgents.includes(context.agentId)) {
      return {
        action: 'deny',
        reason: 'agent_not_allowed_for_tool',
        filterName: 'tool_profile',
        metadata: { allowedAgents: policy.allowedAgents },
      };
    }

    return { action: 'allow', reason: 'tool_profile_passed', filterName: 'tool_profile' };
  }

  /**
   * 2. Provider Tool Profile过滤
   * 检查Provider级别的工具权限
   */
  private async filterByProviderProfile(toolName: string, context: SecurityContext): Promise<FilterResult> {
    // 模拟Provider级策略检查
    // 在实际实现中，会检查context中的provider信息
    const providerId = context.channel || 'default';
    
    // 假设某些Provider有特殊限制
    const restrictedProviders = ['third-party-api', 'untrusted-channel'];
    if (restrictedProviders.includes(providerId)) {
      const highRiskTools = ['file_write', 'exec', 'network'];
      if (highRiskTools.includes(toolName)) {
        return {
          action: 'require_approval',
          reason: 'high_risk_tool_in_restricted_provider',
          filterName: 'provider_profile',
          metadata: { providerId, toolName },
        };
      }
    }

    return { action: 'allow', reason: 'provider_profile_passed', filterName: 'provider_profile' };
  }

  /**
   * 3. Global Tool Policy过滤
   * 基于HexaCore.json全局配置
   */
  private async filterByGlobalPolicy(toolName: string, context: SecurityContext): Promise<FilterResult> {
    const policy = this.toolPolicies.get(toolName);
    if (!policy) {
      return { action: 'deny', reason: 'tool_not_in_global_policy', filterName: 'global_policy' };
    }

    // 检查全局风险等级限制
    if (policy.riskLevel === 'critical' && context.trustLevel < 9) {
      return {
        action: 'require_approval',
        reason: 'critical_tool_requires_high_trust',
        filterName: 'global_policy',
        metadata: { requiredTrustLevel: 9, currentTrustLevel: context.trustLevel },
      };
    }

    return { action: 'allow', reason: 'global_policy_passed', filterName: 'global_policy' };
  }

  /**
   * 4. Provider Tool Policy过滤
   * 检查Provider认证状态
   */
  private async filterByProviderPolicy(toolName: string, context: SecurityContext): Promise<FilterResult> {
    // 模拟Provider认证检查
    // 在实际实现中，会验证Provider的认证令牌或证书
    const isProviderAuthenticated = context.trustLevel >= 5;
    
    if (!isProviderAuthenticated) {
      const authenticatedTools = ['file_read', 'weather_query', 'data_analysis'];
      if (!authenticatedTools.includes(toolName)) {
        return {
          action: 'deny',
          reason: 'provider_not_authenticated_for_tool',
          filterName: 'provider_policy',
          metadata: { requiredAuthentication: true },
        };
      }
    }

    return { action: 'allow', reason: 'provider_policy_passed', filterName: 'provider_policy' };
  }

  /**
   * 5. Agent-specific Tool Policy过滤
   * 应用Agent级别的个性化策略
   */
  private async filterByAgentPolicy(toolName: string, context: SecurityContext): Promise<FilterResult> {
    const policy = this.toolPolicies.get(toolName);
    if (!policy) {
      return { action: 'deny', reason: 'agent_specific_policy_not_found', filterName: 'agent_policy' };
    }

    // 检查Agent是否在允许列表中
    if (policy.allowedAgents && !policy.allowedAgents.includes(context.agentId)) {
      return {
        action: 'deny',
        reason: 'agent_not_in_allowed_list',
        filterName: 'agent_policy',
        metadata: { allowedAgents: policy.allowedAgents },
      };
    }

    // 检查Agent的能力
    const requiredCapabilities = this.getRequiredCapabilities(toolName);
    if (requiredCapabilities.length > 0) {
      const missingCapabilities = requiredCapabilities.filter(
        cap => !context.capabilities.includes(cap)
      );
      if (missingCapabilities.length > 0) {
        return {
          action: 'deny',
          reason: 'agent_missing_required_capabilities',
          filterName: 'agent_policy',
          metadata: { missingCapabilities },
        };
      }
    }

    return { action: 'allow', reason: 'agent_policy_passed', filterName: 'agent_policy' };
  }

  /**
   * 6. Agent Provider Policy过滤
   * 检查Agent与Provider的绑定关系
   */
  private async filterByAgentProviderPolicy(toolName: string, context: SecurityContext): Promise<FilterResult> {
    // 模拟Agent-Provider绑定检查
    // 在实际实现中，会检查Agent是否被授权使用特定的Provider
    const agentProviderBindings: Record<string, string[]> = {
      'weather-agent-001': ['openweather-api', 'accuweather'],
      'data-analysis-agent': ['database', 'api-server'],
      'system-admin': ['all'],
    };

    const allowedProviders = agentProviderBindings[context.agentId] || ['default'];
    const currentProvider = context.channel || 'default';

    if (!allowedProviders.includes('all') && !allowedProviders.includes(currentProvider)) {
      return {
        action: 'deny',
        reason: 'agent_not_bound_to_provider',
        filterName: 'agent_provider_policy',
        metadata: { allowedProviders, currentProvider },
      };
    }

    return { action: 'allow', reason: 'agent_provider_policy_passed', filterName: 'agent_provider_policy' };
  }

  /**
   * 7. Sandbox Tool Policy过滤
   * 检查容器级别的工具权限
   */
  private async filterBySandboxPolicy(toolName: string, context: SecurityContext): Promise<FilterResult> {
    const policy = this.toolPolicies.get(toolName);
    if (!policy) {
      return { action: 'deny', reason: 'sandbox_policy_not_found', filterName: 'sandbox_policy' };
    }

    // 检查沙箱模式是否允许该工具
    if (!policy.allowedInModes.includes(context.sandboxMode)) {
      return {
        action: 'deny',
        reason: 'tool_not_allowed_in_current_sandbox_mode',
        filterName: 'sandbox_policy',
        metadata: { allowedModes: policy.allowedInModes, currentMode: context.sandboxMode },
      };
    }

    // 检查是否需要审批
    if (policy.requiresApproval) {
      return {
        action: 'require_approval',
        reason: 'tool_requires_approval',
        filterName: 'sandbox_policy',
        metadata: {
          riskLevel: policy.riskLevel,
          approvalTimeout: policy.approvalTimeout,
        },
      };
    }

    // 检查白名单
    if (policy.whitelist && policy.whitelist.length > 0) {
      const userInWhitelist = policy.whitelist.some(whitelistItem => {
        return whitelistItem === context.agentId || 
               whitelistItem === context.userRole ||
               (context.userId && whitelistItem === context.userId);
      });

      if (!userInWhitelist) {
        return {
          action: 'deny',
          reason: 'user_not_in_tool_whitelist',
          filterName: 'sandbox_policy',
          metadata: { whitelist: policy.whitelist },
        };
      }
    }

    return { action: 'allow', reason: 'sandbox_policy_passed', filterName: 'sandbox_policy' };
  }

  /**
   * 通过过滤器（占位符）
   */
  private async passFilter(toolName: string, context: SecurityContext): Promise<FilterResult> {
    return { action: 'allow', reason: 'filter_disabled', filterName: 'disabled_filter' };
  }

  /**
   * 获取过滤器名称
   */
  private getFilterName(index: number): string {
    const names = [
      'tool_profile',
      'provider_profile',
      'global_policy',
      'provider_policy',
      'agent_policy',
      'agent_provider_policy',
      'sandbox_policy',
    ];
    return names[index] || `filter_${index}`;
  }

  /**
   * 获取工具所需的能力
   */
  private getRequiredCapabilities(toolName: string): string[] {
    const capabilityMap: Record<string, string[]> = {
      'file_write': ['write_access', 'storage'],
      'exec': ['system_access', 'high_privilege'],
      'network': ['network_access', 'external_api'],
      'database_query': ['database_access', 'read_privilege'],
    };
    return capabilityMap[toolName] || [];
  }

  /**
   * 更新工具策略
   */
  updateToolPolicies(policies: ToolPolicy[]): void {
    this.toolPolicies.clear();
    policies.forEach(policy => {
      this.toolPolicies.set(policy.toolName, policy);
    });
  }

  /**
   * 获取当前所有策略
   */
  getAllPolicies(): ToolPolicy[] {
    return Array.from(this.toolPolicies.values());
  }
}
