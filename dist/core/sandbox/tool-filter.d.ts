/**
 * 工具权限过滤器
 * 实现7层过滤链，基于HexaCore安全策略模型
 */
import { SecurityContext, ToolPolicy, FilterResult } from './types';
export declare class ToolPermissionFilter {
    private toolPolicies;
    constructor(policies: ToolPolicy[]);
    /**
     * 执行7层过滤链检查
     */
    filterToolAccess(toolName: string, context: SecurityContext, config: {
        globalPolicyEnabled: boolean;
        providerPolicyEnabled: boolean;
        agentPolicyEnabled: boolean;
        sandboxPolicyEnabled: boolean;
    }): Promise<FilterResult>;
    /**
     * 1. Tool Profile过滤
     * 检查工具是否在允许的工具组内
     */
    private filterByToolProfile;
    /**
     * 2. Provider Tool Profile过滤
     * 检查Provider级别的工具权限
     */
    private filterByProviderProfile;
    /**
     * 3. Global Tool Policy过滤
     * 基于HexaCore.json全局配置
     */
    private filterByGlobalPolicy;
    /**
     * 4. Provider Tool Policy过滤
     * 检查Provider认证状态
     */
    private filterByProviderPolicy;
    /**
     * 5. Agent-specific Tool Policy过滤
     * 应用Agent级别的个性化策略
     */
    private filterByAgentPolicy;
    /**
     * 6. Agent Provider Policy过滤
     * 检查Agent与Provider的绑定关系
     */
    private filterByAgentProviderPolicy;
    /**
     * 7. Sandbox Tool Policy过滤
     * 检查容器级别的工具权限
     */
    private filterBySandboxPolicy;
    /**
     * 通过过滤器（占位符）
     */
    private passFilter;
    /**
     * 获取过滤器名称
     */
    private getFilterName;
    /**
     * 获取工具所需的能力
     */
    private getRequiredCapabilities;
    /**
     * 更新工具策略
     */
    updateToolPolicies(policies: ToolPolicy[]): void;
    /**
     * 获取当前所有策略
     */
    getAllPolicies(): ToolPolicy[];
}
