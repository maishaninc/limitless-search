import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { BackendManager } from '../utils/backend-manager.js';
import { HttpClient } from '../utils/http-client.js';
import { Config } from '../utils/config.js';

/**
 * 启动后端服务工具定义
 */
export const startBackendTool: Tool = {
  name: 'start_backend',
  description: '启动Limitless Search后端服务。如果后端服务未运行，此工具将启动它并等待服务完全可用。',
  inputSchema: {
    type: 'object',
    properties: {
      force_restart: {
        type: 'boolean',
        description: '是否强制重启后端服务（即使已在运行）',
        default: false
      }
    },
    additionalProperties: false
  }
};

/**
 * 启动后端服务工具参数接口
 */
interface StartBackendArgs {
  force_restart?: boolean;
}

/**
 * 执行启动后端服务工具
 */
export async function executeStartBackendTool(
  args: unknown, 
  httpClient?: HttpClient, 
  config?: Config
): Promise<string> {
  try {
    // 参数验证
    const params = args as StartBackendArgs;
    const forceRestart = params?.force_restart || false;

    console.log('启动后端服务工具被调用');
    
    // 如果没有提供依赖项，则创建默认实例
    if (!config) {
      const { loadConfig } = await import('../utils/config.js');
      config = loadConfig();
    }
    
    if (!httpClient) {
      const { HttpClient } = await import('../utils/http-client.js');
      httpClient = new HttpClient(config);
    }
    
    // 创建后端管理器
    const backendManager = new BackendManager(config, httpClient);
    
    // 检查当前服务状态
    httpClient.setSilentMode(true);
    const isHealthy = await httpClient.testConnection();
    httpClient.setSilentMode(false);
    
    if (isHealthy && !forceRestart) {
      return JSON.stringify({
        success: true,
        message: '后端服务已在运行',
        status: 'already_running',
        service_url: config.serverUrl
      }, null, 2);
    }
    
    if (isHealthy && forceRestart) {
      console.log('强制重启后端服务...');
    }
    
    console.log('正在启动后端服务...');
    const started = await backendManager.startBackend();
    
    if (!started) {
      return JSON.stringify({
        success: false,
        message: '后端服务启动失败',
        status: 'start_failed',
        error: '无法启动后端服务，请检查配置和权限'
      }, null, 2);
    }
    
    // 等待服务完全启动并进行健康检查
    console.log('等待服务完全启动...');
    const maxRetries = 10;
    let retries = 0;
    
    while (retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒
      const healthy = await httpClient.testConnection();
      
      if (healthy) {
        console.log('后端服务启动成功并通过健康检查');
        return JSON.stringify({
          success: true,
          message: '后端服务启动成功',
          status: 'started',
          service_url: config.serverUrl,
          startup_time: `${retries + 1}秒`
        }, null, 2);
      }
      
      retries++;
      console.log(`健康检查重试 ${retries}/${maxRetries}...`);
    }
    
    return JSON.stringify({
      success: false,
      message: '后端服务启动超时',
      status: 'timeout',
      error: '服务启动后未能通过健康检查，可能需要更多时间或存在配置问题'
    }, null, 2);
    
  } catch (error) {
    console.error('启动后端服务时发生错误:', error);
    return JSON.stringify({
      success: false,
      message: '启动后端服务时发生错误',
      status: 'error',
      error: error instanceof Error ? error.message : String(error)
    }, null, 2);
  }
}
