/**
 * Docker管理器
 * 负责容器生命周期管理
 * 基于Docker守护进程API实现
 */

import { ContainerConfig, ContainerInstance, ContainerMetrics, DockerManager } from './types';

export class DockerManagerImpl implements DockerManager {
  private dockerSocket: string;
  private apiVersion: string;
  private timeout: number;
  private containers: Map<string, ContainerInstance> = new Map();

  constructor(config: { socketPath: string; apiVersion: string; timeout: number }) {
    this.dockerSocket = config.socketPath;
    this.apiVersion = config.apiVersion;
    this.timeout = config.timeout;
  }

  /**
   * 创建容器
   */
  async createContainer(config: ContainerConfig): Promise<ContainerInstance> {
    const containerId = `container-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const instance: ContainerInstance = {
      id: containerId,
      agentId: 'unknown', // 将在调用时设置
      sessionKey: 'unknown',
      sandboxMode: 'non-main',
      config,
      status: 'creating',
      createdAt: new Date().toISOString(),
    };

    // 模拟Docker API调用
    console.log(`[DockerManager] Creating container ${containerId} with image ${config.image}`);
    
    // 在实际实现中，这里会调用Docker SDK:
    // const docker = new Docker({ socketPath: this.dockerSocket, version: this.apiVersion });
    // const container = await docker.createContainer({
    //   Image: config.image,
    //   Cmd: config.command,
    //   Env: Object.entries(config.env).map(([k, v]) => `${k}=${v}`),
    //   HostConfig: {
    //     Memory: this.parseMemoryLimit(config.memoryLimit),
    //     NanoCpus: config.cpuQuota * 1e9,
    //     ReadonlyRootfs: config.readOnlyRootFs,
    //     CapAdd: config.capabilities,
    //     NetworkMode: config.network,
    //     Binds: config.volumes?.map(v => `${v.hostPath}:${v.containerPath}:${v.readonly ? 'ro' : 'rw'}`),
    //   },
    // });

    // 模拟成功创建
    await this.delay(500);
    
    instance.status = 'running';
    instance.startedAt = new Date().toISOString();
    this.containers.set(containerId, instance);
    
    console.log(`[DockerManager] Container ${containerId} created successfully`);
    return instance;
  }

  /**
   * 启动容器
   */
  async startContainer(containerId: string): Promise<void> {
    const instance = this.containers.get(containerId);
    if (!instance) {
      throw new Error(`Container ${containerId} not found`);
    }

    if (instance.status === 'running') {
      console.warn(`[DockerManager] Container ${containerId} is already running`);
      return;
    }

    console.log(`[DockerManager] Starting container ${containerId}`);
    
    // 模拟Docker API调用
    // const docker = new Docker({ socketPath: this.dockerSocket, version: this.apiVersion });
    // const container = docker.getContainer(containerId);
    // await container.start();

    await this.delay(200);
    
    instance.status = 'running';
    instance.startedAt = new Date().toISOString();
    console.log(`[DockerManager] Container ${containerId} started successfully`);
  }

  /**
   * 停止容器
   */
  async stopContainer(containerId: string): Promise<void> {
    const instance = this.containers.get(containerId);
    if (!instance) {
      throw new Error(`Container ${containerId} not found`);
    }

    if (instance.status === 'stopped') {
      console.warn(`[DockerManager] Container ${containerId} is already stopped`);
      return;
    }

    console.log(`[DockerManager] Stopping container ${containerId}`);
    
    // 模拟Docker API调用
    // const docker = new Docker({ socketPath: this.dockerSocket, version: this.apiVersion });
    // const container = docker.getContainer(containerId);
    // await container.stop({ t: 10 });

    await this.delay(300);
    
    instance.status = 'stopped';
    instance.stoppedAt = new Date().toISOString();
    console.log(`[DockerManager] Container ${containerId} stopped successfully`);
  }

  /**
   * 删除容器
   */
  async removeContainer(containerId: string): Promise<void> {
    const instance = this.containers.get(containerId);
    if (!instance) {
      throw new Error(`Container ${containerId} not found`);
    }

    if (instance.status === 'running') {
      await this.stopContainer(containerId);
    }

    console.log(`[DockerManager] Removing container ${containerId}`);
    
    // 模拟Docker API调用
    // const docker = new Docker({ socketPath: this.dockerSocket, version: this.apiVersion });
    // const container = docker.getContainer(containerId);
    // await container.remove({ v: true, force: true });

    await this.delay(100);
    
    this.containers.delete(containerId);
    console.log(`[DockerManager] Container ${containerId} removed successfully`);
  }

  /**
   * 在容器内执行命令
   */
  async execInContainer(
    containerId: string,
    command: string[]
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const instance = this.containers.get(containerId);
    if (!instance) {
      throw new Error(`Container ${containerId} not found`);
    }

    if (instance.status !== 'running') {
      throw new Error(`Container ${containerId} is not running`);
    }

    console.log(`[DockerManager] Executing command in container ${containerId}: ${command.join(' ')}`);
    
    // 模拟Docker API调用
    // const docker = new Docker({ socketPath: this.dockerSocket, version: this.apiVersion });
    // const container = docker.getContainer(containerId);
    // const exec = await container.exec({
    //   Cmd: command,
    //   AttachStdout: true,
    //   AttachStderr: true,
    // });
    // const stream = await exec.start({ hijack: true, stdin: false });
    // // 处理流数据...

    await this.delay(100);
    
    // 模拟成功执行
    return {
      stdout: `Command executed successfully: ${command.join(' ')}`,
      stderr: '',
      exitCode: 0,
    };
  }

  /**
   * 获取容器统计信息
   */
  async getContainerStats(containerId: string): Promise<ContainerMetrics> {
    const instance = this.containers.get(containerId);
    if (!instance) {
      throw new Error(`Container ${containerId} not found`);
    }

    // 模拟获取统计信息
    // const docker = new Docker({ socketPath: this.dockerSocket, version: this.apiVersion });
    // const container = docker.getContainer(containerId);
    // const stats = await container.stats({ stream: false });
    // // 解析stats数据...

    return {
      cpuUsage: 15.5,
      memoryUsage: 256 * 1024 * 1024, // 256MB
      memoryLimit: 1024 * 1024 * 1024, // 1GB
      networkRx: 1024 * 1024, // 1MB
      networkTx: 512 * 1024, // 512KB
      diskRead: 0,
      diskWrite: 0,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 列出所有容器
   */
  async listContainers(): Promise<ContainerInstance[]> {
    return Array.from(this.containers.values());
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      // 模拟检查Docker守护进程是否可访问
      // 在实际实现中，可以尝试列出容器或执行简单的ping操作
      console.log('[DockerManager] Performing health check');
      await this.delay(50);
      return true;
    } catch (error) {
      console.error('[DockerManager] Health check failed:', error);
      return false;
    }
  }

  /**
   * 解析内存限制字符串（如"1g" -> 字节数）
   */
  private parseMemoryLimit(memoryLimit: string): number {
    const units: Record<string, number> = {
      b: 1,
      k: 1024,
      m: 1024 * 1024,
      g: 1024 * 1024 * 1024,
    };

    const match = memoryLimit.match(/^(\d+)([bkmg])?$/i);
    if (!match) {
      return 1024 * 1024 * 1024; // 默认1GB
    }

    const value = parseInt(match[1], 10);
    const unit = match[2]?.toLowerCase() || 'b';
    return value * (units[unit] || 1);
  }

  /**
   * 模拟延迟
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}