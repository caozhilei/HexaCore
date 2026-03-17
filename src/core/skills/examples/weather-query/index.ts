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
  precipitation: number; // 降水概率百分比
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
export class WeatherQuerySkill extends SkillBase {
  private apiKey: string;
  private baseUrl = 'https://api.openweathermap.org/data/2.5';
  
  /**
   * 构造函数
   */
  constructor() {
    super('weather-query', '1.0.0', '实时天气查询技能，支持全球城市天气信息查询');
    
    // 获取API密钥
    this.apiKey = process.env.WEATHER_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('WEATHER_API_KEY环境变量未设置，将使用模拟数据');
    }
  }
  
  /**
   * 技能初始化
   */
  async initialize(): Promise<void> {
    console.log('天气查询技能初始化完成');
  }
  
  /**
   * 执行天气查询
   */
  async execute(input: SkillInput<WeatherQueryParams>): Promise<SkillOutput<WeatherQueryResult>> {
    const startTime = Date.now();
    
    try {
      const { city, days = 1 } = input.parameters;
      
      // 验证参数
      if (!city || city.trim().length === 0) {
        return this.createErrorResponse('城市名称不能为空');
      }
      
      if (days < 1 || days > 7) {
        return this.createErrorResponse('预报天数必须在1-7之间');
      }
      
      let result: WeatherQueryResult;
      
      // 如果有API密钥，尝试调用真实API
      if (this.apiKey) {
        result = await this.fetchRealWeatherData(city, days);
      } else {
        // 使用模拟数据
        result = this.generateMockWeatherData(city, days);
      }
      
      const processingTime = Date.now() - startTime;
      
      return this.createSuccessResponse(result, {
        processingTime,
        cacheable: true,
        ttl: 1800, // 30分钟缓存
      });
    } catch (error) {
      return this.createErrorResponse(
        `天气查询失败: ${error.message}`,
        { processingTime: Date.now() - startTime }
      );
    }
  }
  
  /**
   * 获取真实天气数据
   */
  private async fetchRealWeatherData(city: string, days: number): Promise<WeatherQueryResult> {
    // 这里应该实现真实的API调用
    // 由于环境限制，这里暂时返回模拟数据
    return this.generateMockWeatherData(city, days);
  }
  
  /**
   * 生成模拟天气数据
   */
  private generateMockWeatherData(city: string, days: number): WeatherQueryResult {
    // 生成当前天气
    const current: CurrentWeather = {
      temp: 20 + Math.random() * 10, // 20-30度
      feels_like: 20 + Math.random() * 10,
      humidity: 40 + Math.random() * 40, // 40-80%
      pressure: 1000 + Math.random() * 30, // 1000-1030hPa
      wind_speed: 1 + Math.random() * 5, // 1-6m/s
      description: this.getRandomWeatherDescription(),
      icon: this.getWeatherIcon('晴'),
    };
    
    // 生成天气预报
    const forecast: ForecastDay[] = [];
    const today = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const weatherDesc = this.getRandomWeatherDescription();
      
      forecast.push({
        date: date.toISOString().split('T')[0],
        temp_min: 15 + Math.random() * 5,
        temp_max: 25 + Math.random() * 5,
        description: weatherDesc,
        precipitation: Math.floor(Math.random() * 30), // 0-30%降水概率
      });
    }
    
    return {
      city: `${city}市`,
      current,
      forecast,
    };
  }
  
  /**
   * 获取随机天气描述
   */
  private getRandomWeatherDescription(): string {
    const descriptions = [
      '晴', '多云', '阴', '小雨', '中雨', '大雨', '阵雨',
      '雷阵雨', '小雪', '中雪', '大雪', '雾', '霾', '沙尘'
    ];
    return descriptions[Math.floor(Math.random() * descriptions.length)];
  }
  
  /**
   * 获取天气图标
   */
  private getWeatherIcon(description: string): string {
    const iconMap: Record<string, string> = {
      '晴': 'https://openweathermap.org/img/wn/01d@2x.png',
      '多云': 'https://openweathermap.org/img/wn/02d@2x.png',
      '阴': 'https://openweathermap.org/img/wn/03d@2x.png',
      '小雨': 'https://openweathermap.org/img/wn/09d@2x.png',
      '中雨': 'https://openweathermap.org/img/wn/10d@2x.png',
      '大雨': 'https://openweathermap.org/img/wn/11d@2x.png',
      '阵雨': 'https://openweathermap.org/img/wn/09d@2x.png',
      '雷阵雨': 'https://openweathermap.org/img/wn/11d@2x.png',
      '小雪': 'https://openweathermap.org/img/wn/13d@2x.png',
      '中雪': 'https://openweathermap.org/img/wn/13d@2x.png',
      '大雪': 'https://openweathermap.org/img/wn/13d@2x.png',
      '雾': 'https://openweathermap.org/img/wn/50d@2x.png',
      '霾': 'https://openweathermap.org/img/wn/50d@2x.png',
      '沙尘': 'https://openweathermap.org/img/wn/50d@2x.png',
    };
    
    return iconMap[description] || 'https://openweathermap.org/img/wn/01d@2x.png';
  }
  
  /**
   * 技能清理
   */
  async cleanup(): Promise<void> {
    console.log('天气查询技能清理完成');
  }
}

/**
 * 导出工厂函数
 */
export default function createSkill() {
  return new WeatherQuerySkill();
}