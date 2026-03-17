/**
 * 技能管理器
 * 负责技能的全生命周期管理：加载、注册、执行、卸载
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  SkillDefinition,
  SkillBase,
  SkillInput,
  SkillOutput,
  SkillExecutionContext,
  SkillFactory,
  SkillLoaderOptions,
  SkillStatus,
  SkillInstance
} from './framework';
import {
  parseSkillDefinition,
  parseSkillFromDirectory,
  discoverSkills,
  createSkillInstance,
  SkillParseError
} from './parser';

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
export class SkillManager {
  private config: SkillManagerConfig;
  private skills: Map<string, SkillInstance> = new Map();
  private skillDefinitions: Map<string, SkillDefinition> = new Map();
  private status: SkillStatus = SkillStatus.NOT_LOADED;
  private initialized: boolean = false;
  
  /**
   * 构造函数
   * @param config 管理器配置
   */
  constructor(config: SkillManagerConfig) {
    this.config = {
      skillsDirectory: config.skillsDirectory,
      environment: config.environment || process.env,
      defaultTools: config.defaultTools || ['read', 'write', 'exec'],
      autoDiscover: config.autoDiscover ?? true,
      autoInitialize: config.autoInitialize ?? true,
      whitelist: config.whitelist || [],
      blacklist: config.blacklist || [],
      maxSkills: config.maxSkills || 100,
      cacheSize: config.cacheSize || 1000,
    };
  }
  
  /**
   * 初始化管理器
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    this.status = SkillStatus.INITIALIZING;
    
    try {
      // 确保技能目录存在
      await this.ensureSkillsDirectory();
      
      // 自动发现技能
      if (this.config.autoDiscover) {
        await this.discoverAndLoadSkills();
      }
      
      this.initialized = true;
      this.status = SkillStatus.READY;
      
      console.log(`技能管理器初始化完成，已加载 ${this.skills.size} 个技能`);
    } catch (error) {
      this.status = SkillStatus.ERROR;
      throw new Error(`技能管理器初始化失败: ${error.message}`);
    }
  }
  
  /**
   * 确保技能目录存在
   */
  private async ensureSkillsDirectory(): Promise<void> {
    try {
      await fs.access(this.config.skillsDirectory);
    } catch {
      // 目录不存在，创建它
      await fs.mkdir(this.config.skillsDirectory, { recursive: true });
      console.log(`创建技能目录: ${this.config.skillsDirectory}`);
    }
  }
  
  /**
   * 发现并加载技能
   */
  private async discoverAndLoadSkills(): Promise<void> {
    const discovered = await discoverSkills(this.config.skillsDirectory);
    
    for (const definition of discovered) {
      // 检查白名单和黑名单
      if (this.shouldSkipSkill(definition.name)) {
        console.log(`跳过技能 ${definition.name}（被过滤）`);
        continue;
      }
      
      // 检查技能数量限制
      if (this.skills.size >= this.config.maxSkills!) {
        console.warn(`达到最大技能数限制 ${this.config.maxSkills}，跳过技能 ${definition.name}`);
        continue;
      }
      
      try {
        // 加载技能
        await this.loadSkill(definition);
      } catch (error) {
        console.error(`加载技能 ${definition.name} 失败:`, error.message);
        // 记录失败但不阻止其他技能加载
      }
    }
  }
  
  /**
   * 判断是否应跳过某个技能
   */
  private shouldSkipSkill(skillName: string): boolean {
    // 检查黑名单
    if (this.config.blacklist!.includes(skillName)) {
      return true;
    }
    
    // 检查白名单（如果设置了白名单）
    if (this.config.whitelist!.length > 0 && !this.config.whitelist!.includes(skillName)) {
      return true;
    }
    
    return false;
  }
  
  /**
   * 加载单个技能
   * @param definition 技能定义
   */
  async loadSkill(definition: SkillDefinition): Promise<void> {
    const skillName = definition.name;
    
    if (this.skills.has(skillName)) {
      throw new Error(`技能 ${skillName} 已加载`);
    }
    
    console.log(`加载技能: ${skillName} v${definition.version}`);
    
    try {
      // 创建技能实例
      const instance = await createSkillInstance(definition);
      
      // 初始化技能
      let status = SkillStatus.LOADED;
      if (this.config.autoInitialize) {
        try {
          status = SkillStatus.INITIALIZING;
          if (instance.initialize) {
            await instance.initialize();
          }
          status = SkillStatus.READY;
        } catch (initError) {
          status = SkillStatus.ERROR;
          console.error(`技能 ${skillName} 初始化失败:`, initError.message);
        }
      }
      
      // 保存技能实例
      const skillInstance: SkillInstance = {
        definition,
        instance,
        status,
        loadedAt: Date.now(),
        callCount: 0
      };
      
      this.skills.set(skillName, skillInstance);
      this.skillDefinitions.set(skillName, definition);
      
      console.log(`技能 ${skillName} 加载完成，状态: ${status}`);
    } catch (error) {
      console.error(`加载技能 ${skillName} 失败:`, error.message);
      throw error;
    }
  }
  
  /**
   * 从目录加载技能
   * @param skillDirectory 技能目录
   */
  async loadSkillFromDirectory(skillDirectory: string): Promise<void> {
    const definition = await parseSkillFromDirectory(skillDirectory);
    
    if (!definition) {
      throw new Error(`目录 ${skillDirectory} 不是有效的技能目录`);
    }
    
    await this.loadSkill(definition);
  }
  
  /**
   * 卸载技能
   * @param skillName 技能名称
   */
  async unloadSkill(skillName: string): Promise<void> {
    const skillInstance = this.skills.get(skillName);
    
    if (!skillInstance) {
      throw new Error(`技能 ${skillName} 未加载`);
    }
    
    console.log(`卸载技能: ${skillName}`);
    
    try {
      // 清理技能
      skillInstance.status = SkillStatus.UNLOADING;
      if (skillInstance.instance.cleanup) {
        await skillInstance.instance.cleanup();
      }
      
      // 从映射中移除
      this.skills.delete(skillName);
      this.skillDefinitions.delete(skillName);
      
      console.log(`技能 ${skillName} 卸载完成`);
    } catch (error) {
      console.error(`卸载技能 ${skillName} 失败:`, error.message);
      throw error;
    }
  }
  
  /**
   * 重新加载技能
   * @param skillName 技能名称
   */
  async reloadSkill(skillName: string): Promise<void> {
    const skillInstance = this.skills.get(skillName);
    
    if (!skillInstance) {
      throw new Error(`技能 ${skillName} 未加载`);
    }
    
    const definition = skillInstance.definition;
    
    // 先卸载再加载
    try {
      await this.unloadSkill(skillName);
    } catch (unloadError) {
      console.warn(`卸载技能 ${skillName} 失败，尝试强制加载:`, unloadError.message);
    }
    
    await this.loadSkill(definition);
  }
  
  /**
   * 执行技能
   * @param skillName 技能名称
   * @param parameters 参数
   * @param options 执行选项
   * @returns 执行结果
   */
  async executeSkill<T = any>(
    skillName: string,
    parameters: Record<string, any>,
    options: SkillExecuteOptions
  ): Promise<SkillOutput<T>> {
    const skillInstance = this.skills.get(skillName);
    
    if (!skillInstance) {
      return {
        success: false,
        error: `技能 ${skillName} 未加载`,
        metadata: {
          timestamp: new Date().toISOString(),
          skillName,
        }
      };
    }
    
    // 检查技能状态
    if (skillInstance.status !== SkillStatus.READY) {
      return {
        success: false,
        error: `技能 ${skillName} 状态为 ${skillInstance.status}，无法执行`,
        metadata: {
          timestamp: new Date().toISOString(),
          skillName,
        }
      };
    }
    
    // 更新调用信息
    skillInstance.callCount++;
    skillInstance.lastCalledAt = Date.now();
    
    // 构建执行上下文
    const context = this.buildExecutionContext(options);
    
    // 构建技能输入
    const input: SkillInput = {
      parameters,
      context,
      metadata: {
        timestamp: Date.now(),
        callerAgentId: options.callerAgentId,
        sessionId: options.sessionId,
        channelId: options.channelId,
      }
    };
    
    // 验证输入参数
    const validationErrors = skillInstance.instance.validateInput(input);
    if (validationErrors.length > 0) {
      return {
        success: false,
        error: `输入参数验证失败: ${validationErrors.join(', ')}`,
        metadata: {
          timestamp: new Date().toISOString(),
          skillName,
          skillVersion: skillInstance.definition.version,
        }
      };
    }
    
    // 验证权限
    if (options.validatePermissions !== false) {
      const permissionCheck = this.checkPermissions(skillInstance.definition, options);
      if (!permissionCheck.allowed) {
        return {
          success: false,
          error: `权限不足: ${permissionCheck.reason}`,
          metadata: {
            timestamp: new Date().toISOString(),
            skillName,
          }
        };
      }
    }
    
    // 执行技能
    try {
      const startTime = Date.now();
      const result = await skillInstance.instance.execute(input);
      const processingTime = Date.now() - startTime;
      
      // 添加处理时间到元数据
      if (result.metadata) {
        result.metadata.processingTime = processingTime;
        result.metadata.skillName = skillName;
        result.metadata.skillVersion = skillInstance.definition.version;
      }
      
      return result;
    } catch (error) {
      console.error(`执行技能 ${skillName} 失败:`, error);
      
      return {
        success: false,
        error: `技能执行异常: ${error.message}`,
        metadata: {
          timestamp: new Date().toISOString(),
          skillName,
          skillVersion: skillInstance.definition.version,
          processingTime: 0,
        }
      };
    }
  }
  
  /**
   * 构建执行上下文
   */
  private buildExecutionContext(options: SkillExecuteOptions): SkillExecutionContext {
    // 合并资源限制
    const resourceLimits = {
      maxMemory: options.resourceLimits?.maxMemory || '512m',
      maxCpu: options.resourceLimits?.maxCpu || 0.5,
      timeout: options.resourceLimits?.timeout || 30000,
    };
    
    // 构建安全上下文
    const securityContext = {
      permissionLevel: options.securityContext?.permissionLevel || 'standard',
      allowedNetworks: options.securityContext?.allowedNetworks || [],
      allowedFilesystems: options.securityContext?.allowedFilesystems || [],
      resourceLimits,
    };
    
    return {
      availableTools: this.config.defaultTools!,
      environment: this.config.environment!,
      workingDirectory: process.cwd(),
      securityContext,
      session: options.sessionId ? {
        id: options.sessionId,
        channelId: options.channelId || 'default',
        agentId: options.callerAgentId,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
      } : undefined,
    };
  }
  
  /**
   * 检查权限
   */
  private checkPermissions(
    definition: SkillDefinition,
    options: SkillExecuteOptions
  ): { allowed: boolean; reason?: string } {
    const skillTools = definition.tools || [];
    
    // 检查工具权限
    const availableTools = this.config.defaultTools!;
    for (const requiredTool of skillTools) {
      if (!availableTools.includes(requiredTool)) {
        return {
          allowed: false,
          reason: `缺少工具权限: ${requiredTool}`,
        };
      }
    }
    
    // 检查环境变量（简化检查）
    const requiredEnv = definition.environment || [];
    for (const envVar of requiredEnv) {
      if (!this.config.environment![envVar]) {
        return {
          allowed: false,
          reason: `缺少环境变量: ${envVar}`,
        };
      }
    }
    
    // 检查安全级别
    if (options.securityContext?.permissionLevel === 'restricted') {
      // 受限模式下不允许某些高风险工具
      const restrictedTools = ['exec', 'network', 'database_write'];
      const hasRestrictedTool = skillTools.some(tool => restrictedTools.includes(tool));
      if (hasRestrictedTool) {
        return {
          allowed: false,
          reason: '受限模式下不允许使用高风险工具',
        };
      }
    }
    
    return { allowed: true };
  }
  
  /**
   * 获取所有已加载技能
   */
  getAllSkills(): SkillInstance[] {
    return Array.from(this.skills.values());
  }
  
  /**
   * 获取技能定义
   * @param skillName 技能名称
   */
  getSkillDefinition(skillName: string): SkillDefinition | undefined {
    return this.skillDefinitions.get(skillName);
  }
  
  /**
   * 获取技能实例
   * @param skillName 技能名称
   */
  getSkillInstance(skillName: string): SkillInstance | undefined {
    return this.skills.get(skillName);
  }
  
  /**
   * 获取技能状态
   * @param skillName 技能名称
   */
  getSkillStatus(skillName: string): SkillStatus | undefined {
    const instance = this.skills.get(skillName);
    return instance?.status;
  }
  
  /**
   * 检查技能是否存在
   * @param skillName 技能名称
   */
  hasSkill(skillName: string): boolean {
    return this.skills.has(skillName);
  }
  
  /**
   * 获取技能数量
   */
  getSkillCount(): number {
    return this.skills.size;
  }
  
  /**
   * 获取管理器状态
   */
  getStatus(): SkillStatus {
    return this.status;
  }
  
  /**
   * 获取配置
   */
  getConfig(): SkillManagerConfig {
    return { ...this.config };
  }
  
  /**
   * 创建技能目录
   * @param skillName 技能名称
   * @param description 技能描述
   */
  async createSkillDirectory(skillName: string, description: string): Promise<string> {
    const skillDir = path.join(this.config.skillsDirectory, skillName);
    
    // 确保目录不存在
    try {
      await fs.access(skillDir);
      throw new Error(`技能目录 ${skillDir} 已存在`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
    
    // 创建目录
    await fs.mkdir(skillDir, { recursive: true });
    
    // 创建SKILL.md文件
    const skillMdPath = path.join(skillDir, 'SKILL.md');
    const { generateSkillTemplate } = await import('./parser');
    const template = generateSkillTemplate(skillName, description);
    await fs.writeFile(skillMdPath, template, 'utf8');
    
    // 创建基础实现文件
    const indexPath = path.join(skillDir, 'index.ts');
    const indexContent = `/**
 * ${skillName} 技能实现
 */

import { SkillBase, SkillInput, SkillOutput } from '../../framework';

interface ${skillName.charAt(0).toUpperCase() + skillName.slice(1)}Params {
  // 定义技能参数
  example_param: string;
}

interface ${skillName.charAt(0).toUpperCase() + skillName.slice(1)}Result {
  // 定义技能结果
  message: string;
  timestamp: string;
}

export class ${skillName.charAt(0).toUpperCase() + skillName.slice(1)}Skill extends SkillBase {
  constructor() {
    super('${skillName}', '1.0.0', '${description}');
  }
  
  async execute(input: SkillInput<${skillName.charAt(0).toUpperCase() + skillName.slice(1)}Params>): Promise<SkillOutput<${skillName.charAt(0).toUpperCase() + skillName.slice(1)}Result>> {
    const { example_param } = input.parameters;
    
    try {
      // 实现技能逻辑
      const result: ${skillName.charAt(0).toUpperCase() + skillName.slice(1)}Result = {
        message: \`收到参数: \${example_param}\`,
        timestamp: new Date().toISOString(),
      };
      
      return this.createSuccessResponse(result, {
        cacheable: true,
        ttl: 3600,
      });
    } catch (error) {
      return this.createErrorResponse(\`执行失败: \${error.message}\`);
    }
  }
}

// 导出工厂函数
export default function createSkill() {
  return new ${skillName.charAt(0).toUpperCase() + skillName.slice(1)}Skill();
}
`;
    
    await fs.writeFile(indexPath, indexContent, 'utf8');
    
    console.log(`技能目录创建成功: ${skillDir}`);
    return skillDir;
  }
}