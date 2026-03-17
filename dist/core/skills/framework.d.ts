/**
 * 技能框架核心模块
 * 基于HexaCore SKILL.md标准的声明式技能框架
 */
/**
 * 技能参数定义
 */
export interface SkillParameterDefinition {
    /** 参数类型：string, number, boolean, object, array */
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    /** 参数描述 */
    description: string;
    /** 是否必填 */
    required?: boolean;
    /** 默认值 */
    default?: any;
    /** 最小值（数值类型） */
    min?: number;
    /** 最大值（数值类型） */
    max?: number;
    /** 枚举值列表（字符串类型） */
    enum?: string[];
    /** 数组元素类型（数组类型） */
    items?: SkillParameterDefinition;
    /** 对象属性定义（对象类型） */
    properties?: Record<string, SkillParameterDefinition>;
}
/**
 * 技能输出定义
 */
export interface SkillOutputDefinition {
    /** 输出类型 */
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    /** 输出描述 */
    description?: string;
    /** 对象属性定义（对象类型） */
    properties?: Record<string, SkillOutputDefinition>;
    /** 数组元素定义（数组类型） */
    items?: SkillOutputDefinition;
}
/**
 * 技能定义元数据（对应SKILL.md文件）
 */
export interface SkillDefinition {
    /** 技能唯一标识，符合npm包命名规范 */
    name: string;
    /** 简洁的功能描述（≤200字符） */
    description: string;
    /** 语义化版本号（major.minor.patch） */
    version: string;
    /** 技能所需的工具权限列表 */
    tools: string[];
    /** 技能所需的环境变量列表 */
    environment?: string[];
    /** 输入参数定义 */
    parameters?: Record<string, SkillParameterDefinition>;
    /** 输出数据结构定义，遵循JSON Schema标准 */
    output: SkillOutputDefinition;
    /** 技能所在目录路径 */
    directory?: string;
    /** SKILL.md文件路径 */
    skillMdPath?: string;
    /** 技能实现模块路径 */
    implementationPath?: string;
}
/**
 * 技能输入参数
 */
export interface SkillInput<T = Record<string, any>> {
    /** 输入参数值 */
    parameters: T;
    /** 调用上下文信息 */
    context: SkillExecutionContext;
    /** 元数据 */
    metadata: {
        /** 调用时间戳 */
        timestamp: number;
        /** 调用方Agent ID */
        callerAgentId: string;
        /** 会话ID */
        sessionId?: string;
        /** 频道ID */
        channelId?: string;
    };
}
/**
 * 技能执行上下文
 */
export interface SkillExecutionContext {
    /** 可用的工具列表 */
    availableTools: string[];
    /** 环境变量 */
    environment: Record<string, string>;
    /** 工作目录 */
    workingDirectory: string;
    /** 安全上下文 */
    securityContext: SecurityContext;
    /** 会话信息 */
    session?: {
        id: string;
        channelId: string;
        agentId: string;
        createdAt: number;
        lastActiveAt: number;
    };
}
/**
 * 安全上下文
 */
export interface SecurityContext {
    /** 权限级别 */
    permissionLevel: 'restricted' | 'standard' | 'elevated';
    /** 允许的网络访问 */
    allowedNetworks: string[];
    /** 允许的文件系统访问 */
    allowedFilesystems: string[];
    /** 资源限制 */
    resourceLimits: {
        maxMemory: string;
        maxCpu: number;
        timeout: number;
    };
}
/**
 * 技能执行结果
 */
export interface SkillOutput<T = any> {
    /** 是否执行成功 */
    success: boolean;
    /** 执行结果数据（成功时） */
    data?: T;
    /** 错误信息（失败时） */
    error?: string;
    /** 元数据 */
    metadata: {
        /** 执行时间戳 */
        timestamp: string;
        /** 处理耗时（毫秒） */
        processingTime?: number;
        /** 是否可缓存 */
        cacheable?: boolean;
        /** 缓存TTL（秒） */
        ttl?: number;
        /** 技能名称 */
        skillName?: string;
        /** 技能版本 */
        skillVersion?: string;
    };
}
/**
 * 技能基类 - 所有技能必须继承此类
 */
export declare abstract class SkillBase {
    /** 技能定义 */
    protected definition: SkillDefinition;
    /**
     * 构造函数
     * @param name 技能名称
     * @param version 技能版本
     * @param description 技能描述
     */
    constructor(name: string, version: string, description?: string);
    /**
     * 获取技能定义
     */
    getDefinition(): SkillDefinition;
    /**
     * 设置技能定义
     * @param definition 技能定义
     */
    setDefinition(definition: SkillDefinition): void;
    /**
     * 技能初始化（可选）
     * 在技能加载时调用
     */
    initialize(): Promise<void>;
    /**
     * 技能清理（可选）
     * 在技能卸载时调用
     */
    cleanup(): Promise<void>;
    /**
     * 执行技能 - 抽象方法，必须由子类实现
     * @param input 技能输入参数
     * @returns 技能执行结果
     */
    abstract execute(input: SkillInput): Promise<SkillOutput>;
    /**
     * 验证输入参数
     * @param input 输入参数
     * @returns 验证错误列表，空数组表示验证通过
     */
    validateInput(input: SkillInput): string[];
    /**
     * 生成标准化的成功响应
     * @param data 响应数据
     * @param metadata 额外元数据
     * @returns 标准化的技能输出
     */
    protected createSuccessResponse<T>(data: T, metadata?: Partial<SkillOutput['metadata']>): SkillOutput<T>;
    /**
     * 生成标准化的错误响应
     * @param error 错误信息
     * @param metadata 额外元数据
     * @returns 标准化的技能输出
     */
    protected createErrorResponse(error: string, metadata?: Partial<SkillOutput['metadata']>): SkillOutput;
}
/**
 * 技能工厂函数类型
 * 每个技能模块必须导出此类型的默认函数
 */
export type SkillFactory = () => SkillBase | Promise<SkillBase>;
/**
 * 技能加载器选项
 */
export interface SkillLoaderOptions {
    /** 技能目录路径 */
    skillsDirectory: string;
    /** 是否自动发现技能 */
    autoDiscover?: boolean;
    /** 技能白名单（仅加载指定技能） */
    whitelist?: string[];
    /** 技能黑名单（不加载指定技能） */
    blacklist?: string[];
    /** 环境变量 */
    environment?: Record<string, string>;
}
/**
 * 技能状态
 */
export declare enum SkillStatus {
    /** 未加载 */
    NOT_LOADED = "not_loaded",
    /** 加载中 */
    LOADING = "loading",
    /** 已加载 */
    LOADED = "loaded",
    /** 初始化中 */
    INITIALIZING = "initializing",
    /** 就绪 */
    READY = "ready",
    /** 错误 */
    ERROR = "error",
    /** 卸载中 */
    UNLOADING = "unloading",
    /** 已卸载 */
    UNLOADED = "unloaded"
}
/**
 * 技能实例信息
 */
export interface SkillInstance {
    /** 技能定义 */
    definition: SkillDefinition;
    /** 技能实例 */
    instance: SkillBase;
    /** 技能状态 */
    status: SkillStatus;
    /** 加载时间戳 */
    loadedAt: number;
    /** 最后调用时间戳 */
    lastCalledAt?: number;
    /** 调用次数 */
    callCount: number;
    /** 错误信息（如果状态为ERROR） */
    error?: string;
}
