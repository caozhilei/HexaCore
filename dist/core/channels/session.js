"use strict";
/**
 * 会话实现模块
 *
 * 定义ChannelContainer接口和具体的实现类，管理会话生命周期和状态机
 * 提供完整的隔离保障和资源管理
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChannelContainerImpl = exports.MemoryWorkspaceManager = exports.SessionStateMachine = void 0;
exports.createDefaultResourceQuota = createDefaultResourceQuota;
exports.createDefaultNetworkPolicy = createDefaultNetworkPolicy;
/**
 * 会话状态机
 *
 * 确保Agent会话的确定性状态转换：
 *
 * 创建中 (creating)
 *     ↓
 * 运行中 (running) ←→ 挂起中 (paused)
 *     ↓
 * 停止中 (stopping)
 *     ↓
 * 已停止 (stopped)
 *     ↑
 * 错误状态 (error) → 恢复中 (recovering)
 */
class SessionStateMachine {
    currentState;
    lastTransition;
    transitionHistory = [];
    constructor(initialState = 'creating') {
        this.currentState = initialState;
        this.lastTransition = new Date();
    }
    /**
     * 获取当前状态
     */
    getState() {
        return this.currentState;
    }
    /**
     * 获取状态转换历史
     */
    getTransitionHistory() {
        return [...this.transitionHistory];
    }
    /**
     * 检查是否允许状态转换
     */
    canTransition(toState) {
        const validTransitions = {
            creating: ['running', 'error'],
            running: ['paused', 'stopping', 'error'],
            paused: ['running', 'stopping', 'error'],
            stopping: ['stopped', 'error'],
            stopped: [], // 停止状态为终态
            error: ['recovering', 'stopped'],
            recovering: ['running', 'error']
        };
        return validTransitions[this.currentState]?.includes(toState) ?? false;
    }
    /**
     * 执行状态转换
     *
     * @param toState 目标状态
     * @param reason 转换原因（可选）
     * @throws {Error} 当状态转换不允许时
     */
    transition(toState, reason) {
        if (!this.canTransition(toState)) {
            throw new Error(`Invalid state transition from ${this.currentState} to ${toState}. ` +
                `Allowed transitions: ${this.getAllowedTransitions().join(', ')}`);
        }
        const previousState = this.currentState;
        this.transitionHistory.push({
            from: previousState,
            to: toState,
            timestamp: new Date(),
            reason
        });
        this.currentState = toState;
        this.lastTransition = new Date();
        console.log(`Session state transition: ${previousState} -> ${toState} (reason: ${reason || 'unspecified'})`);
    }
    /**
     * 获取允许的状态转换列表
     */
    getAllowedTransitions() {
        const validTransitions = {
            creating: ['running', 'error'],
            running: ['paused', 'stopping', 'error'],
            paused: ['running', 'stopping', 'error'],
            stopping: ['stopped', 'error'],
            stopped: [],
            error: ['recovering', 'stopped'],
            recovering: ['running', 'error']
        };
        return validTransitions[this.currentState] || [];
    }
    /**
     * 检查是否处于终态
     */
    isTerminal() {
        return this.currentState === 'stopped';
    }
    /**
     * 检查是否处于错误状态
     */
    isError() {
        return this.currentState === 'error';
    }
    /**
     * 重置状态机（用于恢复）
     */
    reset(state = 'creating') {
        this.currentState = state;
        this.lastTransition = new Date();
        console.log(`Session state machine reset to: ${state}`);
    }
}
exports.SessionStateMachine = SessionStateMachine;
/**
 * 简单的内存工作区管理器实现
 */
class MemoryWorkspaceManager {
    rootPath;
    files = new Map();
    constructor(rootPath) {
        this.rootPath = rootPath;
    }
    async initialize() {
        console.log(`Initializing workspace at: ${this.rootPath}`);
        this.files.clear();
        // 在实际实现中，这里会创建目录结构
        // 为简化示例，我们只初始化内存映射
    }
    async cleanup() {
        console.log(`Cleaning up workspace at: ${this.rootPath}`);
        this.files.clear();
    }
    resolvePath(relativePath) {
        // 简单的路径解析，在实际实现中需要考虑路径安全
        return `${this.rootPath}/${relativePath}`;
    }
    async getDiskUsage() {
        // 计算内存中存储的文件总大小
        let totalSize = 0;
        for (const content of this.files.values()) {
            totalSize += Buffer.byteLength(content, 'utf8');
        }
        // 假设配额为100MB
        const quota = 100 * 1024 * 1024;
        return {
            used: totalSize,
            quota,
            percentage: (totalSize / quota) * 100
        };
    }
    /**
     * 写入文件（内存实现）
     */
    writeFile(path, content) {
        this.files.set(path, content);
    }
    /**
     * 读取文件（内存实现）
     */
    readFile(path) {
        return this.files.get(path);
    }
    /**
     * 列出文件（内存实现）
     */
    listFiles() {
        return Array.from(this.files.keys());
    }
}
exports.MemoryWorkspaceManager = MemoryWorkspaceManager;
/**
 * 具体的频道容器实现
 */
class ChannelContainerImpl {
    sessionKey;
    agentId;
    isolationLevel;
    resourceLimits;
    networkPolicy;
    status;
    pid;
    startTime;
    workspace;
    stateMachine;
    sessionState;
    constructor(sessionKey, agentId, isolationLevel, resourceLimits, networkPolicy, workspaceRootPath) {
        this.sessionKey = sessionKey;
        this.agentId = agentId;
        this.isolationLevel = isolationLevel;
        this.resourceLimits = resourceLimits;
        this.networkPolicy = networkPolicy;
        this.status = 'creating';
        // 初始化工作区
        const workspacePath = workspaceRootPath || `~/.HexaCore/workspace/${agentId}/${this.getPeerIdFromKey(sessionKey)}`;
        this.workspace = new MemoryWorkspaceManager(workspacePath);
        // 初始化状态机
        this.stateMachine = new SessionStateMachine('creating');
        // 初始化会话状态
        this.sessionState = {
            sessionKey,
            agentId,
            status: 'creating',
            createdAt: new Date(),
            lastActiveAt: new Date(),
            metadata: {
                isolationLevel,
                resourceLimits,
                networkPolicy
            },
            workspacePath
        };
    }
    /**
     * 启动容器
     */
    async start() {
        try {
            console.log(`Starting channel container: ${this.sessionKey}`);
            // 1. 初始化工作区
            await this.workspace.initialize();
            // 2. 启动状态机转换
            this.stateMachine.transition('running', 'Container started');
            this.status = 'running';
            this.startTime = new Date();
            // 3. 模拟启动进程（在实际实现中会启动真正的Agent进程）
            this.pid = Math.floor(Math.random() * 10000) + 1000;
            // 4. 更新会话状态
            this.sessionState = {
                ...this.sessionState,
                status: 'running',
                lastActiveAt: new Date()
            };
            console.log(`Channel container started successfully: ${this.sessionKey}, PID: ${this.pid}`);
        }
        catch (error) {
            console.error(`Failed to start channel container ${this.sessionKey}:`, error);
            this.stateMachine.transition('error', `Start failed: ${error}`);
            this.status = 'error';
            throw error;
        }
    }
    /**
     * 暂停容器
     */
    async pause() {
        try {
            console.log(`Pausing channel container: ${this.sessionKey}`);
            if (this.status !== 'running') {
                throw new Error(`Cannot pause container in ${this.status} state`);
            }
            this.stateMachine.transition('paused', 'Container paused');
            this.status = 'paused';
            // 在实际实现中，这里会暂停进程或冻结容器
            console.log(`Channel container paused: ${this.sessionKey}`);
        }
        catch (error) {
            console.error(`Failed to pause channel container ${this.sessionKey}:`, error);
            this.stateMachine.transition('error', `Pause failed: ${error}`);
            this.status = 'error';
            throw error;
        }
    }
    /**
     * 恢复容器
     */
    async resume() {
        try {
            console.log(`Resuming channel container: ${this.sessionKey}`);
            if (this.status !== 'paused') {
                throw new Error(`Cannot resume container in ${this.status} state`);
            }
            this.stateMachine.transition('running', 'Container resumed');
            this.status = 'running';
            console.log(`Channel container resumed: ${this.sessionKey}`);
        }
        catch (error) {
            console.error(`Failed to resume channel container ${this.sessionKey}:`, error);
            this.stateMachine.transition('error', `Resume failed: ${error}`);
            this.status = 'error';
            throw error;
        }
    }
    /**
     * 停止容器
     */
    async stop() {
        try {
            console.log(`Stopping channel container: ${this.sessionKey}`);
            if (this.status === 'stopped' || this.status === 'stopping') {
                console.log(`Container already ${this.status}, skipping`);
                return;
            }
            this.stateMachine.transition('stopping', 'Container stopping');
            this.status = 'stopping';
            // 在实际实现中，这里会向Agent进程发送停止信号
            // 模拟停止过程
            await new Promise(resolve => setTimeout(resolve, 100));
            this.stateMachine.transition('stopped', 'Container stopped');
            this.status = 'stopped';
            this.pid = undefined;
            console.log(`Channel container stopped: ${this.sessionKey}`);
        }
        catch (error) {
            console.error(`Failed to stop channel container ${this.sessionKey}:`, error);
            this.stateMachine.transition('error', `Stop failed: ${error}`);
            this.status = 'error';
            throw error;
        }
    }
    /**
     * 销毁容器
     */
    async destroy() {
        try {
            console.log(`Destroying channel container: ${this.sessionKey}`);
            // 1. 停止容器（如果还在运行）
            if (this.status === 'running' || this.status === 'paused') {
                await this.stop();
            }
            // 2. 清理工作区
            await this.workspace.cleanup();
            // 3. 清理资源
            this.pid = undefined;
            this.startTime = undefined;
            console.log(`Channel container destroyed: ${this.sessionKey}`);
        }
        catch (error) {
            console.error(`Failed to destroy channel container ${this.sessionKey}:`, error);
            throw error;
        }
    }
    /**
     * 获取当前会话状态
     */
    getState() {
        return {
            ...this.sessionState,
            status: this.status,
            lastActiveAt: new Date()
        };
    }
    /**
     * 更新会话状态
     */
    updateState(updates) {
        this.sessionState = {
            ...this.sessionState,
            ...updates,
            lastActiveAt: new Date()
        };
    }
    /**
     * 获取状态机实例
     */
    getStateMachine() {
        return this.stateMachine;
    }
    /**
     * 从Session Key解析Peer ID
     */
    getPeerIdFromKey(sessionKey) {
        const parts = sessionKey.split(':');
        return parts.length === 6 ? parts[5] : 'unknown';
    }
}
exports.ChannelContainerImpl = ChannelContainerImpl;
/**
 * 创建默认的资源配额配置
 */
function createDefaultResourceQuota() {
    return {
        memory: {
            maxRSS: '1g',
            maxHeap: '2g'
        },
        cpu: {
            shares: 1024,
            quota: '2.0'
        },
        storage: {
            diskQuota: '10g',
            inodeLimit: 10000
        },
        network: {
            bandwidth: '100m',
            connectionLimit: 100
        }
    };
}
/**
 * 创建默认的网络策略配置
 */
function createDefaultNetworkPolicy() {
    return {
        inbound: false,
        outbound: true,
        allowedDomains: ['api.openai.com', 'api.anthropic.com']
    };
}
//# sourceMappingURL=session.js.map