# Sousou API 数据结构分析

## 基本信息
- **数据源类型**: JSON API (GET 请求)
- **API URL格式**: `https://sousou.pro/api.php?action=search&q={关键词}&page={页码}&per_size={每页数量}&type={网盘类型}`
- **数据特点**: 网盘资源聚合搜索，支持多种网盘类型过滤

## API请求参数

| 参数名 | 类型 | 必填 | 说明 | 示例值 |
|--------|------|------|------|--------|
| `action` | string | 是 | 操作类型，固定为 `search` | search |
| `q` | string | 是 | 搜索关键词 | 遮天 |
| `page` | int | 否 | 页码，从1开始 | 1 |
| `per_size` | int | 否 | 每页返回数量 | 10 |
| `type` | string | 否 | 网盘类型过滤，为空表示全部 | QUARK, BDY, ALY, XUNLEI, UC, 115 |

### 网盘类型参数说明
- `QUARK` - 夸克网盘
- `BDY` - 百度网盘
- `ALY` - 阿里云盘
- `XUNLEI` - 迅雷网盘
- `UC` - UC网盘
- `115` - 115网盘
- 留空 - 搜索所有网盘类型

## API响应结构

### 顶层结构
```json
{
    "code": 200,              // 状态码：200表示成功
    "msg": "请求成功",        // 响应消息
    "data": {
        "total": 200,         // 总记录数
        "per_size": 10,       // 每页数量
        "took": 62,           // 搜索耗时（毫秒）
        "list": []            // 数据列表数组
    }
}
```

### `data.list`数组中的数据项结构
```json
{
    "disk_id": "bd8623b72cbb",                    // 网盘分享ID
    "disk_name": "美漫之黑手遮天-西风啸月.txt",     // 资源标题/文件名
    "disk_pass": "",                              // 提取码（可能为空）
    "disk_type": "QUARK",                         // 网盘类型标识
    "files": "file:美漫之黑手遮天-西风啸月.txt",    // 文件列表描述
    "doc_id": "cmhfmcz0l2emoae7mf7amvbsi",        // 文档ID
    "share_user": "安心*海豹",                     // 分享用户（脱敏）
    "share_user_id": "",                          // 分享用户ID（可能为空）
    "shared_time": "2025-10-27 21:38:59",         // 分享时间
    "rel_movie": "",                              // 相关电影（可能为空）
    "is_mine": true,                              // 是否我的分享
    "tags": null,                                 // 标签数组（可能为null或字符串数组）
    "link": "https://pan.quark.cn/s/bd8623b72cbb", // 分享链接
    "enabled": true,                              // 是否启用
    "weight": 1,                                  // 权重
    "status": 0                                   // 状态
}
```

### 字段说明

#### 核心字段
- **disk_id**: 网盘分享的唯一标识符，用于去重和构建 UniqueID
- **disk_name**: 资源标题，通常是文件名或文件夹名
- **disk_pass**: 提取码/访问密码，可能为空字符串
- **disk_type**: 网盘类型标识符（API特定格式）
- **link**: 完整的分享链接URL

#### 扩展信息字段
- **files**: 文件列表描述，格式多样：
  - 单文件: `"file:文件名.txt"`
  - 多文件: `"file:1.mp4\nfile:2.mp4\nfolder:文件夹"`
  - 包含文件和文件夹的层级结构
- **tags**: 分类标签，可能为 `null` 或字符串数组，如 `["短剧", "电视剧", "国产剧"]`
- **share_user**: 分享用户昵称（已脱敏处理）
- **shared_time**: 分享时间，格式为 `YYYY-MM-DD HH:MM:SS`

#### 元数据字段
- **doc_id**: 系统内部文档ID
- **share_user_id**: 分享用户的系统ID（通常为空）
- **rel_movie**: 关联的电影信息（通常为空）
- **is_mine**: 布尔值，标识是否为当前用户的分享
- **enabled**: 布尔值，标识资源是否启用
- **weight**: 整数，资源权重
- **status**: 整数，资源状态码

## 插件所需字段映射

| 源字段 | 目标字段 | 说明 |
|--------|----------|------|
| `disk_id` | `UniqueID` | 格式: `sousou-{disk_id}` |
| `disk_name` | `Title` | 资源标题 |
| `files` | `Content` | 文件列表描述 |
| `shared_time` | `Datetime` | 解析为 `time.Time` 格式 |
| `tags` | `Tags` | 标签数组（需处理 null 情况） |
| `link` + `disk_pass` + `disk_type` | `Links` | 转换为 Link 数组 |
| `""` | `Channel` | 插件搜索结果 Channel 为空字符串 |

## 网盘类型映射

### API标识符 -> 系统类型

| API标识 (`disk_type`) | 系统类型 (`Link.Type`) | 域名特征 |
|----------------------|---------------------|----------|
| `QUARK` | `quark` | `pan.quark.cn` |
| `BDY` | `baidu` | `pan.baidu.com` |
| `ALY` | `aliyun` | `alipan.com`, `aliyundrive.com` |
| `XUNLEI` | `xunlei` | `pan.xunlei.com` |
| `UC` | `uc` | `drive.uc.cn` |
| `115` | `115` | `115.com`, `115cdn.com` |
| `TIANYI` | `tianyi` | `cloud.189.cn` |
| `CAIYUN` | `mobile` | `caiyun.139.com` |
| `123PAN` | `123` | `123pan.com`, `123912.com` |
| `PIKPAK` | `pikpak` | `mypikpak.com` |

## 数据特征分析

### 1. 时间格式
- **原始格式**: `"2025-10-27 21:38:59"`
- **解析格式**: `"2006-01-02 15:04:05"` (Go time.Parse)

### 2. 标签处理
```json
// 情况1: tags 为 null
"tags": null

// 情况2: tags 为字符串数组
"tags": ["短剧", "电视剧", "国产剧"]
```

### 3. 文件列表格式
```
单文件:
"file:美漫之黑手遮天-西风啸月.txt"

多文件:
".mp4
file:29.mp4
file:78.mp4
file:59.mp4
folder:14.弹指遮天"

复杂结构:
"58.mp4
file:90.mp4
file:40.mp4
folder:10.遮天武神"
```

## 插件开发指导

### SearchResult构建示例
```go
result := model.SearchResult{
    UniqueID: fmt.Sprintf("sousou-%s", item.DiskID),
    Title:    item.DiskName,
    Content:  item.Files,
    Datetime: parseTime(item.SharedTime),
    Tags:     processTags(item.Tags),
    Links:    []model.Link{
        {
            Type:     convertDiskType(item.DiskType),
            URL:      item.Link,
            Password: item.DiskPass,
        },
    },
    Channel:  "", // 插件搜索结果Channel为空
}
```

### 网盘类型转换函数
```go
func convertDiskType(diskType string) string {
    switch diskType {
    case "BDY":
        return "baidu"
    case "ALY":
        return "aliyun"
    case "QUARK":
        return "quark"
    case "TIANYI":
        return "tianyi"
    case "UC":
        return "uc"
    case "CAIYUN":
        return "mobile"
    case "115":
        return "115"
    case "XUNLEI":
        return "xunlei"
    case "123PAN":
        return "123"
    case "PIKPAK":
        return "pikpak"
    default:
        return "others"
    }
}
```

### 时间解析函数
```go
func parseTime(timeStr string) time.Time {
    if timeStr == "" {
        return time.Time{} // 零值
    }
    
    // 格式：2025-10-27 21:38:59
    parsedTime, err := time.Parse("2006-01-02 15:04:05", timeStr)
    if err != nil {
        return time.Time{} // 解析失败返回零值
    }
    
    return parsedTime
}
```

### 标签处理函数
```go
func processTags(tags interface{}) []string {
    if tags == nil {
        return nil
    }
    
    // 类型断言为字符串数组
    if tagArray, ok := tags.([]interface{}); ok {
        result := make([]string, 0, len(tagArray))
        for _, tag := range tagArray {
            if tagStr, ok := tag.(string); ok {
                result = append(result, tagStr)
            }
        }
        return result
    }
    
    return nil
}
```

## 多页请求策略

### 并发分页获取
```go
func (p *SousouAsyncPlugin) searchAPI(client *http.Client, keyword string) ([]SousouItem, error) {
    maxPages := 3 // 获取前3页
    perSize := 30 // 每页30条
    
    // 创建结果通道
    resultChan := make(chan []SousouItem, maxPages)
    errChan := make(chan error, maxPages)
    
    var wg sync.WaitGroup
    
    // 并发请求每一页
    for page := 1; page <= maxPages; page++ {
        wg.Add(1)
        
        go func(pageNum int) {
            defer wg.Done()
            
            url := fmt.Sprintf("https://sousou.pro/api.php?action=search&q=%s&page=%d&per_size=%d&type=",
                url.QueryEscape(keyword), pageNum, perSize)
            
            items, err := p.fetchPage(client, url)
            if err != nil {
                errChan <- err
                return
            }
            
            resultChan <- items
        }(page)
    }
    
    // 等待所有请求完成
    go func() {
        wg.Wait()
        close(resultChan)
        close(errChan)
    }()
    
    // 收集结果
    var allItems []SousouItem
    for items := range resultChan {
        allItems = append(allItems, items...)
    }
    
    return allItems, nil
}
```

## 与其他插件的差异

| 特性 | sousou | hunhepan | 说明 |
|------|--------|----------|------|
| **请求方式** | GET | POST | sousou更简单 |
| **API数量** | 1个 | 4个 | sousou单一API |
| **链接格式** | 标准 | 标准 | 都是简单的URL |
| **时间字段** | 有 | 有 | 格式相同 |
| **标签处理** | 可能为null | 可能为null | 需要类型检查 |
| **去重依据** | disk_id | disk_id | 相同逻辑 |

## 注意事项

1. **时间解析**: 时间格式为 `YYYY-MM-DD HH:MM:SS`，需要正确的解析格式
2. **标签类型**: tags 可能为 `null`，需要进行类型检查和处理
3. **链接验证**: 确保 link 字段非空再创建 Link 对象
4. **网盘类型**: disk_type 使用大写标识符，需要转换为系统标准类型
5. **分页策略**: 可以并发请求多页提高效率
6. **去重处理**: 使用 disk_id 作为唯一标识进行去重
7. **空字段处理**: disk_pass、share_user_id、rel_movie 等字段可能为空

## 开发建议

- **优先级设置**: 建议设置为等级3（普通质量数据源）
- **分页数量**: 建议获取前3页数据，平衡性能和数据量
- **每页大小**: 建议设置为30条，与其他插件保持一致
- **超时控制**: 使用 context 控制请求超时（30秒）
- **错误处理**: 对每个可能失败的解析步骤都要有错误处理
- **重试机制**: 实现简单的重试机制，提高稳定性
- **缓存策略**: 设置合理的缓存TTL（建议2小时）

## API响应示例

### 成功响应
```json
{
    "code": 200,
    "msg": "请求成功",
    "data": {
        "total": 200,
        "per_size": 10,
        "took": 62,
        "list": [
            {
                "disk_id": "bd8623b72cbb",
                "disk_name": "美漫之黑手遮天-西风啸月.txt",
                "disk_pass": "",
                "disk_type": "QUARK",
                "files": "file:美漫之黑手遮天-西风啸月.txt",
                "doc_id": "cmhfmcz0l2emoae7mf7amvbsi",
                "share_user": "安心*海豹",
                "share_user_id": "",
                "shared_time": "2025-10-27 21:38:59",
                "rel_movie": "",
                "is_mine": true,
                "tags": null,
                "link": "https://pan.quark.cn/s/bd8623b72cbb",
                "enabled": true,
                "weight": 1,
                "status": 0
            }
        ]
    }
}
```

### 错误响应（推测）
```json
{
    "code": 400,
    "msg": "请求失败: 参数错误",
    "data": null
}
```

