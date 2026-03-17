/**
 * SKILL.md解析器
 * 解析HexaCore标准技能定义文件
 */
import { SkillDefinition } from './framework';
/**
 * SKILL.md解析错误
 */
export declare class SkillParseError extends Error {
    readonly filePath?: string | undefined;
    constructor(message: string, filePath?: string | undefined);
}
/**
 * 从SKILL.md文件解析技能定义
 * @param skillMdPath SKILL.md文件路径
 * @returns 解析后的技能定义
 */
export declare function parseSkillDefinition(skillMdPath: string): Promise<SkillDefinition>;
/**
 * 从技能目录解析技能定义
 * @param skillDirectory 技能目录路径
 * @returns 解析后的技能定义，找不到则返回null
 */
export declare function parseSkillFromDirectory(skillDirectory: string): Promise<SkillDefinition | null>;
/**
 * 扫描技能目录，发现所有技能
 * @param skillsRootDir 技能根目录
 * @returns 所有发现的技能定义
 */
export declare function discoverSkills(skillsRootDir: string): Promise<SkillDefinition[]>;
/**
 * 加载技能实现模块
 * @param definition 技能定义
 * @returns 技能实例
 */
export declare function loadSkillImplementation(definition: SkillDefinition): Promise<any>;
/**
 * 创建技能实例
 * @param definition 技能定义
 * @returns 技能实例
 */
export declare function createSkillInstance(definition: SkillDefinition): Promise<any>;
/**
 * 生成SKILL.md文件模板
 * @param name 技能名称
 * @param description 技能描述
 * @returns SKILL.md文件内容
 */
export declare function generateSkillTemplate(name: string, description: string): string;
