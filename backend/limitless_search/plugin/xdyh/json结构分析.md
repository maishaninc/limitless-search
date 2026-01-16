# XDYH 搜索API JSON结构分析

## 接口信息

- **接口名称**: XDYH 聚合搜索API
- **接口地址**: `https://ys.66ds.de/search`
- **请求方法**: `POST`
- **Content-Type**: `application/json`
- **主要特点**: 聚合多个网盘搜索站点，提供统一的JSON API接口

## 请求结构

### 请求体格式

```json
{
  "keyword": "关键词",
  "sites": null,
  "max_workers": 10,
  "save_to_file": false,
  "split_links": true
}
```

### 请求参数说明

| 参数名 | 类型 | 必需 | 默认值 | 说明 |
|--------|------|------|--------|------|
| `keyword` | string | 是 | - | 搜索关键词 |
| `sites` | array/null | 否 | null | 指定搜索的站点列表，null表示搜索所有站点 |
| `max_workers` | int | 否 | 10 | 最大并发工作线程数 |
| `save_to_file` | bool | 否 | false | 是否保存结果到文件 |
| `split_links` | bool | 否 | true | 是否拆分链接 |

## 响应结构

### 基本响应格式

```json
{
  "status": "success",
  "keyword": "搜索关键词",
  "search_timestamp": "2025-09-09T09:55:55.091056",
  "summary": { ... },
  "successful_sites": [ ... ],
  "failed_sites": [ ... ],
  "data": [ ... ],
  "performance": { ... }
}
```

### 响应字段详解

#### 1. 基本信息

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `status` | string | 请求状态："success" 或 "error" |
| `keyword` | string | 搜索关键词 |
| `search_timestamp` | string | 搜索时间戳（ISO 8601格式） |

#### 2. 统计信息 (summary)

```json
{
  "total_sites_searched": 9,
  "successful_sites": 9,
  "failed_sites": 0,
  "total_search_results": 759,
  "total_successful_parses": 232,
  "total_drive_links": 226,
  "unique_links": 226
}
```

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `total_sites_searched` | int | 总搜索站点数 |
| `successful_sites` | int | 成功搜索的站点数 |
| `failed_sites` | int | 失败的站点数 |
| `total_search_results` | int | 总搜索结果数 |
| `total_successful_parses` | int | 成功解析的结果数 |
| `total_drive_links` | int | 网盘链接总数 |
| `unique_links` | int | 去重后的唯一链接数 |

#### 3. 站点信息

```json
{
  "successful_sites": [
    "云桥",
    "寻道云海", 
    "易客FM",
    "段聚搜",
    "搜一搜影视",
    "闪电搜",
    "Melost",
    "万阅书屋",
    "Pansoo夸克网盘"
  ],
  "failed_sites": []
}
```

#### 4. 搜索结果数据 (data)

##### 基础结果格式
```json
{
  "title": "逆仙而上[2025]【更至14】[爱情 古装]",
  "post_date": "2025-09-08 12:32:03",
  "drive_links": [
    "https://pan.quark.cn/s/de411fee612b"
  ],
  "has_links": true,
  "link_count": 1,
  "password": "",
  "source_api": "yunso",
  "source_site": "云桥"
}
```

##### 扩展结果格式（部分结果包含更多字段）
```json
{
  "title": "仙逆",
  "post_date": "2025-09-07",
  "drive_links": [
    "https://pan.quark.cn/s/85ef7d3e06b5"
  ],
  "password": "7vs2",
  "has_password": true,
  "has_links": true,
  "link_count": 1,
  "source_site": "万阅书屋",
  "file_preview": "file:仙逆-hu-077.mp4, file:仙逆-hu-091.mp4"
}
```

##### 数据字段说明

| 字段名 | 类型 | 必需 | 说明 |
|--------|------|------|------|
| `title` | string | 是 | 资源标题 |
| `post_date` | string | 是 | 发布日期（格式：YYYY-MM-DD HH:mm:ss 或 YYYY-MM-DD） |
| `drive_links` | array | 是 | 网盘链接列表 |
| `has_links` | bool | 是 | 是否包含有效链接 |
| `link_count` | int | 是 | 链接数量 |
| `password` | string | 否 | 网盘密码（可能为空） |
| `has_password` | bool | 否 | 是否有密码 |
| `source_site` | string | 是 | 来源站点名称 |
| `source_api` | string | 否 | 来源API标识 |
| `file_preview` | string | 否 | 文件预览信息（部分结果） |

#### 5. 性能信息 (performance)

```json
{
  "total_search_time": 1.67,
  "sites_searched": 9,
  "avg_time_per_site": 0.19,
  "optimization": "asyncio_gather",
  "timestamp": "2025-09-09T09:55:55.091451"
}
```

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `total_search_time` | float | 总搜索耗时（秒） |
| `sites_searched` | int | 搜索的站点数量 |
| `avg_time_per_site` | float | 平均每站点耗时（秒） |
| `optimization` | string | 优化策略标识 |
| `timestamp` | string | 性能统计时间戳 |

## 支持的网盘类型

根据API返回的数据分析，支持以下网盘类型：

- **夸克网盘**: `https://pan.quark.cn/s/xxxxxxxx`
- **UC网盘**: `https://drive.uc.cn/s/xxxxxxxx`
- **百度网盘**: `https://pan.baidu.com/s/xxxxxxxx`
- **阿里云盘**: `https://www.alipan.com/s/xxxxxxxx`
- **天翼云盘**: `https://cloud.189.cn/t/xxxxxxxx`
- **其他网盘**: 根据实际API返回确定

## 数据来源站点

API聚合了以下9个搜索站点：

1. **云桥** - API标识: `yunso`
2. **寻道云海**
3. **易客FM** 
4. **段聚搜**
5. **搜一搜影视**
6. **闪电搜**
7. **Melost**
8. **万阅书屋**
9. **Pansoo夸克网盘**

## 重要特性

### 1. 聚合搜索 🔍
- 同时搜索9个不同的资源站点
- 自动去重和链接整合
- 统一的数据格式输出

### 2. 异步并发 ⚡
- 使用 `asyncio_gather` 优化策略
- 支持自定义并发工作线程数（`max_workers`）
- 平均每站点搜索时间约0.19秒

### 3. 密码处理 🔐
- 自动提取网盘链接密码
- 提供 `has_password` 字段标识
- 密码信息在 `password` 字段中

### 4. 性能统计 📊
- 详细的搜索性能数据
- 成功/失败站点统计
- 链接数量和去重统计

## 提取逻辑

### 请求构建
```go
type SearchRequest struct {
    Keyword     string      `json:"keyword"`
    Sites       interface{} `json:"sites"`        // null or []string
    MaxWorkers  int         `json:"max_workers"`
    SaveToFile  bool        `json:"save_to_file"`
    SplitLinks  bool        `json:"split_links"`
}
```

### 响应解析
```go
type APIResponse struct {
    Status          string               `json:"status"`
    Keyword         string               `json:"keyword"`
    SearchTimestamp string               `json:"search_timestamp"`
    Summary         Summary              `json:"summary"`
    SuccessfulSites []string             `json:"successful_sites"`
    FailedSites     []string             `json:"failed_sites"`
    Data            []SearchResultItem   `json:"data"`
    Performance     Performance          `json:"performance"`
}

type SearchResultItem struct {
    Title        string   `json:"title"`
    PostDate     string   `json:"post_date"`
    DriveLinks   []string `json:"drive_links"`
    HasLinks     bool     `json:"has_links"`
    LinkCount    int      `json:"link_count"`
    Password     string   `json:"password,omitempty"`
    HasPassword  bool     `json:"has_password,omitempty"`
    SourceSite   string   `json:"source_site"`
    SourceAPI    string   `json:"source_api,omitempty"`
    FilePreview  string   `json:"file_preview,omitempty"`
}
```

### 链接转换
```go
// 将API结果转换为标准链接格式
func convertToStandardLinks(items []SearchResultItem) []model.Link {
    var links []model.Link
    for _, item := range items {
        for _, driveLink := range item.DriveLinks {
            link := model.Link{
                Type:     determineCloudType(driveLink),
                URL:      driveLink,
                Password: item.Password,
            }
            links = append(links, link)
        }
    }
    return links
}
```

## 错误处理

### 常见错误类型
1. **网络连接错误**: 请求超时或连接失败
2. **API服务错误**: 服务端返回非200状态码
3. **JSON解析错误**: 响应格式不符合预期
4. **站点访问失败**: 部分源站点无法访问

### 容错机制
- **部分失败容忍**: 即使部分站点失败，仍返回成功站点的结果
- **去重处理**: 自动去除重复的网盘链接
- **数据验证**: 验证链接有效性和格式正确性

## 性能优化建议

1. **并发控制**: 根据服务器性能调整 `max_workers` 参数
2. **缓存策略**: 对相同关键词实现合理的缓存机制
3. **超时设置**: 设置适当的HTTP请求超时时间
4. **重试机制**: 对临时失败的请求实现重试逻辑

## 开发注意事项

1. **优先级设置**: 建议设置为优先级2，聚合搜索质量较高
2. **Service层过滤**: 使用标准的Service层过滤，不跳过
3. **链接去重**: API已提供去重功能，插件层面可简化处理
4. **密码处理**: 正确提取和设置网盘密码字段
5. **时间格式**: 注意处理不同的时间格式（带时分秒 vs 仅日期）
