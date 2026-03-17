/**
 * 基于SQLite的记忆存储引擎
 * 实现HexaCore框架的记忆层持久化存储接口
 * 支持向量检索和上下文管理
 */
export interface ConversationTurn {
    id: string;
    sessionKey: string;
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    timestamp: Date;
    tokenCount: number;
    metadata?: Record<string, any>;
}
export interface MemoryEntry {
    id: string;
    sessionKey: string;
    content: string;
    embedding: number[];
    sourceTurnId?: string;
    category: 'preference' | 'commitment' | 'fact' | 'summary';
    importance: number;
    lastAccessed: Date;
    accessCount: number;
    metadata?: Record<string, any>;
}
export interface CompactionResult {
    action: 'compacted' | 'skipped';
    summary?: string;
    qualityScore?: number;
    tokenSavings: number;
    compressedHistory: ConversationTurn[];
}
export interface PruningResult {
    action: 'soft_pruned' | 'hard_replaced' | 'skipped';
    segmentsRemoved: number;
    tokenReduction: number;
    retainedData?: any;
    replacedData?: any;
}
export interface StorageConfig {
    dbPath: string;
    maxContextTokens: number;
    compactionThreshold: number;
    pruningTTL: number;
    embeddingModel: string;
    vectorDimension: number;
}
/**
 * 记忆存储引擎
 * 负责对话历史存储、记忆条目管理和向量检索
 */
export declare class MemoryStorage {
    private db;
    private embeddingService;
    private config;
    constructor(config?: Partial<StorageConfig>);
    /**
     * 初始化数据库连接和表结构
     */
    initialize(): Promise<void>;
    /**
     * 保存对话轮次
     */
    saveConversationTurn(turn: ConversationTurn): Promise<void>;
    /**
     * 获取会话的对话历史
     */
    getConversationHistory(sessionKey: string, limit?: number): Promise<ConversationTurn[]>;
    /**
     * 计算会话的当前Token使用量
     */
    calculateTokenUsage(sessionKey: string): Promise<number>;
    /**
     * 检查是否需要压缩
     */
    needsCompaction(sessionKey: string): Promise<boolean>;
    /**
     * 保存记忆条目
     */
    saveMemoryEntry(entry: Omit<MemoryEntry, 'id' | 'lastAccessed' | 'accessCount'>): Promise<string>;
    /**
     * 更新记忆条目的访问信息
     */
    updateAccessInfo(memoryId: string): Promise<void>;
    /**
     * 根据内容搜索相关记忆
     */
    searchMemories(sessionKey: string, query: string, limit?: number): Promise<MemoryEntry[]>;
    /**
     * 清理过期记忆
     */
    cleanupExpiredMemories(maxAgeDays?: number): Promise<number>;
    /**
     * 关闭数据库连接
     */
    close(): Promise<void>;
    /**
     * 计算余弦相似度
     */
    private cosineSimilarity;
}
