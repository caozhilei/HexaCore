/**
 * 路由匹配器实现
 * 
 * 本模块实现了7级匹配规则的具体匹配逻辑：
 * 1. Peer匹配器 - 处理peer.id、peer.kind和peer.metadata的匹配
 * 2. Content匹配器 - 处理关键词和语义匹配
 * 3. Channel匹配器 - 处理渠道匹配
 * 4. Time匹配器 - 处理时间条件匹配
 * 5. Location匹配器 - 处理地理位置匹配
 * 6. Intent匹配器 - 处理意图识别匹配
 * 7. Trust匹配器 - 处理信任级别匹配
 */

import {
  InboundMessage,
  RoutingRule,
  RoutingMatchConditions,
  PeerMatchCondition,
  ContentMatchCondition,
  ContentKeywordCondition,
  TimeMatchCondition,
  LocationMatchCondition,
  IntentMatchCondition,
  TrustMatchCondition
} from './rules';

/**
 * 基础匹配器抽象类
 */
export abstract class BaseMatcher<T> {
  abstract match(
    message: InboundMessage,
    condition: T
  ): boolean | Promise<boolean>;
  
  /**
   * 计算匹配得分（0-1之间）
   */
  abstract calculateScore(
    message: InboundMessage,
    condition: T,
    matched: boolean
  ): number | Promise<number>;
}

/**
 * Peer匹配器
 */
export class PeerMatcher extends BaseMatcher<PeerMatchCondition> {
  match(message: InboundMessage, condition: PeerMatchCondition): boolean {
    if (!condition) return false;
    
    // 检查peer.id精确匹配
    if (condition.id && condition.id !== message.peer.id) {
      return false;
    }
    
    // 检查peer.kind匹配
    if (condition.kind && condition.kind !== message.peer.kind) {
      return false;
    }
    
    // 检查peer.metadata匹配
    if (condition.metadata) {
      if (!message.peer.metadata) return false;
      if (!this.matchMetadata(condition.metadata, message.peer.metadata)) {
        return false;
      }
    }
    
    return true;
  }
  
  calculateScore(message: InboundMessage, condition: PeerMatchCondition, matched: boolean): number {
    if (!matched) return 0;
    
    let score = 0;
    let totalWeights = 0;
    
    // peer.id匹配权重最高
    if (condition.id) {
      totalWeights += 0.5;
      if (condition.id === message.peer.id) {
        score += 0.5;
      }
    }
    
    // peer.kind匹配权重中等
    if (condition.kind) {
      totalWeights += 0.3;
      if (condition.kind === message.peer.kind) {
        score += 0.3;
      }
    }
    
    // peer.metadata匹配权重较低
    if (condition.metadata) {
      totalWeights += 0.2;
      if (this.matchMetadata(condition.metadata, message.peer.metadata || {})) {
        score += 0.2;
      }
    }
    
    return totalWeights > 0 ? score / totalWeights : 1.0;
  }
  
  private matchMetadata(
    ruleMetadata: Record<string, any>,
    messageMetadata: Record<string, any>
  ): boolean {
    for (const [key, condition] of Object.entries(ruleMetadata)) {
      const actualValue = messageMetadata[key];
      
      // 如果规则条件是一个对象，支持复杂匹配运算符
      if (typeof condition === 'object' && condition !== null) {
        if (condition.gt !== undefined && actualValue <= condition.gt) return false;
        if (condition.lt !== undefined && actualValue >= condition.lt) return false;
        if (condition.gte !== undefined && actualValue < condition.gte) return false;
        if (condition.lte !== undefined && actualValue > condition.lte) return false;
        if (condition.eq !== undefined && actualValue !== condition.eq) return false;
        if (condition.in !== undefined && !condition.in.includes(actualValue)) return false;
        if (condition.contains !== undefined && !actualValue?.includes(condition.contains)) return false;
      } else {
        // 简单相等匹配
        if (actualValue !== condition) return false;
      }
    }
    
    return true;
  }
}

/**
 * Content关键词匹配器
 */
export class ContentKeywordMatcher extends BaseMatcher<ContentKeywordCondition | string[]> {
  match(message: InboundMessage, condition: ContentKeywordCondition | string[]): boolean {
    if (!condition) return false;
    
    const text = message.content.text || '';
    if (!text) return false;
    
    let keywordCondition: ContentKeywordCondition;
    if (Array.isArray(condition)) {
      keywordCondition = {
        keywords: condition,
        mode: 'any'
      };
    } else {
      keywordCondition = condition;
    }
    
    const { keywords, mode = 'any' } = keywordCondition;
    if (!keywords || keywords.length === 0) return false;
    
    if (mode === 'any') {
      return keywords.some(keyword => text.includes(keyword));
    } else {
      return keywords.every(keyword => text.includes(keyword));
    }
  }
  
  calculateScore(message: InboundMessage, condition: ContentKeywordCondition | string[], matched: boolean): number {
    if (!matched) return 0;
    
    const text = message.content.text || '';
    let keywordCondition: ContentKeywordCondition;
    if (Array.isArray(condition)) {
      keywordCondition = {
        keywords: condition,
        mode: 'any'
      };
    } else {
      keywordCondition = condition;
    }
    
    const { keywords, mode = 'any' } = keywordCondition;
    
    // 计算关键词命中比例
    if (mode === 'any') {
      // 任意匹配模式下，只要有一个关键词命中就得满分
      return 1.0;
    } else {
      // 所有匹配模式下，计算实际命中的关键词比例
      const matchedKeywords = keywords.filter(keyword => text.includes(keyword));
      return matchedKeywords.length / keywords.length;
    }
  }
}

/**
 * Content语义匹配器
 * 注意：这是一个简化实现，实际生产环境需要集成向量检索服务
 */
export class ContentSemanticMatcher extends BaseMatcher<string> {
  private readonly defaultThreshold = 0.7;
  
  async match(message: InboundMessage, query: string): Promise<boolean> {
    const text = message.content.text || '';
    if (!text) return false;
    
    // 简化实现：使用文本相似度作为语义匹配
    const similarity = await this.calculateSimilarity(text, query);
    return similarity >= this.defaultThreshold;
  }
  
  async calculateScore(message: InboundMessage, query: string, matched: boolean): Promise<number> {
    if (!matched) return 0;
    
    // 返回计算得到的相似度作为得分
    return await this.calculateSimilarity(message.content.text || '', query);
  }
  
  private async calculateSimilarity(text1: string, text2: string): Promise<number> {
    // 简化实现：使用Jaccard相似度
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }
}

/**
 * Channel匹配器
 */
export class ChannelMatcher extends BaseMatcher<string | string[]> {
  match(message: InboundMessage, condition: string | string[]): boolean {
    if (!condition) return false;
    
    if (Array.isArray(condition)) {
      return condition.includes(message.channel);
    } else {
      return condition === message.channel;
    }
  }
  
  calculateScore(message: InboundMessage, condition: string | string[], matched: boolean): number {
    return matched ? 1.0 : 0;
  }
}

/**
 * Time匹配器
 */
export class TimeMatcher extends BaseMatcher<TimeMatchCondition> {
  match(message: InboundMessage, condition: TimeMatchCondition): boolean {
    if (!condition) return false;
    
    const timestamp = message.timestamp;
    const date = new Date(timestamp);
    
    // 检查工作日
    if (condition.weekdays && condition.weekdays.length > 0) {
      const dayOfWeek = date.getDay(); // 0=周日, 1=周一, ..., 6=周六
      if (!condition.weekdays.includes(dayOfWeek)) {
        return false;
      }
    }
    
    // 检查小时范围
    if (condition.startHour !== undefined || condition.endHour !== undefined) {
      const hour = date.getHours();
      if (condition.startHour !== undefined && hour < condition.startHour) {
        return false;
      }
      if (condition.endHour !== undefined && hour >= condition.endHour) {
        return false;
      }
    }
    
    // 检查是否在工作时间（简化实现：9:00-18:00）
    if (condition.businessHours === true) {
      const hour = date.getHours();
      if (hour < 9 || hour >= 18) {
        return false;
      }
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        return false; // 周末
      }
    }
    
    // 排除节假日（简化实现：需要外部节假日数据）
    if (condition.excludeHolidays === true) {
      // 这里需要集成节假日服务
      // 暂时返回true，假设不是节假日
    }
    
    return true;
  }
  
  calculateScore(message: InboundMessage, condition: TimeMatchCondition, matched: boolean): number {
    return matched ? 1.0 : 0;
  }
}

/**
 * Location匹配器
 * 注意：简化实现，实际需要集成地理位置服务
 */
export class LocationMatcher extends BaseMatcher<LocationMatchCondition> {
  match(message: InboundMessage, condition: LocationMatchCondition): boolean {
    if (!condition) return false;
    
    // 从消息元数据中获取位置信息
    const location = message.metadata?.location;
    if (!location) return false;
    
    // 检查国家
    if (condition.country && condition.country !== location.country) {
      return false;
    }
    
    // 检查地区
    if (condition.region && condition.region !== location.region) {
      return false;
    }
    
    // 检查城市
    if (condition.city && condition.city !== location.city) {
      return false;
    }
    
    // 检查坐标（简化实现）
    if (condition.coordinates) {
      const { lat, lng, radius = 1000 } = condition.coordinates;
      const distance = this.calculateDistance(
        lat, lng,
        location.latitude, location.longitude
      );
      if (distance > radius) {
        return false;
      }
    }
    
    return true;
  }
  
  calculateScore(message: InboundMessage, condition: LocationMatchCondition, matched: boolean): number {
    return matched ? 1.0 : 0;
  }
  
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    // 使用Haversine公式计算两点间距离（米）
    const R = 6371000; // 地球半径（米）
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c;
  }
}

/**
 * Intent匹配器
 * 注意：简化实现，实际需要集成意图识别服务
 */
export class IntentMatcher extends BaseMatcher<IntentMatchCondition> {
  match(message: InboundMessage, condition: IntentMatchCondition): boolean {
    if (!condition) return false;
    
    // 从消息元数据中获取意图信息
    const intent = message.metadata?.intent;
    if (!intent) return false;
    
    // 检查意图类别
    if (condition.categories && condition.categories.length > 0) {
      if (!condition.categories.includes(intent.category)) {
        return false;
      }
    }
    
    // 检查置信度阈值
    if (condition.confidenceThreshold !== undefined) {
      if ((intent.confidence || 0) < condition.confidenceThreshold) {
        return false;
      }
    }
    
    return true;
  }
  
  calculateScore(message: InboundMessage, condition: IntentMatchCondition, matched: boolean): number {
    return matched ? 1.0 : 0;
  }
}

/**
 * Trust匹配器
 */
export class TrustMatcher extends BaseMatcher<TrustMatchCondition> {
  match(message: InboundMessage, condition: TrustMatchCondition): boolean {
    if (!condition) return false;
    
    // 从消息元数据中获取信任信息
    const trust = message.metadata?.trust || {};
    
    // 检查信任级别
    if (condition.level && condition.level !== trust.level) {
      return false;
    }
    
    // 检查信任分数阈值
    if (condition.scoreThreshold !== undefined) {
      if ((trust.score || 0) < condition.scoreThreshold) {
        return false;
      }
    }
    
    // 检查是否已验证
    if (condition.verified !== undefined) {
      if (trust.verified !== condition.verified) {
        return false;
      }
    }
    
    return true;
  }
  
  calculateScore(message: InboundMessage, condition: TrustMatchCondition, matched: boolean): number {
    return matched ? 1.0 : 0;
  }
}

/**
 * Account匹配器
 */
export class AccountMatcher extends BaseMatcher<string> {
  match(message: InboundMessage, condition: string): boolean {
    if (!condition) return false;
    return condition === message.accountId;
  }
  
  calculateScore(message: InboundMessage, condition: string, matched: boolean): number {
    return matched ? 1.0 : 0;
  }
}

/**
 * 复合匹配器：组合所有7级匹配器
 */
export class CompositeMatcher {
  private peerMatcher = new PeerMatcher();
  private keywordMatcher = new ContentKeywordMatcher();
  private semanticMatcher = new ContentSemanticMatcher();
  private channelMatcher = new ChannelMatcher();
  private accountMatcher = new AccountMatcher();
  private timeMatcher = new TimeMatcher();
  private locationMatcher = new LocationMatcher();
  private intentMatcher = new IntentMatcher();
  private trustMatcher = new TrustMatcher();
  
  async match(
    message: InboundMessage,
    conditions: RoutingMatchConditions
  ): Promise<{
    matched: boolean;
    scores: Record<string, number>;
    matchedConditions: Partial<RoutingMatchConditions>;
  }> {
    const scores: Record<string, number> = {};
    const matchedConditions: Partial<RoutingMatchConditions> = {};
    
    // 按7级优先级顺序匹配
    let allMatched = true;
    
    // 0. Account匹配 (Priority: High)
    if (conditions.accountId) {
      const matched = this.accountMatcher.match(message, conditions.accountId);
      scores.account = this.accountMatcher.calculateScore(message, conditions.accountId, matched);
      if (matched) matchedConditions.accountId = conditions.accountId;
      allMatched = allMatched && matched;
    }

    // 1. Peer匹配
    if (conditions.peer) {
      const matched = this.peerMatcher.match(message, conditions.peer);
      scores.peer = this.peerMatcher.calculateScore(message, conditions.peer, matched);
      if (matched) matchedConditions.peer = conditions.peer;
      allMatched = allMatched && matched;
    }
    
    // 2. Content关键词匹配
    if (conditions.content?.keywords) {
      const matched = this.keywordMatcher.match(message, conditions.content.keywords);
      scores.contentKeywords = this.keywordMatcher.calculateScore(
        message, conditions.content.keywords, matched
      );
      if (matched) matchedConditions.content = { ...matchedConditions.content, keywords: conditions.content.keywords };
      allMatched = allMatched && matched;
    }
    
    // 3. Channel匹配
    if (conditions.channel) {
      const matched = this.channelMatcher.match(message, conditions.channel);
      scores.channel = this.channelMatcher.calculateScore(message, conditions.channel, matched);
      if (matched) matchedConditions.channel = conditions.channel;
      allMatched = allMatched && matched;
    }
    
    // 4. Time匹配
    if (conditions.time) {
      const matched = this.timeMatcher.match(message, conditions.time);
      scores.time = this.timeMatcher.calculateScore(message, conditions.time, matched);
      if (matched) matchedConditions.time = conditions.time;
      allMatched = allMatched && matched;
    }
    
    // 5. Location匹配
    if (conditions.location) {
      const matched = this.locationMatcher.match(message, conditions.location);
      scores.location = this.locationMatcher.calculateScore(message, conditions.location, matched);
      if (matched) matchedConditions.location = conditions.location;
      allMatched = allMatched && matched;
    }
    
    // 6. Intent匹配
    if (conditions.intent) {
      const matched = this.intentMatcher.match(message, conditions.intent);
      scores.intent = this.intentMatcher.calculateScore(message, conditions.intent, matched);
      if (matched) matchedConditions.intent = conditions.intent;
      allMatched = allMatched && matched;
    }
    
    // 7. Trust匹配
    if (conditions.trust) {
      const matched = this.trustMatcher.match(message, conditions.trust);
      scores.trust = this.trustMatcher.calculateScore(message, conditions.trust, matched);
      if (matched) matchedConditions.trust = conditions.trust;
      allMatched = allMatched && matched;
    }
    
    // 8. Content语义匹配（异步）
    if (conditions.content?.semantic?.query) {
      const matched = await this.semanticMatcher.match(message, conditions.content.semantic.query);
      scores.contentSemantic = await this.semanticMatcher.calculateScore(
        message, conditions.content.semantic.query, matched
      );
      if (matched) matchedConditions.content = { 
        ...matchedConditions.content, 
        semantic: conditions.content.semantic 
      };
      allMatched = allMatched && matched;
    }
    
    // 9. Default规则
    if (conditions.default === true) {
      allMatched = true;
      matchedConditions.default = true;
      scores.default = 1.0;
    }
    
    return {
      matched: allMatched,
      scores,
      matchedConditions
    };
  }
}