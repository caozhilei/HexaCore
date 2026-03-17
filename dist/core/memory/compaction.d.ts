/**
 * 压缩算法实现
 * 基于HexaCore框架的Compaction机制，通过摘要生成降低Token成本
 * 实现上下文窗口监控、摘要生成和质量评估
 */
import { ConversationTurn } from './storage';
export interface CompactionConfig {
    enabled: boolean;
    mode: 'auto' | 'manual' | 'disabled';
    threshold: number;
    windowSize: number;
    summaryModel: string;
    qualityThreshold: number;
    backupEnabled: boolean;
    maxContextTokens: number;
}
export interface CompactionResult {
    action: 'compacted' | 'skipped';
    summary?: string;
    qualityScore?: number;
    tokenSavings: number;
    compressedHistory: ConversationTurn[];
    reason?: string;
    originalWindow?: ConversationTurn[];
}
export interface SummaryQualityMetrics {
    rougeLScore: number;
    coverageScore: number;
    keyPointRetention: number;
    readabilityScore: number;
}
/**
 * 对话压缩器
 * 实现HexaCore框架的Compaction算法
 */
export declare class ConversationCompactor {
    private config;
    constructor(config?: Partial<CompactionConfig>);
    /**
     * 压缩对话历史
     */
    compactConversation(sessionKey: string, conversationHistory: ConversationTurn[], configOverride?: Partial<CompactionConfig>): Promise<CompactionResult>;
    /**
     * 检查是否需要压缩
     */
    needsCompaction(history: ConversationTurn[], threshold: number, maxContextTokens: number): boolean;
    /**
     * 识别压缩窗口
     */
    identifyCompressionWindow(history: ConversationTurn[], windowSize: number): ConversationTurn[];
    /**
     * 生成摘要（模拟实现）
     * 实际实现应调用摘要模型如T5/BART
     */
    private generateSummary;
    /**
     * 评估摘要质量
     */
    private evaluateSummaryQuality;
    /**
     * 应用压缩：将压缩窗口替换为摘要
     */
    private applyCompaction;
    /**
     * 计算Token节约
     */
    private calculateTokenSavings;
    /**
     * 计算总Token数
     */
    private calculateTotalTokens;
    /**
     * 估算Token数量（简化版）
     */
    private estimateTokenCount;
    /**
     * 计算ROUGE-L分数（模拟）
     */
    private calculateRougeL;
    /**
     * 最长公共子序列
     */
    private longestCommonSubsequence;
    /**
     * 计算覆盖率
     */
    private calculateCoverage;
    /**
     * 提取关键点
     */
    private extractKeyPoints;
    /**
     * 提取话题
     */
    private extractTopics;
    /**
     * 提取决策
     */
    private extractDecisions;
    /**
     * 提取用户关注点
     */
    private extractUserConcerns;
    /**
     * 提取解决方案
     */
    private extractSolutions;
    /**
     * 提取名词（简化版）
     */
    private extractNouns;
    /**
     * 提取结论（简化版）
     */
    private extractConclusions;
    /**
     * 获取配置
     */
    getConfig(): CompactionConfig;
    /**
     * 更新配置
     */
    updateConfig(newConfig: Partial<CompactionConfig>): void;
}
