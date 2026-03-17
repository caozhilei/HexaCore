/**
 * 企业级智能客服示例 - 六元组协同工作流演示
 *
 * 本示例演示完整的六元组架构在企业微信客服场景中的应用：
 * 1. 出入口层：企业微信适配器接收消息并标准化
 * 2. 路由层：7级匹配规则路由到客服频道
 * 3. 频道层：会话管理和上下文隔离
 * 4. 技能层：客服应答技能调用
 * 5. 记忆层：会话历史压缩和优化
 * 6. 沙箱层：安全隔离执行环境
 *
 * 场景：企业微信用户咨询产品定价和合同续约问题
 */
import { InboundMessage } from '../../../src/core/entry-points/interfaces';
/**
 * 六元组协同工作流演示
 */
declare function demonstrateHexadWorkflow(): Promise<{
    inboundMessage: InboundMessage;
    routingResult: import("../../core/routing/rules").RoutingResult;
    session: any;
    skillOutput: any;
    memoryStats: any;
    performanceMetrics: {
        tokenReduction: string;
        responseTime: string;
        successRate: string;
    };
}>;
export { demonstrateHexadWorkflow };
