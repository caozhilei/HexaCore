/**
 * HexaCore 企业微信适配器
 * 基于企业微信开放API实现的企业级通信适配器
 */
import { BaseAdapter } from './base-adapter';
import { OutboundMessage, ChannelConfig, HealthStatus, Logger } from './interfaces';
interface WeComRawMessage {
    ToUserName: string;
    FromUserName: string;
    CreateTime: number;
    MsgType: string;
    MsgId: string;
    Event?: string;
    EventKey?: string;
    Content?: string;
    PicUrl?: string;
    MediaId?: string;
    Format?: string;
    ThumbMediaId?: string;
    Location_X?: number;
    Location_Y?: number;
    Scale?: number;
    Label?: string;
    Title?: string;
    Description?: string;
    Url?: string;
    AgentID?: number;
}
/**
 * 企业微信适配器实现
 */
export declare class WeComAdapter extends BaseAdapter {
    private apiClient;
    private orgSync;
    private oauthManager;
    private accessToken;
    private tokenExpiry;
    private departmentCache;
    private userCache;
    constructor(logger?: Logger);
    /**
     * 企业微信特定的启动逻辑
     */
    protected onStart(config: ChannelConfig): Promise<void>;
    /**
     * 企业微信特定的停止逻辑
     */
    protected onStop(): Promise<void>;
    /**
     * 企业微信特定的消息发送逻辑
     */
    protected onSend(message: OutboundMessage): Promise<void>;
    /**
     * 企业微信特定的健康检查逻辑
     */
    protected onHealthCheck(): Promise<HealthStatus>;
    /**
     * 验证企业微信配置
     */
    protected validateConfig(config: ChannelConfig): Promise<void>;
    /**
     * 验证输出消息格式
     */
    protected validateOutboundMessage(message: OutboundMessage): Promise<void>;
    /**
     * 初始化API客户端
     */
    private initApiClient;
    /**
     * 刷新访问令牌
     */
    private refreshAccessToken;
    /**
     * 启动组织架构同步服务
     */
    private startOrgSyncService;
    /**
     * 初始化OAuth管理器
     */
    private initOAuthManager;
    /**
     * 处理接收到的企业微信消息
     */
    handleIncomingMessage(raw: WeComRawMessage): Promise<void>;
    /**
     * 将企业微信原始消息转换为InboundMessage
     */
    private convertToInboundMessage;
    /**
     * 将标准化消息内容转换为企业微信消息格式
     */
    private convertToWeComMessage;
    /**
     * 获取用户信息
     */
    private getUserInfo;
    private extractText;
    private extractAttachments;
    private mapMessageType;
    private mapToWeComMsgType;
    private isSupportedAttachmentType;
}
export {};
