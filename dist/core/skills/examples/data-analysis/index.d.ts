/**
 * 数据分析技能实现
 * 支持多种数据格式和多种分析方法
 */
import { SkillBase, SkillInput, SkillOutput } from '../../framework';
/**
 * 数据分析参数
 */
interface DataAnalysisParams {
    file_url: string;
    analysis_type: 'descriptive' | 'correlation' | 'trend' | 'clustering';
    output_format: 'json' | 'csv' | 'chart' | 'report';
}
/**
 * 数据摘要
 */
interface DataSummary {
    row_count: number;
    column_count: number;
    missing_values: number;
    data_types: Record<string, string>;
}
/**
 * 可视化图表
 */
interface Visualization {
    type: string;
    data: any;
    title: string;
}
/**
 * 数据分析结果
 */
interface DataAnalysisResult {
    summary: DataSummary;
    visualizations: Visualization[];
    recommendations: string[];
}
/**
 * 数据分析技能
 */
export declare class DataAnalysisSkill extends SkillBase {
    private redisClient;
    private dbPool;
    /**
     * 构造函数
     */
    constructor();
    /**
     * 初始化连接
     */
    private initializeConnections;
    /**
     * 技能初始化
     */
    initialize(): Promise<void>;
    /**
     * 执行数据分析
     */
    execute(input: SkillInput<DataAnalysisParams>): Promise<SkillOutput<DataAnalysisResult>>;
    /**
     * 加载数据
     */
    private loadData;
    /**
     * 生成模拟数据
     */
    private generateMockData;
    /**
     * 数据清洗
     */
    private cleanData;
    /**
     * 描述性统计分析
     */
    private descriptiveAnalysis;
    /**
     * 相关性分析
     */
    private correlationAnalysis;
    /**
     * 趋势分析
     */
    private trendAnalysis;
    /**
     * 聚类分析
     */
    private clusteringAnalysis;
    /**
     * 生成可视化
     */
    private generateVisualizations;
    /**
     * 生成建议
     */
    private generateRecommendations;
    /**
     * 计算缺失值数量
     */
    private countMissingValues;
    /**
     * 分析数据类型
     */
    private analyzeDataTypes;
    /**
     * 技能清理
     */
    cleanup(): Promise<void>;
}
/**
 * 导出工厂函数
 */
export default function createSkill(): DataAnalysisSkill;
export {};
