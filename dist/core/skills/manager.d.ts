/**
 * 技能管理器
 * 负责技能的全生命周期管理：加载、注册、执行、卸载
 */
import { SkillDefinition, SkillOutput, SkillStatus, SkillInstance } from './framework';
/**
 * 技能管理器配置
 */
export interface SkillManagerConfig {
    /** 技能根目录 */
    skillsDirectory: string;
    /** 环境变量 */
    environment?: Record<string, string>;
    /** 默认工具权限 */
    defaultTools?: string[];
    /** 自动发现技能 */
    autoDiscover?: boolean;
    /** 自动初始化技能 */
    autoInitialize?: boolean;
    /** 技能白名单 */
    whitelist?: string[];
    /** 技能黑名单 */
    blacklist?: string[];
    /** 最大技能数 */
    maxSkills?: number;
    /** 技能缓存大小 */
    cacheSize?: number;
}
/**
 * 技能执行选项
 */
export interface SkillExecuteOptions {
    /** 调用方Agent ID */
    callerAgentId: string;
    /** 会话ID */
    sessionId?: string;
    /** 频道ID */
    channelId?: string;
    /** 安全上下文 */
    securityContext?: {
        permissionLevel: 'restricted' | 'standard' | 'elevated';
        allowedNetworks?: string[];
        allowedFilesystems?: string[];
    };
    /** 资源限制 */
    resourceLimits?: {
        maxMemory?: string;
        maxCpu?: number;
        timeout?: number;
    };
    /** 是否验证权限 */
    validatePermissions?: boolean;
    /** 是否缓存结果 */
    cacheResult?: boolean;
}
/**
 * 技能管理器
 */
export declare class SkillManager {
    private config;
    private skills;
    private skillDefinitions;
    private status;
    private initialized;
    /**
     * 构造函数
     * @param config 管理器配置
     */
    constructor(config: SkillManagerConfig);
    /**
     * 初始化管理器
     */
    initialize(): Promise<void>;
    /**
     * 确保技能目录存在
     */
    private ensureSkillsDirectory;
    /**
     * 发现并加载技能
     */
    private discoverAndLoadSkills;
    /**
     * 判断是否应跳过某个技能
     */
    private shouldSkipSkill;
    /**
     * 加载单个技能
     * @param definition 技能定义
     */
    loadSkill(definition: SkillDefinition): Promise<void>;
    /**
     * 从目录加载技能
     * @param skillDirectory 技能目录
     */
    loadSkillFromDirectory(skillDirectory: string): Promise<void>;
    /**
     * 卸载技能
     * @param skillName 技能名称
     */
    unloadSkill(skillName: string): Promise<void>;
    /**
     * 重新加载技能
     * @param skillName 技能名称
     */
    reloadSkill(skillName: string): Promise<void>;
    /**
     * 执行技能
     * @param skillName 技能名称
     * @param parameters 参数
     * @param options 执行选项
     * @returns 执行结果
     */
    executeSkill<T = any>(skillName: string, parameters: Record<string, any>, options: SkillExecuteOptions): Promise<SkillOutput<T>>;
    /**
     * 构建执行上下文
     */
    private buildExecutionContext;
    /**
     * 检查权限
     */
    private checkPermissions;
    /**
     * 获取所有已加载技能
     */
    getAllSkills(): SkillInstance[];
    /**
     * 获取技能定义
     * @param skillName 技能名称
     */
    getSkillDefinition(skillName: string): SkillDefinition | undefined;
    /**
     * 获取技能实例
     * @param skillName 技能名称
     */
    getSkillInstance(skillName: string): SkillInstance | undefined;
    /**
     * 获取技能状态
     * @param skillName 技能名称
     */
    getSkillStatus(skillName: string): SkillStatus | undefined;
    /**
     * 检查技能是否存在
     * @param skillName 技能名称
     */
    hasSkill(skillName: string): boolean;
    /**
     * 获取技能数量
     */
    getSkillCount(): number;
    /**
     * 获取管理器状态
     */
    getStatus(): SkillStatus;
    /**
     * 获取配置
     */
    getConfig(): SkillManagerConfig;
    /**
     * 创建技能目录
     * @param skillName 技能名称
     * @param description 技能描述
     */
    createSkillDirectory(skillName: string, description: string): Promise<string>;
}
