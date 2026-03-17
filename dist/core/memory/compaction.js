"use strict";
/**
 * 压缩算法实现
 * 基于HexaCore框架的Compaction机制，通过摘要生成降低Token成本
 * 实现上下文窗口监控、摘要生成和质量评估
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationCompactor = void 0;
/**
 * 对话压缩器
 * 实现HexaCore框架的Compaction算法
 */
class ConversationCompactor {
    config;
    constructor(config = {}) {
        this.config = {
            enabled: config.enabled ?? true,
            mode: config.mode ?? 'auto',
            threshold: config.threshold ?? 0.8,
            windowSize: config.windowSize ?? 20,
            summaryModel: config.summaryModel ?? 't5-small',
            qualityThreshold: config.qualityThreshold ?? 0.7,
            backupEnabled: config.backupEnabled ?? true,
            maxContextTokens: config.maxContextTokens ?? 200000,
        };
    }
    /**
     * 压缩对话历史
     */
    async compactConversation(sessionKey, conversationHistory, configOverride) {
        const config = configOverride ? { ...this.config, ...configOverride } : this.config;
        // 1. 检查是否需要压缩
        if (!this.needsCompaction(conversationHistory, config.threshold, config.maxContextTokens)) {
            return {
                action: 'skipped',
                tokenSavings: 0,
                compressedHistory: conversationHistory,
                reason: 'below_threshold',
            };
        }
        // 2. 识别可压缩的对话区间
        const compressionWindow = this.identifyCompressionWindow(conversationHistory, config.windowSize);
        // 3. 生成摘要（模拟实现）
        const summary = await this.generateSummary(compressionWindow, config.summaryModel);
        // 4. 质量评估
        const qualityScore = await this.evaluateSummaryQuality(summary, compressionWindow);
        // 5. 检查质量阈值
        if (qualityScore < config.qualityThreshold) {
            return {
                action: 'skipped',
                tokenSavings: 0,
                compressedHistory: conversationHistory,
                reason: 'quality_threshold_not_met',
                qualityScore,
                originalWindow: compressionWindow,
            };
        }
        // 6. 应用压缩
        const compressedHistory = this.applyCompaction(conversationHistory, compressionWindow, summary, sessionKey);
        // 7. 计算Token节约
        const tokenSavings = this.calculateTokenSavings(compressionWindow, summary);
        return {
            action: 'compacted',
            summary,
            qualityScore,
            tokenSavings,
            compressedHistory,
            originalWindow: compressionWindow,
        };
    }
    /**
     * 检查是否需要压缩
     */
    needsCompaction(history, threshold, maxContextTokens) {
        const totalTokens = this.calculateTotalTokens(history);
        const usageRatio = totalTokens / maxContextTokens;
        console.log(`[Compaction] Token使用: ${totalTokens}/${maxContextTokens} = ${usageRatio.toFixed(2)}`);
        return usageRatio >= threshold;
    }
    /**
     * 识别压缩窗口
     */
    identifyCompressionWindow(history, windowSize) {
        if (history.length <= windowSize) {
            return [...history];
        }
        // 保留最近10轮作为活跃上下文，压缩之前的对话
        const keepRecent = 10;
        const startIdx = Math.max(0, history.length - windowSize - keepRecent);
        const endIdx = startIdx + windowSize;
        console.log(`[Compaction] 压缩窗口: ${startIdx}-${endIdx} (共${windowSize}轮)`);
        return history.slice(startIdx, endIdx);
    }
    /**
     * 生成摘要（模拟实现）
     * 实际实现应调用摘要模型如T5/BART
     */
    async generateSummary(window, model) {
        console.log(`[Compaction] 使用模型 ${model} 生成摘要`);
        // 提取关键信息
        const userMessages = window
            .filter(turn => turn.role === 'user')
            .map(turn => turn.content);
        const assistantMessages = window
            .filter(turn => turn.role === 'assistant')
            .map(turn => turn.content);
        // 简单摘要：提取主要话题和决策
        const topics = this.extractTopics([...userMessages, ...assistantMessages]);
        const decisions = this.extractDecisions(assistantMessages);
        const summary = `对话摘要（${window.length}轮）：
- 主要话题：${topics.join('、')}
- 关键决策：${decisions.length > 0 ? decisions.join('；') : '无'}
- 用户关注点：${this.extractUserConcerns(userMessages).join('、')}
- 解决方案：${this.extractSolutions(assistantMessages).join('；')}`;
        return summary;
    }
    /**
     * 评估摘要质量
     */
    async evaluateSummaryQuality(summary, originalWindow) {
        // 模拟ROUGE-L分数计算
        const rougeLScore = this.calculateRougeL(summary, originalWindow.map(t => t.content).join('\n'));
        // 计算覆盖率
        const coverageScore = this.calculateCoverage(summary, this.extractKeyPoints(originalWindow));
        // 综合质量得分
        const qualityScore = rougeLScore * 0.6 + coverageScore * 0.4;
        console.log(`[Compaction] 摘要质量: ROUGE-L=${rougeLScore.toFixed(2)}, 覆盖率=${coverageScore.toFixed(2)}, 总分=${qualityScore.toFixed(2)}`);
        return qualityScore;
    }
    /**
     * 应用压缩：将压缩窗口替换为摘要
     */
    applyCompaction(fullHistory, compressionWindow, summary, sessionKey) {
        if (compressionWindow.length === 0) {
            return fullHistory;
        }
        // 找到压缩窗口在完整历史中的起始索引
        const startIdx = fullHistory.findIndex(turn => turn.id === compressionWindow[0].id);
        if (startIdx === -1) {
            console.warn('[Compaction] 压缩窗口未在完整历史中找到');
            return fullHistory;
        }
        const endIdx = startIdx + compressionWindow.length;
        // 创建摘要轮次
        const summaryTurn = {
            id: `summary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            sessionKey,
            role: 'system',
            content: summary,
            timestamp: new Date(),
            tokenCount: this.estimateTokenCount(summary),
            metadata: {
                compactionType: 'window_summary',
                originalWindowSize: compressionWindow.length,
                originalTokens: this.calculateTotalTokens(compressionWindow),
                timestamp: new Date().toISOString(),
            },
        };
        // 构建压缩后的历史
        const beforeWindow = fullHistory.slice(0, startIdx);
        const afterWindow = fullHistory.slice(endIdx);
        return [...beforeWindow, summaryTurn, ...afterWindow];
    }
    /**
     * 计算Token节约
     */
    calculateTokenSavings(originalWindow, summary) {
        const originalTokens = this.calculateTotalTokens(originalWindow);
        const summaryTokens = this.estimateTokenCount(summary);
        const savings = originalTokens - summaryTokens;
        console.log(`[Compaction] Token节约: ${originalTokens} -> ${summaryTokens} = ${savings} (${(savings / originalTokens * 100).toFixed(1)}%)`);
        return savings;
    }
    /**
     * 计算总Token数
     */
    calculateTotalTokens(turns) {
        return turns.reduce((sum, turn) => sum + turn.tokenCount, 0);
    }
    /**
     * 估算Token数量（简化版）
     */
    estimateTokenCount(text) {
        // 简单估算：英文约1token=4字符，中文约1token=2字符
        const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
        const otherChars = text.length - chineseChars;
        return Math.ceil(chineseChars / 2 + otherChars / 4);
    }
    /**
     * 计算ROUGE-L分数（模拟）
     */
    calculateRougeL(summary, reference) {
        // 简化实现：基于最长公共子序列
        const lcs = this.longestCommonSubsequence(summary, reference);
        const recall = lcs / reference.length;
        const precision = lcs / summary.length;
        if (recall + precision === 0)
            return 0;
        return (2 * recall * precision) / (recall + precision);
    }
    /**
     * 最长公共子序列
     */
    longestCommonSubsequence(text1, text2) {
        const m = text1.length;
        const n = text2.length;
        const dp = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (text1[i - 1] === text2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                }
                else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }
        return dp[m][n];
    }
    /**
     * 计算覆盖率
     */
    calculateCoverage(summary, keyPoints) {
        if (keyPoints.length === 0)
            return 1.0;
        let covered = 0;
        for (const point of keyPoints) {
            if (summary.includes(point)) {
                covered++;
            }
        }
        return covered / keyPoints.length;
    }
    /**
     * 提取关键点
     */
    extractKeyPoints(turns) {
        const keyPoints = [];
        for (const turn of turns) {
            if (turn.role === 'user') {
                // 提取用户问题中的关键名词
                const nouns = this.extractNouns(turn.content);
                keyPoints.push(...nouns);
            }
            else if (turn.role === 'assistant') {
                // 提取助理解释中的结论性语句
                const conclusions = this.extractConclusions(turn.content);
                keyPoints.push(...conclusions);
            }
        }
        // 去重
        return [...new Set(keyPoints)];
    }
    /**
     * 提取话题
     */
    extractTopics(messages) {
        const topics = new Set();
        for (const msg of messages) {
            // 简单关键词提取
            if (msg.includes('天气') || msg.includes('温度') || msg.includes('预报')) {
                topics.add('天气查询');
            }
            if (msg.includes('数据') || msg.includes('分析') || msg.includes('统计')) {
                topics.add('数据分析');
            }
            if (msg.includes('文档') || msg.includes('报告') || msg.includes('生成')) {
                topics.add('文档生成');
            }
            if (msg.includes('客服') || msg.includes('问题') || msg.includes('帮助')) {
                topics.add('客服支持');
            }
        }
        return Array.from(topics);
    }
    /**
     * 提取决策
     */
    extractDecisions(messages) {
        const decisions = [];
        for (const msg of messages) {
            if (msg.includes('决定') || msg.includes('选择') || msg.includes('建议')) {
                const lines = msg.split('\n');
                for (const line of lines) {
                    if (line.includes('：') || line.includes(':')) {
                        decisions.push(line.trim());
                    }
                }
            }
        }
        return decisions;
    }
    /**
     * 提取用户关注点
     */
    extractUserConcerns(messages) {
        const concerns = [];
        for (const msg of messages) {
            if (msg.includes('?') || msg.includes('？') || msg.includes('如何') || msg.includes('为什么')) {
                concerns.push(msg.substring(0, 50) + '...');
            }
        }
        return concerns;
    }
    /**
     * 提取解决方案
     */
    extractSolutions(messages) {
        const solutions = [];
        for (const msg of messages) {
            if (msg.includes('步骤') || msg.includes('方法') || msg.includes('方案')) {
                const lines = msg.split('\n');
                for (const line of lines) {
                    if (line.match(/^\d+\./)) {
                        solutions.push(line.trim());
                    }
                }
            }
        }
        return solutions;
    }
    /**
     * 提取名词（简化版）
     */
    extractNouns(text) {
        // 简单实现：提取长度大于1的中文词
        const words = text.match(/[\u4e00-\u9fa5]{2,}/g) || [];
        return words.slice(0, 5); // 返回前5个
    }
    /**
     * 提取结论（简化版）
     */
    extractConclusions(text) {
        const conclusions = [];
        const sentences = text.split(/[。！？.!?]/);
        for (const sentence of sentences) {
            if (sentence.includes('因此') || sentence.includes('所以') ||
                sentence.includes('结论') || sentence.includes('建议')) {
                conclusions.push(sentence.trim());
            }
        }
        return conclusions;
    }
    /**
     * 获取配置
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * 更新配置
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
}
exports.ConversationCompactor = ConversationCompactor;
//# sourceMappingURL=compaction.js.map