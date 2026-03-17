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
  // 内存限制
  memory: {
    maxRSS: string;      // 最大常驻内存（如"1g"）
    maxHeap: string;     // 最大堆内存
  };
  
  // CPU限制
  cpu: {
    shares: number;      // CPU份额（相对权重）
    quota: string;       // CPU时间配额（如"2.0"表示2个CPU核心）
  };
  
  // 存储限制
  storage: {
    diskQuota: string;   // 磁盘配额（如"10g"）
    inodeLimit: number;  // 文件数限制
  };
  
  // 网络限制
  network: {
    bandwidth: string;   // 带宽限制（如"100m"）
    connectionLimit: number; // 并发连接数限制
  };
}

/**
 * 网络策略配置
 */
export interface NetworkPolicy {
  inbound: boolean;    // 是否允许入站连接
  outbound: boolean;   // 是否允许出站连接
  allowedDomains: string[]; // 允许访问的域名列表
}

/**
 * 工作区管理器接口
 */
export interface WorkspaceManager {
  // 工作区根路径
  rootPath: string;
  
  // 初始化工作区
  initialize(): Promise<void>;
  
  // 清理工作区
  cleanup(): Promise<void>;
  
  // 获取文件路径
  resolvePath(relativePath: string): string;
  
  // 检查磁盘使用情况
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
  // 容器标识
  sessionKey: string;
  agentId: string;
  
  // 隔离配置
  isolationLevel: 'off' | 'non-main' | 'all';
  resourceLimits: ResourceQuota;
  networkPolicy: NetworkPolicy;
  
  // 运行时状态
  status: 'creating' | 'running' | 'paused' | 'stopped' | 'error';
  pid?: number;
  startTime?: Date;
  
  // 工作区管理
  workspace: WorkspaceManager;
  
  // 生命周期方法
  start(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
  destroy(): Promise<void>;
  
  // 状态查询
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
export class SessionStateMachine {
  private currentState: SessionState['status'];
  private lastTransition: Date;
  private transitionHistory: Array<{
    from: SessionState['status'];
    to: SessionState['status'];
    timestamp: Date;
    reason?: string;
  }> = [];
  
  constructor(initialState: SessionState['status'] = 'creating') {
    this.currentState = initialState;
    this.lastTransition = new Date();
  }
  
  /**
   * 获取当前状态
   */
  getState(): SessionState['status'] {
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
  canTransition(toState: SessionState['status']): boolean {
    const validTransitions: Record<SessionState['status'], SessionState['status'][]> = {
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
  transition(toState: SessionState['status'], reason?: string): void {
    if (!this.canTransition(toState)) {
      throw new Error(
        `Invalid state transition from ${this.currentState} to ${toState}. ` +
        `Allowed transitions: ${this.getAllowedTransitions().join(', ')}`
      );
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
  getAllowedTransitions(): SessionState['status'][] {
    const validTransitions: Record<SessionState['status'], SessionState['status'][]> = {
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
  isTerminal(): boolean {
    return this.currentState === 'stopped';
  }
  
  /**
   * 检查是否处于错误状态
   */
  isError(): boolean {
    return this.currentState === 'error';
  }
  
  /**
   * 重置状态机（用于恢复）
   */
  reset(state: SessionState['status'] = 'creating'): void {
    this.currentState = state;
    this.lastTransition = new Date();
    console.log(`Session state machine reset to: ${state}`);
  }
}

/**
 * 简单的内存工作区管理器实现
 */
export class MemoryWorkspaceManager implements WorkspaceManager {
  rootPath: string;
  private files: Map<string, string> = new Map();
  
  constructor(rootPath: string) {
    this.rootPath = rootPath;
  }
  
  async initialize(): Promise<void> {
    console.log(`Initializing workspace at: ${this.rootPath}`);
    this.files.clear();
    // 在实际实现中，这里会创建目录结构
    // 为简化示例，我们只初始化内存映射
  }
  
  async cleanup(): Promise<void> {
    console.log(`Cleaning up workspace at: ${this.rootPath}`);
    this.files.clear();
  }
  
  resolvePath(relativePath: string): string {
    // 简单的路径解析，在实际实现中需要考虑路径安全
    return `${this.rootPath}/${relativePath}`;
  }
  
  async getDiskUsage(): Promise<{ used: number; quota: number; percentage: number }> {
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
  writeFile(path: string, content: string): void {
    this.files.set(path, content);
  }
  
  /**
   * 读取文件（内存实现）
   */
  readFile(path: string): string | undefined {
    return this.files.get(path);
  }
  
  /**
   * 列出文件（内存实现）
   */
  listFiles(): string[] {
    return Array.from(this.files.keys());
  }
}

/**
 * 具体的频道容器实现
 */
export class ChannelContainerImpl implements ChannelContainer {
  sessionKey: string;
  agentId: string;
  isolationLevel: 'off' | 'non-main' | 'all';
  resourceLimits: ResourceQuota;
  networkPolicy: NetworkPolicy;
  status: SessionState['status'];
  pid?: number;
  startTime?: Date;
  workspace: WorkspaceManager;
  
  private stateMachine: SessionStateMachine;
  private sessionState: SessionState;
  
  constructor(
    sessionKey: string,
    agentId: string,
    isolationLevel: 'off' | 'non-main' | 'all',
    resourceLimits: ResourceQuota,
    networkPolicy: NetworkPolicy,
    workspaceRootPath?: string
  ) {
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
  async start(): Promise<void> {
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
    } catch (error) {
      console.error(`Failed to start channel container ${this.sessionKey}:`, error);
      this.stateMachine.transition('error', `Start failed: ${error}`);
      this.status = 'error';
      throw error;
    }
  }
  
  /**
   * 暂停容器
   */
  async pause(): Promise<void> {
    try {
      console.log(`Pausing channel container: ${this.sessionKey}`);
      
      if (this.status !== 'running') {
        throw new Error(`Cannot pause container in ${this.status} state`);
      }
      
      this.stateMachine.transition('paused', 'Container paused');
      this.status = 'paused';
      
      // 在实际实现中，这里会暂停进程或冻结容器
      console.log(`Channel container paused: ${this.sessionKey}`);
    } catch (error) {
      console.error(`Failed to pause channel container ${this.sessionKey}:`, error);
      this.stateMachine.transition('error', `Pause failed: ${error}`);
      this.status = 'error';
      throw error;
    }
  }
  
  /**
   * 恢复容器
   */
  async resume(): Promise<void> {
    try {
      console.log(`Resuming channel container: ${this.sessionKey}`);
      
      if (this.status !== 'paused') {
        throw new Error(`Cannot resume container in ${this.status} state`);
      }
      
      this.stateMachine.transition('running', 'Container resumed');
      this.status = 'running';
      
      console.log(`Channel container resumed: ${this.sessionKey}`);
    } catch (error) {
      console.error(`Failed to resume channel container ${this.sessionKey}:`, error);
      this.stateMachine.transition('error', `Resume failed: ${error}`);
      this.status = 'error';
      throw error;
    }
  }
  
  /**
   * 停止容器
   */
  async stop(): Promise<void> {
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
    } catch (error) {
      console.error(`Failed to stop channel container ${this.sessionKey}:`, error);
      this.stateMachine.transition('error', `Stop failed: ${error}`);
      this.status = 'error';
      throw error;
    }
  }
  
  /**
   * 销毁容器
   */
  async destroy(): Promise<void> {
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
    } catch (error) {
      console.error(`Failed to destroy channel container ${this.sessionKey}:`, error);
      throw error;
    }
  }
  
  /**
   * 获取当前会话状态
   */
  getState(): SessionState {
    return {
      ...this.sessionState,
      status: this.status,
      lastActiveAt: new Date()
    };
  }
  
  /**
   * 更新会话状态
   */
  updateState(updates: Partial<SessionState>): void {
    this.sessionState = {
      ...this.sessionState,
      ...updates,
      lastActiveAt: new Date()
    };
  }
  
  /**
   * 获取状态机实例
   */
  getStateMachine(): SessionStateMachine {
    return this.stateMachine;
  }
  
  /**
   * 从Session Key解析Peer ID
   */
  private getPeerIdFromKey(sessionKey: string): string {
    const parts = sessionKey.split(':');
    return parts.length === 6 ? parts[5] : 'unknown';
  }
}

/**
 * 创建默认的资源配额配置
 */
export function createDefaultResourceQuota(): ResourceQuota {
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
export function createDefaultNetworkPolicy(): NetworkPolicy {
  return {
    inbound: false,
    outbound: true,
    allowedDomains: ['api.openai.com', 'api.anthropic.com']
  };
}
