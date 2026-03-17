/**
 * 会话实现模块
 *
 * 定义ChannelContainer接口和具体的实现类，管理会话生命周期和状态机
 * 提供完整的隔离保障和资源管理
 */
import { SessionState } from './redis-store';
/**
 * 资源配额配置
 */
export interface ResourceQuota {
    memory: {
        maxRSS: string;
        maxHeap: string;
    };
    cpu: {
        shares: number;
        quota: string;
    };
    storage: {
        diskQuota: string;
        inodeLimit: number;
    };
    network: {
        bandwidth: string;
        connectionLimit: number;
    };
}
/**
 * 网络策略配置
 */
export interface NetworkPolicy {
    inbound: boolean;
    outbound: boolean;
    allowedDomains: string[];
}
/**
 * 工作区管理器接口
 */
export interface WorkspaceManager {
    rootPath: string;
    initialize(): Promise<void>;
    cleanup(): Promise<void>;
    resolvePath(relativePath: string): string;
    getDiskUsage(): Promise<{
        used: number;
        quota: number;
        percentage: number;
    }>;
}
/**
 * 频道容器接口
 */
export interface ChannelContainer {
    sessionKey: string;
    agentId: string;
    isolationLevel: 'off' | 'non-main' | 'all';
    resourceLimits: ResourceQuota;
    networkPolicy: NetworkPolicy;
    status: 'creating' | 'running' | 'paused' | 'stopped' | 'error';
    pid?: number;
    startTime?: Date;
    workspace: WorkspaceManager;
    start(): Promise<void>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    stop(): Promise<void>;
    destroy(): Promise<void>;
    getState(): SessionState;
}
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
export declare class SessionStateMachine {
    private currentState;
    private lastTransition;
    private transitionHistory;
    constructor(initialState?: SessionState['status']);
    /**
     * 获取当前状态
     */
    getState(): SessionState['status'];
    /**
     * 获取状态转换历史
     */
    getTransitionHistory(): {
        from: SessionState["status"];
        to: SessionState["status"];
        timestamp: Date;
        reason?: string;
    }[];
    /**
     * 检查是否允许状态转换
     */
    canTransition(toState: SessionState['status']): boolean;
    /**
     * 执行状态转换
     *
     * @param toState 目标状态
     * @param reason 转换原因（可选）
     * @throws {Error} 当状态转换不允许时
     */
    transition(toState: SessionState['status'], reason?: string): void;
    /**
     * 获取允许的状态转换列表
     */
    getAllowedTransitions(): SessionState['status'][];
    /**
     * 检查是否处于终态
     */
    isTerminal(): boolean;
    /**
     * 检查是否处于错误状态
     */
    isError(): boolean;
    /**
     * 重置状态机（用于恢复）
     */
    reset(state?: SessionState['status']): void;
}
/**
 * 简单的内存工作区管理器实现
 */
export declare class MemoryWorkspaceManager implements WorkspaceManager {
    rootPath: string;
    private files;
    constructor(rootPath: string);
    initialize(): Promise<void>;
    cleanup(): Promise<void>;
    resolvePath(relativePath: string): string;
    getDiskUsage(): Promise<{
        used: number;
        quota: number;
        percentage: number;
    }>;
    /**
     * 写入文件（内存实现）
     */
    writeFile(path: string, content: string): void;
    /**
     * 读取文件（内存实现）
     */
    readFile(path: string): string | undefined;
    /**
     * 列出文件（内存实现）
     */
    listFiles(): string[];
}
/**
 * 具体的频道容器实现
 */
export declare class ChannelContainerImpl implements ChannelContainer {
    sessionKey: string;
    agentId: string;
    isolationLevel: 'off' | 'non-main' | 'all';
    resourceLimits: ResourceQuota;
    networkPolicy: NetworkPolicy;
    status: SessionState['status'];
    pid?: number;
    startTime?: Date;
    workspace: WorkspaceManager;
    private stateMachine;
    private sessionState;
    constructor(sessionKey: string, agentId: string, isolationLevel: 'off' | 'non-main' | 'all', resourceLimits: ResourceQuota, networkPolicy: NetworkPolicy, workspaceRootPath?: string);
    /**
     * 启动容器
     */
    start(): Promise<void>;
    /**
     * 暂停容器
     */
    pause(): Promise<void>;
    /**
     * 恢复容器
     */
    resume(): Promise<void>;
    /**
     * 停止容器
     */
    stop(): Promise<void>;
    /**
     * 销毁容器
     */
    destroy(): Promise<void>;
    /**
     * 获取当前会话状态
     */
    getState(): SessionState;
    /**
     * 更新会话状态
     */
    updateState(updates: Partial<SessionState>): void;
    /**
     * 获取状态机实例
     */
    getStateMachine(): SessionStateMachine;
    /**
     * 从Session Key解析Peer ID
     */
    private getPeerIdFromKey;
}
/**
 * 创建默认的资源配额配置
 */
export declare function createDefaultResourceQuota(): ResourceQuota;
/**
 * 创建默认的网络策略配置
 */
export declare function createDefaultNetworkPolicy(): NetworkPolicy;
