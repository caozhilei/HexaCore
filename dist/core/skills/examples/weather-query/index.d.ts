/**
 * 天气查询技能实现
 * 基于OpenWeatherMap API的实时天气查询
 */
import { SkillBase, SkillInput, SkillOutput } from '../../framework';
/**
 * 天气查询参数
 */
interface WeatherQueryParams {
    city: string;
    days?: number;
}
/**
 * 当前天气信息
 */
interface CurrentWeather {
    temp: number;
    feels_like: number;
    humidity: number;
    pressure: number;
    wind_speed: number;
    description: string;
    icon: string;
}
/**
 * 天气预报信息
 */
interface ForecastDay {
    date: string;
    temp_min: number;
    temp_max: number;
    description: string;
    precipitation: number;
}
/**
 * 天气查询结果
 */
interface WeatherQueryResult {
    city: string;
    current: CurrentWeather;
    forecast: ForecastDay[];
}
/**
 * 天气查询技能
 */
export declare class WeatherQuerySkill extends SkillBase {
    private apiKey;
    private baseUrl;
    /**
     * 构造函数
     */
    constructor();
    /**
     * 技能初始化
     */
    initialize(): Promise<void>;
    /**
     * 执行天气查询
     */
    execute(input: SkillInput<WeatherQueryParams>): Promise<SkillOutput<WeatherQueryResult>>;
    /**
     * 获取真实天气数据
     */
    private fetchRealWeatherData;
    /**
     * 生成模拟天气数据
     */
    private generateMockWeatherData;
    /**
     * 获取随机天气描述
     */
    private getRandomWeatherDescription;
    /**
     * 获取天气图标
     */
    private getWeatherIcon;
    /**
     * 技能清理
     */
    cleanup(): Promise<void>;
}
/**
 * 导出工厂函数
 */
export default function createSkill(): WeatherQuerySkill;
export {};
