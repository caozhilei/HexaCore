"use strict";
/**
 * Memory Sidecar模块
 * 基于HexaCore框架的向量存储和语义检索服务
 * 实现知识提取、向量索引和语义搜索功能
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemorySidecar = void 0;
const retrieval_1 = require("./retrieval");
/**
 * 记忆边车服务
 * 实现HexaCore框架的Memory Sidecar模式
 */
class MemorySidecar {
    config;
    embeddingService;
    knowledgeEntries = new Map();
    extractionCache = new Map();
    syncTimer;
    constructor(config = {}) {
        this.config = {
            enabled: config.enabled ?? true,
            vectorStore: {
                type: config.vectorStore?.type ?? 'sqlite',
                path: config.vectorStore?.path ?? '~/.HexaCore/memory/embeddings.db',
                embeddingModel: config.vectorStore?.embeddingModel ?? 'text-embedding-3-small',
                dimension: config.vectorStore?.dimension ?? 1536,
                batchSize: config.vectorStore?.batchSize ?? 10,
            },
            semanticSearch: {
                topK: config.semanticSearch?.topK ?? 5,
                similarityThreshold: config.semanticSearch?.similarityThreshold ?? 0.7,
                rerankEnabled: config.semanticSearch?.rerankEnabled ?? true,
                minImportanceThreshold: config.semanticSearch?.minImportanceThreshold ?? 0.1,
            },
            knowledgeExtraction: {
                enabled: config.knowledgeExtraction?.enabled ?? true,
                extractors: config.knowledgeExtraction?.extractors ?? [
                    'user_preferences',
                    'commitments',
                    'important_facts',
                ],
                minConfidence: config.knowledgeExtraction?.minConfidence ?? 0.6,
            },
            syncInterval: config.syncInterval ?? 30000, // 30秒
            maxMemoryEntries: config.maxMemoryEntries ?? 10000,
        };
        this.embeddingService = new retrieval_1.EmbeddingService({
            model: this.config.vectorStore.embeddingModel,
            dimension: this.config.vectorStore.dimension,
        });
    }
    /**
     * 初始化边车服务
     */
    async initialize() {
        if (!this.config.enabled) {
            console.log('[Sidecar] 边车服务已禁用');
            return;
        }
        console.log('[Sidecar] 初始化记忆边车服务...');
        // 初始化向量存储（模拟）
        await this.initializeVectorStore();
        // 启动同步定时器
        this.startSyncTimer();
        console.log('[Sidecar] 边车服务初始化完成');
    }
    /**
     * 处理新对话历史，提取知识并存储
     */
    async processConversationHistory(sessionKey, conversationHistory, incremental = true) {
        if (!this.config.enabled) {
            return { extracted: { preferences: [], commitments: [], importantFacts: [] }, storedEntries: [] };
        }
        // 1. 提取知识
        const extractionResult = await this.extractKnowledge(sessionKey, conversationHistory);
        // 2. 存储知识条目
        const storedEntries = [];
        // 存储用户偏好
        for (const preference of extractionResult.preferences) {
            const entry = await this.storeKnowledgeEntry({
                sessionKey,
                content: preference.text,
                category: 'preference',
                confidence: preference.confidence,
                metadata: {
                    context: preference.context,
                    extractionMethod: 'pattern_matching',
                },
            });
            storedEntries.push(entry);
        }
        // 存储承诺事项
        for (const commitment of extractionResult.commitments) {
            const entry = await this.storeKnowledgeEntry({
                sessionKey,
                content: commitment.text,
                category: 'commitment',
                confidence: commitment.confidence,
                metadata: {
                    deadline: commitment.deadline?.toISOString(),
                    extractionMethod: 'deadline_detection',
                },
            });
            storedEntries.push(entry);
        }
        // 存储重要事实
        for (const fact of extractionResult.importantFacts) {
            const entry = await this.storeKnowledgeEntry({
                sessionKey,
                content: fact.text,
                category: 'fact',
                confidence: fact.confidence,
                metadata: {
                    entities: fact.entities,
                    extractionMethod: 'entity_recognition',
                },
            });
            storedEntries.push(entry);
        }
        // 缓存提取结果
        const cacheKey = `${sessionKey}:${conversationHistory.length}`;
        this.extractionCache.set(cacheKey, extractionResult);
        return {
            extracted: extractionResult,
            storedEntries,
        };
    }
    /**
     * 语义搜索记忆
     */
    async searchMemories(sessionKey, query, searchConfig) {
        if (!this.config.enabled) {
            return [];
        }
        // 获取该会话的所有知识条目
        const sessionEntries = Array.from(this.knowledgeEntries.values())
            .filter(entry => entry.sessionKey === sessionKey)
            .filter(entry => entry.confidence >= this.config.semanticSearch.minImportanceThreshold);
        if (sessionEntries.length === 0) {
            return [];
        }
        // 转换为检索格式
        const memories = sessionEntries.map(entry => ({
            id: entry.id,
            content: entry.content,
            embedding: entry.embedding,
            importance: entry.confidence,
            category: entry.category,
            metadata: entry.metadata,
        }));
        // 执行语义搜索
        const results = await this.embeddingService.semanticSearch(query, memories, {
            topK: searchConfig?.topK || this.config.semanticSearch.topK,
            similarityThreshold: searchConfig?.similarityThreshold || this.config.semanticSearch.similarityThreshold,
            rerankEnabled: searchConfig?.rerankEnabled || this.config.semanticSearch.rerankEnabled,
            minImportance: searchConfig?.minImportance || this.config.semanticSearch.minImportanceThreshold,
        });
        // 更新访问信息
        for (const result of results) {
            const entry = this.knowledgeEntries.get(result.id);
            if (entry) {
                entry.lastAccessed = new Date();
                entry.accessCount++;
                this.knowledgeEntries.set(result.id, entry);
            }
        }
        return results;
    }
    /**
     * 获取会话的摘要知识
     */
    async getSessionSummary(sessionKey, maxEntries = 20) {
        const sessionEntries = Array.from(this.knowledgeEntries.values())
            .filter(entry => entry.sessionKey === sessionKey)
            .sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime())
            .slice(0, maxEntries);
        const preferences = sessionEntries
            .filter(entry => entry.category === 'preference')
            .map(entry => entry.content);
        const commitments = sessionEntries
            .filter(entry => entry.category === 'commitment')
            .map(entry => ({
            text: entry.content,
            deadline: entry.metadata?.deadline ? new Date(entry.metadata.deadline) : undefined,
        }));
        const importantFacts = sessionEntries
            .filter(entry => entry.category === 'fact')
            .map(entry => entry.content);
        return {
            preferences,
            commitments,
            importantFacts,
            recentAccesses: sessionEntries,
        };
    }
    /**
     * 清理旧记忆
     */
    async cleanupOldMemories(maxAgeDays = 30, minImportance = 0.2) {
        const cutoffDate = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);
        const oldEntries = Array.from(this.knowledgeEntries.entries())
            .filter(([_, entry]) => entry.lastAccessed < cutoffDate &&
            entry.confidence < minImportance);
        for (const [id] of oldEntries) {
            this.knowledgeEntries.delete(id);
        }
        console.log(`[Sidecar] 清理了 ${oldEntries.length} 条旧记忆`);
        return oldEntries.length;
    }
    /**
     * 关闭边车服务
     */
    async shutdown() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = undefined;
        }
        // 执行最终同步（模拟）
        await this.syncToPersistentStorage();
        console.log('[Sidecar] 边车服务已关闭');
    }
    /**
     * 获取统计信息
     */
    getStats() {
        const categories = {};
        const sessions = new Set();
        for (const entry of this.knowledgeEntries.values()) {
            categories[entry.category] = (categories[entry.category] || 0) + 1;
            sessions.add(entry.sessionKey);
        }
        return {
            totalEntries: this.knowledgeEntries.size,
            sessionsCount: sessions.size,
            categories,
            cacheSize: this.extractionCache.size,
        };
    }
    /**
     * 初始化向量存储（模拟实现）
     */
    async initializeVectorStore() {
        console.log(`[Sidecar] 初始化向量存储: ${this.config.vectorStore.type}`);
        // 模拟SQLite初始化
        if (this.config.vectorStore.type === 'sqlite') {
            // 在实际实现中，这里会建立数据库连接和表结构
            console.log(`[Sidecar] 数据库路径: ${this.config.vectorStore.path}`);
        }
        // 加载现有记忆条目（模拟）
        await this.loadFromPersistentStorage();
    }
    /**
     * 从持久化存储加载记忆（模拟）
     */
    async loadFromPersistentStorage() {
        // 模拟从数据库加载
        console.log('[Sidecar] 从持久化存储加载记忆...');
        // 实际实现中会从SQLite/Redis等加载
    }
    /**
     * 同步到持久化存储（模拟）
     */
    async syncToPersistentStorage() {
        // 模拟同步到数据库
        const entryCount = this.knowledgeEntries.size;
        console.log(`[Sidecar] 同步 ${entryCount} 条记忆到持久化存储...`);
        // 实际实现中会批量写入SQLite/Redis等
    }
    /**
     * 启动同步定时器
     */
    startSyncTimer() {
        this.syncTimer = setInterval(async () => {
            try {
                await this.syncToPersistentStorage();
            }
            catch (error) {
                console.error('[Sidecar] 同步失败:', error);
            }
        }, this.config.syncInterval);
    }
    /**
     * 提取知识：用户偏好、承诺事项、重要事实
     */
    async extractKnowledge(sessionKey, conversationHistory) {
        const result = {
            preferences: [],
            commitments: [],
            importantFacts: [],
        };
        if (!this.config.knowledgeExtraction.enabled) {
            return result;
        }
        const extractors = this.config.knowledgeExtraction.extractors;
        const minConfidence = this.config.knowledgeExtraction.minConfidence;
        for (const turn of conversationHistory) {
            const content = turn.content.toLowerCase();
            // 提取用户偏好
            if (extractors.includes('user_preferences')) {
                const preferences = this.extractUserPreferences(content, turn.role);
                result.preferences.push(...preferences);
            }
            // 提取承诺事项
            if (extractors.includes('commitments')) {
                const commitments = this.extractCommitments(content, turn.role);
                result.commitments.push(...commitments);
            }
            // 提取重要事实
            if (extractors.includes('important_facts')) {
                const facts = this.extractImportantFacts(content, turn.role);
                result.importantFacts.push(...facts);
            }
        }
        // 过滤低置信度结果
        result.preferences = result.preferences.filter(p => p.confidence >= minConfidence);
        result.commitments = result.commitments.filter(c => c.confidence >= minConfidence);
        result.importantFacts = result.importantFacts.filter(f => f.confidence >= minConfidence);
        return result;
    }
    /**
     * 提取用户偏好
     */
    extractUserPreferences(content, role) {
        const preferences = [];
        if (role !== 'user') {
            return preferences;
        }
        // 简单模式匹配
        const patterns = [
            { pattern: /(喜欢|偏好|倾向于|希望).*?(用|使用|采用)/, confidence: 0.8 },
            { pattern: /(不喜欢|讨厌|不希望).*?(用|使用)/, confidence: 0.7 },
            { pattern: /(习惯|通常|一般).*?(做|使用)/, confidence: 0.6 },
        ];
        for (const { pattern, confidence } of patterns) {
            const match = content.match(pattern);
            if (match) {
                preferences.push({
                    text: match[0],
                    confidence,
                    context: content.substring(Math.max(0, match.index - 50), Math.min(content.length, match.index + match[0].length + 50)),
                });
            }
        }
        return preferences;
    }
    /**
     * 提取承诺事项
     */
    extractCommitments(content, role) {
        const commitments = [];
        if (role !== 'assistant') {
            return commitments;
        }
        // 匹配时间表达和承诺性语言
        const timePatterns = [
            { pattern: /(今天|明天|后天|下周|下个月|(\d+)月(\d+)日)/, confidence: 0.9 },
            { pattern: /(尽快|马上|立刻)/, confidence: 0.7 },
        ];
        const commitmentPatterns = [
            { pattern: /(会|将|要|承诺|保证).*?(做|完成|处理)/, confidence: 0.8 },
            { pattern: /(安排|计划|打算).*?(做|完成)/, confidence: 0.7 },
        ];
        // 提取时间和承诺的组合
        for (const timePat of timePatterns) {
            const timeMatch = content.match(timePat.pattern);
            if (timeMatch) {
                for (const commitPat of commitmentPatterns) {
                    const commitMatch = content.match(commitPat.pattern);
                    if (commitMatch) {
                        // 简单计算截止日期（模拟）
                        let deadline;
                        if (timeMatch[0].includes('今天')) {
                            deadline = new Date(Date.now() + 24 * 60 * 60 * 1000);
                        }
                        else if (timeMatch[0].includes('明天')) {
                            deadline = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
                        }
                        commitments.push({
                            text: `${commitMatch[0]}（时间：${timeMatch[0]}）`,
                            deadline,
                            confidence: Math.min(timePat.confidence, commitPat.confidence),
                        });
                    }
                }
            }
        }
        return commitments;
    }
    /**
     * 提取重要事实
     */
    extractImportantFacts(content, role) {
        const facts = [];
        // 匹配事实性陈述
        const factPatterns = [
            { pattern: /(是|为|等于|约为)\s*[\d\.]+/, confidence: 0.9 }, // 数值事实
            { pattern: /(根据|依据|按照).*?(规定|标准|政策)/, confidence: 0.8 }, // 规范性事实
            { pattern: /(包含|包括|有).*?(\d+)\s*个/, confidence: 0.7 }, // 包含性事实
        ];
        for (const { pattern, confidence } of factPatterns) {
            const match = content.match(pattern);
            if (match) {
                // 简单实体提取（模拟）
                const entities = this.extractEntities(match[0]);
                facts.push({
                    text: match[0],
                    entities,
                    confidence,
                });
            }
        }
        return facts;
    }
    /**
     * 提取实体（模拟实现）
     */
    extractEntities(text) {
        const entities = [];
        // 匹配数字
        const numbers = text.match(/[\d\.]+/g);
        if (numbers)
            entities.push(...numbers.map(n => `数值:${n}`));
        // 匹配单位
        const units = text.match(/(元|美元|个|人|天|小时)/g);
        if (units)
            entities.push(...units.map(u => `单位:${u}`));
        return entities;
    }
    /**
     * 存储知识条目
     */
    async storeKnowledgeEntry(data) {
        // 生成嵌入
        const embedding = await this.embeddingService.generateEmbedding(data.content);
        const entry = {
            id: `know_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            sessionKey: data.sessionKey,
            content: data.content,
            embedding,
            category: data.category,
            confidence: data.confidence,
            sourceTurnId: data.sourceTurnId,
            extractedAt: new Date(),
            lastAccessed: new Date(),
            accessCount: 0,
            metadata: data.metadata,
        };
        // 检查数量限制
        if (this.knowledgeEntries.size >= this.config.maxMemoryEntries) {
            // 淘汰最不重要的条目
            await this.evictLeastImportantEntry();
        }
        this.knowledgeEntries.set(entry.id, entry);
        console.log(`[Sidecar] 存储知识条目: ${entry.id} (类别: ${entry.category}, 置信度: ${entry.confidence.toFixed(2)})`);
        return entry;
    }
    /**
     * 淘汰最不重要的条目
     */
    async evictLeastImportantEntry() {
        const entries = Array.from(this.knowledgeEntries.entries());
        if (entries.length === 0)
            return;
        // 按重要性排序
        entries.sort((a, b) => {
            const scoreA = a[1].confidence * (a[1].accessCount / 100);
            const scoreB = b[1].confidence * (b[1].accessCount / 100);
            return scoreA - scoreB; // 升序，最不重要在前
        });
        // 移除最不重要的条目
        const [id, entry] = entries[0];
        this.knowledgeEntries.delete(id);
        console.log(`[Sidecar] 淘汰条目: ${id} (重要性: ${entry.confidence.toFixed(2)}, 访问: ${entry.accessCount})`);
    }
}
exports.MemorySidecar = MemorySidecar;
//# sourceMappingURL=sidecar.js.map