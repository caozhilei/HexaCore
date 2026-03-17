"use strict";
/**
 * 文档生成技能实现
 * 支持多种文档类型和输出格式
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentGenerationSkill = void 0;
exports.default = createSkill;
const framework_1 = require("../../framework");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const ejs = __importStar(require("ejs"));
const marked_1 = require("marked");
/**
 * 文档生成技能
 */
class DocumentGenerationSkill extends framework_1.SkillBase {
    openaiApiKey;
    templateDir;
    /**
     * 构造函数
     */
    constructor() {
        super('document-generation', '1.0.0', '文档生成技能，支持多种文档类型和输出格式');
        // 获取配置
        this.openaiApiKey = process.env.OPENAI_API_KEY || '';
        this.templateDir = process.env.TEMPLATE_DIR || './templates';
        if (!this.openaiApiKey) {
            console.warn('OPENAI_API_KEY环境变量未设置，将使用模板生成文档');
        }
    }
    /**
     * 技能初始化
     */
    async initialize() {
        // 确保模板目录存在
        try {
            await fs.access(this.templateDir);
        }
        catch {
            await fs.mkdir(this.templateDir, { recursive: true });
            console.log(`创建模板目录: ${this.templateDir}`);
        }
        console.log('文档生成技能初始化完成');
    }
    /**
     * 执行文档生成
     */
    async execute(input) {
        const startTime = Date.now();
        try {
            const { document_type, topic, output_format, template_name } = input.parameters;
            // 验证参数
            if (!topic || topic.trim().length === 0) {
                return this.createErrorResponse('文档主题不能为空');
            }
            if (!document_type) {
                return this.createErrorResponse('文档类型不能为空');
            }
            // 加载模板
            const template = await this.loadTemplate(document_type, template_name);
            // 生成文档内容
            const content = await this.generateContent(topic, document_type, template);
            // 格式转换
            const formattedContent = await this.formatContent(content, output_format);
            // 保存文档
            const documentPath = await this.saveDocument(topic, formattedContent, output_format);
            // 构建结果
            const result = {
                document_url: documentPath,
                metadata: {
                    generation_time: Date.now() - startTime,
                    word_count: this.countWords(content),
                    template_used: template_name || `${document_type}_default`,
                    format: output_format,
                },
            };
            return this.createSuccessResponse(result, {
                processingTime: Date.now() - startTime,
                cacheable: false, // 文档生成结果通常不缓存
            });
        }
        catch (error) {
            return this.createErrorResponse(`文档生成失败: ${error.message}`, { processingTime: Date.now() - startTime });
        }
    }
    /**
     * 加载模板
     */
    async loadTemplate(documentType, templateName) {
        const templatePath = templateName
            ? path.join(this.templateDir, `${templateName}.ejs`)
            : path.join(this.templateDir, `${documentType}_default.ejs`);
        try {
            // 尝试读取自定义模板
            return await fs.readFile(templatePath, 'utf8');
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                // 模板不存在，使用内置默认模板
                return this.getDefaultTemplate(documentType);
            }
            throw error;
        }
    }
    /**
     * 获取默认模板
     */
    getDefaultTemplate(documentType) {
        const templates = {
            technical: `# <%= topic %> 技术文档

## 概述
本文档详细描述了<%= topic %>的技术实现方案和系统架构。

## 技术架构
### 核心组件
1. **入口层**：负责接收和处理外部请求
2. **路由层**：实现请求的智能分发和负载均衡
3. **业务层**：包含核心业务逻辑和处理流程

### 数据流程
1. 请求进入系统
2. 经过权限验证和安全检查
3. 路由到相应的处理模块
4. 执行业务逻辑并返回结果

## 实现细节
### 关键技术选型
- 开发语言：TypeScript
- 运行环境：Node.js
- 数据库：PostgreSQL
- 缓存：Redis

### 性能优化
- 实现请求缓存机制
- 采用异步处理模式
- 优化数据库查询

## 部署方案
### 环境要求
- Node.js 18+
- PostgreSQL 14+
- Redis 6+

### 部署步骤
1. 安装依赖
2. 配置环境变量
3. 初始化数据库
4. 启动服务

## 维护指南
### 监控指标
- 系统响应时间
- 错误率
- 资源使用率

### 故障处理
提供常见问题的解决方案和排查步骤。

---
*文档生成时间：<%= new Date().toISOString() %>*`,
            report: `# <%= topic %> 分析报告

## 执行摘要
本报告对<%= topic %>进行了全面分析，总结了主要发现和建议。

## 分析背景
### 分析目的
明确本次分析的目标和预期成果。

### 数据来源
说明分析所使用的数据来源和质量评估。

## 分析方法
### 分析框架
描述采用的分析方法和理论框架。

### 技术工具
列出使用的分析工具和技术平台。

## 主要发现
### 发现一：关键趋势
详细描述第一个重要发现。

### 发现二：问题识别
详细描述第二个重要发现。

### 发现三：机会点
详细描述第三个重要发现。

## 结论与建议
### 结论总结
基于分析结果得出的主要结论。

### 行动建议
1. **短期建议**：立即可以实施的改进措施
2. **中期建议**：需要一定准备时间的优化方案
3. **长期建议**：战略层面的发展规划

## 附录
### 数据附表
相关数据表格和补充材料。

### 参考文献
引用的资料和参考文献列表。

---
*报告生成时间：<%= new Date().toISOString() %>*`,
            manual: `# <%= topic %> 使用手册

## 产品简介
### 产品概述
简要介绍<%= topic %>的功能和用途。

### 产品特点
列出产品的主要特点和优势。

## 快速开始
### 安装步骤
1. **环境准备**：确保系统满足运行要求
2. **下载安装**：获取安装包并完成安装
3. **初始配置**：进行必要的初始设置

### 首次使用
引导用户完成第一次使用的必要步骤。

## 功能详解
### 核心功能一
详细描述第一个核心功能的使用方法。

### 核心功能二
详细描述第二个核心功能的使用方法。

### 高级功能
介绍高级功能和专业用途。

## 操作指南
### 日常操作
1. **基本操作**：日常使用的基本流程
2. **数据管理**：如何管理和维护数据
3. **系统设置**：配置系统参数和选项

### 问题排查
常见问题的解决方法和故障排除。

## 维护保养
### 日常维护
建议的日常维护项目和周期。

### 安全注意事项
使用过程中的安全注意事项和警告。

## 技术支持
### 获取帮助
如何获取技术支持和服务。

### 版本更新
版本更新说明和升级指南。

---
*手册生成时间：<%= new Date().toISOString() %>*`,
            proposal: `# <%= topic %> 项目提案

## 项目概述
### 项目背景
说明项目的背景和发起原因。

### 项目目标
明确项目的主要目标和预期成果。

## 需求分析
### 业务需求
详细分析业务需求和痛点。

### 用户需求
描述目标用户的需求和使用场景。

## 解决方案
### 方案设计
提出具体的解决方案和实现方案。

### 技术架构
详细说明技术架构和系统设计。

## 实施计划
### 项目阶段
1. **准备阶段**：项目启动和团队组建
2. **开发阶段**：系统开发和功能实现
3. **测试阶段**：系统测试和性能优化
4. **上线阶段**：部署上线和运营支持

### 时间安排
详细的项目时间表和里程碑。

## 资源需求
### 人力资源
项目所需的人员配置和技能要求。

### 硬件资源
需要的硬件设备和基础设施。

### 软件资源
需要的软件工具和系统平台。

## 风险评估
### 风险识别
识别项目可能面临的主要风险。

### 应对策略
针对各风险的应对措施和预案。

## 预算评估
### 成本估算
详细的项目成本预算和分析。

### 投资回报
预期的投资回报和效益分析。

---
*提案生成时间：<%= new Date().toISOString() %>*`,
        };
        return templates[documentType] || templates.technical;
    }
    /**
     * 生成文档内容
     */
    async generateContent(topic, documentType, template) {
        // 准备模板数据
        const templateData = await this.prepareTemplateData(topic, documentType);
        // 使用EJS模板引擎渲染
        return ejs.render(template, templateData);
    }
    /**
     * 准备模板数据
     */
    async prepareTemplateData(topic, documentType) {
        const baseData = {
            topic,
            date: new Date().toISOString().split('T')[0],
            author: '智能文档生成系统',
            version: '1.0',
        };
        // 根据文档类型添加特定数据
        switch (documentType) {
            case 'technical':
                return {
                    ...baseData,
                    sections: [
                        { title: '架构设计', content: '详细描述系统架构和组件交互' },
                        { title: '技术选型', content: '说明选择的技术栈和理由' },
                        { title: '部署方案', content: '提供完整的部署步骤和配置' },
                    ],
                };
            case 'report':
                return {
                    ...baseData,
                    summary: '这是对项目或分析的执行摘要',
                    findings: [
                        '发现一：系统性能良好',
                        '发现二：用户体验有待提升',
                        '发现三：安全性符合标准',
                    ],
                };
            case 'manual':
                return {
                    ...baseData,
                    introduction: '产品使用手册简介',
                    steps: [
                        { description: '第一步：安装和配置' },
                        { description: '第二步：基本操作' },
                        { description: '第三步：高级功能' },
                    ],
                };
            case 'proposal':
                return {
                    ...baseData,
                    overview: '项目提案概述',
                    objectives: [
                        '目标一：提升系统性能',
                        '目标二：优化用户体验',
                        '目标三：增强安全性',
                    ],
                };
            default:
                return baseData;
        }
    }
    /**
     * 格式转换
     */
    async formatContent(content, outputFormat) {
        switch (outputFormat) {
            case 'markdown':
                return content;
            case 'html':
                return marked_1.marked.parse(content);
            case 'pdf':
                // 简化处理，实际应使用PDF生成库
                return Buffer.from(`PDF格式文档（模拟）\n\n${content}`);
            case 'word':
                // 简化处理，实际应使用docx生成库
                return Buffer.from(`Word格式文档（模拟）\n\n${content}`);
            default:
                return content;
        }
    }
    /**
     * 保存文档
     */
    async saveDocument(topic, content, outputFormat) {
        // 清理主题作为文件名
        const sanitizedTopic = topic.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${sanitizedTopic}_${timestamp}.${outputFormat}`;
        // 创建文档目录
        const docsDir = path.join(process.cwd(), 'outputs', 'documents');
        await fs.mkdir(docsDir, { recursive: true });
        const filepath = path.join(docsDir, filename);
        // 保存文件
        if (Buffer.isBuffer(content)) {
            await fs.writeFile(filepath, content);
        }
        else {
            await fs.writeFile(filepath, content, 'utf8');
        }
        console.log(`文档已保存: ${filepath}`);
        return filepath;
    }
    /**
     * 统计字数
     */
    countWords(content) {
        // 简单的中英文分词统计
        const chineseWords = content.match(/[\u4e00-\u9fa5]/g) || [];
        const englishWords = content.split(/\s+/).filter(word => /[a-zA-Z]/.test(word));
        return chineseWords.length + englishWords.length;
    }
    /**
     * 技能清理
     */
    async cleanup() {
        console.log('文档生成技能清理完成');
    }
}
exports.DocumentGenerationSkill = DocumentGenerationSkill;
/**
 * 导出工厂函数
 */
function createSkill() {
    return new DocumentGenerationSkill();
}
//# sourceMappingURL=index.js.map