# Miaoso API JSON 结构分析

## 概述

Miaoso 是一个网盘搜索平台，提供 RESTful API 接口进行内容搜索。本文档基于对 `1.txt` 文件中 API 响应数据的分析，详细说明 Miaoso API 的请求格式和响应结构。

## API 接口信息

### 请求地址
- **URL**: `https://miaosou.fun/api/secendsearch`
- **方法**: GET
- **参数**:
  - `name`: 搜索关键词（URL编码）
  - `pageNo`: 页码（从1开始）

### 请求头设置
```http
GET /api/secendsearch?name=%E5%87%A1%E4%BA%BA%E4%BF%AE%E4%BB%99%E4%BC%A0&pageNo=1 HTTP/1.1
Host: miaosou.fun
Referer: https://miaosou.fun/info?searchKey=%E5%87%A1%E4%BA%BA%E4%BF%AE%E4%BB%99%E4%BC%A0
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36
```

## 响应数据结构

### 根级响应结构

```json
{
  "code": 200,
  "msg": "SUCCESS", 
  "data": {
    "total": 10000,
    "list": []
  }
}
```

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `code` | number | 响应状态码，200表示成功 |
| `msg` | string | 响应消息，成功时为"SUCCESS" |
| `data` | object | 搜索结果数据对象 |

### data 对象结构

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `total` | number | 搜索结果总数 |
| `list` | array | 搜索结果列表 |

### list 数组中的结果项结构

每个搜索结果项包含以下字段：

| 字段名 | 类型 | 必填 | 示例值 | 说明 |
|--------|------|------|--------|------|
| `id` | string | ✓ | `"6778d087cfbc8d3b625ab777"` | 资源唯一标识 |
| `name` | string | ✓ | `"<span style=\"color: red;\">凡人</span><span style=\"color: red;\">修仙</span>记"` | 资源名称，包含HTML高亮标签 |
| `url` | string | ✓ | `"c31Z+932nn/F5/KFKdkp6JJkqq6efxy9GL444RG8PJELZGyXtrJvn7J+OHV7v6XL"` | 加密的分享链接 |
| `type` | string/null | - | `"folder"` | 资源类型，如folder或null |
| `from` | string | ✓ | `"quark"` | 来源平台（quark、baidu等） |
| `content` | string/null | - | `null` | 资源描述内容 |
| `gmtCreate` | string | ✓ | `"2025-01-04 14:09:11"` | 资源创建时间 |
| `gmtShare` | string | ✓ | `"2025-01-04 14:09:11"` | 资源分享时间 |
| `fileCount` | number | ✓ | `1` | 文件数量 |
| `creatorId` | string/null | - | `"kf0009"` | 创建者ID |
| `creatorName` | string | ✓ | `"夸父0009"` | 创建者昵称 |
| `fileInfos` | array | ✓ | `[]` | 文件信息列表 |

### fileInfos 数组中的文件信息结构

| 字段名 | 类型 | 必填 | 示例值 | 说明 |
|--------|------|------|--------|------|
| `category` | string/null | - | `null` | 文件分类 |
| `fileExtension` | string/null | - | `null` | 文件扩展名 |
| `fileId` | string | ✓ | `"6778d087cfbc8d3b625ab777"` | 文件ID |
| `fileName` | string | ✓ | `"凡人修仙记"` | 文件名称 |
| `type` | string/null | - | `"folder"` | 文件类型 |

## 支持的网盘平台

根据响应数据中的 `from` 字段，Miaoso 支持以下网盘平台：

| 平台标识 | 平台名称 | 说明 |
|----------|----------|------|
| `quark` | 夸克网盘 | 主要支持的网盘平台 |
| `baidu` | 百度网盘 | 传统网盘平台 |
| `uc` | UC网盘 | UC浏览器网盘 |
| `aliyun` | 阿里云盘 | 阿里巴巴云存储 |

## 特殊处理说明

### 1. HTML标签处理
- `name` 字段包含HTML高亮标签 `<span style="color: red;">关键词</span>`
- 需要去除HTML标签获取纯文本标题

### 2. URL解密
- `url` 字段是加密的分享链接，需要通过特定算法解密
- 解密后应该是标准的网盘分享链接

### 3. 时间格式
- `gmtCreate` 和 `gmtShare` 使用格式：`"YYYY-MM-DD HH:mm:ss"`
- 需要转换为 Go 的 time.Time 类型

### 4. 数据验证
- 某些字段可能为 `null`，需要进行空值检查
- `fileInfos` 数组可能包含重复的文件信息

## 插件实现要点

根据 Limitless Search 插件开发指南，实现 Miaoso 插件需要注意：

### 1. 插件配置
- **插件名称**: `miaoso`
- **优先级**: 建议设置为 3（标准质量数据源）
- **Service层过滤**: 启用（标准网盘搜索插件）

### 2. 数据转换映射

| Miaoso字段 | Limitless Search SearchResult字段 | 转换说明 |
|------------|-------------------------|----------|
| `id` | `UniqueID` | 格式：`miaoso-{id}` |
| `name` | `Title` | 去除HTML标签 |
| `content` | `Content` | 描述信息，可能为空 |
| `gmtShare` | `Datetime` | 解析时间格式 |
| `url` + `from` | `Links` | 解密URL并识别网盘类型 |
| - | `Tags` | 可根据`from`设置网盘类型标签 |
| - | `Channel` | 设置为空字符串（插件搜索结果） |

### 3. 错误处理
- 处理API返回的错误状态码
- 处理URL解密失败的情况
- 处理网络请求超时和重试

### 4. 性能优化
- 实现HTTP连接复用
- 合理设置请求超时时间
- 使用关键词过滤提高结果相关性

## 示例代码结构

```go
type MiaosouResponse struct {
    Code int `json:"code"`
    Msg  string `json:"msg"`
    Data MiaosouData `json:"data"`
}

type MiaosouData struct {
    Total int `json:"total"`
    List  []MiaosouItem `json:"list"`
}

type MiaosouItem struct {
    ID          string           `json:"id"`
    Name        string           `json:"name"`
    URL         string           `json:"url"`
    Type        *string          `json:"type"`
    From        string           `json:"from"`
    Content     *string          `json:"content"`
    GmtCreate   string           `json:"gmtCreate"`
    GmtShare    string           `json:"gmtShare"`
    FileCount   int              `json:"fileCount"`
    CreatorID   *string          `json:"creatorId"`
    CreatorName string           `json:"creatorName"`
    FileInfos   []MiaosouFileInfo `json:"fileInfos"`
}

type MiaosouFileInfo struct {
    Category      *string `json:"category"`
    FileExtension *string `json:"fileExtension"`
    FileID        string  `json:"fileId"`
    FileName      string  `json:"fileName"`
    Type          *string `json:"type"`
}
```
