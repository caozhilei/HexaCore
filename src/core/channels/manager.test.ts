/**
 * 频道管理器测试
 * 
 * 验证频道管理器的核心功能：
 * 1. 会话创建与获取
 * 2. Session Key机制
 * 3. 上下文隔离
 * 4. 会话生命周期管理
 * 5. 资源配额和网络策略
 */

import { ChannelManager, SessionCreateOptions } from './manager';
import { RedisClient } from './redis-store';
import { InboundMessage, SessionKeyGenerator } from './session-keys';
import { ChannelContainer } from './session';

/**
 * 模拟Redis客户端（用于测试）
 */
class MockRedisClient implements RedisClient {
  private storage: Map<string, string> = new Map();
  private hashStorage: Map<string, Record<string, string>> = new Map();
  
  async get(key: string): Promise<string | null> {
    return this.storage.get(key) || null;
  }
  
  async set(key: string, value: string, ttl?: number): Promise<void> {
    this.storage.set(key, value);
  }
  
  async del(key: string): Promise<void> {
    this.storage.delete(key);
    this.hashStorage.delete(key);
  }
  
  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return Array.from(this.storage.keys()).filter(key => regex.test(key));
  }
  
  async exists(key: string): Promise<boolean> {
    return this.storage.has(key) || this.hashStorage.has(key);
  }
  
  async expire(key: string, ttl: number): Promise<void> {
    // 模拟过期，在实际测试中不实现
  }
  
  async hgetall(key: string): Promise<Record<string, string>> {
    return this.hashStorage.get(key) || {};
  }
  
  async hset(key: string, data: Record<string, string>): Promise<void> {
    this.hashStorage.set(key, data);
  }
  
  async hdel(key: string, fields: string[]): Promise<void> {
    const existing = this.hashStorage.get(key);
    if (existing) {
      for (const field of fields) {
        delete existing[field];
      }
    }
  }
  
  async quit(): Promise<void> {
    this.storage.clear();
    this.hashStorage.clear();
  }
  
  // 测试辅助方法
  clear(): void {
    this.storage.clear();
    this.hashStorage.clear();
  }
}

/**
 * 测试辅助函数
 */
function createTestMessage(channel: string = 'whatsapp', accountId: string = 'business'): InboundMessage {
  return {
    channel,
    accountId,
    peer: {
      id: '+8613812345678',
      kind: 'dm' as const,
      name: '测试用户'
    },
    content: 'Hello, world!',
    timestamp: new Date()
  };
}

describe('ChannelManager', () => {
  let mockRedis: MockRedisClient;
  let channelManager: ChannelManager;
  
  beforeEach(() => {
    mockRedis = new MockRedisClient();
    channelManager = new ChannelManager(mockRedis, {
      defaultSessionTTL: 3600,
      maxConcurrentSessions: 100,
      sessionPoolSize: 10,
      enablePersistence: true
    });
  });
  
  afterEach(async () => {
    await channelManager.close();
    mockRedis.clear();
  });
  
  describe('Session Key机制', () => {
    test('应该正确生成Session Key', async () => {
      const message = createTestMessage();
      const agentId = 'vip-agent';
      
      const session = await channelManager.createOrGetSession(message, agentId);
      
      expect(session.sessionKey).toBe(
        `agent:${agentId}:${message.channel}:${message.accountId}:direct:${message.peer.id}`
      );
    });
    
    test('应该支持自定义Session Key', async () => {
      const message = createTestMessage();
      const agentId = 'vip-agent';
      const customKey = 'agent:vip-agent:whatsapp:business:direct:custom-user-123';
      
      const options: SessionCreateOptions = {
        customSessionKey: customKey
      };
      
      const session = await channelManager.createOrGetSession(message, agentId, options);
      
      expect(session.sessionKey).toBe(customKey);
    });
    
    test('同一用户和Agent应该生成相同的Session Key', async () => {
      const message1 = createTestMessage('whatsapp', 'business');
      const message2 = createTestMessage('whatsapp', 'business');
      const agentId = 'general-agent';
      
      const session1 = await channelManager.createOrGetSession(message1, agentId);
      const session2 = await channelManager.createOrGetSession(message2, agentId);
      
      expect(session1.sessionKey).toBe(session2.sessionKey);
    });
    
    test('不同用户应该生成不同的Session Key', async () => {
      const message1 = createTestMessage();
      const message2 = {
        ...createTestMessage(),
        peer: { id: '+8613898765432', kind: 'dm' as const }
      };
      const agentId = 'general-agent';
      
      const session1 = await channelManager.createOrGetSession(message1, agentId);
      const session2 = await channelManager.createOrGetSession(message2, agentId);
      
      expect(session1.sessionKey).not.toBe(session2.sessionKey);
    });
  });
  
  describe('会话创建与获取', () => {
    test('应该成功创建新会话', async () => {
      const message = createTestMessage();
      const agentId = 'vip-agent';
      
      const session = await channelManager.createOrGetSession(message, agentId);
      
      expect(session).toBeDefined();
      expect(session.agentId).toBe(agentId);
      expect(session.status).toBe('running');
      expect(session.sessionKey).toContain(agentId);
    });
    
    test('应该重用已存在的活跃会话', async () => {
      const message = createTestMessage();
      const agentId = 'vip-agent';
      
      // 第一次创建
      const session1 = await channelManager.createOrGetSession(message, agentId);
      const sessionKey = session1.sessionKey;
      
      // 第二次获取（应该重用）
      const session2 = await channelManager.createOrGetSession(message, agentId);
      
      expect(session2.sessionKey).toBe(sessionKey);
      expect(session2).toBe(session1); // 应该是同一个对象
    });
    
    test('应该能够根据Session Key获取会话', async () => {
      const message = createTestMessage();
      const agentId = 'vip-agent';
      
      // 创建会话
      const createdSession = await channelManager.createOrGetSession(message, agentId);
      const sessionKey = createdSession.sessionKey;
      
      // 通过Session Key获取
      const retrievedSession = await channelManager.getSession(sessionKey);
      
      expect(retrievedSession).toBeDefined();
      expect(retrievedSession!.sessionKey).toBe(sessionKey);
      expect(retrievedSession!.agentId).toBe(agentId);
    });
    
    test('对于不存在的Session Key应该返回null', async () => {
      const nonExistentKey = 'agent:non-existent:whatsapp:business:direct:123';
      
      const session = await channelManager.getSession(nonExistentKey);
      
      expect(session).toBeNull();
    });
  });
  
  describe('上下文隔离', () => {
    test('不同会话应该具有独立的工作区', async () => {
      const message1 = createTestMessage();
      const message2 = {
        ...createTestMessage(),
        peer: { id: '+8613898765432', kind: 'dm' as const }
      };
      const agentId = 'general-agent';
      
      const session1 = await channelManager.createOrGetSession(message1, agentId);
      const session2 = await channelManager.createOrGetSession(message2, agentId);
      
      // 检查会话Key不同
      expect(session1.sessionKey).not.toBe(session2.sessionKey);
      
      // 检查工作区路径不同
      expect(session1.workspace.rootPath).not.toBe(session2.workspace.rootPath);
    });
    
    test('同一用户与不同Agent应该创建不同会话', async () => {
      const message = createTestMessage();
      const agentId1 = 'vip-agent';
      const agentId2 = 'general-agent';
      
      const session1 = await channelManager.createOrGetSession(message, agentId1);
      const session2 = await channelManager.createOrGetSession(message, agentId2);
      
      expect(session1.sessionKey).not.toBe(session2.sessionKey);
      expect(session1.agentId).not.toBe(session2.agentId);
    });
    
    test('会话状态应该独立维护', async () => {
      const message1 = createTestMessage();
      const message2 = {
        ...createTestMessage(),
        peer: { id: '+8613898765432', kind: 'dm' as const }
      };
      const agentId = 'general-agent';
      
      const session1 = await channelManager.createOrGetSession(message1, agentId);
      const session2 = await channelManager.createOrGetSession(message2, agentId);
      
      // 暂停第一个会话
      await session1.pause();
      
      // 第二个会话应该仍然在运行状态
      expect(session1.status).toBe('paused');
      expect(session2.status).toBe('running');
    });
  });
  
  describe('会话生命周期管理', () => {
    test('应该能够暂停和恢复会话', async () => {
      const message = createTestMessage();
      const agentId = 'vip-agent';
      
      const session = await channelManager.createOrGetSession(message, agentId);
      expect(session.status).toBe('running');
      
      // 暂停
      await channelManager.pauseSession(session.sessionKey);
      expect(session.status).toBe('paused');
      
      // 恢复
      await channelManager.resumeSession(session.sessionKey);
      expect(session.status).toBe('running');
    });
    
    test('应该能够销毁会话', async () => {
      const message = createTestMessage();
      const agentId = 'vip-agent';
      
      const session = await channelManager.createOrGetSession(message, agentId);
      const sessionKey = session.sessionKey;
      
      // 销毁
      const result = await channelManager.destroySession(sessionKey);
      expect(result).toBe(true);
      
      // 再次获取应该返回null
      const retrieved = await channelManager.getSession(sessionKey);
      expect(retrieved).toBeNull();
    });
    
    test('销毁不存在的会话应该返回false', async () => {
      const nonExistentKey = 'agent:non-existent:whatsapp:business:direct:123';
      
      const result = await channelManager.destroySession(nonExistentKey);
      expect(result).toBe(false);
    });
  });
  
  describe('资源配额和网络策略', () => {
    test('应该应用默认的资源配额', async () => {
      const message = createTestMessage();
      const agentId = 'general-agent';
      
      const session = await channelManager.createOrGetSession(message, agentId);
      
      expect(session.resourceLimits).toBeDefined();
      expect(session.resourceLimits.memory.maxRSS).toBe('512m');
      expect(session.resourceLimits.cpu.quota).toBe('1.0');
    });
    
    test('VIP Agent应该具有更高的资源配额', async () => {
      const message = createTestMessage();
      const agentId = 'vip-agent';
      
      const session = await channelManager.createOrGetSession(message, agentId);
      
      expect(session.resourceLimits.memory.maxRSS).toBe('2g');
      expect(session.resourceLimits.cpu.quota).toBe('4.0');
    });
    
    test('应该支持自定义资源配额', async () => {
      const message = createTestMessage();
      const agentId = 'general-agent';
      
      const options: SessionCreateOptions = {
        customResourceQuota: {
          memory: { maxRSS: '3g', maxHeap: '6g' },
          cpu: { shares: 3072, quota: '3.0' }
        }
      };
      
      const session = await channelManager.createOrGetSession(message, agentId, options);
      
      expect(session.resourceLimits.memory.maxRSS).toBe('3g');
      expect(session.resourceLimits.cpu.quota).toBe('3.0');
    });
    
    test('应该应用网络策略', async () => {
      const message = createTestMessage();
      const agentId = 'general-agent';
      
      const session = await channelManager.createOrGetSession(message, agentId);
      
      expect(session.networkPolicy).toBeDefined();
      expect(session.networkPolicy.outbound).toBe(true);
      expect(session.networkPolicy.inbound).toBe(false);
      expect(session.networkPolicy.allowedDomains).toContain('api.openai.com');
    });
  });
  
  describe('持久化', () => {
    test('应该持久化会话状态到Redis', async () => {
      const message = createTestMessage();
      const agentId = 'vip-agent';
      
      const session = await channelManager.createOrGetSession(message, agentId);
      const sessionKey = session.sessionKey;
      
      // 关闭当前管理器
      await channelManager.close();
      
      // 创建新的管理器（应该能从Redis恢复会话）
      const newManager = new ChannelManager(mockRedis, {
        enablePersistence: true
      });
      
      const restoredSession = await newManager.getSession(sessionKey);
      
      expect(restoredSession).toBeDefined();
      expect(restoredSession!.sessionKey).toBe(sessionKey);
      expect(restoredSession!.agentId).toBe(agentId);
      
      await newManager.close();
    });
    
    test('禁用持久化时不应该保存到Redis', async () => {
      const disabledManager = new ChannelManager(mockRedis, {
        enablePersistence: false
      });
      
      const message = createTestMessage();
      const agentId = 'vip-agent';
      
      const session = await disabledManager.createOrGetSession(message, agentId);
      const sessionKey = session.sessionKey;
      
      // 关闭管理器
      await disabledManager.close();
      
      // 创建启用了持久化的新管理器
      const enabledManager = new ChannelManager(mockRedis, {
        enablePersistence: true
      });
      
      // 应该无法恢复会话
      const restoredSession = await enabledManager.getSession(sessionKey);
      expect(restoredSession).toBeNull();
      
      await enabledManager.close();
    });
  });
  
  describe('并发限制', () => {
    test('应该遵守最大并发会话限制', async () => {
      // 配置一个很小的限制便于测试
      const limitedManager = new ChannelManager(mockRedis, {
        maxConcurrentSessions: 2
      });
      
      try {
        // 创建第一个会话
        const session1 = await limitedManager.createOrGetSession(
          createTestMessage(),
          'general-agent'
        );
        
        // 创建第二个会话
        const message2 = {
          ...createTestMessage(),
          peer: { id: '+8613898765432', kind: 'dm' as const }
        };
        const session2 = await limitedManager.createOrGetSession(
          message2,
          'general-agent'
        );
        
        // 尝试创建第三个会话（应该抛出错误）
        const message3 = {
          ...createTestMessage(),
          peer: { id: '+8613811122222', kind: 'dm' as const }
        };
        
        await expect(
          limitedManager.createOrGetSession(message3, 'general-agent')
        ).rejects.toThrow('Maximum concurrent sessions limit reached');
      } finally {
        await limitedManager.close();
      }
    });
  });
  
  describe('统计信息', () => {
    test('应该正确跟踪会话统计', async () => {
      const initialStats = channelManager.getStats();
      expect(initialStats.totalSessionsCreated).toBe(0);
      expect(initialStats.activeSessionCount).toBe(0);
      
      // 创建会话
      const session1 = await channelManager.createOrGetSession(
        createTestMessage(),
        'general-agent'
      );
      
      const statsAfterCreate = channelManager.getStats();
      expect(statsAfterCreate.totalSessionsCreated).toBe(1);
      expect(statsAfterCreate.activeSessionCount).toBe(1);
      
      // 销毁会话
      await channelManager.destroySession(session1.sessionKey);
      
      const statsAfterDestroy = channelManager.getStats();
      expect(statsAfterDestroy.totalSessionsCreated).toBe(1);
      expect(statsAfterDestroy.totalSessionsDestroyed).toBe(1);
      expect(statsAfterDestroy.activeSessionCount).toBe(0);
    });
    
    test('应该跟踪峰值并发数', async () => {
      // 创建第一个会话
      const session1 = await channelManager.createOrGetSession(
        createTestMessage(),
        'general-agent'
      );
      
      let stats = channelManager.getStats();
      expect(stats.peakConcurrentSessions).toBe(1);
      
      // 创建第二个会话
      const message2 = {
        ...createTestMessage(),
        peer: { id: '+8613898765432', kind: 'dm' as const }
      };
      const session2 = await channelManager.createOrGetSession(
        message2,
        'general-agent'
      );
      
      stats = channelManager.getStats();
      expect(stats.peakConcurrentSessions).toBe(2);
      
      // 销毁一个会话
      await channelManager.destroySession(session1.sessionKey);
      
      // 峰值应该保持不变
      stats = channelManager.getStats();
      expect(stats.peakConcurrentSessions).toBe(2);
    });
  });
});

// 运行测试的辅助代码
if (require.main === module) {
  console.log('Running ChannelManager tests...');
  // 在实际环境中，这里会调用测试运行器
  // 为简化示例，我们只输出测试结构
  console.log('Test structure defined. Use a test runner like Jest to execute.');
}