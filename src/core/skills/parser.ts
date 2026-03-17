/**
 * SKILL.md解析器
 * 解析HexaCore标准技能定义文件
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { SkillDefinition, SkillParameterDefinition, SkillOutputDefinition } from './framework';

/**
 * SKILL.md解析错误
 */
export class SkillParseError extends Error {
  constructor(message: string, public readonly filePath?: string) {
    super(message);
    this.name = 'SkillParseError';
  }
}

/**
 * 解析Frontmatter格式（---包裹的YAML）
 */
function parseFrontmatter(content: string): { frontmatter: any; content: string } {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);
  
  if (!match) {
    // 如果没有frontmatter分隔符，整个内容作为markdown
    return { frontmatter: {}, content };
  }
  
  try {
    const frontmatter = yaml.load(match[1]) as any;
    const markdownContent = match[2];
    return { frontmatter, content: markdownContent };
  } catch (error) {
    throw new SkillParseError(`YAML解析失败: ${error.message}`);
  }
}

/**
 * 验证技能定义的基本完整性
 */
function validateSkillDefinition(def: any): void {
  if (!def.name) {
    throw new SkillParseError('技能定义缺少必填字段: name');
  }
  
  if (!def.description) {
    throw new SkillParseError('技能定义缺少必填字段: description');
  }
  
  if (!def.version) {
    throw new SkillParseError('技能定义缺少必填字段: version');
  }
  
  if (!def.tools || !Array.isArray(def.tools)) {
    throw new SkillParseError('技能定义缺少必填字段: tools（必须是数组）');
  }
  
  if (!def.output) {
    throw new SkillParseError('技能定义缺少必填字段: output');
  }
  
  // 验证版本号格式（简化验证）
  const versionRegex = /^\d+\.\d+\.\d+$/;
  if (!versionRegex.test(def.version)) {
    throw new SkillParseError('版本号格式不正确，应为 major.minor.patch 格式');
  }
  
  // 验证参数定义
  if (def.parameters) {
    for (const [paramName, paramDef] of Object.entries(def.parameters as Record<string, any>)) {
      if (!paramDef.type) {
        throw new SkillParseError(`参数 "${paramName}" 缺少 type 字段`);
      }
      
      const validTypes = ['string', 'number', 'boolean', 'object', 'array'];
      if (!validTypes.includes(paramDef.type)) {
        throw new SkillParseError(`参数 "${paramName}" 的 type 必须是以下值之一: ${validTypes.join(', ')}`);
      }
    }
  }
}

/**
 * 转换参数定义
 */
function convertParameterDefinition(def: any): SkillParameterDefinition {
  const result: SkillParameterDefinition = {
    type: def.type,
    description: def.description || '',
    required: def.required || false
  };
  
  if (def.default !== undefined) {
    result.default = def.default;
  }
  
  if (def.min !== undefined) {
    result.min = def.min;
  }
  
  if (def.max !== undefined) {
    result.max = def.max;
  }
  
  if (def.enum && Array.isArray(def.enum)) {
    result.enum = def.enum;
  }
  
  if (def.items && def.type === 'array') {
    result.items = convertParameterDefinition(def.items);
  }
  
  if (def.properties && def.type === 'object') {
    result.properties = {};
    for (const [propName, propDef] of Object.entries(def.properties as Record<string, any>)) {
      result.properties[propName] = convertParameterDefinition(propDef);
    }
  }
  
  return result;
}

/**
 * 转换输出定义
 */
function convertOutputDefinition(def: any): SkillOutputDefinition {
  const result: SkillOutputDefinition = {
    type: def.type,
    description: def.description
  };
  
  if (def.properties && def.type === 'object') {
    result.properties = {};
    for (const [propName, propDef] of Object.entries(def.properties as Record<string, any>)) {
      result.properties[propName] = convertOutputDefinition(propDef);
    }
  }
  
  if (def.items && def.type === 'array') {
    result.items = convertOutputDefinition(def.items);
  }
  
  return result;
}

/**
 * 从SKILL.md文件解析技能定义
 * @param skillMdPath SKILL.md文件路径
 * @returns 解析后的技能定义
 */
export async function parseSkillDefinition(skillMdPath: string): Promise<SkillDefinition> {
  try {
    // 读取文件内容
    const content = await fs.readFile(skillMdPath, 'utf8');
    
    // 解析frontmatter
    const { frontmatter, content: markdownContent } = parseFrontmatter(content);
    
    // 验证基本完整性
    validateSkillDefinition(frontmatter);
    
    // 构建技能定义
    const skillDir = path.dirname(skillMdPath);
    const skillDefinition: SkillDefinition = {
      name: frontmatter.name,
      description: frontmatter.description,
      version: frontmatter.version,
      tools: frontmatter.tools,
      environment: frontmatter.environment || [],
      output: convertOutputDefinition(frontmatter.output),
      directory: skillDir,
      skillMdPath
    };
    
    // 转换参数定义
    if (frontmatter.parameters) {
      skillDefinition.parameters = {};
      for (const [paramName, paramDef] of Object.entries(frontmatter.parameters as Record<string, any>)) {
        skillDefinition.parameters[paramName] = convertParameterDefinition(paramDef);
      }
    }
    
    // 查找实现文件（优先查找index.ts，然后是同名ts文件）
    const possibleImplementationPaths = [
      path.join(skillDir, 'index.ts'),
      path.join(skillDir, 'index.js'),
      path.join(skillDir, `${frontmatter.name}.ts`),
      path.join(skillDir, `${frontmatter.name}.js`)
    ];
    
    for (const implPath of possibleImplementationPaths) {
      try {
        await fs.access(implPath);
        skillDefinition.implementationPath = implPath;
        break;
      } catch {
        // 文件不存在，继续尝试下一个
      }
    }
    
    if (!skillDefinition.implementationPath) {
      console.warn(`技能 "${frontmatter.name}" 未找到实现文件，将无法执行`);
    }
    
    return skillDefinition;
  } catch (error) {
    if (error instanceof SkillParseError) {
      throw error;
    }
    
    throw new SkillParseError(
      `解析SKILL.md文件失败: ${error.message}`,
      skillMdPath
    );
  }
}

/**
 * 从技能目录解析技能定义
 * @param skillDirectory 技能目录路径
 * @returns 解析后的技能定义，找不到则返回null
 */
export async function parseSkillFromDirectory(skillDirectory: string): Promise<SkillDefinition | null> {
  const skillMdPath = path.join(skillDirectory, 'SKILL.md');
  
  try {
    await fs.access(skillMdPath);
    return await parseSkillDefinition(skillMdPath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * 扫描技能目录，发现所有技能
 * @param skillsRootDir 技能根目录
 * @returns 所有发现的技能定义
 */
export async function discoverSkills(skillsRootDir: string): Promise<SkillDefinition[]> {
  try {
    await fs.access(skillsRootDir);
  } catch {
    // 目录不存在，返回空数组
    return [];
  }
  
  const entries = await fs.readdir(skillsRootDir, { withFileTypes: true });
  const skillDefinitions: SkillDefinition[] = [];
  
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const skillDir = path.join(skillsRootDir, entry.name);
      const definition = await parseSkillFromDirectory(skillDir);
      
      if (definition) {
        skillDefinitions.push(definition);
      }
    }
  }
  
  return skillDefinitions;
}

/**
 * 加载技能实现模块
 * @param definition 技能定义
 * @returns 技能实例
 */
export async function loadSkillImplementation(definition: SkillDefinition): Promise<any> {
  if (!definition.implementationPath) {
    throw new SkillParseError(`技能 "${definition.name}" 没有实现文件路径`);
  }
  
  try {
    // 动态导入模块
    const module = await import(definition.implementationPath);
    
    // 查找默认导出（应为工厂函数）
    if (!module.default) {
      throw new SkillParseError(`技能模块 "${definition.name}" 没有默认导出`);
    }
    
    return module.default;
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      throw new SkillParseError(
        `技能实现模块未找到: ${definition.implementationPath}`,
        definition.implementationPath
      );
    }
    
    throw new SkillParseError(
      `加载技能实现失败: ${error.message}`,
      definition.implementationPath
    );
  }
}

/**
 * 创建技能实例
 * @param definition 技能定义
 * @returns 技能实例
 */
export async function createSkillInstance(definition: SkillDefinition): Promise<any> {
  const factory = await loadSkillImplementation(definition);
  
  if (typeof factory !== 'function') {
    throw new SkillParseError(`技能 "${definition.name}" 的默认导出不是函数`);
  }
  
  const instance = await factory();
  
  if (!instance || typeof instance.execute !== 'function') {
    throw new SkillParseError(`技能 "${definition.name}" 实例无效，缺少execute方法`);
  }
  
  // 设置技能定义
  if (instance.setDefinition) {
    instance.setDefinition(definition);
  }
  
  return instance;
}

/**
 * 生成SKILL.md文件模板
 * @param name 技能名称
 * @param description 技能描述
 * @returns SKILL.md文件内容
 */
export function generateSkillTemplate(name: string, description: string): string {
  return `---
name: ${name}
description: ${description}
version: 1.0.0
tools: [read, write]
environment: []
parameters:
  example_param:
    type: string
    description: 示例参数
    required: true
output:
  type: object
  properties:
    result:
      type: string
---

# ${name}

## 功能描述
${description}

## 使用示例
\`\`\`javascript
// 调用示例
const result = await skill.execute({
  parameters: {
    example_param: "示例值"
  },
  context: { /* 执行上下文 */ },
  metadata: { /* 元数据 */ }
});
\`\`\`

## 配置要求
- 环境变量：无特殊要求
- 工具权限：read, write

## 实现说明
请在此处说明技能的实现细节和注意事项。

## 版本历史
- 1.0.0: 初始版本
`;
}
