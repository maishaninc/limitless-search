# Nyaa.si BT种子搜索站结构分析

## 网站信息

- **网站名称**: Nyaa.si
- **网站URL**: https://nyaa.si
- **网站类型**: 动漫BT种子搜索引擎
- **数据源**: HTML页面爬虫
- **主要特点**: 专注于动漫、漫画等ACG资源的BT种子搜索

## 搜索URL格式

```
https://nyaa.si/?f=0&c=0_0&q={关键词}
```

### URL参数说明

| 参数 | 说明 | 示例值 |
|------|------|--------|
| `q` | 搜索关键词 | `tomb` |
| `f` | 过滤器 (0=无过滤, 1=无重制, 2=仅信任) | `0` |
| `c` | 分类 (0_0=全部, 1_0=动漫, 1_2=英文动漫, 1_3=非英文动漫等) | `0_0` |
| `s` | 排序字段 (id/size/comments/seeders/leechers/downloads) | 可选 |
| `o` | 排序方式 (asc/desc) | 可选 |

## 搜索结果页面结构

### 主容器

搜索结果显示在一个表格中：

```html
<table class="table table-bordered table-hover table-striped torrent-list">
  <thead>
    <tr>
      <th class="hdr-category">Category</th>
      <th class="hdr-name">Name</th>
      <th class="hdr-comments">Comments</th>
      <th class="hdr-link">Link</th>
      <th class="hdr-size">Size</th>
      <th class="hdr-date">Date</th>
      <th class="hdr-seeders">Seeders</th>
      <th class="hdr-leechers">Leechers</th>
      <th class="hdr-downloads">Downloads</th>
    </tr>
  </thead>
  <tbody>
    <!-- 搜索结果行 -->
  </tbody>
</table>
```

### 单个搜索结果行结构

每个搜索结果是一个 `<tr>` 元素，包含以下字段：

```html
<tr class="default">  <!-- class可能是: default, success, danger, warning -->
  <!-- 1. 分类 -->
  <td>
    <a href="/?c=1_3" title="Anime - Non-English-translated">
      <img src="/static/img/icons/nyaa/1_3.png" alt="Anime - Non-English-translated" class="category-icon">
    </a>
  </td>
  
  <!-- 2. 标题（跨2列） -->
  <td colspan="2">
    <a href="/view/2024388" title="[GM-Team][国漫][神墓 第3季][Tomb of Fallen Gods Ⅲ][2025][09][GB][4K HEVC 10Bit]">
      [GM-Team][国漫][神墓 第3季][Tomb of Fallen Gods Ⅲ][2025][09][GB][4K HEVC 10Bit]
    </a>
  </td>
  
  <!-- 3. 下载链接 -->
  <td class="text-center">
    <a href="/download/2024388.torrent"><i class="fa fa-fw fa-download"></i></a>
    <a href="magnet:?xt=urn:btih:e47fcca0f3f1e24b1cc871a07881350faca92636&amp;dn=%5BGM-Team%5D...">
      <i class="fa fa-fw fa-magnet"></i>
    </a>
  </td>
  
  <!-- 4. 文件大小 -->
  <td class="text-center">1.1 GiB</td>
  
  <!-- 5. 发布时间 -->
  <td class="text-center" data-timestamp="1758941208">2025-09-27 02:46</td>
  
  <!-- 6. 做种数 -->
  <td class="text-center">60</td>
  
  <!-- 7. 下载数 -->
  <td class="text-center">13</td>
  
  <!-- 8. 完成数 -->
  <td class="text-center">286</td>
</tr>
```

## 字段提取规则

### 1. 分类信息
- **选择器**: `td:nth-child(1) a`
- **提取**: `title` 属性
- **示例**: "Anime - Non-English-translated"

### 2. 标题和详情链接
- **选择器**: `td[colspan="2"] a`
- **标题**: `text()` 或 `title` 属性
- **详情链接**: `href` 属性 (如 `/view/2024388`)
- **唯一ID**: 从href提取数字部分

### 3. 下载链接
- **种子文件**: `td.text-center a[href^="/download/"]`
  - 格式: `/download/{ID}.torrent`
  - 完整URL: `https://nyaa.si/download/{ID}.torrent`
  
- **磁力链接**: `td.text-center a[href^="magnet:"]`
  - 格式: `magnet:?xt=urn:btih:{HASH}&dn={文件名}&tr={tracker列表}`
  - 提取: 直接获取 `href` 属性

### 4. 文件大小
- **选择器**: `td.text-center` (第4个td)
- **格式**: "1.1 GiB", "500.0 MiB", "3.2 TiB"
- **提取**: 直接文本内容

### 5. 发布时间
- **选择器**: `td.text-center[data-timestamp]`
- **时间戳**: `data-timestamp` 属性 (Unix timestamp)
- **显示时间**: 文本内容 "2025-09-27 02:46"

### 6. 种子统计信息
- **做种数 (Seeders)**: 第6个 `td.text-center`
- **下载数 (Leechers)**: 第7个 `td.text-center`
- **完成数 (Downloads)**: 第8个 `td.text-center`

## 搜索结果类型标识

通过 `<tr>` 的 class 属性区分资源质量：

| Class | 含义 | 说明 |
|-------|------|------|
| `default` | 普通资源 | 灰色背景 |
| `success` | 可信任/已验证资源 | 绿色背景 |
| `danger` | 重制版 | 红色背景 |
| `warning` | 警告/可疑 | 黄色背景 |

## 磁力链接格式

```
magnet:?xt=urn:btih:{INFO_HASH}
&dn={URL编码的文件名}
&tr={tracker1}
&tr={tracker2}
&tr={tracker3}
...
```

### 常见Tracker列表

```
http://nyaa.tracker.wf:7777/announce
udp://open.stealth.si:80/announce
udp://tracker.opentrackr.org:1337/announce
udp://exodus.desync.com:6969/announce
udp://tracker.torrent.eu.org:451/announce
```

## 反爬虫策略

### 请求头设置

```go
req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...")
req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
req.Header.Set("Accept-Language", "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7")
req.Header.Set("Referer", "https://nyaa.si/")
```

### 访问频率控制
- 建议请求间隔：100-200ms
- 超时时间：10秒
- 重试次数：3次

## 插件设计

### 基本信息
- **插件名称**: nyaa
- **优先级**: 3 (普通质量数据源)
- **Service层过滤**: 跳过 (磁力搜索插件，标题格式特殊)
- **缓存TTL**: 30分钟

### 搜索流程

```
1. 构建搜索URL
   ↓
2. 发送HTTP请求（带重试）
   ↓
3. 解析HTML页面 (goquery)
   ↓
4. 查找表格 table.torrent-list
   ↓
5. 遍历 tbody > tr 提取信息
   ↓
6. 提取磁力链接
   ↓
7. 关键词过滤（插件层）
   ↓
8. 返回结果
```

### 数据转换

#### SearchResult 字段映射

| Nyaa字段 | SearchResult字段 | 说明 |
|---------|-----------------|------|
| 标题 | Title | 资源标题 |
| 分类+大小+统计 | Content | 拼接描述信息 |
| 磁力链接 | Links[0].URL | magnet链接 |
| 发布时间 | Datetime | Unix timestamp转换 |
| 分类 | Tags[0] | 资源分类 |
| 做种/下载/完成 | Tags[1-3] | 统计信息 |
| 唯一ID | UniqueID | nyaa-{ID} |
| 频道 | Channel | 空字符串 |

#### Link 字段设置

```go
Link{
    Type:     "magnet",  // 固定为magnet
    URL:      magnetURL,  // 完整的磁力链接
    Password: "",         // 磁力链接无密码
}
```

## 性能优化

### 1. HTTP连接池
```go
MaxIdleConns:        50
MaxIdleConnsPerHost: 20
MaxConnsPerHost:     30
IdleConnTimeout:     90 * time.Second
```

### 2. 超时控制
- 搜索请求超时：10秒
- 重试间隔：指数退避（200ms, 400ms, 800ms）

### 3. 缓存策略
- 搜索结果缓存：30分钟
- 定期清理：每小时清理一次过期缓存

## 使用示例

### API请求
```bash
curl "http://localhost:8888/api/search?kw=神墓&plugins=nyaa"
```

### 预期响应
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "results": [
      {
        "unique_id": "nyaa-2024388",
        "title": "[GM-Team][国漫][神墓 第3季][Tomb of Fallen Gods Ⅲ][2025][09][GB][4K HEVC 10Bit]",
        "content": "分类: Anime - Non-English-translated | 大小: 1.1 GiB | 做种: 60 | 下载: 13 | 完成: 286",
        "datetime": "2025-09-27T02:46:00Z",
        "links": [
          {
            "type": "magnet",
            "url": "magnet:?xt=urn:btih:e47fcca0f3f1e24b1cc871a07881350faca92636&dn=...",
            "password": ""
          }
        ],
        "tags": ["Anime - Non-English-translated", "做种:60", "下载:13", "完成:286"],
        "channel": ""
      }
    ]
  }
}
```

## 注意事项

### 优点
- ✅ **专业的ACG资源站**: 动漫资源质量高
- ✅ **磁力链接直接可用**: 无需下载种子文件
- ✅ **完整的统计信息**: 做种数、下载数、完成数
- ✅ **分类清晰**: 多种分类便于筛选
- ✅ **更新及时**: 最新动漫资源快速更新

### 注意事项
- ⚠️ **仅提供磁力链接**: 不是网盘资源
- ⚠️ **标题格式特殊**: 使用方括号、点号等特殊格式
- ⚠️ **需要跳过Service层过滤**: 避免误删有效结果
- ⚠️ **英文为主**: 部分资源标题为英文
- ⚠️ **BT下载**: 需要BT客户端支持

## 维护建议

1. **定期检查网站结构**: 网站可能更新HTML结构
2. **监控成功率**: 检查请求成功率和解析准确率
3. **优化关键词匹配**: 针对特殊标题格式优化过滤逻辑
4. **tracker更新**: 定期更新tracker列表以提高连接成功率
