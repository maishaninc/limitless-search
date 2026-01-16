import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { HttpClient, SearchRequest } from '../utils/http-client.js';
import { validateCloudTypes, validateSourceType, validateResultType, SUPPORTED_CLOUD_TYPES, SOURCE_TYPES, RESULT_TYPES } from '../utils/config.js';

/**
 * 搜索工具参数验证模式
 */
const SearchToolArgsSchema = z.object({
  keyword: z.string().min(1, '搜索关键词不能为空'),
  channels: z.array(z.string()).optional().describe('TG频道列表，如: ["tgsearchers3", "xxx"]'),
  plugins: z.array(z.string()).optional().describe('插件列表，如: ["pansearch", "panta"]'),
  cloud_types: z.array(z.string()).optional().describe(`网盘类型过滤，支持: ${SUPPORTED_CLOUD_TYPES.join(', ')}`),
  source_type: z.enum(['all', 'tg', 'plugin']).optional().default('all').describe('数据来源类型'),
  force_refresh: z.boolean().optional().default(false).describe('强制刷新缓存'),
  result_type: z.enum(['all', 'results', 'merge']).optional().default('merge').describe('结果类型'),
  concurrency: z.number().int().min(0).optional().describe('并发搜索数量，0表示自动计算'),
  ext_params: z.record(z.any()).optional().describe('扩展参数，传递给插件的自定义参数')
});

export type SearchToolArgs = z.infer<typeof SearchToolArgsSchema>;

/**
 * 搜索工具定义
 */
export const searchTool: Tool = {
  name: 'search_netdisk',
  description: '搜索网盘资源，支持多种网盘类型和搜索来源。可以搜索电影、电视剧、软件、文档等各类资源。',
  inputSchema: {
    type: 'object',
    properties: {
      keyword: {
        type: 'string',
        description: '搜索关键词，如："速度与激情"、"Python教程"、"Office 2021"等'
      },
      channels: {
        type: 'array',
        items: { type: 'string' },
        description: 'TG频道列表，指定要搜索的Telegram频道。不指定则使用默认配置的频道'
      },
      plugins: {
        type: 'array',
        items: { type: 'string' },
        description: '插件列表，指定要使用的搜索插件。不指定则使用所有可用插件'
      },
      cloud_types: {
        type: 'array',
        items: { 
          type: 'string',
          enum: [...SUPPORTED_CLOUD_TYPES]
        },
        description: `网盘类型过滤，只返回指定类型的网盘链接。支持: ${SUPPORTED_CLOUD_TYPES.join(', ')}`
      },
      source_type: {
        type: 'string',
        enum: [...SOURCE_TYPES],
        default: 'all',
        description: '数据来源类型：all(全部来源)、tg(仅Telegram)、plugin(仅插件)'
      },
      force_refresh: {
        type: 'boolean',
        default: false,
        description: '强制刷新缓存，获取最新数据'
      },
      result_type: {
        type: 'string',
        enum: [...RESULT_TYPES],
        default: 'merge',
        description: '结果类型：all(返回所有结果)、results(仅返回results)、merge(仅返回按网盘类型分组的结果)'
      },
      concurrency: {
        type: 'number',
        description: '并发搜索数量，0或不指定则自动计算'
      },
      ext_params: {
        type: 'object',
        description: '扩展参数，用于传递给插件的自定义参数，如: {"title_en": "Fast and Furious", "is_all": true}'
      }
    },
    required: ['keyword']
  }
};

/**
 * 执行搜索工具
 */
export async function executeSearchTool(args: unknown, httpClient: HttpClient): Promise<string> {
  try {
    // 参数验证
    const validatedArgs = SearchToolArgsSchema.parse(args);
    
    // 验证网盘类型
    let cloudTypes: string[] | undefined;
    if (validatedArgs.cloud_types) {
      cloudTypes = validateCloudTypes(validatedArgs.cloud_types);
    }
    
    // 验证数据来源类型
    const sourceType = validateSourceType(validatedArgs.source_type);
    
    // 验证结果类型
    const resultType = validateResultType(validatedArgs.result_type);
    
    // 检查后端服务状态
    const isHealthy = await httpClient.checkHealth();
    if (!isHealthy) {
      throw new Error('后端服务未运行，请先启动后端服务。');
    }
    
    // 构建搜索请求
    const searchRequest: SearchRequest = {
      kw: validatedArgs.keyword,
      channels: validatedArgs.channels,
      plugins: validatedArgs.plugins,
      cloud_types: cloudTypes as any,
      src: sourceType,
      refresh: validatedArgs.force_refresh,
      res: resultType,
      conc: validatedArgs.concurrency,
      ext: validatedArgs.ext_params
    };
    
    // 执行搜索
    const result = await httpClient.search(searchRequest);
    
    // 格式化返回结果
    return formatSearchResult(result, validatedArgs.keyword, resultType);
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`参数验证失败: ${errorMessages}`);
    }
    
    if (error instanceof Error) {
      console.error('搜索过程中发生错误:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        timestamp: new Date().toISOString(),
        originalArgs: args
      });
      throw error;
    }
    
    throw new Error(`搜索失败: ${String(error)}`);
  }
}

/**
 * 格式化搜索结果
 */
function formatSearchResult(result: any, keyword: string, resultType: string): string {
  const { total, results, merged_by_type } = result;
  
  let output = `搜索关键词: "${keyword}"\n`;
  output += `找到 ${total} 个结果\n\n`;
  
  if (resultType === 'merge' && merged_by_type) {
    // 按网盘类型分组显示
    output += formatMergedResults(merged_by_type);
  } else if (resultType === 'results' && results) {
    // 显示详细结果
    output += formatDetailedResults(results);
  } else if (resultType === 'all') {
    // 显示所有信息
    if (merged_by_type) {
      output += "## 按网盘类型分组\n";
      output += formatMergedResults(merged_by_type);
    }
    if (results && results.length > 0) {
      output += "\n## 详细结果\n";
      output += formatDetailedResults(results.slice(0, 10)); // 限制显示前10个详细结果
    }
  }
  
  return output;
}

/**
 * 格式化按网盘类型分组的结果
 */
function formatMergedResults(mergedByType: Record<string, any[]>): string {
  let output = '';
  
  const typeNames: Record<string, string> = {
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
    'others': '其他'
  };
  
  for (const [type, links] of Object.entries(mergedByType)) {
    if (links && links.length > 0) {
      const typeName = typeNames[type] || `${type}`;
      output += `### ${typeName} (${links.length}个)\n`;
      
      links.slice(0, 5).forEach((link: any, index: number) => {
        output += `${index + 1}. **${link.note || '未知标题'}**\n`;
        output += `   链接: ${link.url}\n`;
        if (link.password) {
          output += `   密码: ${link.password}\n`;
        }
        if (link.source) {
          output += `   来源: ${link.source}\n`;
        }
        output += `   时间: ${new Date(link.datetime).toLocaleString('zh-CN')}\n\n`;
      });
      
      if (links.length > 5) {
        output += `   ... 还有 ${links.length - 5} 个结果\n\n`;
      }
    }
  }
  
  return output;
}

/**
 * 格式化详细结果
 */
function formatDetailedResults(results: any[]): string {
  let output = '';
  
  results.forEach((result: any, index: number) => {
    output += `### ${index + 1}. ${result.title || '未知标题'}\n`;
    output += `频道: ${result.channel}\n`;
    output += `时间: ${new Date(result.datetime).toLocaleString('zh-CN')}\n`;
    
    if (result.content && result.content !== result.title) {
      const content = result.content.length > 200 ? result.content.substring(0, 200) + '...' : result.content;
      output += `内容: ${content}\n`;
    }
    
    if (result.tags && result.tags.length > 0) {
      output += `标签: ${result.tags.join(', ')}\n`;
    }
    
    if (result.links && result.links.length > 0) {
      output += `网盘链接:\n`;
      result.links.forEach((link: any, linkIndex: number) => {
        output += `   ${linkIndex + 1}. [${link.type.toUpperCase()}] ${link.url}`;
        if (link.password) {
          output += ` (密码: ${link.password})`;
        }
        output += '\n';
      });
    }
    
    if (result.images && result.images.length > 0) {
      output += `图片: ${result.images.length}张\n`;
    }
    
    output += '\n';
  });
  
  return output;
}