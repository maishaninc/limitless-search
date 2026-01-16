import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { HttpClient } from '../utils/http-client.js';

/**
 * 健康检查工具定义
 */
export const healthTool: Tool = {
  name: 'check_service_health',
  description: '检查Limitless Search服务的健康状态，获取服务信息、可用插件和频道列表',
  inputSchema: {
    type: 'object',
    properties: {},
    required: []
  }
};

/**
 * 执行健康检查工具
 */
export async function executeHealthTool(args: unknown, httpClient: HttpClient): Promise<string> {
  try {
    // 执行健康检查
    const healthData = await httpClient.checkHealth();
    
    // 格式化返回结果
    return formatHealthResult(healthData, httpClient.getServerUrl());
    
  } catch (error) {
    if (error instanceof Error) {
      return formatErrorResult(error.message, httpClient.getServerUrl());
    }
    
    return formatErrorResult(`健康检查失败: ${String(error)}`, httpClient.getServerUrl());
  }
}

/**
 * 格式化健康检查结果
 */
function formatHealthResult(healthData: any, serverUrl: string): string {
  let output = `**Limitless Search服务健康检查**\n\n`;
  
  // 服务基本信息
  output += `**服务地址**: ${serverUrl}\n`;
  output += `**服务状态**: ${healthData.status === 'ok' ? '正常' : '异常'}\n\n`;
  
  // 频道信息
  output += `**TG频道信息**\n`;
  output += `   频道数量: ${healthData.channels_count || 0}\n`;
  if (healthData.channels && healthData.channels.length > 0) {
    output += `   可用频道:\n`;
    healthData.channels.forEach((channel: string, index: number) => {
      output += `      ${index + 1}. ${channel}\n`;
    });
  } else {
    output += `   未配置频道\n`;
  }
  output += '\n';
  
  // 插件信息
  output += `**插件信息**\n`;
  output += `   插件功能: ${healthData.plugins_enabled ? '已启用' : '已禁用'}\n`;
  
  if (healthData.plugins_enabled) {
    output += `   插件数量: ${healthData.plugin_count || 0}\n`;
    if (healthData.plugins && healthData.plugins.length > 0) {
      output += `   可用插件:\n`;
      
      // 将插件按行显示，每行最多4个
      const plugins = healthData.plugins;
      for (let i = 0; i < plugins.length; i += 4) {
        const row = plugins.slice(i, i + 4);
        output += `      ${row.map((plugin: string, idx: number) => `${i + idx + 1}. ${plugin}`).join('  ')}\n`;
      }
    } else {
      output += `   未发现可用插件\n`;
    }
  } else {
    output += `   插件功能已禁用\n`;
  }
  
  output += '\n';
  
  // 功能说明
  output += `**功能说明**\n`;
  output += `   支持搜索多种网盘资源\n`;
  output += `   支持TG频道和插件双重搜索\n`;
  output += `   支持并发搜索，提升搜索速度\n`;
  output += `   支持缓存机制，避免重复请求\n`;
  output += `   支持按网盘类型过滤结果\n`;
  
  return output;
}

/**
 * 格式化错误结果
 */
function formatErrorResult(errorMessage: string, serverUrl: string): string {
  let output = `**Limitless Search服务健康检查失败**\n\n`;
  
  output += `**服务地址**: ${serverUrl}\n`;
  output += `**错误信息**: ${errorMessage}\n\n`;
  
  output += `**可能的解决方案**:\n`;
  output += `   1. 检查Limitless Search服务是否正在运行\n`;
  output += `   2. 确认服务地址配置是否正确\n`;
  output += `   3. 检查网络连接是否正常\n`;
  output += `   4. 查看服务日志获取更多信息\n\n`;
  
  output += `**配置说明**:\n`;
  output += `   可通过环境变量 PANSOU_SERVER_URL 配置服务地址\n`;
  output += `   默认地址: http://localhost:8888\n`;
  
  return output;
}
