"use strict";
/**
 * 技能管理器
 * 负责技能的全生命周期管理：加载、注册、执行、卸载
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkillManager = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const framework_1 = require("./framework");
const parser_1 = require("./parser");
/**
 * 技能管理器
 */
class SkillManager {
    config;
    skills = new Map();
    skillDefinitions = new Map();
    status = framework_1.SkillStatus.NOT_LOADED;
    initialized = false;
    /**
     * 构造函数
     * @param config 管理器配置
     */
    constructor(config) {
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
    async initialize() {
        if (this.initialized) {
            return;
        }
        this.status = framework_1.SkillStatus.INITIALIZING;
        try {
            // 确保技能目录存在
            await this.ensureSkillsDirectory();
            // 自动发现技能
            if (this.config.autoDiscover) {
                await this.discoverAndLoadSkills();
            }
            this.initialized = true;
            this.status = framework_1.SkillStatus.READY;
            console.log(`技能管理器初始化完成，已加载 ${this.skills.size} 个技能`);
        }
        catch (error) {
            this.status = framework_1.SkillStatus.ERROR;
            throw new Error(`技能管理器初始化失败: ${error.message}`);
        }
    }
    /**
     * 确保技能目录存在
     */
    async ensureSkillsDirectory() {
        try {
            await fs.access(this.config.skillsDirectory);
        }
        catch {
            // 目录不存在，创建它
            await fs.mkdir(this.config.skillsDirectory, { recursive: true });
            console.log(`创建技能目录: ${this.config.skillsDirectory}`);
        }
    }
    /**
     * 发现并加载技能
     */
    async discoverAndLoadSkills() {
        const discovered = await (0, parser_1.discoverSkills)(this.config.skillsDirectory);
        for (const definition of discovered) {
            // 检查白名单和黑名单
            if (this.shouldSkipSkill(definition.name)) {
                console.log(`跳过技能 ${definition.name}（被过滤）`);
                continue;
            }
            // 检查技能数量限制
            if (this.skills.size >= this.config.maxSkills) {
                console.warn(`达到最大技能数限制 ${this.config.maxSkills}，跳过技能 ${definition.name}`);
                continue;
            }
            try {
                // 加载技能
                await this.loadSkill(definition);
            }
            catch (error) {
                console.error(`加载技能 ${definition.name} 失败:`, error.message);
                // 记录失败但不阻止其他技能加载
            }
        }
    }
    /**
     * 判断是否应跳过某个技能
     */
    shouldSkipSkill(skillName) {
        // 检查黑名单
        if (this.config.blacklist.includes(skillName)) {
            return true;
        }
        // 检查白名单（如果设置了白名单）
        if (this.config.whitelist.length > 0 && !this.config.whitelist.includes(skillName)) {
            return true;
        }
        return false;
    }
    /**
     * 加载单个技能
     * @param definition 技能定义
     */
    async loadSkill(definition) {
        const skillName = definition.name;
        if (this.skills.has(skillName)) {
            throw new Error(`技能 ${skillName} 已加载`);
        }
        console.log(`加载技能: ${skillName} v${definition.version}`);
        try {
            // 创建技能实例
            const instance = await (0, parser_1.createSkillInstance)(definition);
            // 初始化技能
            let status = framework_1.SkillStatus.LOADED;
            if (this.config.autoInitialize) {
                try {
                    status = framework_1.SkillStatus.INITIALIZING;
                    if (instance.initialize) {
                        await instance.initialize();
                    }
                    status = framework_1.SkillStatus.READY;
                }
                catch (initError) {
                    status = framework_1.SkillStatus.ERROR;
                    console.error(`技能 ${skillName} 初始化失败:`, initError.message);
                }
            }
            // 保存技能实例
            const skillInstance = {
                definition,
                instance,
                status,
                loadedAt: Date.now(),
                callCount: 0
            };
            this.skills.set(skillName, skillInstance);
            this.skillDefinitions.set(skillName, definition);
            console.log(`技能 ${skillName} 加载完成，状态: ${status}`);
        }
        catch (error) {
            console.error(`加载技能 ${skillName} 失败:`, error.message);
            throw error;
        }
    }
    /**
     * 从目录加载技能
     * @param skillDirectory 技能目录
     */
    async loadSkillFromDirectory(skillDirectory) {
        const definition = await (0, parser_1.parseSkillFromDirectory)(skillDirectory);
        if (!definition) {
            throw new Error(`目录 ${skillDirectory} 不是有效的技能目录`);
        }
        await this.loadSkill(definition);
    }
    /**
     * 卸载技能
     * @param skillName 技能名称
     */
    async unloadSkill(skillName) {
        const skillInstance = this.skills.get(skillName);
        if (!skillInstance) {
            throw new Error(`技能 ${skillName} 未加载`);
        }
        console.log(`卸载技能: ${skillName}`);
        try {
            // 清理技能
            skillInstance.status = framework_1.SkillStatus.UNLOADING;
            if (skillInstance.instance.cleanup) {
                await skillInstance.instance.cleanup();
            }
            // 从映射中移除
            this.skills.delete(skillName);
            this.skillDefinitions.delete(skillName);
            console.log(`技能 ${skillName} 卸载完成`);
        }
        catch (error) {
            console.error(`卸载技能 ${skillName} 失败:`, error.message);
            throw error;
        }
    }
    /**
     * 重新加载技能
     * @param skillName 技能名称
     */
    async reloadSkill(skillName) {
        const skillInstance = this.skills.get(skillName);
        if (!skillInstance) {
            throw new Error(`技能 ${skillName} 未加载`);
        }
        const definition = skillInstance.definition;
        // 先卸载再加载
        try {
            await this.unloadSkill(skillName);
        }
        catch (unloadError) {
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
    async executeSkill(skillName, parameters, options) {
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
        if (skillInstance.status !== framework_1.SkillStatus.READY) {
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
        const input = {
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
        }
        catch (error) {
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
    buildExecutionContext(options) {
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
            availableTools: this.config.defaultTools,
            environment: this.config.environment,
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
    checkPermissions(definition, options) {
        const skillTools = definition.tools || [];
        // 检查工具权限
        const availableTools = this.config.defaultTools;
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
            if (!this.config.environment[envVar]) {
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
    getAllSkills() {
        return Array.from(this.skills.values());
    }
    /**
     * 获取技能定义
     * @param skillName 技能名称
     */
    getSkillDefinition(skillName) {
        return this.skillDefinitions.get(skillName);
    }
    /**
     * 获取技能实例
     * @param skillName 技能名称
     */
    getSkillInstance(skillName) {
        return this.skills.get(skillName);
    }
    /**
     * 获取技能状态
     * @param skillName 技能名称
     */
    getSkillStatus(skillName) {
        const instance = this.skills.get(skillName);
        return instance?.status;
    }
    /**
     * 检查技能是否存在
     * @param skillName 技能名称
     */
    hasSkill(skillName) {
        return this.skills.has(skillName);
    }
    /**
     * 获取技能数量
     */
    getSkillCount() {
        return this.skills.size;
    }
    /**
     * 获取管理器状态
     */
    getStatus() {
        return this.status;
    }
    /**
     * 获取配置
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * 创建技能目录
     * @param skillName 技能名称
     * @param description 技能描述
     */
    async createSkillDirectory(skillName, description) {
        const skillDir = path.join(this.config.skillsDirectory, skillName);
        // 确保目录不存在
        try {
            await fs.access(skillDir);
            throw new Error(`技能目录 ${skillDir} 已存在`);
        }
        catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
        // 创建目录
        await fs.mkdir(skillDir, { recursive: true });
        // 创建SKILL.md文件
        const skillMdPath = path.join(skillDir, 'SKILL.md');
        const { generateSkillTemplate } = await Promise.resolve().then(() => __importStar(require('./parser')));
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
exports.SkillManager = SkillManager;
//# sourceMappingURL=manager.js.map