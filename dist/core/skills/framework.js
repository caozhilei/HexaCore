"use strict";
/**
 * 技能框架核心模块
 * 基于HexaCore SKILL.md标准的声明式技能框架
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkillStatus = exports.SkillBase = void 0;
// ==================== 技能基类 ====================
/**
 * 技能基类 - 所有技能必须继承此类
 */
class SkillBase {
    /** 技能定义 */
    definition;
    /**
     * 构造函数
     * @param name 技能名称
     * @param version 技能版本
     * @param description 技能描述
     */
    constructor(name, version, description) {
        this.definition = {
            name,
            version,
            description: description || '',
            tools: [],
            output: { type: 'object' }
        };
    }
    /**
     * 获取技能定义
     */
    getDefinition() {
        return this.definition;
    }
    /**
     * 设置技能定义
     * @param definition 技能定义
     */
    setDefinition(definition) {
        this.definition = definition;
    }
    /**
     * 技能初始化（可选）
     * 在技能加载时调用
     */
    async initialize() {
        // 默认空实现，子类可重写
    }
    /**
     * 技能清理（可选）
     * 在技能卸载时调用
     */
    async cleanup() {
        // 默认空实现，子类可重写
    }
    /**
     * 验证输入参数
     * @param input 输入参数
     * @returns 验证错误列表，空数组表示验证通过
     */
    validateInput(input) {
        const errors = [];
        const { parameters } = this.definition;
        if (!parameters) {
            return errors;
        }
        for (const [paramName, paramDef] of Object.entries(parameters)) {
            const paramValue = input.parameters[paramName];
            // 检查必填参数
            if (paramDef.required && (paramValue === undefined || paramValue === null)) {
                errors.push(`参数 "${paramName}" 是必填项`);
                continue;
            }
            // 如果参数未提供且有默认值，跳过进一步验证
            if (paramValue === undefined || paramValue === null) {
                continue;
            }
            // 类型验证
            switch (paramDef.type) {
                case 'string':
                    if (typeof paramValue !== 'string') {
                        errors.push(`参数 "${paramName}" 必须是字符串类型`);
                    }
                    else if (paramDef.enum && !paramDef.enum.includes(paramValue)) {
                        errors.push(`参数 "${paramName}" 必须是以下值之一: ${paramDef.enum.join(', ')}`);
                    }
                    break;
                case 'number':
                    if (typeof paramValue !== 'number' || isNaN(paramValue)) {
                        errors.push(`参数 "${paramName}" 必须是数字类型`);
                    }
                    else {
                        if (paramDef.min !== undefined && paramValue < paramDef.min) {
                            errors.push(`参数 "${paramName}" 不能小于 ${paramDef.min}`);
                        }
                        if (paramDef.max !== undefined && paramValue > paramDef.max) {
                            errors.push(`参数 "${paramName}" 不能大于 ${paramDef.max}`);
                        }
                    }
                    break;
                case 'boolean':
                    if (typeof paramValue !== 'boolean') {
                        errors.push(`参数 "${paramName}" 必须是布尔类型`);
                    }
                    break;
                case 'array':
                    if (!Array.isArray(paramValue)) {
                        errors.push(`参数 "${paramName}" 必须是数组类型`);
                    }
                    else if (paramDef.items) {
                        // 验证数组元素类型
                        for (let i = 0; i < paramValue.length; i++) {
                            // 简化验证，实际应递归验证
                            const elementType = typeof paramValue[i];
                            const expectedType = paramDef.items.type;
                            if (elementType !== expectedType && expectedType !== 'object') {
                                errors.push(`参数 "${paramName}[${i}]" 类型应为 ${expectedType}，实际为 ${elementType}`);
                            }
                        }
                    }
                    break;
                case 'object':
                    if (typeof paramValue !== 'object' || paramValue === null || Array.isArray(paramValue)) {
                        errors.push(`参数 "${paramName}" 必须是对象类型`);
                    }
                    break;
            }
        }
        return errors;
    }
    /**
     * 生成标准化的成功响应
     * @param data 响应数据
     * @param metadata 额外元数据
     * @returns 标准化的技能输出
     */
    createSuccessResponse(data, metadata = {}) {
        const baseMetadata = {
            timestamp: new Date().toISOString(),
            skillName: this.definition.name,
            skillVersion: this.definition.version,
            cacheable: true,
            ttl: 1800, // 30分钟默认缓存
            ...metadata
        };
        return {
            success: true,
            data,
            metadata: baseMetadata
        };
    }
    /**
     * 生成标准化的错误响应
     * @param error 错误信息
     * @param metadata 额外元数据
     * @returns 标准化的技能输出
     */
    createErrorResponse(error, metadata = {}) {
        const baseMetadata = {
            timestamp: new Date().toISOString(),
            skillName: this.definition.name,
            skillVersion: this.definition.version,
            ...metadata
        };
        return {
            success: false,
            error,
            metadata: baseMetadata
        };
    }
}
exports.SkillBase = SkillBase;
/**
 * 技能状态
 */
var SkillStatus;
(function (SkillStatus) {
    /** 未加载 */
    SkillStatus["NOT_LOADED"] = "not_loaded";
    /** 加载中 */
    SkillStatus["LOADING"] = "loading";
    /** 已加载 */
    SkillStatus["LOADED"] = "loaded";
    /** 初始化中 */
    SkillStatus["INITIALIZING"] = "initializing";
    /** 就绪 */
    SkillStatus["READY"] = "ready";
    /** 错误 */
    SkillStatus["ERROR"] = "error";
    /** 卸载中 */
    SkillStatus["UNLOADING"] = "unloading";
    /** 已卸载 */
    SkillStatus["UNLOADED"] = "unloaded";
})(SkillStatus || (exports.SkillStatus = SkillStatus = {}));
//# sourceMappingURL=framework.js.map