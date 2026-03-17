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
import { InboundMessage, RoutingMatchConditions, PeerMatchCondition, ContentKeywordCondition, TimeMatchCondition, LocationMatchCondition, IntentMatchCondition, TrustMatchCondition } from './rules';
/**
 * 基础匹配器抽象类
 */
export declare abstract class BaseMatcher<T> {
    abstract match(message: InboundMessage, condition: T): boolean | Promise<boolean>;
    /**
     * 计算匹配得分（0-1之间）
     */
    abstract calculateScore(message: InboundMessage, condition: T, matched: boolean): number | Promise<number>;
}
/**
 * Peer匹配器
 */
export declare class PeerMatcher extends BaseMatcher<PeerMatchCondition> {
    match(message: InboundMessage, condition: PeerMatchCondition): boolean;
    calculateScore(message: InboundMessage, condition: PeerMatchCondition, matched: boolean): number;
    private matchMetadata;
}
/**
 * Content关键词匹配器
 */
export declare class ContentKeywordMatcher extends BaseMatcher<ContentKeywordCondition | string[]> {
    match(message: InboundMessage, condition: ContentKeywordCondition | string[]): boolean;
    calculateScore(message: InboundMessage, condition: ContentKeywordCondition | string[], matched: boolean): number;
}
/**
 * Content语义匹配器
 * 注意：这是一个简化实现，实际生产环境需要集成向量检索服务
 */
export declare class ContentSemanticMatcher extends BaseMatcher<string> {
    private readonly defaultThreshold;
    match(message: InboundMessage, query: string): Promise<boolean>;
    calculateScore(message: InboundMessage, query: string, matched: boolean): Promise<number>;
    private calculateSimilarity;
}
/**
 * Channel匹配器
 */
export declare class ChannelMatcher extends BaseMatcher<string | string[]> {
    match(message: InboundMessage, condition: string | string[]): boolean;
    calculateScore(message: InboundMessage, condition: string | string[], matched: boolean): number;
}
/**
 * Time匹配器
 */
export declare class TimeMatcher extends BaseMatcher<TimeMatchCondition> {
    match(message: InboundMessage, condition: TimeMatchCondition): boolean;
    calculateScore(message: InboundMessage, condition: TimeMatchCondition, matched: boolean): number;
}
/**
 * Location匹配器
 * 注意：简化实现，实际需要集成地理位置服务
 */
export declare class LocationMatcher extends BaseMatcher<LocationMatchCondition> {
    match(message: InboundMessage, condition: LocationMatchCondition): boolean;
    calculateScore(message: InboundMessage, condition: LocationMatchCondition, matched: boolean): number;
    private calculateDistance;
}
/**
 * Intent匹配器
 * 注意：简化实现，实际需要集成意图识别服务
 */
export declare class IntentMatcher extends BaseMatcher<IntentMatchCondition> {
    match(message: InboundMessage, condition: IntentMatchCondition): boolean;
    calculateScore(message: InboundMessage, condition: IntentMatchCondition, matched: boolean): number;
}
/**
 * Trust匹配器
 */
export declare class TrustMatcher extends BaseMatcher<TrustMatchCondition> {
    match(message: InboundMessage, condition: TrustMatchCondition): boolean;
    calculateScore(message: InboundMessage, condition: TrustMatchCondition, matched: boolean): number;
}
/**
 * Account匹配器
 */
export declare class AccountMatcher extends BaseMatcher<string> {
    match(message: InboundMessage, condition: string): boolean;
    calculateScore(message: InboundMessage, condition: string, matched: boolean): number;
}
/**
 * 复合匹配器：组合所有7级匹配器
 */
export declare class CompositeMatcher {
    private peerMatcher;
    private keywordMatcher;
    private semanticMatcher;
    private channelMatcher;
    private accountMatcher;
    private timeMatcher;
    private locationMatcher;
    private intentMatcher;
    private trustMatcher;
    match(message: InboundMessage, conditions: RoutingMatchConditions): Promise<{
        matched: boolean;
        scores: Record<string, number>;
        matchedConditions: Partial<RoutingMatchConditions>;
    }>;
}
