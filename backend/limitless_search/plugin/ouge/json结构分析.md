# Ouge API 数据结构分析

## 基本信息
- **数据源类型**: JSON API  
- **API URL格式**: `https://woog.nxog.eu.org/api.php/provide/vod?ac=detail&wd={关键词}`
- **数据特点**: 视频点播(VOD)系统API，提供结构化影视资源数据
- **重要发现**: **与wanou插件使用完全相同的API和数据结构**

## API响应结构

### 顶层结构
```json
{
    "code": 1,                    // 状态码：1表示成功
    "msg": "数据列表",             // 响应消息
    "page": 1,                    // 当前页码
    "pagecount": 1,               // 总页数
    "limit": 20,                  // 每页限制条数
    "total": 3,                   // 总记录数
    "list": []                    // 数据列表数组
}
```

### `list`数组中的数据项结构
```json
{
    "vod_id": 18010,                    // 资源唯一ID
    "vod_name": "凡人修仙传",            // 资源标题
    "vod_actor": "杨洋,金晨,汪铎...",    // 主演（逗号分隔）
    "vod_director": "杨阳",             // 导演
    "vod_area": "中国大陆",             // 地区
    "vod_year": "2025",                 // 年份
    "vod_remarks": "第11集",            // 更新状态/备注
    "vod_pubdate": "2025-07-27(中国大陆)", // 发布日期
    "vod_content": "<p>...</p>",        // 内容描述（HTML格式）
    "vod_pic": "https://...",           // 封面图片URL
    
    // 关键字段：下载链接相关
    "vod_down_from": "bd$$$KG$$$UC",    // 下载源标识（$$$分隔）
    "vod_down_url": "https://pan.baidu.com/s/13milLJZV5_7DCzGDQu-fcA?pwd=8888$$$https://pan.quark.cn/s/0fe46ed6eefc$$$https://drive.uc.cn/s/d83caf5d4fb74"
}
```

## 插件所需字段映射

| 源字段 | 目标字段 | 说明 |
|--------|----------|------|
| `vod_id` | `UniqueID` | 格式: `ouge-{vod_id}` |
| `vod_name` | `Title` | 资源标题 |
| `vod_actor`, `vod_director`, `vod_area`, `vod_year`, `vod_remarks` | `Content` | 组合描述信息 |
| `vod_year`, `vod_area` | `Tags` | 标签数组 |
| `vod_down_from` + `vod_down_url` | `Links` | 解析为Link数组 |
| `""` | `Channel` | 插件搜索结果Channel为空 |
| `time.Now()` | `Datetime` | 当前时间 |

## 下载链接解析

### 分隔符规则
- **多个下载源**: 使用 `$$$` 分隔
- **对应关系**: `vod_down_from`、`vod_down_url` 按相同位置对应

### 下载源标识映射（与wanou相同）
| API标识 | 网盘类型 | 域名示例 |
|---------|----------|----------|
| `bd`    | baidu (百度网盘) | `pan.baidu.com` |
| `KG`    | quark (夸克网盘) | `pan.quark.cn` |
| `UC`    | uc (UC网盘) | `drive.uc.cn` |

### 链接格式示例
```
百度网盘: https://pan.baidu.com/s/13milLJZV5_7DCzGDQu-fcA?pwd=8888
夸克网盘: https://pan.quark.cn/s/0fe46ed6eefc
UC网盘: https://drive.uc.cn/s/d83caf5d4fb74
```

## 支持的网盘类型（16种）

### 主流网盘
- **baidu (百度网盘)**: `https://pan.baidu.com/s/{分享码}?pwd={密码}`
- **quark (夸克网盘)**: `https://pan.quark.cn/s/{分享码}`
- **aliyun (阿里云盘)**: `https://aliyundrive.com/s/{分享码}`, `https://www.alipan.com/s/{分享码}`
- **uc (UC网盘)**: `https://drive.uc.cn/s/{分享码}`
- **xunlei (迅雷网盘)**: `https://pan.xunlei.com/s/{分享码}`

### 运营商网盘
- **tianyi (天翼云盘)**: `https://cloud.189.cn/t/{分享码}`
- **mobile (移动网盘)**: `https://caiyun.feixin.10086.cn/{分享码}`

### 专业网盘
- **115 (115网盘)**: `https://115.com/s/{分享码}`
- **weiyun (微云)**: `https://share.weiyun.com/{分享码}`
- **lanzou (蓝奏云)**: `https://lanzou.com/{分享码}`
- **jianguoyun (坚果云)**: `https://jianguoyun.com/{分享码}`
- **123 (123网盘)**: `https://123pan.com/s/{分享码}`
- **pikpak (PikPak)**: `https://mypikpak.com/s/{分享码}`

### 其他协议
- **magnet (磁力链接)**: `magnet:?xt=urn:btih:{hash}`
- **ed2k (电驴链接)**: `ed2k://|file|{filename}|{size}|{hash}|/`
- **others (其他类型)**: 其他不在上述分类中的链接

## 插件开发指导

### 请求示例
```go
searchURL := fmt.Sprintf("https://woog.nxog.eu.org/api.php/provide/vod?ac=detail&wd=%s", url.QueryEscape(keyword))
```

### SearchResult构建示例
```go
result := model.SearchResult{
    UniqueID: fmt.Sprintf("ouge-%d", item.VodID),
    Title:    item.VodName,
    Content:  buildContent(item),
    Links:    parseDownloadLinks(item.VodDownFrom, item.VodDownURL),
    Tags:     []string{item.VodYear, item.VodArea},
    Channel:  "", // 插件搜索结果Channel为空
    Datetime: time.Now(),
}
```

### 链接解析逻辑
```go
// 按$$$分隔
fromParts := strings.Split(item.VodDownFrom, "$$$")
urlParts := strings.Split(item.VodDownURL, "$$$")

// 遍历对应位置
for i := 0; i < min(len(fromParts), len(urlParts)); i++ {
    linkType := mapCloudType(fromParts[i], urlParts[i])
    password := extractPassword(urlParts[i])
    // ...
}
```

## 注意事项
1. **API兼容性**: 与wanou插件完全兼容，可以共享代码实现
2. **数据格式**: 纯JSON API，无需HTML解析
3. **分隔符处理**: 多个值使用`$$$`分隔，需要split处理
4. **密码提取**: 部分百度网盘链接包含`?pwd=`参数
5. **错误处理**: API可能返回`code != 1`的错误状态
6. **链接验证**: 应过滤无效链接（如`javascript:;`等）

## 开发建议
- **代码复用**: 可以直接复制wanou插件的实现，仅修改插件名称和API域名
- **域名差异**: 唯一区别是使用`woog.nxog.eu.org`而不是其他域名
- **缓存策略**: 建议使用相同的缓存机制和TTL设置