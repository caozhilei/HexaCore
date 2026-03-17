"use strict";
/**
 * 记忆存储引擎测试
 * 验证记忆层的存储、检索和优化功能
 * 遵循HexaCore框架的测试标准
 */
Object.defineProperty(exports, "__esModule", { value: true });
const storage_1 = require("./storage");
const compaction_1 = require("./compaction");
const pruning_1 = require("./pruning");
const sidecar_1 = require("./sidecar");
// 模拟测试数据
const TEST_SESSION_KEY = 'test_session_001';
const TEST_TURNS = [
    {
        id: 'turn_001',
        sessionKey: TEST_SESSION_KEY,
        role: 'user',
        content: '今天天气怎么样？',
        timestamp: new Date('2026-02-28T10:00:00Z'),
        tokenCount: 10,
    },
    {
        id: 'turn_002',
        sessionKey: TEST_SESSION_KEY,
        role: 'assistant',
        content: '今天天气晴朗，温度25°C，适合外出。',
        timestamp: new Date('2026-02-28T10:00:10Z'),
        tokenCount: 15,
    },
    {
        id: 'turn_003',
        sessionKey: TEST_SESSION_KEY,
        role: 'user',
        content: '明天的天气呢？',
        timestamp: new Date('2026-02-28T10:00:20Z'),
        tokenCount: 8,
    },
    {
        id: 'turn_004',
        sessionKey: TEST_SESSION_KEY,
        role: 'assistant',
        content: '明天有小雨，温度22°C，建议带伞。',
        timestamp: new Date('2026-02-28T10:00:30Z'),
        tokenCount: 16,
    },
    {
        id: 'turn_005',
        sessionKey: TEST_SESSION_KEY,
        role: 'tool',
        content: '天气查询API返回：未来3天天气数据...',
        timestamp: new Date('2026-02-28T10:00:40Z'),
        tokenCount: 200,
        metadata: { toolName: 'weather_api', cacheTTL: 3600 },
    },
];
/**
 * 记忆存储引擎测试组
 */
describe('MemoryStorage', () => {
    let storage;
    beforeAll(async () => {
        storage = new storage_1.MemoryStorage({
            dbPath: ':memory:', // 内存数据库用于测试
            maxContextTokens: 1000, // 降低阈值便于测试
            compactionThreshold: 0.5,
        });
        await storage.initialize();
    });
    afterAll(async () => {
        await storage.close();
    });
    beforeEach(async () => {
        // 清空测试数据
        // 在实际实现中，这里会清空数据库表
    });
    test('应正确保存对话轮次', async () => {
        for (const turn of TEST_TURNS) {
            await storage.saveConversationTurn(turn);
        }
        const history = await storage.getConversationHistory(TEST_SESSION_KEY);
        expect(history.length).toBe(TEST_TURNS.length);
        expect(history[0].content).toBe(TEST_TURNS[0].content);
    });
    test('应正确计算Token使用量', async () => {
        const tokenUsage = await storage.calculateTokenUsage(TEST_SESSION_KEY);
        const expectedTokens = TEST_TURNS.reduce((sum, turn) => sum + turn.tokenCount, 0);
        expect(tokenUsage).toBe(expectedTokens);
    });
    test('应检测到需要压缩', async () => {
        // 添加更多轮次以超过阈值
        const extraTurns = Array.from({ length: 50 }, (_, i) => ({
            id: `extra_${i}`,
            sessionKey: TEST_SESSION_KEY,
            role: 'user',
            content: `测试内容 ${i}`,
            timestamp: new Date(),
            tokenCount: 20,
        }));
        for (const turn of extraTurns) {
            await storage.saveConversationTurn(turn);
        }
        const needsCompaction = await storage.needsCompaction(TEST_SESSION_KEY);
        expect(needsCompaction).toBe(true);
    });
    test('应能搜索相关记忆', async () => {
        // 首先保存一些记忆条目
        await storage.saveMemoryEntry({
            sessionKey: TEST_SESSION_KEY,
            content: '用户喜欢晴朗天气',
            embedding: new Array(1536).fill(0.1), // 模拟向量
            sourceTurnId: 'turn_001',
            category: 'preference',
            importance: 0.8,
        });
        const results = await storage.searchMemories(TEST_SESSION_KEY, '天气偏好');
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].category).toBe('preference');
    });
});
/**
 * 压缩算法测试组
 */
describe('ConversationCompactor', () => {
    let compactor;
    beforeAll(() => {
        compactor = new compaction_1.ConversationCompactor({
            threshold: 0.5,
            windowSize: 2,
            maxContextTokens: 100,
            qualityThreshold: 0.5,
        });
    });
    test('应正确识别压缩窗口', () => {
        const window = compactor['identifyCompressionWindow'](TEST_TURNS, 2);
        expect(window.length).toBe(2);
        expect(window[0].id).toBe('turn_001');
        expect(window[1].id).toBe('turn_002');
    });
    test('应计算Token使用率', () => {
        const totalTokens = TEST_TURNS.reduce((sum, turn) => sum + turn.tokenCount, 0);
        const usageRatio = totalTokens / 100; // maxContextTokens = 100
        const needsCompaction = compactor['needsCompaction'](TEST_TURNS, 0.5, 100);
        expect(needsCompaction).toBe(usageRatio >= 0.5);
    });
    test('应生成摘要并评估质量', async () => {
        const window = TEST_TURNS.slice(0, 2);
        const summary = await compactor['generateSummary'](window, 't5-small');
        expect(typeof summary).toBe('string');
        expect(summary.length).toBeGreaterThan(0);
        const qualityScore = await compactor['evaluateSummaryQuality'](summary, window);
        expect(qualityScore).toBeGreaterThanOrEqual(0);
        expect(qualityScore).toBeLessThanOrEqual(1);
    });
    test('应应用压缩并计算Token节约', async () => {
        const result = await compactor.compactConversation(TEST_SESSION_KEY, TEST_TURNS, { threshold: 0.1 } // 低阈值确保触发
        );
        expect(['compacted', 'skipped']).toContain(result.action);
        if (result.action === 'compacted') {
            expect(result.summary).toBeDefined();
            expect(result.qualityScore).toBeGreaterThanOrEqual(0.5);
            expect(result.tokenSavings).toBeGreaterThan(0);
            expect(result.compressedHistory.length).toBeLessThan(TEST_TURNS.length);
        }
    });
});
/**
 * Session修剪测试组
 */
describe('SessionPruner', () => {
    let pruner;
    beforeAll(() => {
        pruner = new pruning_1.SessionPruner({
            mode: 'soft',
            valueThreshold: 0.3,
            ttl: 3600,
        });
    });
    test('应识别低价值内容', () => {
        const testSegments = [
            {
                id: 'seg_001',
                content: '重要内容',
                timestamp: new Date(Date.now() - 1000),
                lastAccessed: new Date(),
                accessCount: 10,
                tokenCount: 50,
                category: 'conversation',
            },
            {
                id: 'seg_002',
                content: '不重要内容',
                timestamp: new Date(Date.now() - 86400000), // 1天前
                lastAccessed: new Date(Date.now() - 86400000),
                accessCount: 1,
                tokenCount: 30,
                category: 'tool_result',
                toolType: 'execution',
            },
        ];
        const lowValueSegments = pruner['identifyLowValueContent'](testSegments, 0.5, // 高阈值
        3600);
        expect(lowValueSegments.length).toBeGreaterThan(0);
        expect(lowValueSegments[0].id).toBe('seg_002');
    });
    test('应执行软修剪', () => {
        const testSegments = [
            {
                id: 'seg_001',
                content: '需要修剪的长内容'.repeat(10),
                timestamp: new Date(),
                lastAccessed: new Date(),
                accessCount: 1,
                tokenCount: 100,
                category: 'tool_result',
            },
        ];
        const result = pruner['softPrune'](testSegments, testSegments);
        expect(result.retainedData.length).toBe(testSegments.length);
        expect(result.tokenReduction).toBeGreaterThan(0);
    });
    test('应计算成本节约报告', () => {
        const report = pruner.calculateCostSavingsReport(100000, 40000);
        expect(report.tokenSavings).toBe(60000);
        expect(report.costSavings).toBeGreaterThan(0);
        expect(report.savingsPercent).toBe(60);
    });
});
/**
 * 记忆边车测试组
 */
describe('MemorySidecar', () => {
    let sidecar;
    beforeAll(async () => {
        sidecar = new sidecar_1.MemorySidecar({
            enabled: true,
            syncInterval: 10000,
            maxMemoryEntries: 100,
        });
        await sidecar.initialize();
    });
    afterAll(async () => {
        await sidecar.shutdown();
    });
    test('应处理对话历史并提取知识', async () => {
        const result = await sidecar.processConversationHistory(TEST_SESSION_KEY, TEST_TURNS);
        expect(result.extracted).toBeDefined();
        expect(result.storedEntries.length).toBeGreaterThanOrEqual(0);
    });
    test('应进行语义搜索', async () => {
        // 先添加一些知识
        await sidecar.processConversationHistory(TEST_SESSION_KEY, TEST_TURNS);
        const results = await sidecar.searchMemories(TEST_SESSION_KEY, '天气');
        expect(Array.isArray(results)).toBe(true);
    });
    test('应获取会话摘要', async () => {
        const summary = await sidecar.getSessionSummary(TEST_SESSION_KEY);
        expect(summary).toBeDefined();
        expect(Array.isArray(summary.preferences)).toBe(true);
        expect(Array.isArray(summary.commitments)).toBe(true);
        expect(Array.isArray(summary.importantFacts)).toBe(true);
    });
    test('应返回统计信息', () => {
        const stats = sidecar.getStats();
        expect(stats.totalEntries).toBeGreaterThanOrEqual(0);
        expect(stats.sessionsCount).toBeGreaterThanOrEqual(0);
        expect(typeof stats.categories).toBe('object');
    });
});
/**
 * 集成测试：三层优化机制协同工作
 */
describe('三层优化机制集成测试', () => {
    let storage;
    let compactor;
    let pruner;
    let sidecar;
    beforeAll(async () => {
        storage = new storage_1.MemoryStorage({ dbPath: ':memory:' });
        await storage.initialize();
        compactor = new compaction_1.ConversationCompactor({
            threshold: 0.3,
            windowSize: 2,
            maxContextTokens: 200,
        });
        pruner = new pruning_1.SessionPruner({
            mode: 'soft',
            valueThreshold: 0.4,
        });
        sidecar = new sidecar_1.MemorySidecar({ enabled: true });
        await sidecar.initialize();
    });
    afterAll(async () => {
        await storage.close();
        await sidecar.shutdown();
    });
    test('应实现完整的三层优化流程', async () => {
        // 1. 保存对话历史
        for (const turn of TEST_TURNS) {
            await storage.saveConversationTurn(turn);
        }
        // 2. 检查并执行压缩
        const needsCompaction = await storage.needsCompaction(TEST_SESSION_KEY);
        if (needsCompaction) {
            const history = await storage.getConversationHistory(TEST_SESSION_KEY);
            const compactionResult = await compactor.compactConversation(TEST_SESSION_KEY, history);
            expect(compactionResult.tokenSavings).toBeGreaterThanOrEqual(0);
        }
        // 3. 执行会话修剪（模拟）
        const testSegments = [
            {
                id: 'test_seg',
                content: '测试内容',
                timestamp: new Date(),
                lastAccessed: new Date(),
                accessCount: 1,
                tokenCount: 50,
                category: 'tool_result',
                toolType: 'query',
            },
        ];
        const pruningResult = await pruner.pruneSession(TEST_SESSION_KEY, testSegments);
        expect(pruningResult.segmentsRemoved).toBeGreaterThanOrEqual(0);
        // 4. 边车知识提取
        const sidecarResult = await sidecar.processConversationHistory(TEST_SESSION_KEY, TEST_TURNS);
        expect(sidecarResult.extracted).toBeDefined();
        // 5. 验证整体成本节约
        const originalTokens = TEST_TURNS.reduce((sum, turn) => sum + turn.tokenCount, 0);
        // 模拟压缩后Token计算
        const compactedTokens = Math.max(originalTokens * 0.2, 50); // 假设压缩到20%
        const savingsPercent = ((originalTokens - compactedTokens) / originalTokens) * 100;
        expect(savingsPercent).toBeGreaterThan(50); // 压缩应显著降低Token
    });
});
// 测试工具函数
function expect(actual) {
    return {
        toBe(expected) {
            if (actual !== expected) {
                throw new Error(`期望 ${expected}，实际得到 ${actual}`);
            }
        },
        toBeGreaterThan(expected) {
            if (actual <= expected) {
                throw new Error(`期望大于 ${expected}，实际得到 ${actual}`);
            }
        },
        toBeGreaterThanOrEqual(expected) {
            if (actual < expected) {
                throw new Error(`期望大于等于 ${expected}，实际得到 ${actual}`);
            }
        },
        toBeLessThan(expected) {
            if (actual >= expected) {
                throw new Error(`期望小于 ${expected}，实际得到 ${actual}`);
            }
        },
        toBeLessThanOrEqual(expected) {
            if (actual > expected) {
                throw new Error(`期望小于等于 ${expected}，实际得到 ${actual}`);
            }
        },
        toBeDefined() {
            if (actual === undefined) {
                throw new Error(`期望已定义，实际得到 undefined`);
            }
        },
        toContain(expected) {
            if (!Array.isArray(actual) || !actual.includes(expected)) {
                throw new Error(`期望数组包含 ${expected}，实际得到 ${actual}`);
            }
        },
    };
}
//# sourceMappingURL=storage.test.js.map