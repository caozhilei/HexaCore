"use strict";
/**
 * 路由引擎测试模块
 *
 * 本模块测试路由引擎的核心功能：
 * 1. 基本规则匹配
 * 2. 优先级处理
 * 3. 健康检查与降级
 * 4. 缓存功能
 * 5. 批量路由
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runRoutingTests = runRoutingTests;
const engine_1 = require("./engine");
const examples_1 = require("./examples");
// Mock健康检查器
class MockHealthChecker {
    healthyAgents = new Set();
    setAgentHealth(agentId, healthy) {
        if (healthy) {
            this.healthyAgents.add(agentId);
        }
        else {
            this.healthyAgents.delete(agentId);
        }
    }
    async isAgentHealthy(agentId) {
        return this.healthyAgents.has(agentId);
    }
    async getAgentHealthStatus(agentId) {
        const healthy = this.healthyAgents.has(agentId);
        return {
            healthy,
            score: healthy ? 1.0 : 0.3,
            lastCheck: new Date()
        };
    }
}
describe('路由引擎测试', () => {
    let engine;
    let healthChecker;
    const testConfig = {
        rules: examples_1.simplifiedExampleRules
    };
    const engineOptions = {
        enableCaching: true,
        cacheTTL: 3600,
        enableParallelMatching: false,
        enableHealthCheck: true,
        healthCheckTimeout: 5000
    };
    beforeEach(() => {
        healthChecker = new MockHealthChecker();
        engine = new engine_1.RoutingEngine(testConfig, engineOptions);
        engine.setHealthChecker(healthChecker);
        // 默认所有Agent都健康
        healthChecker.setAgentHealth('vip-agent', true);
        healthChecker.setAgentHealth('pricing-agent', true);
        healthChecker.setAgentHealth('tech-support', true);
        healthChecker.setAgentHealth('general-agent', true);
    });
    afterEach(() => {
        engine.clearCache();
    });
    test('VIP客户规则匹配', async () => {
        const message = (0, examples_1.createTestMessage)({
            channel: 'whatsapp',
            peer: {
                metadata: {
                    tier: 'premium',
                    totalSpending: 15000,
                    customerSince: '2025-03-15'
                }
            },
            content: {
                text: '我需要帮助'
            }
        });
        const result = await engine.route(message);
        expect(result.agentId).toBe('vip-agent');
        expect(result.rulePriority).toBe(examples_1.vipCustomerRule.priority);
        expect(result.score).toBeGreaterThan(0);
    });
    test('价格咨询规则匹配', async () => {
        const message = (0, examples_1.createTestMessage)({
            channel: 'whatsapp',
            peer: {
                metadata: {
                    tier: 'basic', // 非VIP客户
                    totalSpending: 5000
                }
            },
            content: {
                text: '这个产品多少钱？'
            },
            timestamp: new Date('2026-02-28T14:30:00Z') // 工作时间
        });
        const result = await engine.route(message);
        expect(result.agentId).toBe('pricing-agent');
        expect(result.rulePriority).toBe(examples_1.pricingInquiryRule.priority);
    });
    test('技术支持规则匹配', async () => {
        const message = (0, examples_1.createTestMessage)({
            channel: 'web',
            peer: {
                metadata: {
                    department: 'engineering',
                    role: 'developer'
                }
            },
            content: {
                text: '系统出现了一个bug'
            }
        });
        const result = await engine.route(message);
        expect(result.agentId).toBe('tech-support');
        expect(result.rulePriority).toBe(examples_1.techSupportRule.priority);
    });
    test('默认规则匹配', async () => {
        const message = (0, examples_1.createTestMessage)({
            channel: 'telegram', // 未配置的渠道
            peer: {
                metadata: {
                    tier: 'basic',
                    totalSpending: 100
                }
            },
            content: {
                text: '你好'
            }
        });
        const result = await engine.route(message);
        expect(result.agentId).toBe('general-agent');
        expect(result.rulePriority).toBe(examples_1.defaultRule.priority);
        expect(result.matchedConditions.default).toBe(true);
    });
    test('规则优先级处理', async () => {
        // 创建一个同时匹配VIP和价格规则的消息
        const message = (0, examples_1.createTestMessage)({
            channel: 'whatsapp',
            peer: {
                metadata: {
                    tier: 'premium',
                    totalSpending: 15000,
                    customerSince: '2025-03-15'
                }
            },
            content: {
                text: '这个VIP产品价格是多少？'
            },
            timestamp: new Date('2026-02-28T14:30:00Z')
        });
        const result = await engine.route(message);
        // VIP规则优先级（100）应该高于价格规则（90）
        expect(result.agentId).toBe('vip-agent');
        expect(result.rulePriority).toBe(100);
    });
    test('健康检查降级', async () => {
        // 设置vip-agent不健康
        healthChecker.setAgentHealth('vip-agent', false);
        const message = (0, examples_1.createTestMessage)({
            channel: 'whatsapp',
            peer: {
                metadata: {
                    tier: 'premium',
                    totalSpending: 15000,
                    customerSince: '2025-03-15'
                }
            },
            content: {
                text: '我需要帮助'
            }
        });
        const result = await engine.route(message);
        // 应该降级到fallbackAgent（general-agent）
        expect(result.agentId).toBe('general-agent');
    });
    test('缓存功能', async () => {
        const message = (0, examples_1.createTestMessage)({
            channel: 'whatsapp',
            peer: {
                metadata: {
                    tier: 'premium',
                    totalSpending: 15000,
                    customerSince: '2025-03-15'
                }
            },
            content: {
                text: '缓存测试消息'
            }
        });
        // 第一次路由，应该是缓存未命中
        const result1 = await engine.route(message);
        // 第二次路由，应该是缓存命中
        const result2 = await engine.route(message);
        expect(result2.agentId).toBe(result1.agentId);
        expect(result2.rulePriority).toBe(result1.rulePriority);
        // 检查统计信息
        const stats = engine.getStatistics();
        expect(stats.cacheHitRate).toBeGreaterThan(0);
    });
    test('批量路由', async () => {
        const messages = [
            (0, examples_1.createTestMessage)({
                id: 'msg-1',
                channel: 'whatsapp',
                peer: {
                    metadata: { tier: 'premium' }
                },
                content: { text: 'VIP消息' }
            }),
            (0, examples_1.createTestMessage)({
                id: 'msg-2',
                channel: 'web',
                peer: {
                    metadata: { department: 'engineering' }
                },
                content: { text: '技术问题' }
            }),
            (0, examples_1.createTestMessage)({
                id: 'msg-3',
                channel: 'telegram',
                content: { text: '默认消息' }
            })
        ];
        // 启用并行匹配进行测试
        const parallelEngine = new engine_1.RoutingEngine(testConfig, {
            ...engineOptions,
            enableParallelMatching: true
        });
        parallelEngine.setHealthChecker(healthChecker);
        const results = await parallelEngine.routeBatch(messages);
        expect(results).toHaveLength(3);
        expect(results[0].agentId).toBe('vip-agent');
        expect(results[1].agentId).toBe('tech-support');
        expect(results[2].agentId).toBe('general-agent');
    });
    test('配置重加载', async () => {
        const message = (0, examples_1.createTestMessage)({
            channel: 'whatsapp',
            peer: {
                metadata: { tier: 'premium' }
            },
            content: { text: '测试消息' }
        });
        // 初始路由
        const initialResult = await engine.route(message);
        expect(initialResult.agentId).toBe('vip-agent');
        // 创建新配置，禁用VIP规则
        const newConfig = {
            rules: [
                { ...examples_1.vipCustomerRule, enabled: false },
                examples_1.pricingInquiryRule,
                examples_1.techSupportRule,
                examples_1.defaultRule
            ]
        };
        // 重加载配置
        await engine.reloadConfig(newConfig);
        // 重新路由相同的消息
        const newResult = await engine.route(message);
        // 现在应该匹配价格规则（VIP规则已禁用）
        expect(newResult.agentId).toBe('pricing-agent');
    });
    test('引擎状态管理', () => {
        expect(engine.getState()).toBe('idle');
        // 注意：状态在内部方法中更新，这里主要测试获取状态的方法
        expect(['idle', 'matching', 'health_checking', 'routing', 'error']).toContain(engine.getState());
    });
    test('统计信息收集', async () => {
        const message = (0, examples_1.createTestMessage)({
            channel: 'whatsapp',
            peer: {
                metadata: { tier: 'premium' }
            },
            content: { text: '统计测试' }
        });
        // 执行几次路由
        await engine.route(message);
        await engine.route((0, examples_1.createTestMessage)({
            channel: 'telegram',
            content: { text: '另一个测试' }
        }));
        const stats = engine.getStatistics();
        expect(stats.totalMatches).toBe(2);
        expect(stats.successfulMatches).toBe(2);
        expect(stats.successRate).toBe(1.0);
        expect(stats.averageMatchTime).toBeGreaterThan(0);
    });
    test('缓存信息查询', async () => {
        const message = (0, examples_1.createTestMessage)({
            channel: 'whatsapp',
            peer: {
                metadata: { tier: 'premium' }
            },
            content: { text: '缓存查询测试' }
        });
        // 执行路由，会生成缓存
        await engine.route(message);
        const cacheInfo = engine.getCacheInfo();
        expect(cacheInfo.size).toBeGreaterThan(0);
        expect(cacheInfo.hits).toBe(0); // 第一次访问，缓存命中为0
        expect(cacheInfo.misses).toBe(1);
        expect(cacheInfo.items).toHaveLength(cacheInfo.size);
    });
    test('确定性哈希路由', async () => {
        // 创建启用确定性路由的引擎
        const deterministicEngine = new engine_1.RoutingEngine(testConfig, {
            ...engineOptions,
            enableDeterministicRouting: true
        });
        // 创建两个相同的消息（应该路由到相同的Agent）
        const message1 = (0, examples_1.createTestMessage)({
            id: 'msg-a',
            channel: 'whatsapp',
            peer: {
                id: 'user-123',
                metadata: { tier: 'premium' }
            },
            content: { text: '消息1' }
        });
        const message2 = (0, examples_1.createTestMessage)({
            id: 'msg-b',
            channel: 'whatsapp',
            peer: {
                id: 'user-123', // 相同的peer ID
                metadata: { tier: 'premium' }
            },
            content: { text: '消息2' }
        });
        const result1 = await deterministicEngine.route(message1);
        const result2 = await deterministicEngine.route(message2);
        // 确定性路由应该确保相同的消息特征路由到相同的Agent
        expect(result1.agentId).toBe(result2.agentId);
    });
    test('自适应超时', async () => {
        // 测试自适应超时功能
        const adaptiveEngine = new engine_1.RoutingEngine(testConfig, {
            ...engineOptions,
            enableAdaptiveTimeout: true
        });
        // 主要测试配置加载和引擎初始化
        expect(adaptiveEngine).toBeDefined();
        // 具体自适应逻辑需要在生产环境中测试
    });
});
// 运行测试的辅助函数（用于演示）
async function runRoutingTests() {
    console.log('开始路由引擎测试...\n');
    try {
        // 创建测试引擎
        const healthChecker = new MockHealthChecker();
        healthChecker.setAgentHealth('vip-agent', true);
        healthChecker.setAgentHealth('pricing-agent', true);
        healthChecker.setAgentHealth('tech-support', true);
        healthChecker.setAgentHealth('general-agent', true);
        const engine = new engine_1.RoutingEngine({
            rules: examples_1.simplifiedExampleRules
        }, {
            enableCaching: false,
            enableHealthCheck: true
        });
        engine.setHealthChecker(healthChecker);
        // 测试1: VIP客户路由
        console.log('测试1: VIP客户路由');
        const vipMessage = (0, examples_1.createTestMessage)({
            channel: 'whatsapp',
            peer: {
                metadata: {
                    tier: 'premium',
                    totalSpending: 15000,
                    customerSince: '2025-03-15'
                }
            },
            content: { text: '我需要帮助' }
        });
        const vipResult = await engine.route(vipMessage);
        console.log(`  VIP消息路由结果: agentId=${vipResult.agentId}, priority=${vipResult.rulePriority}`);
        console.log(`  测试结果: ${vipResult.agentId === 'vip-agent' ? '✅ 通过' : '❌ 失败'}\n`);
        // 测试2: 价格咨询路由
        console.log('测试2: 价格咨询路由');
        const pricingMessage = (0, examples_1.createTestMessage)({
            channel: 'whatsapp',
            peer: {
                metadata: {
                    tier: 'basic',
                    totalSpending: 5000
                }
            },
            content: { text: '这个产品多少钱？' },
            timestamp: new Date('2026-02-28T14:30:00Z')
        });
        const pricingResult = await engine.route(pricingMessage);
        console.log(`  价格咨询路由结果: agentId=${pricingResult.agentId}, priority=${pricingResult.rulePriority}`);
        console.log(`  测试结果: ${pricingResult.agentId === 'pricing-agent' ? '✅ 通过' : '❌ 失败'}\n`);
        // 测试3: 默认路由
        console.log('测试3: 默认路由');
        const defaultMessage = (0, examples_1.createTestMessage)({
            channel: 'telegram',
            peer: {
                metadata: {
                    tier: 'basic',
                    totalSpending: 100
                }
            },
            content: { text: '你好' }
        });
        const defaultResult = await engine.route(defaultMessage);
        console.log(`  默认路由结果: agentId=${defaultResult.agentId}, priority=${defaultResult.rulePriority}`);
        console.log(`  测试结果: ${defaultResult.agentId === 'general-agent' ? '✅ 通过' : '❌ 失败'}\n`);
        // 测试4: 健康检查降级
        console.log('测试4: 健康检查降级');
        healthChecker.setAgentHealth('vip-agent', false);
        const fallbackResult = await engine.route(vipMessage);
        console.log(`  降级路由结果: agentId=${fallbackResult.agentId}, priority=${fallbackResult.rulePriority}`);
        console.log(`  测试结果: ${fallbackResult.agentId === 'general-agent' ? '✅ 通过' : '❌ 失败'}\n`);
        console.log('所有测试完成！');
    }
    catch (error) {
        console.error('测试过程中出现错误:', error);
        throw error;
    }
}
//# sourceMappingURL=engine.test.js.map