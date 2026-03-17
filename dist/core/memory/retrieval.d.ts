/**
 * 向量检索服务
 * 基于OpenAI Embeddings实现语义搜索和向量相似度计算
 * 遵循HexaCore框架的记忆层检索接口标准
 */
export interface EmbeddingConfig {
    model: string;
    dimension: number;
    apiKey?: string;
    baseURL?: string;
}
export interface SearchConfig {
    topK: number;
    similarityThreshold: number;
    rerankEnabled: boolean;
    minImportance: number;
}
export interface SearchResult {
    id: string;
    content: string;
    similarity: number;
    importance: number;
    category: string;
    metadata?: Record<string, any>;
}
/**
 * 嵌入服务 - 模拟OpenAI Embeddings API
 * 实际实现中应调用真实的OpenAI API
 */
export declare class EmbeddingService {
    private config;
    private cache;
    constructor(config?: Partial<EmbeddingConfig>);
    /**
     * 生成文本的向量嵌入
     * 实际实现中应调用OpenAI API
     */
    generateEmbedding(text: string): Promise<number[]>;
    /**
     * 批量生成嵌入
     */
    generateEmbeddings(texts: string[]): Promise<number[][]>;
    /**
     * 计算余弦相似度
     */
    cosineSimilarity(vecA: number[], vecB: number[]): number;
    /**
     * 语义搜索：根据查询文本检索相关记忆
     */
    semanticSearch(query: string, memories: Array<{
        id: string;
        content: string;
        embedding: number[];
        importance: number;
        category: string;
        metadata?: Record<string, any>;
    }>, config?: Partial<SearchConfig>): Promise<SearchResult[]>;
    /**
     * 重排序 - 模拟交叉编码器
     */
    private rerankWithCrossEncoder;
    /**
     * 生成确定性向量（基于文本哈希）
     */
    private generateDeterministicVector;
    /**
     * 字符串哈希函数
     */
    private hashString;
    /**
     * 创建伪随机数生成器
     */
    private createPRNG;
    /**
     * 归一化向量
     */
    private normalizeVector;
    /**
     * 计算内容相关度（基于简单关键词匹配）
     */
    private calculateContentRelevance;
    /**
     * 计算向量之间的欧氏距离
     */
    euclideanDistance(vecA: number[], vecB: number[]): number;
    /**
     * 查找最近邻（KNN）
     */
    findNearestNeighbors(queryEmbedding: number[], embeddings: number[][], k?: number): Promise<{
        index: number;
        distance: number;
    }[]>;
    /**
     * 清理缓存
     */
    clearCache(): void;
    /**
     * 获取缓存统计信息
     */
    getCacheStats(): {
        size: number;
        hits: number;
    };
}
