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
export class EmbeddingService {
  private config: EmbeddingConfig;
  private cache: Map<string, number[]> = new Map();

  constructor(config: Partial<EmbeddingConfig> = {}) {
    this.config = {
      model: config.model || 'text-embedding-3-small',
      dimension: config.dimension || 1536,
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
      baseURL: config.baseURL || 'https://api.openai.com/v1',
    };
  }

  /**
   * 生成文本的向量嵌入
   * 实际实现中应调用OpenAI API
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // 检查缓存
    const cacheKey = `${this.config.model}:${text}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // 模拟OpenAI Embeddings API调用
    console.log(`[EmbeddingService] 生成嵌入: "${text.substring(0, 50)}..."`);
    
    // 生成模拟向量（随机但确定性的）
    const embedding = this.generateDeterministicVector(text);
    
    // 缓存结果
    this.cache.set(cacheKey, embedding);
    
    return embedding;
  }

  /**
   * 批量生成嵌入
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    
    for (const text of texts) {
      const embedding = await this.generateEmbedding(text);
      embeddings.push(embedding);
    }
    
    return embeddings;
  }

  /**
   * 计算余弦相似度
   */
  cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error(`向量维度不匹配: ${vecA.length} != ${vecB.length}`);
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * 语义搜索：根据查询文本检索相关记忆
   */
  async semanticSearch(
    query: string,
    memories: Array<{ id: string; content: string; embedding: number[]; importance: number; category: string; metadata?: Record<string, any> }>,
    config: Partial<SearchConfig> = {}
  ): Promise<SearchResult[]> {
    const searchConfig: SearchConfig = {
      topK: config.topK || 5,
      similarityThreshold: config.similarityThreshold || 0.7,
      rerankEnabled: config.rerankEnabled || false,
      minImportance: config.minImportance || 0.1,
    };

    // 过滤低重要性记忆
    const filteredMemories = memories.filter(m => m.importance >= searchConfig.minImportance);
    
    if (filteredMemories.length === 0) {
      return [];
    }

    // 生成查询向量
    const queryEmbedding = await this.generateEmbedding(query);
    
    // 计算相似度
    const scoredMemories = filteredMemories.map(memory => {
      const similarity = this.cosineSimilarity(queryEmbedding, memory.embedding);
      return {
        id: memory.id,
        content: memory.content,
        similarity,
        importance: memory.importance,
        category: memory.category,
        metadata: memory.metadata,
      };
    });

    // 按相似度排序
    scoredMemories.sort((a, b) => b.similarity - a.similarity);
    
    // 应用相似度阈值
    const thresholded = scoredMemories.filter(m => m.similarity >= searchConfig.similarityThreshold);
    
    // 应用重排序（简化版）
    let finalResults = thresholded;
    if (searchConfig.rerankEnabled && thresholded.length > 1) {
      finalResults = this.rerankWithCrossEncoder(query, thresholded);
    }

    // 返回TopK结果
    return finalResults.slice(0, searchConfig.topK);
  }

  /**
   * 重排序 - 模拟交叉编码器
   */
  private rerankWithCrossEncoder(query: string, results: SearchResult[]): SearchResult[] {
    // 简化实现：基于内容和重要性进行重排序
    return results.map(result => {
      // 计算内容相关度（简单基于关键词匹配）
      const contentScore = this.calculateContentRelevance(query, result.content);
      const importanceScore = result.importance;
      
      // 综合得分：60%相似度 + 20%内容相关度 + 20%重要性
      const finalScore = result.similarity * 0.6 + contentScore * 0.2 + importanceScore * 0.2;
      
      return { ...result, similarity: finalScore };
    }).sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * 生成确定性向量（基于文本哈希）
   */
  private generateDeterministicVector(text: string): number[] {
    // 使用简单的哈希函数生成确定性向量
    const seed = this.hashString(text);
    const prng = this.createPRNG(seed);
    
    const vector: number[] = [];
    for (let i = 0; i < this.config.dimension; i++) {
      // 生成0-1之间的随机数，然后归一化到单位球面
      vector.push(prng() * 2 - 1); // -1 到 1
    }
    
    // 归一化到单位长度
    return this.normalizeVector(vector);
  }

  /**
   * 字符串哈希函数
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash);
  }

  /**
   * 创建伪随机数生成器
   */
  private createPRNG(seed: number): () => number {
    return function() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }

  /**
   * 归一化向量
   */
  private normalizeVector(vec: number[]): number[] {
    const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
    if (norm === 0) return vec;
    return vec.map(val => val / norm);
  }

  /**
   * 计算内容相关度（基于简单关键词匹配）
   */
  private calculateContentRelevance(query: string, content: string): number {
    const queryWords = new Set(query.toLowerCase().split(/\W+/).filter(w => w.length > 2));
    const contentWords = content.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    
    if (queryWords.size === 0 || contentWords.length === 0) return 0;
    
    let matches = 0;
    for (const word of contentWords) {
      if (queryWords.has(word)) {
        matches++;
      }
    }
    
    // 返回匹配比例
    return Math.min(matches / queryWords.size, 1);
  }

  /**
   * 计算向量之间的欧氏距离
   */
  euclideanDistance(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error(`向量维度不匹配: ${vecA.length} != ${vecB.length}`);
    }
    
    let sum = 0;
    for (let i = 0; i < vecA.length; i++) {
      const diff = vecA[i] - vecB[i];
      sum += diff * diff;
    }
    
    return Math.sqrt(sum);
  }

  /**
   * 查找最近邻（KNN）
   */
  async findNearestNeighbors(
    queryEmbedding: number[],
    embeddings: number[][],
    k: number = 5
  ): Promise<{ index: number; distance: number }[]> {
    const distances = embeddings.map((embedding, index) => ({
      index,
      distance: this.euclideanDistance(queryEmbedding, embedding),
    }));
    
    distances.sort((a, b) => a.distance - b.distance);
    return distances.slice(0, k);
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): { size: number; hits: number } {
    // 简化实现
    return { size: this.cache.size, hits: 0 };
  }
}
