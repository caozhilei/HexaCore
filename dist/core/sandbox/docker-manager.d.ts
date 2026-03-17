/**
 * Docker管理器
 * 负责容器生命周期管理
 * 基于Docker守护进程API实现
 */
import { ContainerConfig, ContainerInstance, ContainerMetrics, DockerManager } from './types';
export declare class DockerManagerImpl implements DockerManager {
    private dockerSocket;
    private apiVersion;
    private timeout;
    private containers;
    constructor(config: {
        socketPath: string;
        apiVersion: string;
        timeout: number;
    });
    /**
     * 创建容器
     */
    createContainer(config: ContainerConfig): Promise<ContainerInstance>;
    /**
     * 启动容器
     */
    startContainer(containerId: string): Promise<void>;
    /**
     * 停止容器
     */
    stopContainer(containerId: string): Promise<void>;
    /**
     * 删除容器
     */
    removeContainer(containerId: string): Promise<void>;
    /**
     * 在容器内执行命令
     */
    execInContainer(containerId: string, command: string[]): Promise<{
        stdout: string;
        stderr: string;
        exitCode: number;
    }>;
    /**
     * 获取容器统计信息
     */
    getContainerStats(containerId: string): Promise<ContainerMetrics>;
    /**
     * 列出所有容器
     */
    listContainers(): Promise<ContainerInstance[]>;
    /**
     * 健康检查
     */
    healthCheck(): Promise<boolean>;
    /**
     * 解析内存限制字符串（如"1g" -> 字节数）
     */
    private parseMemoryLimit;
    /**
     * 模拟延迟
     */
    private delay;
}
