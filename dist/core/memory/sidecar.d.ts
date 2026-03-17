/**
 * Memory Sidecar模块
 * 基于HexaCore框架的向量存储和语义检索服务
 * 实现知识提取、向量索引和语义搜索功能
 */
import { SearchResult, SearchConfig } from './retrieval';
export interface SidecarConfig {
    enabled: boolean;
    vectorStore: {
        type: 'sqlite' | 'redis' | 'pinecone';
        path?: string;
        embeddingModel: string;
        dimension: number;
        batchSize: number;
    };
    semanticSearch: {
        topK: number;
        similarityThreshold: number;
        rerankEnabled: boolean;
        minImportanceThreshold: number;
    };
    knowledgeExtraction: {
        enabled: boolean;
        extractors: ('user_preferences' | 'commitments' | 'important_facts')[];
        minConfidence: number;
    };
    syncInterval: number;
    maxMemoryEntries: number;
}
export interface KnowledgeEntry {
    id: string;
    sessionKey: string;
    content: string;
    embedding: number[];
    category: 'preference' | 'commitment' | 'fact' | 'summary';
    confidence: number;
    sourceTurnId?: string;
    extractedAt: Date;
    lastAccessed: Date;
    accessCount: number;
    metadata?: Record<string, any>;
}
export interface ExtractionResult {
    preferences: Array<{
        text: string;
        confidence: number;
        context: string;
    }>;
    commitments: Array<{
        text: string;
        deadline?: Date;
        confidence: number;
    }>;
    importantFacts: Array<{
        text: string;
        entities: string[];
        confidence: number;
    }>;
    summary?: string;
}
/**
 * 记忆边车服务
 * 实现HexaCore框架的Memory Sidecar模式
 */
export declare class MemorySidecar {
    private config;
    private embeddingService;
    private knowledgeEntries;
    private extractionCache;
    private syncTimer?;
    constructor(config?: Partial<SidecarConfig>);
    /**
     * 初始化边车服务
     */
    initialize(): Promise<void>;
    /**
     * 处理新对话历史，提取知识并存储
     */
    processConversationHistory(sessionKey: string, conversationHistory: Array<{
        id: string;
        role: string;
        content: string;
        timestamp: Date;
    }>, incremental?: boolean): Promise<{
        extracted: ExtractionResult;
        storedEntries: KnowledgeEntry[];
    }>;
    /**
     * 语义搜索记忆
     */
    searchMemories(sessionKey: string, query: string, searchConfig?: Partial<SearchConfig>): Promise<SearchResult[]>;
    /**
     * 获取会话的摘要知识
     */
    getSessionSummary(sessionKey: string, maxEntries?: number): Promise<{
        preferences: string[];
        commitments: Array<{
            text: string;
            deadline?: Date;
        }>;
        importantFacts: string[];
        recentAccesses: KnowledgeEntry[];
    }>;
    /**
     * 清理旧记忆
     */
    cleanupOldMemories(maxAgeDays?: number, minImportance?: number): Promise<number>;
    /**
     * 关闭边车服务
     */
    shutdown(): Promise<void>;
    /**
     * 获取统计信息
     */
    getStats(): {
        totalEntries: number;
        sessionsCount: number;
        categories: Record<string, number>;
        cacheSize: number;
    };
    /**
     * 初始化向量存储（模拟实现）
     */
    private initializeVectorStore;
    /**
     * 从持久化存储加载记忆（模拟）
     */
    private loadFromPersistentStorage;
    /**
     * 同步到持久化存储（模拟）
     */
    private syncToPersistentStorage;
    /**
     * 启动同步定时器
     */
    private startSyncTimer;
    /**
     * 提取知识：用户偏好、承诺事项、重要事实
     */
    private extractKnowledge;
    /**
     * 提取用户偏好
     */
    private extractUserPreferences;
    /**
     * 提取承诺事项
     */
    private extractCommitments;
    /**
     * 提取重要事实
     */
    private extractImportantFacts;
    /**
     * 提取实体（模拟实现）
     */
    private extractEntities;
    /**
     * 存储知识条目
     */
    private storeKnowledgeEntry;
    /**
     * 淘汰最不重要的条目
     */
    private evictLeastImportantEntry;
}
