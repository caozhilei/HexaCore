"use strict";
/**
 * 基于SQLite的记忆存储引擎
 * 实现HexaCore框架的记忆层持久化存储接口
 * 支持向量检索和上下文管理
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryStorage = void 0;
const sqlite3_1 = __importDefault(require("sqlite3"));
const sqlite_1 = require("sqlite");
const retrieval_1 = require("./retrieval");
/**
 * 记忆存储引擎
 * 负责对话历史存储、记忆条目管理和向量检索
 */
class MemoryStorage {
    db = null;
    embeddingService;
    config;
    constructor(config = {}) {
        this.config = {
            dbPath: config.dbPath || ':memory:',
            maxContextTokens: config.maxContextTokens || 200000, // Claude Opus 200K
            compactionThreshold: config.compactionThreshold || 0.8,
            pruningTTL: config.pruningTTL || 86400, // 24小时
            embeddingModel: config.embeddingModel || 'text-embedding-3-small',
            vectorDimension: config.vectorDimension || 1536,
        };
        this.embeddingService = new retrieval_1.EmbeddingService({
            model: this.config.embeddingModel,
            dimension: this.config.vectorDimension,
        });
    }
    /**
     * 初始化数据库连接和表结构
     */
    async initialize() {
        this.db = await (0, sqlite_1.open)({
            filename: this.config.dbPath,
            driver: sqlite3_1.default.Database,
        });
        // 创建对话历史表
        await this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversation_turns (
        id TEXT PRIMARY KEY,
        session_key TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system', 'tool')),
        content TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        token_count INTEGER DEFAULT 0,
        metadata TEXT,
        INDEX idx_session_key (session_key),
        INDEX idx_timestamp (timestamp)
      )
    `);
        // 创建记忆条目表（包含向量）
        await this.db.exec(`
      CREATE TABLE IF NOT EXISTS memory_entries (
        id TEXT PRIMARY KEY,
        session_key TEXT NOT NULL,
        content TEXT NOT NULL,
        embedding BLOB, -- 存储向量序列化
        source_turn_id TEXT,
        category TEXT NOT NULL CHECK(category IN ('preference', 'commitment', 'fact', 'summary')),
        importance REAL DEFAULT 0.5 CHECK(importance >= 0 AND importance <= 1),
        last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
        access_count INTEGER DEFAULT 0,
        metadata TEXT,
        INDEX idx_session_key (session_key),
        INDEX idx_category (category),
        INDEX idx_importance (importance),
        INDEX idx_last_accessed (last_accessed)
      )
    `);
        // 创建向量索引（使用SQLite的R-Tree或自定义索引）
        await this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS memory_embeddings_ft 
      USING rtree(
        id,
        min_x, max_x,
        min_y, max_y,
        min_z, max_z
      ) -- 简化示例，实际需要更高维度的向量索引
    `);
        console.log('记忆存储引擎初始化完成');
    }
    /**
     * 保存对话轮次
     */
    async saveConversationTurn(turn) {
        if (!this.db)
            throw new Error('存储引擎未初始化');
        await this.db.run(`INSERT INTO conversation_turns (id, session_key, role, content, timestamp, token_count, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?)`, [
            turn.id,
            turn.sessionKey,
            turn.role,
            turn.content,
            turn.timestamp.toISOString(),
            turn.tokenCount,
            turn.metadata ? JSON.stringify(turn.metadata) : null,
        ]);
    }
    /**
     * 获取会话的对话历史
     */
    async getConversationHistory(sessionKey, limit = 100) {
        if (!this.db)
            throw new Error('存储引擎未初始化');
        const rows = await this.db.all(`SELECT id, session_key as sessionKey, role, content, timestamp, token_count as tokenCount, metadata
       FROM conversation_turns
       WHERE session_key = ?
       ORDER BY timestamp ASC
       LIMIT ?`, [sessionKey, limit]);
        return rows.map(row => ({
            ...row,
            timestamp: new Date(row.timestamp),
            metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        }));
    }
    /**
     * 计算会话的当前Token使用量
     */
    async calculateTokenUsage(sessionKey) {
        if (!this.db)
            throw new Error('存储引擎未初始化');
        const result = await this.db.get(`SELECT SUM(token_count) as totalTokens
       FROM conversation_turns
       WHERE session_key = ?`, [sessionKey]);
        return result?.totalTokens || 0;
    }
    /**
     * 检查是否需要压缩
     */
    async needsCompaction(sessionKey) {
        const tokenUsage = await this.calculateTokenUsage(sessionKey);
        const usageRatio = tokenUsage / this.config.maxContextTokens;
        return usageRatio >= this.config.compactionThreshold;
    }
    /**
     * 保存记忆条目
     */
    async saveMemoryEntry(entry) {
        if (!this.db)
            throw new Error('存储引擎未初始化');
        const id = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        // 序列化向量
        const embeddingBlob = Buffer.from(new Float32Array(entry.embedding).buffer);
        await this.db.run(`INSERT INTO memory_entries 
       (id, session_key, content, embedding, source_turn_id, category, importance, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
            id,
            entry.sessionKey,
            entry.content,
            embeddingBlob,
            entry.sourceTurnId || null,
            entry.category,
            entry.importance,
            entry.metadata ? JSON.stringify(entry.metadata) : null,
        ]);
        return id;
    }
    /**
     * 更新记忆条目的访问信息
     */
    async updateAccessInfo(memoryId) {
        if (!this.db)
            throw new Error('存储引擎未初始化');
        await this.db.run(`UPDATE memory_entries 
       SET last_accessed = CURRENT_TIMESTAMP, access_count = access_count + 1
       WHERE id = ?`, [memoryId]);
    }
    /**
     * 根据内容搜索相关记忆
     */
    async searchMemories(sessionKey, query, limit = 5) {
        if (!this.db)
            throw new Error('存储引擎未初始化');
        // 获取查询向量
        const queryEmbedding = await this.embeddingService.generateEmbedding(query);
        // 获取该会话的所有记忆条目
        const rows = await this.db.all(`SELECT id, session_key as sessionKey, content, embedding, source_turn_id as sourceTurnId,
              category, importance, last_accessed as lastAccessed, access_count as accessCount, metadata
       FROM memory_entries
       WHERE session_key = ?`, [sessionKey]);
        // 计算相似度并排序
        const memories = rows.map(row => {
            const embeddingBuffer = Buffer.from(row.embedding);
            const embedding = Array.from(new Float32Array(embeddingBuffer.buffer));
            return {
                ...row,
                embedding,
                lastAccessed: new Date(row.lastAccessed),
                metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
            };
        });
        // 计算余弦相似度
        const scoredMemories = memories.map(memory => {
            const similarity = this.cosineSimilarity(queryEmbedding, memory.embedding);
            return { ...memory, similarity };
        });
        // 按相似度排序
        scoredMemories.sort((a, b) => b.similarity - a.similarity);
        // 更新前几名记忆的访问信息
        const topMemories = scoredMemories.slice(0, Math.min(limit, 3));
        for (const memory of topMemories) {
            await this.updateAccessInfo(memory.id);
        }
        return scoredMemories.slice(0, limit).map(({ similarity, ...memory }) => memory);
    }
    /**
     * 清理过期记忆
     */
    async cleanupExpiredMemories(maxAgeDays = 30) {
        if (!this.db)
            throw new Error('存储引擎未初始化');
        const cutoffDate = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);
        const result = await this.db.run(`DELETE FROM memory_entries 
       WHERE last_accessed < ? AND importance < 0.3`, [cutoffDate.toISOString()]);
        return result.changes || 0;
    }
    /**
     * 关闭数据库连接
     */
    async close() {
        if (this.db) {
            await this.db.close();
            this.db = null;
        }
    }
    /**
     * 计算余弦相似度
     */
    cosineSimilarity(vecA, vecB) {
        if (vecA.length !== vecB.length) {
            throw new Error('向量维度不匹配');
        }
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        if (normA === 0 || normB === 0)
            return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}
exports.MemoryStorage = MemoryStorage;
//# sourceMappingURL=storage.js.map