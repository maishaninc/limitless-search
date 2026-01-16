import { z } from 'zod';
import { ConfigSchema } from './validators.js';

export type Config = z.infer<typeof ConfigSchema>;

/**
 * 解析逗号分隔的字符串为数组
 */
function parseCommaSeparated(value: string | undefined): string[] {
  if (!value || value.trim() === '') {
    return [];
  }
  return value.split(',').map(item => item.trim()).filter(item => item.length > 0);
}

/**
 * 从环境变量加载配置
 */
export function loadConfig(): Config {
  const rawConfig = {
    serverUrl: process.env.PANSOU_SERVER_URL,
    requestTimeout: process.env.REQUEST_TIMEOUT ? parseInt(process.env.REQUEST_TIMEOUT) * 1000 : undefined,
    maxResults: process.env.MAX_RESULTS ? parseInt(process.env.MAX_RESULTS) : undefined,
    maxConcurrentRequests: process.env.MAX_CONCURRENT_REQUESTS ? parseInt(process.env.MAX_CONCURRENT_REQUESTS) : undefined,
    enableCache: process.env.ENABLE_CACHE === 'true',
    defaultChannels: parseCommaSeparated(process.env.DEFAULT_CHANNELS),
    defaultPlugins: parseCommaSeparated(process.env.DEFAULT_PLUGINS),
    defaultCloudTypes: parseCommaSeparated(process.env.DEFAULT_CLOUD_TYPES),
    logLevel: process.env.LOG_LEVEL as 'error' | 'warn' | 'info' | 'debug' | undefined,
    // 后端服务自动管理配置
    autoStartBackend: process.env.AUTO_START_BACKEND !== 'false', // 默认为true，除非明确设置为false
    backendShutdownDelay: process.env.BACKEND_SHUTDOWN_DELAY ? parseInt(process.env.BACKEND_SHUTDOWN_DELAY) : undefined,
    backendStartupTimeout: process.env.BACKEND_STARTUP_TIMEOUT ? parseInt(process.env.BACKEND_STARTUP_TIMEOUT) : undefined,
    // 空闲超时配置
    idleTimeout: process.env.IDLE_TIMEOUT ? parseInt(process.env.IDLE_TIMEOUT) : undefined,
    enableIdleShutdown: process.env.ENABLE_IDLE_SHUTDOWN !== 'false', // 默认为true，除非明确设置为false
    // 项目根目录路径
    projectRootPath: process.env.PROJECT_ROOT_PATH,
    // Docker部署模式
    dockerMode: process.env.DOCKER_MODE === 'true'
  };

  // 移除undefined值，让zod使用默认值
  const cleanConfig = Object.fromEntries(
    Object.entries(rawConfig).filter(([_, value]) => value !== undefined)
  );

  try {
    return ConfigSchema.parse(cleanConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('配置验证失败:', error.errors);
      throw new Error(`配置验证失败: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
    }
    throw error;
  }
}

// 从validators模块重新导出类型和验证函数
export {
  SUPPORTED_CLOUD_TYPES,
  SOURCE_TYPES,
  RESULT_TYPES,
  type CloudType,
  type SourceType,
  type ResultType,
  validateCloudTypes,
  validateSourceType,
  validateResultType
} from './validators.js';