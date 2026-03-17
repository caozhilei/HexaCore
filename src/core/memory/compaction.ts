/**
 * 压缩算法实现
 * 基于HexaCore框架的Compaction机制，通过摘要生成降低Token成本
 * 实现上下文窗口监控、摘要生成和质量评估
 */

import { ConversationTurn } from './storage';

export interface CompactionConfig {
  enabled: boolean;
  mode: 'auto' | 'manual' | 'disabled';
  threshold: number; // 压缩触发阈值（上下文使用率）
  windowSize: number; // 每次压缩的对话轮次数
  summaryModel: string; // 使用的摘要模型
  qualityThreshold: number; // 摘要质量阈值
  backupEnabled: boolean; // 是否备份原始对话
  maxContextTokens: number; // 最大上下文Token数
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
export class ConversationCompactor {
  private config: CompactionConfig;

  constructor(config: Partial<CompactionConfig> = {}) {
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
  async compactConversation(
    sessionKey: string,
    conversationHistory: ConversationTurn[],
    configOverride?: Partial<CompactionConfig>
  ): Promise<CompactionResult> {
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
    const compressionWindow = this.identifyCompressionWindow(
      conversationHistory,
      config.windowSize
    );

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
    const compressedHistory = this.applyCompaction(
      conversationHistory,
      compressionWindow,
      summary,
      sessionKey
    );

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
  needsCompaction(
    history: ConversationTurn[],
    threshold: number,
    maxContextTokens: number
  ): boolean {
    const totalTokens = this.calculateTotalTokens(history);
    const usageRatio = totalTokens / maxContextTokens;
    
    console.log(`[Compaction] Token使用: ${totalTokens}/${maxContextTokens} = ${usageRatio.toFixed(2)}`);
    
    return usageRatio >= threshold;
  }

  /**
   * 识别压缩窗口
   */
  identifyCompressionWindow(
    history: ConversationTurn[],
    windowSize: number
  ): ConversationTurn[] {
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
  private async generateSummary(
    window: ConversationTurn[],
    model: string
  ): Promise<string> {
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
  private async evaluateSummaryQuality(
    summary: string,
    originalWindow: ConversationTurn[]
  ): Promise<number> {
    // 模拟ROUGE-L分数计算
    const rougeLScore = this.calculateRougeL(
      summary,
      originalWindow.map(t => t.content).join('\n')
    );
    
    // 计算覆盖率
    const coverageScore = this.calculateCoverage(
      summary,
      this.extractKeyPoints(originalWindow)
    );
    
    // 综合质量得分
    const qualityScore = rougeLScore * 0.6 + coverageScore * 0.4;
    
    console.log(`[Compaction] 摘要质量: ROUGE-L=${rougeLScore.toFixed(2)}, 覆盖率=${coverageScore.toFixed(2)}, 总分=${qualityScore.toFixed(2)}`);
    
    return qualityScore;
  }

  /**
   * 应用压缩：将压缩窗口替换为摘要
   */
  private applyCompaction(
    fullHistory: ConversationTurn[],
    compressionWindow: ConversationTurn[],
    summary: string,
    sessionKey: string
  ): ConversationTurn[] {
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
    const summaryTurn: ConversationTurn = {
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
  private calculateTokenSavings(
    originalWindow: ConversationTurn[],
    summary: string
  ): number {
    const originalTokens = this.calculateTotalTokens(originalWindow);
    const summaryTokens = this.estimateTokenCount(summary);
    
    const savings = originalTokens - summaryTokens;
    console.log(`[Compaction] Token节约: ${originalTokens} -> ${summaryTokens} = ${savings} (${(savings / originalTokens * 100).toFixed(1)}%)`);
    
    return savings;
  }

  /**
   * 计算总Token数
   */
  private calculateTotalTokens(turns: ConversationTurn[]): number {
    return turns.reduce((sum, turn) => sum + turn.tokenCount, 0);
  }

  /**
   * 估算Token数量（简化版）
   */
  private estimateTokenCount(text: string): number {
    // 简单估算：英文约1token=4字符，中文约1token=2字符
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const otherChars = text.length - chineseChars;
    
    return Math.ceil(chineseChars / 2 + otherChars / 4);
  }

  /**
   * 计算ROUGE-L分数（模拟）
   */
  private calculateRougeL(summary: string, reference: string): number {
    // 简化实现：基于最长公共子序列
    const lcs = this.longestCommonSubsequence(summary, reference);
    const recall = lcs / reference.length;
    const precision = lcs / summary.length;
    
    if (recall + precision === 0) return 0;
    return (2 * recall * precision) / (recall + precision);
  }

  /**
   * 最长公共子序列
   */
  private longestCommonSubsequence(text1: string, text2: string): number {
    const m = text1.length;
    const n = text2.length;
    const dp: number[][] = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));
    
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (text1[i - 1] === text2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }
    
    return dp[m][n];
  }

  /**
   * 计算覆盖率
   */
  private calculateCoverage(summary: string, keyPoints: string[]): number {
    if (keyPoints.length === 0) return 1.0;
    
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
  private extractKeyPoints(turns: ConversationTurn[]): string[] {
    const keyPoints: string[] = [];
    
    for (const turn of turns) {
      if (turn.role === 'user') {
        // 提取用户问题中的关键名词
        const nouns = this.extractNouns(turn.content);
        keyPoints.push(...nouns);
      } else if (turn.role === 'assistant') {
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
  private extractTopics(messages: string[]): string[] {
    const topics = new Set<string>();
    
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
  private extractDecisions(messages: string[]): string[] {
    const decisions: string[] = [];
    
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
  private extractUserConcerns(messages: string[]): string[] {
    const concerns: string[] = [];
    
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
  private extractSolutions(messages: string[]): string[] {
    const solutions: string[] = [];
    
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
  private extractNouns(text: string): string[] {
    // 简单实现：提取长度大于1的中文词
    const words = text.match(/[\u4e00-\u9fa5]{2,}/g) || [];
    return words.slice(0, 5); // 返回前5个
  }

  /**
   * 提取结论（简化版）
   */
  private extractConclusions(text: string): string[] {
    const conclusions: string[] = [];
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
  getConfig(): CompactionConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<CompactionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}
