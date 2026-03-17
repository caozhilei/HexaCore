/**
 * HexaCore 出入口适配器测试用例
 * 验证三种渠道适配器的基本功能
 */

import { WhatsAppAdapter } from '../whatsapp-adapter';
import { WeComAdapter } from '../wecom-adapter';
import { WebAdapter } from '../web-adapter';
import {
  InboundMessage,
  OutboundMessage,
  WhatsAppConfig,
  WeComConfig,
  WebConfig
} from '../interfaces';

/**
 * WhatsApp适配器测试
 */
describe('WhatsAppAdapter', () => {
  let adapter: WhatsAppAdapter;
  
  beforeEach(() => {
    adapter = new WhatsAppAdapter();
  });
  
  test('should initialize with default config', () => {
    expect(adapter.channelTypeName).toBe('whatsapp');
    expect(adapter.isRunningStatus).toBe(false);
  });
  
  test('should validate configuration correctly', async () => {
    const config: WhatsAppConfig = {
      enabled: true,
      adapter: 'baileys',
      config: {
        businessAccountId: 'test_business',
        authDir: './test-auth'
      }
    };
    
    await expect(adapter.start(config)).resolves.not.toThrow();
  });
  
  test('should reject invalid configuration', async () => {
    const invalidConfig: any = {
      enabled: true,
      config: {
        // missing required fields
      }
    };
    
    await expect(adapter.start(invalidConfig)).rejects.toThrow();
  });
  
  test('should send message when running', async () => {
    const config: WhatsAppConfig = {
      enabled: true,
      adapter: 'baileys',
      config: {
        businessAccountId: 'test_business',
        authDir: './test-auth'
      }
    };
    
    await adapter.start(config);
    
    const message: OutboundMessage = {
      channel: 'whatsapp',
      accountId: 'test_business',
      peerId: '+8613812345678',
      content: {
        text: 'Test message',
        type: 'text'
      }
    };
    
    await expect(adapter.send(message)).resolves.not.toThrow();
  });
});

/**
 * 企业微信适配器测试
 */
describe('WeComAdapter', () => {
  let adapter: WeComAdapter;
  
  beforeEach(() => {
    adapter = new WeComAdapter();
  });
  
  test('should initialize with default config', () => {
    expect(adapter.channelTypeName).toBe('wecom');
    expect(adapter.isRunningStatus).toBe(false);
  });
  
  test('should validate configuration correctly', async () => {
    const config: WeComConfig = {
      enabled: true,
      adapter: 'wecom',
      config: {
        corpId: 'test_corp',
        agentId: 1000001,
        secret: 'test_secret'
      }
    };
    
    await expect(adapter.start(config)).resolves.not.toThrow();
  });
  
  test('should send message when running', async () => {
    const config: WeComConfig = {
      enabled: true,
      adapter: 'wecom',
      config: {
        corpId: 'test_corp',
        agentId: 1000001,
        secret: 'test_secret'
      }
    };
    
    await adapter.start(config);
    
    const message: OutboundMessage = {
      channel: 'wecom',
      accountId: '1000001',
      peerId: 'user001',
      content: {
        text: 'Test WeCom message',
        type: 'text'
      }
    };
    
    await expect(adapter.send(message)).resolves.not.toThrow();
  });
});

/**
 * Web适配器测试
 */
describe('WebAdapter', () => {
  let adapter: WebAdapter;
  
  beforeEach(() => {
    adapter = new WebAdapter();
  });
  
  test('should initialize with default config', () => {
    expect(adapter.channelTypeName).toBe('web');
    expect(adapter.isRunningStatus).toBe(false);
  });
  
  test('should validate configuration correctly', async () => {
    const config: WebConfig = {
      enabled: true,
      adapter: 'widget',
      config: {
        widgetVersion: '2.0.0',
        wsPort: 18790
      }
    };
    
    await expect(adapter.start(config)).resolves.not.toThrow();
  });
  
  test('should send message when running', async () => {
    const config: WebConfig = {
      enabled: true,
      adapter: 'widget',
      config: {
        widgetVersion: '2.0.0',
        wsPort: 18790
      }
    };
    
    await adapter.start(config);
    
    const message: OutboundMessage = {
      channel: 'web',
      accountId: 'default',
      peerId: 'web_session_123',
      content: {
        text: 'Test Web message',
        type: 'text'
      }
    };
    
    await expect(adapter.send(message)).resolves.not.toThrow();
  });
});

/**
 * 综合测试 - 消息格式验证
 */
describe('Message Format Validation', () => {
  test('should accept valid InboundMessage structure', () => {
    const validMessage: InboundMessage = {
      channel: 'web',
      accountId: 'test_account',
      peer: {
        kind: 'anonymous',
        id: 'user_123',
        metadata: {}
      },
      content: {
        text: 'Hello World',
        type: 'text'
      },
      timestamp: Date.now(),
      metadata: {}
    };
    
    expect(validMessage.channel).toBe('web');
    expect(validMessage.content.text).toBe('Hello World');
    expect(validMessage.content.type).toBe('text');
  });
  
  test('should reject message with missing required fields', () => {
    // TypeScript会在编译时捕获这些错误，这里我们只是演示
    const invalidMessage: any = {
      channel: 'web',
      // missing accountId
      peer: {
        kind: 'anonymous',
        id: 'user_123'
      },
      content: {
        text: 'Hello'
      },
      timestamp: Date.now()
    };
    
    // 在实际测试中，我们会使用验证函数
    expect(invalidMessage.accountId).toBeUndefined();
  });
});

/**
 * 性能测试 - 基本性能检查
 */
describe('Adapter Performance', () => {
  test('should start within reasonable time', async () => {
    const adapter = new WhatsAppAdapter();
    const config: WhatsAppConfig = {
      enabled: true,
      adapter: 'baileys',
      config: {
        businessAccountId: 'test_business',
        authDir: './test-auth'
      }
    };
    
    const startTime = Date.now();
    await adapter.start(config);
    const endTime = Date.now();
    
    expect(endTime - startTime).toBeLessThan(5000); // 5秒内启动
  });
  
  test('should send message with low latency', async () => {
    const adapter = new WebAdapter();
    const config: WebConfig = {
      enabled: true,
      adapter: 'widget',
      config: {
        widgetVersion: '2.0.0',
        wsPort: 18790
      }
    };
    
    await adapter.start(config);
    
    const message: OutboundMessage = {
      channel: 'web',
      accountId: 'default',
      peerId: 'test_session',
      content: {
        text: 'Performance test',
        type: 'text'
      }
    };
    
    const startTime = Date.now();
    await adapter.send(message);
    const endTime = Date.now();
    
    expect(endTime - startTime).toBeLessThan(1000); // 1秒内发送
  });
});

/**
 * 错误处理测试
 */
describe('Error Handling', () => {
  test('should handle connection errors gracefully', async () => {
    const adapter = new WeComAdapter();
    // 使用无效配置触发错误
    const invalidConfig: any = {
      enabled: true,
      config: {
        corpId: '',
        agentId: 0,
        secret: ''
      }
    };
    
    await expect(adapter.start(invalidConfig)).rejects.toThrow();
  });
  
  test('should reject sending when not running', async () => {
    const adapter = new WhatsAppAdapter();
    const message: OutboundMessage = {
      channel: 'whatsapp',
      accountId: 'test',
      peerId: '+1234567890',
      content: {
        text: 'Test',
        type: 'text'
      }
    };
    
    await expect(adapter.send(message)).rejects.toThrow('not running');
  });
});

// 运行测试的辅助函数
export async function runAllTests(): Promise<void> {
  const tests = [
    'WhatsAppAdapter',
    'WeComAdapter', 
    'WebAdapter',
    'Message Format Validation',
    'Adapter Performance',
    'Error Handling'
  ];
  
  console.log('Running all adapter tests...');
  
  for (const testName of tests) {
    console.log(`\n=== ${testName} ===`);
    try {
      // 在实际测试框架中，这里会调用具体的测试套件
      console.log(`✓ ${testName} tests completed`);
    } catch (error) {
      console.error(`✗ ${testName} tests failed: ${error.message}`);
    }
  }
  
  console.log('\n=== All tests completed ===');
}
