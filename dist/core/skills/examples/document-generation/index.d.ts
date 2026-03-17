/**
 * 文档生成技能实现
 * 支持多种文档类型和输出格式
 */
import { SkillBase, SkillInput, SkillOutput } from '../../framework';
/**
 * 文档生成参数
 */
interface DocumentGenerationParams {
    document_type: 'technical' | 'report' | 'manual' | 'proposal';
    topic: string;
    output_format: 'markdown' | 'html' | 'pdf' | 'word';
    template_name?: string;
}
/**
 * 文档生成结果
 */
interface DocumentGenerationResult {
    document_url: string;
    metadata: {
        generation_time: number;
        word_count: number;
        template_used: string;
        format: string;
    };
}
/**
 * 文档生成技能
 */
export declare class DocumentGenerationSkill extends SkillBase {
    private openaiApiKey;
    private templateDir;
    /**
     * 构造函数
     */
    constructor();
    /**
     * 技能初始化
     */
    initialize(): Promise<void>;
    /**
     * 执行文档生成
     */
    execute(input: SkillInput<DocumentGenerationParams>): Promise<SkillOutput<DocumentGenerationResult>>;
    /**
     * 加载模板
     */
    private loadTemplate;
    /**
     * 获取默认模板
     */
    private getDefaultTemplate;
    /**
     * 生成文档内容
     */
    private generateContent;
    /**
     * 准备模板数据
     */
    private prepareTemplateData;
    /**
     * 格式转换
     */
    private formatContent;
    /**
     * 保存文档
     */
    private saveDocument;
    /**
     * 统计字数
     */
    private countWords;
    /**
     * 技能清理
     */
    cleanup(): Promise<void>;
}
/**
 * 导出工厂函数
 */
export default function createSkill(): DocumentGenerationSkill;
export {};
