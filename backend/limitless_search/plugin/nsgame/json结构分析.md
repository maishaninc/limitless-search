# NSGame API JSON 结构分析

## 概述

NSGame (NS游戏网) 是一个专门提供 Nintendo Switch 游戏资源的搜索平台，提供 RESTful API 接口进行游戏资源搜索。本文档详细说明 NSGame API 的请求格式和响应结构。

## API 接口信息

### 请求地址
- **URL**: `https://nsthwj.com/thwj/game/query`
- **方法**: GET
- **参数**:
  - `pageNum`: 页码（从1开始）
  - `pageSize`: 每页大小（建议100）
  - `type`: 游戏类型（可选，空字符串表示全部）
  - `queryName`: 搜索关键词（URL编码）

### 请求示例
```
GET https://nsthwj.com/thwj/game/query?pageNum=1&pageSize=100&type=&queryName=%E9%A9%AC%E9%87%8C%E5%A5%A5
```

### 请求头设置
```http
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36
Accept: application/json, text/plain, */*
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Referer: https://nsthwj.com/
```

## 响应数据结构

### 根级响应结构

```json
{
  "success": true,
  "data": {
    "pageData": {
      "totalCount": 27,
      "pageNum": 0,
      "data": []
    },
    "pageView": null
  },
  "code": "200",
  "message": null
}
```

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `success` | boolean | 请求是否成功 |
| `data` | object | 响应数据对象 |
| `code` | string | 状态码，"200"表示成功 |
| `message` | string/null | 错误消息，成功时为null |

### data 对象结构

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `pageData` | object | 分页数据对象 |
| `pageView` | null | 页面视图信息（通常为null） |

### pageData 对象结构

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `totalCount` | number | 搜索结果总数 |
| `pageNum` | number | 当前页码 |
| `data` | array | 游戏资源列表 |

### data 数组中的游戏资源项结构

每个游戏资源项包含以下字段：

```json
{
  "name": "马里奥奥德赛|Super Mario Odyssey中文",
  "url": "https://pan.baidu.com/s/1ZNTxWN-Vn7TUb6vq0QoIVA?pwd=thwj\n[夸克网盘]：https://pan.quark.cn/s/2dab74360187\n[UC网盘]：https://drive.uc.cn/s/843e8385fbb34",
  "password": "最新版本：1.4.1\n含1.4.1金手指"
}
```

| 字段名 | 类型 | 必填 | 示例值 | 说明 |
|--------|------|------|--------|------|
| `name` | string | ✓ | `"马里奥奥德赛\|Super Mario Odyssey中文"` | 游戏名称（中文\|英文） |
| `url` | string | ✓ | 多行链接文本 | 网盘链接（换行符分隔） |
| `password` | string | ✓ | `"最新版本：1.4.1\n含1.4.1金手指"` | 版本信息和金手指说明 |

## 特殊数据格式说明

### 1. url 字段格式 ⭐ 重要

`url` 字段包含多个网盘链接，使用换行符 `\n` 分隔：

```
https://pan.baidu.com/s/1ZNTxWN-Vn7TUb6vq0QoIVA?pwd=thwj
[夸克网盘]：https://pan.quark.cn/s/2dab74360187
[UC网盘]：https://drive.uc.cn/s/843e8385fbb34
```

**格式规则**:
- **百度网盘**: 直接链接，密码在URL参数中 `?pwd=xxxx`
- **夸克网盘**: 格式 `[夸克网盘]：{链接}`，无密码
- **UC网盘**: 格式 `[UC网盘]：{链接}`，无密码

**提取方法**:
1. 按 `\n` 分割字符串
2. 逐行解析链接
3. 识别链接类型并提取

### 2. password 字段格式

`password` 字段实际上不是网盘提取码，而是游戏版本信息：

```
最新版本：1.4.1
含1.4.1金手指
```

**内容说明**:
- 第一行：游戏的最新版本号
- 第二行：金手指信息（如果有）

### 3. name 字段格式

游戏名称使用竖线 `|` 分隔中英文：

```
马里奥奥德赛|Super Mario Odyssey中文
```

**格式规则**:
- 中文名称 `|` 英文名称
- 可能包含语言标识（中文、汉化等）

## 支持的网盘平台

| 平台标识 | 平台名称 | 域名特征 | 密码位置 |
|----------|----------|----------|----------|
| `baidu` | 百度网盘 | `pan.baidu.com` | URL参数 `?pwd=` |
| `quark` | 夸克网盘 | `pan.quark.cn` | 无密码 |
| `uc` | UC网盘 | `drive.uc.cn` | 无密码 |

## 插件实现要点

### 1. 插件配置
- **插件名称**: `nsgame`
- **优先级**: 建议设置为 2（高质量游戏资源）
- **Service层过滤**: 启用（标准资源搜索插件）
- **特点**: Nintendo Switch 游戏专属

### 2. 数据转换映射

| NSGame字段 | Limitless Search SearchResult字段 | 转换说明 |
|------------|-------------------------|----------|
| `name` | `UniqueID` | 格式：`nsgame-{游戏名hash}` |
| `name` | `Title` | 游戏名称（中英文） |
| `password` | `Content` | 版本信息和金手指说明 |
| - | `Datetime` | 使用当前时间 |
| `url` | `Links` | 解析多行链接文本 |
| - | `Tags` | 添加"NS游戏"、"Switch"标签 |
| - | `Channel` | 设置为空字符串（插件搜索结果） |

### 3. 链接解析逻辑

```go
// 解析 url 字段中的多个网盘链接
func parseMultipleLinks(urlText string) []model.Link {
    var links []model.Link
    
    // 按换行符分割
    lines := strings.Split(urlText, "\n")
    
    for _, line := range lines {
        line = strings.TrimSpace(line)
        if line == "" {
            continue
        }
        
        // 提取链接和类型
        var url, cloudType, password string
        
        if strings.Contains(line, "[夸克网盘]") {
            // 夸克网盘格式
            url = extractURL(line)
            cloudType = "quark"
        } else if strings.Contains(line, "[UC网盘]") {
            // UC网盘格式
            url = extractURL(line)
            cloudType = "uc"
        } else if strings.Contains(line, "pan.baidu.com") {
            // 百度网盘格式
            url, password = extractBaiduLink(line)
            cloudType = "baidu"
        }
        
        if url != "" {
            links = append(links, model.Link{
                Type:     cloudType,
                URL:      url,
                Password: password,
            })
        }
    }
    
    return links
}
```

### 4. 百度网盘密码提取

百度网盘的密码在URL参数中，需要单独提取：

```go
// 从百度网盘URL中提取链接和密码
func extractBaiduLink(line string) (url, password string) {
    // 提取完整URL
    re := regexp.MustCompile(`https://pan\.baidu\.com/s/[^?\s]+(\?pwd=[a-zA-Z0-9]+)?`)
    matches := re.FindStringSubmatch(line)
    if len(matches) > 0 {
        fullURL := matches[0]
        
        // 提取密码参数
        if strings.Contains(fullURL, "?pwd=") {
            parts := strings.Split(fullURL, "?pwd=")
            url = parts[0]
            password = parts[1]
        } else {
            url = fullURL
        }
    }
    
    return
}
```

### 5. 唯一ID生成

由于API返回数据没有唯一ID字段，需要基于游戏名称生成：

```go
import "crypto/md5"

func generateUniqueID(gameName string) string {
    // 使用游戏名称的MD5哈希的前12位
    hash := md5.Sum([]byte(gameName))
    return fmt.Sprintf("nsgame-%x", hash)[:20]
}
```

## 错误处理

### 常见错误类型
1. **API请求失败**: 网络连接失败或服务器错误
2. **JSON解析错误**: 响应格式不符合预期
3. **链接格式异常**: url字段格式不符合预期
4. **空结果**: 关键词搜索无结果

### 容错机制
- **部分失败容忍**: 单个链接解析失败不影响其他链接
- **数据验证**: 验证必填字段存在性
- **默认值处理**: 缺失字段使用合理默认值
- **日志记录**: 详细记录异常情况

## 性能优化建议

1. **分页控制**: 默认每页100条，避免过多请求
2. **缓存策略**: 游戏资源更新不频繁，可设置较长缓存时间
3. **超时设置**: 合理设置请求超时时间（建议10秒）
4. **连接复用**: 使用HTTP连接池
5. **关键词过滤**: 使用 `FilterResultsByKeyword` 提高相关性

## 开发注意事项

1. **链接解析**: 正确处理url字段中的多行链接文本
2. **密码位置**: 百度网盘密码在URL参数中，不在password字段
3. **版本信息**: password字段是版本信息，应作为Content展示
4. **游戏名称**: name字段包含中英文，用竖线分隔
5. **标签设置**: 添加"NS游戏"、"Switch"等标签帮助分类
6. **唯一ID**: 基于游戏名称生成稳定的唯一标识
7. **字符编码**: 确保正确处理中文字符
8. **请求头**: 设置合适的User-Agent避免反爬虫

## 示例代码结构

```go
// API响应结构
type NSGameResponse struct {
    Success bool   `json:"success"`
    Data    struct {
        PageData struct {
            TotalCount int            `json:"totalCount"`
            PageNum    int            `json:"pageNum"`
            Data       []NSGameItem   `json:"data"`
        } `json:"pageData"`
        PageView interface{} `json:"pageView"`
    } `json:"data"`
    Code    string      `json:"code"`
    Message interface{} `json:"message"`
}

// 游戏资源项
type NSGameItem struct {
    Name     string `json:"name"`     // 游戏名称
    URL      string `json:"url"`      // 网盘链接（多行文本）
    Password string `json:"password"` // 版本信息
}
```

## API调用示例

### 搜索马里奥游戏
```bash
curl "https://nsthwj.com/thwj/game/query?pageNum=1&pageSize=100&type=&queryName=%E9%A9%AC%E9%87%8C%E5%A5%A5"
```

### 搜索塞尔达游戏
```bash
curl "https://nsthwj.com/thwj/game/query?pageNum=1&pageSize=100&type=&queryName=%E5%A1%9E%E5%B0%94%E8%BE%BE"
```

## 总结

NSGame API 的主要特点：
- ✅ 专注于 Nintendo Switch 游戏资源
- ✅ 支持多种主流网盘（百度、夸克、UC）
- ✅ 提供详细的版本信息和金手指说明
- ✅ 简单的分页接口设计
- ⚠️ url字段格式特殊，需要特殊解析
- ⚠️ password字段不是提取码，是版本信息

实现此插件的关键在于正确解析 `url` 字段中的多行链接文本，并正确识别各网盘类型和提取密码。

