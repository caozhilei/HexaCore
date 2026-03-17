/**
 * 技能框架核心模块
 * 基于HexaCore SKILL.md标准的声明式技能框架
 */

// ==================== 核心类型定义 ====================

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
    maxMemory: string;  // 如 "512m"
    maxCpu: number;     // CPU配额（0.0-1.0）
    timeout: number;    // 执行超时（毫秒）
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

// ==================== 技能基类 ====================

/**
 * 技能基类 - 所有技能必须继承此类
 */
export abstract class SkillBase {
  /** 技能定义 */
  protected definition: SkillDefinition;
  
  /**
   * 构造函数
   * @param name 技能名称
   * @param version 技能版本
   * @param description 技能描述
   */
  constructor(name: string, version: string, description?: string) {
    this.definition = {
      name,
      version,
      description: description || '',
      tools: [],
      output: { type: 'object' }
    };
  }
  
  /**
   * 获取技能定义
   */
  getDefinition(): SkillDefinition {
    return this.definition;
  }
  
  /**
   * 设置技能定义
   * @param definition 技能定义
   */
  setDefinition(definition: SkillDefinition): void {
    this.definition = definition;
  }
  
  /**
   * 技能初始化（可选）
   * 在技能加载时调用
   */
  async initialize(): Promise<void> {
    // 默认空实现，子类可重写
  }
  
  /**
   * 技能清理（可选）
   * 在技能卸载时调用
   */
  async cleanup(): Promise<void> {
    // 默认空实现，子类可重写
  }
  
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
  validateInput(input: SkillInput): string[] {
    const errors: string[] = [];
    const { parameters } = this.definition;
    
    if (!parameters) {
      return errors;
    }
    
    for (const [paramName, paramDef] of Object.entries(parameters)) {
      const paramValue = input.parameters[paramName];
      
      // 检查必填参数
      if (paramDef.required && (paramValue === undefined || paramValue === null)) {
        errors.push(`参数 "${paramName}" 是必填项`);
        continue;
      }
      
      // 如果参数未提供且有默认值，跳过进一步验证
      if (paramValue === undefined || paramValue === null) {
        continue;
      }
      
      // 类型验证
      switch (paramDef.type) {
        case 'string':
          if (typeof paramValue !== 'string') {
            errors.push(`参数 "${paramName}" 必须是字符串类型`);
          } else if (paramDef.enum && !paramDef.enum.includes(paramValue)) {
            errors.push(`参数 "${paramName}" 必须是以下值之一: ${paramDef.enum.join(', ')}`);
          }
          break;
          
        case 'number':
          if (typeof paramValue !== 'number' || isNaN(paramValue)) {
            errors.push(`参数 "${paramName}" 必须是数字类型`);
          } else {
            if (paramDef.min !== undefined && paramValue < paramDef.min) {
              errors.push(`参数 "${paramName}" 不能小于 ${paramDef.min}`);
            }
            if (paramDef.max !== undefined && paramValue > paramDef.max) {
              errors.push(`参数 "${paramName}" 不能大于 ${paramDef.max}`);
            }
          }
          break;
          
        case 'boolean':
          if (typeof paramValue !== 'boolean') {
            errors.push(`参数 "${paramName}" 必须是布尔类型`);
          }
          break;
          
        case 'array':
          if (!Array.isArray(paramValue)) {
            errors.push(`参数 "${paramName}" 必须是数组类型`);
          } else if (paramDef.items) {
            // 验证数组元素类型
            for (let i = 0; i < paramValue.length; i++) {
              // 简化验证，实际应递归验证
              const elementType = typeof paramValue[i];
              const expectedType = paramDef.items.type;
              if (elementType !== expectedType && expectedType !== 'object') {
                errors.push(`参数 "${paramName}[${i}]" 类型应为 ${expectedType}，实际为 ${elementType}`);
              }
            }
          }
          break;
          
        case 'object':
          if (typeof paramValue !== 'object' || paramValue === null || Array.isArray(paramValue)) {
            errors.push(`参数 "${paramName}" 必须是对象类型`);
          }
          break;
      }
    }
    
    return errors;
  }
  
  /**
   * 生成标准化的成功响应
   * @param data 响应数据
   * @param metadata 额外元数据
   * @returns 标准化的技能输出
   */
  protected createSuccessResponse<T>(
    data: T,
    metadata: Partial<SkillOutput['metadata']> = {}
  ): SkillOutput<T> {
    const baseMetadata = {
      timestamp: new Date().toISOString(),
      skillName: this.definition.name,
      skillVersion: this.definition.version,
      cacheable: true,
      ttl: 1800, // 30分钟默认缓存
      ...metadata
    };
    
    return {
      success: true,
      data,
      metadata: baseMetadata
    };
  }
  
  /**
   * 生成标准化的错误响应
   * @param error 错误信息
   * @param metadata 额外元数据
   * @returns 标准化的技能输出
   */
  protected createErrorResponse(
    error: string,
    metadata: Partial<SkillOutput['metadata']> = {}
  ): SkillOutput {
    const baseMetadata = {
      timestamp: new Date().toISOString(),
      skillName: this.definition.name,
      skillVersion: this.definition.version,
      ...metadata
    };
    
    return {
      success: false,
      error,
      metadata: baseMetadata
    };
  }
}

// ==================== 技能工厂类型 ====================

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
export enum SkillStatus {
  /** 未加载 */
  NOT_LOADED = 'not_loaded',
  /** 加载中 */
  LOADING = 'loading',
  /** 已加载 */
  LOADED = 'loaded',
  /** 初始化中 */
  INITIALIZING = 'initializing',
  /** 就绪 */
  READY = 'ready',
  /** 错误 */
  ERROR = 'error',
  /** 卸载中 */
  UNLOADING = 'unloading',
  /** 已卸载 */
  UNLOADED = 'unloaded'
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
