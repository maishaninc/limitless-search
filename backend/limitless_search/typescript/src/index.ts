#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { loadConfig } from './utils/config.js';
import { HttpClient } from './utils/http-client.js';
import { BackendManager } from './utils/backend-manager.js';
import { searchTool, executeSearchTool } from './tools/search.js';
import { healthTool, executeHealthTool } from './tools/health.js';
import { startBackendTool, executeStartBackendTool } from './tools/start-backend.js';

/**
 * Limitless Search MCP server
 */
class PanSouMCPServer {
  private server: Server;
  private httpClient: HttpClient;
  private backendManager: BackendManager;
  private config: any;

  constructor() {
    this.server = new Server(
      {
        name: 'pansou-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    // 加载配置
    this.config = loadConfig();
    this.httpClient = new HttpClient(this.config);
    this.backendManager = new BackendManager(this.config, this.httpClient);

    this.setupHandlers();
    this.setupProcessHandlers();
  }

  /**
   * 设置请求处理器
   */
  private setupHandlers(): void {
    // 工具列表处理器
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [healthTool, startBackendTool, searchTool],
      };
    });

    // 工具调用处理器
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      // 记录活动，重置空闲计时器
      this.backendManager.recordActivity();

      try {
        switch (name) {
          case 'check_service_health':
            const healthResult = await executeHealthTool(args, this.httpClient);
            return {
              content: [
                {
                  type: 'text',
                  text: healthResult,
                },
              ],
            };

          case 'start_backend':
            const startResult = await executeStartBackendTool(args, this.httpClient, this.config);
            return {
              content: [
                {
                  type: 'text',
                  text: startResult,
                },
              ],
            };

          case 'search_netdisk':
            const searchResult = await executeSearchTool(args, this.httpClient);
            return {
              content: [
                {
                  type: 'text',
                  text: searchResult,
                },
              ],
            };

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `未知工具: ${name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }

        throw new McpError(
          ErrorCode.InternalError,
          `工具执行失败: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });

    // 资源列表处理器
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: 'pansou://plugins',
            name: '可用插件列表',
            description: '获取当前可用的搜索插件列表',
            mimeType: 'application/json',
          },
          {
            uri: 'pansou://channels',
            name: '可用频道列表',
            description: '获取当前可用的TG频道列表',
            mimeType: 'application/json',
          },
          {
            uri: 'pansou://cloud-types',
            name: '支持的网盘类型',
            description: '获取支持的网盘类型列表',
            mimeType: 'application/json',
          },
        ],
      };
    });

    // 资源读取处理器
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      // 记录活动，重置空闲计时器
      this.backendManager.recordActivity();

      try {
        switch (uri) {
          case 'pansou://plugins':
            return await this.getPluginsResource();

          case 'pansou://channels':
            return await this.getChannelsResource();

          case 'pansou://cloud-types':
            return await this.getCloudTypesResource();

          default:
            throw new McpError(
              ErrorCode.InvalidRequest,
              `未知资源URI: ${uri}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }

        throw new McpError(
          ErrorCode.InternalError,
          `资源读取失败: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  /**
   * 获取插件资源
   */
  private async getPluginsResource() {
    try {
      const healthData = await this.httpClient.checkHealth();
      
      const plugins = {
        enabled: healthData.plugins_enabled || false,
        count: healthData.plugin_count || 0,
        list: healthData.plugins || [],
      };

      return {
        contents: [
          {
            uri: 'pansou://plugins',
            mimeType: 'application/json',
            text: JSON.stringify(plugins, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `获取插件信息失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 获取频道资源
   */
  private async getChannelsResource() {
    try {
      const healthData = await this.httpClient.checkHealth();
      
      const channels = {
        count: healthData.channels_count || 0,
        list: healthData.channels || [],
      };

      return {
        contents: [
          {
            uri: 'pansou://channels',
            mimeType: 'application/json',
            text: JSON.stringify(channels, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `获取频道信息失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 获取网盘类型资源
   */
  private async getCloudTypesResource() {
    const cloudTypes = {
      supported: [
        'baidu',    // 百度网盘
        'aliyun',   // 阿里云盘
        'quark',    // 夸克网盘
        'tianyi',   // 天翼云盘
        'uc',       // UC网盘
        'mobile',   // 移动云盘
        '115',      // 115网盘
        'pikpak',   // PikPak
        'xunlei',   // 迅雷网盘
        '123',      // 123网盘
        'magnet',   // 磁力链接
        'ed2k',     // 电驴链接
        'others'    // 其他
      ],
      description: {
        'baidu': '百度网盘',
        'aliyun': '阿里云盘',
        'quark': '夸克网盘',
        'tianyi': '天翼云盘',
        'uc': 'UC网盘',
        'mobile': '移动云盘',
        '115': '115网盘',
        'pikpak': 'PikPak',
        'xunlei': '迅雷网盘',
        '123': '123网盘',
        'magnet': '磁力链接',
        'ed2k': '电驴链接',
        'others': '其他网盘'
      }
    };

    return {
      contents: [
        {
          uri: 'pansou://cloud-types',
          mimeType: 'application/json',
          text: JSON.stringify(cloudTypes, null, 2),
        },
      ],
    };
  }

  /**
   * 设置进程处理器
   */
  private setupProcessHandlers(): void {
    // 处理优雅关闭
    const gracefulShutdown = async (signal: string) => {
      console.error(`\n收到 ${signal} 信号，正在优雅关闭...`);
      
      if (this.config.autoStartBackend) {
        // 延迟关闭后端服务
        this.backendManager.scheduleShutdown();
      }
      
      // 等待一小段时间让MCP客户端处理完当前请求
      setTimeout(() => {
        process.exit(0);
      }, 1000);
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    
    // Windows特有的关闭事件
    if (process.platform === 'win32') {
      process.on('SIGBREAK', () => gracefulShutdown('SIGBREAK'));
    }
  }

  /**
   * 启动服务器
   */
  public async start(): Promise<void> {
    // 如果启用了自动启动后端服务
    if (this.config.autoStartBackend) {
      console.error('检查后端服务状态...');
      
      // 在启动阶段启用静默模式，避免输出网络错误信息
      this.httpClient.setSilentMode(true);
      
      const isRunning = await this.backendManager.isBackendRunning();
      if (!isRunning) {
        console.error('自动启动后端服务...');
        const started = await this.backendManager.startBackend();
        if (!started) {
          console.error('后端服务启动失败，MCP服务器将继续运行但功能可能受限');
        }
      } else {
        console.error('后端服务已在运行');
      }
      
      // 启动完成后关闭静默模式
      this.httpClient.setSilentMode(false);
    }

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    // 输出启动信息到stderr，避免干扰MCP通信
    console.error('Limitless Search MCP服务器已启动');
    console.error(`服务地址: ${this.config.serverUrl}`);
    console.error(`请求超时: ${this.config.requestTimeout}ms`);
    console.error(`最大结果数: ${this.config.maxResults}`);
    console.error(`自动启动后端: ${this.config.autoStartBackend ? '启用' : '禁用'}`);
    // 空闲监控信息已在BackendManager构造函数中显示
  }
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  try {
    const server = new PanSouMCPServer();
    await server.start();
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
  process.exit(1);
});

// 启动服务器
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('index.js')) {
  main();
}

export { PanSouMCPServer };