"use strict";
/**
* HexaCore 出入口适配器框架 - 公共接口定义
* 基于HexaCore Channel插件架构的标准化接口
*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionError = exports.SecurityError = exports.ValidationError = exports.ChannelError = void 0;
/**
 * 错误类型定义
 */
class ChannelError extends Error {
    code;
    retryable;
    details;
    constructor(message, code, retryable = false, details) {
        super(message);
        this.code = code;
        this.retryable = retryable;
        this.details = details;
        this.name = 'ChannelError';
    }
}
exports.ChannelError = ChannelError;
class ValidationError extends ChannelError {
    constructor(message, details) {
        super(message, 'VALIDATION_ERROR', false, details);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class SecurityError extends ChannelError {
    constructor(message, details) {
        super(message, 'SECURITY_ERROR', false, details);
        this.name = 'SecurityError';
    }
}
exports.SecurityError = SecurityError;
class ConnectionError extends ChannelError {
    constructor(message, details) {
        super(message, 'CONNECTION_ERROR', true, details);
        this.name = 'ConnectionError';
    }
}
exports.ConnectionError = ConnectionError;
//# sourceMappingURL=interfaces.js.map