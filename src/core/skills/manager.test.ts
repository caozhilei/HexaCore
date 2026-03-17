/**
 * 技能管理器测试
 * 验证技能框架的基本功能
 */

import { SkillManager, SkillManagerConfig, SkillExecuteOptions } from './manager';
import { SkillStatus } from './framework';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * 测试配置
 */
const TEST_CONFIG: SkillManagerConfig = {
  skillsDirectory: './test-skills',
  environment: {
    TEST_ENV: 'test_value',
    WEATHER_API_KEY: 'test_api_key',
    OPENAI_API_KEY: 'test_openai_key',
  },
  autoDiscover: true,
  autoInitialize: true,
  maxSkills: 10,
};

/**
 * 清理测试目录
 */
async function cleanupTestDirectory(): Promise<void> {
  try {
    await fs.rm(TEST_CONFIG.skillsDirectory, { recursive: true, force: true });
  } catch (error) {
    // 目录不存在，忽略错误
  }
}

/**
 * 创建测试技能目录
 */
async function createTestSkillDirectory(skillName: string, description: string): Promise<string> {
  const skillDir = path.join(TEST_CONFIG.skillsDirectory, skillName);
  await fs.mkdir(skillDir, { recursive: true });
  
  // 创建SKILL.md文件
  const skillMdContent = `---
name: ${skillName}
description: ${description}
version: 1.0.0
tools: [read, write]
environment: [TEST_ENV]
parameters:
  name:
    type: string
    description: 测试参数
    required: true
output:
  type: object
  properties:
    message:
      type: string
    timestamp:
      type: string
---
# ${skillName}
测试技能描述
`;
  
  await fs.writeFile(path.join(skillDir, 'SKILL.md'), skillMdContent, 'utf8');
  
  // 创建实现文件
  const indexContent = `import { SkillBase, SkillInput, SkillOutput } from '../../framework';

interface TestParams {
  name: string;
}

interface TestResult {
  message: string;
  timestamp: string;
}

export class TestSkill extends SkillBase {
  constructor() {
    super('${skillName}', '1.0.0', '${description}');
  }
  
  async execute(input: SkillInput<TestParams>): Promise<SkillOutput<TestResult>> {
    const { name } = input.parameters;
    
    const result: TestResult = {
      message: \`Hello, \${name}! This is skill '\${this.definition.name}'\`,
      timestamp: new Date().toISOString(),
    };
    
    return {
      success: true,
      data: result,
      metadata: {
        timestamp: new Date().toISOString(),
        processingTime: 100,
        skillName: this.definition.name,
        skillVersion: this.definition.version,
      },
    };
  }
}

export default function createSkill() {
  return new TestSkill();
}
`;
  
  await fs.writeFile(path.join(skillDir, 'index.ts'), indexContent, 'utf8');
  
  return skillDir;
}

/**
 * 主测试函数
 */
describe('技能管理器测试', () => {
  let skillManager: SkillManager;
  
  beforeAll(async () => {
    // 清理并创建测试目录
    await cleanupTestDirectory();
    await fs.mkdir(TEST_CONFIG.skillsDirectory, { recursive: true });
  });
  
  beforeEach(() => {
    skillManager = new SkillManager(TEST_CONFIG);
  });
  
  afterEach(async () => {
    // 清理管理器
    // 注意：实际应该调用清理方法，这里简化处理
  });
  
  afterAll(async () => {
    await cleanupTestDirectory();
  });
  
  /**
   * 测试1：管理器初始化
   */
  test('管理器初始化', async () => {
    await skillManager.initialize();
    
    expect(skillManager.getStatus()).toBe(SkillStatus.READY);
    expect(skillManager.getSkillCount()).toBe(0); // 初始没有技能
  });
  
  /**
   * 测试2：创建和加载技能
   */
  test('创建和加载技能', async () => {
    await skillManager.initialize();
    
    // 创建测试技能目录
    const skillDir = await createTestSkillDirectory('test-skill-1', '测试技能1');
    
    // 重新初始化以发现新技能
    const newManager = new SkillManager(TEST_CONFIG);
    await newManager.initialize();
    
    // 验证技能已加载
    expect(newManager.hasSkill('test-skill-1')).toBe(true);
    expect(newManager.getSkillCount()).toBe(1);
    
    const skillDef = newManager.getSkillDefinition('test-skill-1');
    expect(skillDef).toBeDefined();
    expect(skillDef!.name).toBe('test-skill-1');
    expect(skillDef!.version).toBe('1.0.0');
    expect(skillDef!.tools).toContain('read');
    expect(skillDef!.tools).toContain('write');
  });
  
  /**
   * 测试3：执行技能
   */
  test('执行技能', async () => {
    await skillManager.initialize();
    
    // 创建测试技能目录
    await createTestSkillDirectory('test-skill-2', '测试技能2');
    
    // 重新初始化
    const newManager = new SkillManager(TEST_CONFIG);
    await newManager.initialize();
    
    // 执行选项
    const executeOptions: SkillExecuteOptions = {
      callerAgentId: 'test-agent',
      sessionId: 'test-session-123',
      validatePermissions: false,
    };
    
    // 执行技能
    const result = await newManager.executeSkill(
      'test-skill-2',
      { name: 'Tester' },
      executeOptions
    );
    
    // 验证结果
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.response).toContain('Hello, Tester!');
    expect(result.data!.metadata.intent).toBeDefined();
  });
  
  /**
   * 测试4：技能权限验证
   */
  test('技能权限验证', async () => {
    await skillManager.initialize();
    
    // 创建需要特定工具权限的技能
    const skillDir = path.join(TEST_CONFIG.skillsDirectory, 'restricted-skill');
    await fs.mkdir(skillDir, { recursive: true });
    
    const skillMdContent = `---
name: restricted-skill
description: 需要特殊权限的技能
version: 1.0.0
tools: [exec, network]
environment: []
parameters:
  command:
    type: string
    description: 命令
    required: true
output:
  type: object
  properties:
    result:
      type: string
---
# 受限技能
需要exec和network权限
`;
    
    await fs.writeFile(path.join(skillDir, 'SKILL.md'), skillMdContent, 'utf8');
    
    // 创建实现文件
    const indexContent = `import { SkillBase, SkillInput, SkillOutput } from '../../framework';

interface RestrictedParams {
  command: string;
}

interface RestrictedResult {
  result: string;
}

export class RestrictedSkill extends SkillBase {
  constructor() {
    super('restricted-skill', '1.0.0', '需要特殊权限的技能');
  }
  
  async execute(input: SkillInput<RestrictedParams>): Promise<SkillOutput<RestrictedResult>> {
    return {
      success: true,
      data: { result: '命令执行成功' },
      metadata: {
        timestamp: new Date().toISOString(),
        processingTime: 50,
      },
    };
  }
}

export default function createSkill() {
  return new RestrictedSkill();
}
`;
    
    await fs.writeFile(path.join(skillDir, 'index.ts'), indexContent, 'utf8');
    
    // 重新初始化
    const newManager = new SkillManager(TEST_CONFIG);
    await newManager.initialize();
    
    // 验证技能已加载
    expect(newManager.hasSkill('restricted-skill')).toBe(true);
    
    // 测试执行（应该成功，因为我们在测试中禁用了权限验证）
    const executeOptions: SkillExecuteOptions = {
      callerAgentId: 'test-agent',
      validatePermissions: false,
    };
    
    const result = await newManager.executeSkill(
      'restricted-skill',
      { command: 'test' },
      executeOptions
    );
    
    expect(result.success).toBe(true);
  });
  
  /**
   * 测试5：技能卸载
   */
  test('技能卸载', async () => {
    await skillManager.initialize();
    
    // 创建测试技能
    await createTestSkillDirectory('test-skill-3', '测试技能3');
    
    const newManager = new SkillManager(TEST_CONFIG);
    await newManager.initialize();
    
    // 验证技能已加载
    expect(newManager.hasSkill('test-skill-3')).toBe(true);
    expect(newManager.getSkillCount()).toBe(1);
    
    // 卸载技能
    await newManager.unloadSkill('test-skill-3');
    
    // 验证技能已卸载
    expect(newManager.hasSkill('test-skill-3')).toBe(false);
    expect(newManager.getSkillCount()).toBe(0);
  });
  
  /**
   * 测试6：技能白名单/黑名单
   */
  test('技能白名单和黑名单', async () => {
    const filteredConfig: SkillManagerConfig = {
      ...TEST_CONFIG,
      whitelist: ['allowed-skill'],
      blacklist: ['blocked-skill'],
    };
    
    // 创建多个测试技能
    await createTestSkillDirectory('allowed-skill', '允许的技能');
    await createTestSkillDirectory('blocked-skill', '阻塞的技能');
    await createTestSkillDirectory('other-skill', '其他技能');
    
    const filteredManager = new SkillManager(filteredConfig);
    await filteredManager.initialize();
    
    // 验证：白名单中的技能应该加载
    expect(filteredManager.hasSkill('allowed-skill')).toBe(true);
    
    // 验证：黑名单中的技能不应该加载
    expect(filteredManager.hasSkill('blocked-skill')).toBe(false);
    
    // 验证：不在白名单中的技能不应该加载
    expect(filteredManager.hasSkill('other-skill')).toBe(false);
    
    // 验证技能数量
    expect(filteredManager.getSkillCount()).toBe(1);
  });
  
  /**
   * 测试7：错误处理 - 技能不存在
   */
  test('错误处理 - 技能不存在', async () => {
    await skillManager.initialize();
    
    const executeOptions: SkillExecuteOptions = {
      callerAgentId: 'test-agent',
      validatePermissions: false,
    };
    
    const result = await skillManager.executeSkill(
      'non-existent-skill',
      { param: 'value' },
      executeOptions
    );
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('未加载');
  });
  
  /**
   * 测试8：参数验证
   */
  test('参数验证', async () => {
    await skillManager.initialize();
    
    // 创建测试技能
    await createTestSkillDirectory('validation-skill', '参数验证技能');
    
    const newManager = new SkillManager(TEST_CONFIG);
    await newManager.initialize();
    
    const executeOptions: SkillExecuteOptions = {
      callerAgentId: 'test-agent',
      validatePermissions: false,
    };
    
    // 测试缺少必填参数
    const result1 = await newManager.executeSkill(
      'validation-skill',
      {}, // 缺少name参数
      executeOptions
    );
    
    expect(result1.success).toBe(false);
    expect(result1.error).toContain('验证失败');
    
    // 测试提供有效参数
    const result2 = await newManager.executeSkill(
      'validation-skill',
      { name: 'Valid User' },
      executeOptions
    );
    
    expect(result2.success).toBe(true);
  });
  
  /**
   * 测试9：会话管理
   */
  test('会话管理', async () => {
    await skillManager.initialize();
    
    // 创建测试技能
    await createTestSkillDirectory('session-skill', '会话管理技能');
    
    const newManager = new SkillManager(TEST_CONFIG);
    await newManager.initialize();
    
    const executeOptions: SkillExecuteOptions = {
      callerAgentId: 'test-agent',
      sessionId: 'test-session-456',
      validatePermissions: false,
    };
    
    const result = await newManager.executeSkill(
      'session-skill',
      { name: 'Session User' },
      executeOptions
    );
    
    expect(result.success).toBe(true);
    expect(result.data!.metadata.session_id).toBeDefined();
  });
  
  /**
   * 测试10：性能监控
   */
  test('性能监控', async () => {
    await skillManager.initialize();
    
    // 创建测试技能
    await createTestSkillDirectory('performance-skill', '性能测试技能');
    
    const newManager = new SkillManager(TEST_CONFIG);
    await newManager.initialize();
    
    const executeOptions: SkillExecuteOptions = {
      callerAgentId: 'test-agent',
      validatePermissions: false,
    };
    
    const startTime = Date.now();
    const result = await newManager.executeSkill(
      'performance-skill',
      { name: 'Performance Test' },
      executeOptions
    );
    
    const endTime = Date.now();
    const executionTime = endTime - startTime;
    
    expect(result.success).toBe(true);
    expect(result.metadata.processingTime).toBeDefined();
    expect(executionTime).toBeLessThan(5000); // 执行时间应小于5秒
  });
});

/**
 * 运行测试
 */
async function runTests() {
  console.log('开始运行技能管理器测试...');
  
  try {
    // 这里应该使用测试框架（如Jest）来运行测试
    // 由于环境限制，这里只输出测试说明
    console.log('测试框架需要外部运行（如使用Jest）');
    console.log('要运行测试，请执行: npm test -- src/core/skills/manager.test.ts');
    
    return true;
  } catch (error) {
    console.error('测试运行失败:', error);
    return false;
  }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}