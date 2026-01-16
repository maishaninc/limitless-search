# Linux.do 搜索API JSON结构分析

## 接口信息

- **接口名称**: Linux.do 论坛搜索API (Discourse)
- **接口地址**: `https://linux.do/search.json`
- **请求方法**: `GET`
- **Content-Type**: `application/json`
- **主要特点**: 基于Discourse论坛系统，搜索网盘资源分享帖子，需要绕过Cloudflare防护

## 请求结构

### 搜索API请求格式

```
GET https://linux.do/search.json?q={keyword}%20%23resource%3Acloud-asset%20in%3Atitle&page={page}
```

### 请求参数说明

| 参数名 | 类型 | 必需 | 默认值 | 说明 |
|--------|------|------|--------|------|
| `q` | string | 是 | - | 搜索查询，包含关键词和过滤条件，需要URL编码 |
| `page` | int | 否 | 1 | 页码，从1开始 |

### 查询字符串格式

```
{keyword} #resource:cloud-asset in:title
```

说明：
- `{keyword}`: 搜索关键词（如：遮天）
- `#resource:cloud-asset`: 过滤标签，只搜索云盘资源类别
- `in:title`: 只在标题中搜索

## 响应结构

### 完整响应格式

```json
{
  "posts": [...],
  "topics": [...],
  "users": [],
  "categories": [],
  "tags": [],
  "groups": [],
  "grouped_search_result": {
    "more_posts": null,
    "more_users": null,
    "more_categories": null,
    "term": "遮天 #resource:cloud-asset in:title",
    "search_log_id": 16604511,
    "more_full_page_results": true,
    "can_create_topic": true,
    "error": null,
    "extra": {},
    "post_ids": [...],
    "user_ids": [],
    "category_ids": [],
    "tag_ids": [],
    "group_ids": []
  }
}
```

### 响应字段详解

#### 1. posts 数组（帖子列表）

包含搜索到的帖子信息，每个帖子包含网盘链接：

```json
{
  "id": 9619992,
  "name": "lxwh",
  "username": "lxwh",
  "avatar_template": "/user_avatar/linux.do/lxwh/{size}/387453_2.png",
  "created_at": "2025-10-21T10:29:05.613Z",
  "like_count": 2,
  "blurb": "紫川更新 遮天... 夸克网盘： https://pan.quark.cn/s/99758a147076 点击进入 百度网盘： https://pan.baidu.com/s/1wF1YzQ14Vo8us_k9UfFNJQ?pwd=hccn 点击进入...",
  "post_number": 1,
  "topic_id": 1067663
}
```

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `id` | int | 帖子ID |
| `name` | string | 发帖人姓名 |
| `username` | string | 发帖人用户名 |
| `avatar_template` | string | 头像模板URL |
| `created_at` | string | 发布时间（ISO 8601格式） |
| `like_count` | int | 点赞数 |
| `blurb` | string | **帖子内容摘要（包含网盘链接）** |
| `post_number` | int | 帖子楼层号 |
| `topic_id` | int | 主题ID |

#### 2. topics 数组（主题列表）

包含搜索到的主题信息：

```json
{
  "fancy_title": "遮天 第132集＆紫川2更15集 【4K高码】",
  "id": 1067663,
  "title": "遮天 第132集＆紫川2更15集 【4K高码】",
  "slug": "topic",
  "posts_count": 8,
  "reply_count": 2,
  "highest_post_number": 8,
  "created_at": "2025-10-21T10:29:05.493Z",
  "last_posted_at": "2025-10-22T00:28:29.185Z",
  "bumped": true,
  "bumped_at": "2025-10-22T00:28:29.185Z",
  "archetype": "regular",
  "unseen": false,
  "pinned": false,
  "unpinned": null,
  "visible": true,
  "closed": false,
  "archived": false,
  "bookmarked": null,
  "liked": null,
  "tags": [
    "夸克网盘",
    "影视",
    "百度网盘",
    "动漫"
  ],
  "tags_descriptions": {},
  "category_id": 94,
  "has_accepted_answer": false,
  "can_have_answer": false
}
```

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `id` | int | 主题ID |
| `title` | string | 主题标题 |
| `fancy_title` | string | 格式化标题（HTML实体） |
| `tags` | array | **标签列表（包含网盘类型）** |
| `posts_count` | int | 回复数 |
| `created_at` | string | 创建时间 |
| `last_posted_at` | string | 最后回复时间 |
| `category_id` | int | 分类ID（94=云盘资源） |

#### 3. grouped_search_result（搜索元数据）

```json
{
  "term": "遮天 #resource:cloud-asset in:title",
  "search_log_id": 16604511,
  "more_full_page_results": true,
  "can_create_topic": true,
  "error": null,
  "post_ids": [9619992, 9620329, ...],
  "user_ids": [],
  "category_ids": [],
  "tag_ids": [],
  "group_ids": []
}
```

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `term` | string | 搜索词 |
| `post_ids` | array | 所有帖子ID列表 |
| `more_full_page_results` | bool | 是否有更多结果 |

## 数据提取逻辑

### 1. 从 blurb 中提取网盘链接

`blurb` 字段包含帖子的文本摘要，其中包含网盘链接。需要使用正则表达式提取：

#### 网盘链接格式

| 网盘类型 | URL 格式 | 提取码格式 |
|----------|----------|-----------|
| **夸克网盘** | `https://pan.quark.cn/s/{code}` | 无需提取码 |
| **百度网盘** | `https://pan.baidu.com/s/{code}?pwd={password}` | `?pwd={password}` |
| **阿里云盘** | `https://www.aliyundrive.com/s/{code}` | 无需提取码 |
| **迅雷网盘** | `https://pan.xunlei.com/s/{code}?pwd={password}` | `?pwd={password}` |
| **天翼云盘** | `https://cloud.189.cn/t/{code}` | 访问码: {code} |
| **UC网盘** | `https://drive.uc.cn/s/{code}` | 无需提取码 |

#### 正则表达式模式

```go
// 夸克网盘
quarkPattern := regexp.MustCompile(`https://pan\.quark\.cn/s/[0-9a-zA-Z]+`)

// 百度网盘（带提取码）
baiduPattern := regexp.MustCompile(`https://pan\.baidu\.com/s/[0-9a-zA-Z_\-]+(?:\?pwd=([0-9a-zA-Z]+))?`)

// 阿里云盘
aliyunPattern := regexp.MustCompile(`https://(?:www\.)?aliyundrive\.com/s/[0-9a-zA-Z]+`)

// 迅雷网盘
xunleiPattern := regexp.MustCompile(`https://pan\.xunlei\.com/s/[0-9a-zA-Z_\-]+(?:\?pwd=([0-9a-zA-Z]+))?`)

// 天翼云盘
tianyiPattern := regexp.MustCompile(`https://cloud\.189\.cn/t/[0-9a-zA-Z]+`)

// UC网盘
ucPattern := regexp.MustCompile(`https://drive\.uc\.cn/s/[0-9a-zA-Z]+`)
```

### 2. 从 tags 中获取网盘类型

`tags` 数组包含网盘类型标签，可以用于过滤和分类：

```go
tags := []string{"夸克网盘", "百度网盘", "动漫"}
```

### 3. 网盘类型映射

| 标签名 | 英文标识 |
|--------|---------|
| 夸克网盘 | quark |
| 百度网盘 | baidu |
| 阿里云盘 | aliyun |
| 迅雷网盘 | xunlei |
| UC网盘 | uc |
| 天翼云盘 | tianyi |
| 115网盘 | 115 |
| 123网盘 | 123 |

### 4. 时间格式转换

```go
// 输入格式: "2025-10-21T10:29:05.613Z" (ISO 8601)
// 解析为 time.Time
parsedTime, err := time.Parse(time.RFC3339, "2025-10-21T10:29:05.613Z")
```

## 实现要点

### 1. Cloudflare 绕过

Linux.do 使用 Cloudflare 防护，必须使用 cloudscraper 库绕过：

```go
import "github.com/Advik-B/cloudscraper/lib"

// 创建 cloudscraper 客户端
sc, err := cloudscraper.New()

// 发送请求
resp, err := sc.Get(searchURL)
```

### 2. URL 构建

```go
// 搜索关键词需要 URL 编码
keyword := "遮天"
query := fmt.Sprintf("%s #resource:cloud-asset in:title", keyword)
searchURL := fmt.Sprintf("https://linux.do/search.json?q=%s&page=%d", 
    url.QueryEscape(query), page)
```

### 3. 链接提取逻辑

```go
// 从 blurb 中提取所有网盘链接
func extractNetDiskLinks(blurb string) []model.Link {
    var links []model.Link
    
    // 提取夸克网盘
    quarkLinks := quarkPattern.FindAllString(blurb, -1)
    for _, linkURL := range quarkLinks {
        links = append(links, model.Link{
            Type: "quark",
            URL:  linkURL,
        })
    }
    
    // 提取百度网盘（带提取码）
    baiduMatches := baiduPattern.FindAllStringSubmatch(blurb, -1)
    for _, match := range baiduMatches {
        link := model.Link{
            Type: "baidu",
            URL:  match[0],
        }
        if len(match) > 1 && match[1] != "" {
            link.Password = match[1]
        }
        links = append(links, link)
    }
    
    // ... 其他网盘类型
    
    return links
}
```

### 4. SearchResult 构建

```go
func convertToSearchResult(post Post, topic Topic) model.SearchResult {
    // 提取网盘链接
    links := extractNetDiskLinks(post.Blurb)
    
    // 解析时间
    createdAt, _ := time.Parse(time.RFC3339, post.CreatedAt)
    
    return model.SearchResult{
        UniqueID:  fmt.Sprintf("linuxdo-%d", post.ID),
        Title:     topic.Title,
        Content:   post.Blurb,
        Links:     links,
        Tags:      topic.Tags,
        Channel:   "", // 插件搜索结果必须为空
        Datetime:  createdAt,
    }
}
```

## 注意事项

1. **Cloudflare 防护**: 必须使用 cloudscraper 库绕过
2. **查询格式**: 必须包含 `#resource:cloud-asset in:title` 过滤条件
3. **链接提取**: blurb 是截断的文本，可能包含不完整的链接
4. **去重**: 同一个资源可能在多个帖子中出现，需要去重
5. **网盘类型**: 从 tags 和 链接URL 双重判断网盘类型
6. **提取码**: 百度网盘和迅雷网盘的提取码在 URL 参数中
7. **分页**: 支持 page 参数进行分页搜索

## 优先级建议

根据 Linux.do 的特点，建议设置插件优先级为 **2**：
- ✅ 数据源质量良好，社区活跃
- ✅ 资源更新及时，内容新鲜
- ✅ 支持多种网盘类型
- ⚠️ 需要绕过 Cloudflare 防护
- ⚠️ 链接提取依赖文本解析，可能有误差

## 详情页API

### 接口说明

当搜索结果中的 `blurb` 字段无法提供完整的网盘链接时，可以通过详情页API获取完整内容。

### 请求格式

```
GET https://linux.do/t/{topic_id}.json?track_visit=true&forceLoad=true
```

| 参数名 | 类型 | 必需 | 说明 |
|--------|------|------|------|
| `topic_id` | int | 是 | 主题ID，从搜索结果的 `topic_id` 字段获取 |
| `track_visit` | bool | 否 | 是否跟踪访问 |
| `forceLoad` | bool | 否 | 是否强制加载 |

### 响应结构

```json
{
  "post_stream": {
    "posts": [
      {
        "id": 9619992,
        "username": "lxwh",
        "created_at": "2025-10-21T10:29:05.613Z",
        "cooked": "<p>HTML格式的完整帖子内容...</p>",
        "post_number": 1,
        "topic_id": 1067663,
        "link_counts": [
          {
            "url": "https://pan.quark.cn/s/d6b8b0908959",
            "internal": false,
            "reflection": false,
            "clicks": 29
          },
          {
            "url": "https://pan.baidu.com/s/1KJylsrBbKbMhi9e-i9YMVA?pwd=tn44",
            "internal": false,
            "reflection": false,
            "clicks": 16
          }
        ]
      }
    ]
  },
  "id": 1067663,
  "title": "遮天 第132集＆紫川2更15集 【4K高码】",
  "fancy_title": "遮天 第132集＆紫川2更15集 【4K高码】",
  "tags": ["夸克网盘", "影视", "百度网盘", "动漫"],
  "category_id": 94
}
```

### 关键字段说明

#### post_stream.posts[0]（主帖内容）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `cooked` | string | **HTML格式的完整帖子内容** |
| `link_counts` | array | **所有外部链接列表（含网盘链接）** |

#### link_counts 数组

这是最可靠的链接提取来源，包含了帖子中所有外部链接：

```json
{
  "url": "https://pan.quark.cn/s/d6b8b0908959",
  "internal": false,
  "reflection": false,
  "clicks": 29
}
```

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `url` | string | **完整的链接URL** |
| `internal` | bool | 是否为内部链接（false表示外部链接） |
| `clicks` | int | 点击次数 |

### 数据提取策略

**推荐方式**：优先使用 `link_counts` 数组

1. ✅ **最可靠**：由服务器解析，不会遗漏或截断
2. ✅ **最完整**：包含所有外部链接
3. ✅ **易解析**：结构化数据，无需正则表达式

```go
// 从 link_counts 提取网盘链接
for _, linkCount := range post.LinkCounts {
    // 跳过内部链接
    if linkCount.Internal {
        continue
    }
    
    // 判断是否为网盘链接
    if isNetDiskURL(linkCount.URL) {
        link := parseNetDiskLink(linkCount.URL)
        links = append(links, link)
    }
}
```

**备用方式**：从 `cooked` HTML 中提取

当 `link_counts` 为空或不完整时，可以从 HTML 中提取：

```go
// 使用 goquery 解析 HTML
doc, _ := goquery.NewDocumentFromReader(strings.NewReader(post.Cooked))

// 提取所有 <a> 标签
doc.Find("a").Each(func(i int, s *goquery.Selection) {
    href, exists := s.Attr("href")
    if exists && isNetDiskURL(href) {
        link := parseNetDiskLink(href)
        links = append(links, link)
    }
})
```

## 实现策略

### 两步法获取完整数据

1. **第一步：搜索API**
   - 获取帖子列表和基本信息
   - 从 `blurb` 快速提取部分链接
   - 获取 `topic_id` 用于详情请求

2. **第二步：详情API**（按需）
   - 当 `blurb` 中链接不完整时
   - 或需要获取完整帖子内容时
   - 使用 `link_counts` 获取所有链接

### 性能优化建议

- ✅ **批量获取**：使用协程并发请求多个详情页
- ✅ **智能跳过**：如果搜索结果已有完整链接，跳过详情请求
- ✅ **缓存结果**：相同 `topic_id` 的详情可缓存
- ⚠️ **速率限制**：避免请求过快被限流

## 示例

### 1. 搜索API 示例

#### 请求
```
GET https://linux.do/search.json?q=%E9%81%AE%E5%A4%A9%20%23resource%3Acloud-asset%20in%3Atitle&page=1
```

#### 响应（简化）
```json
{
  "posts": [
    {
      "id": 9619992,
      "username": "lxwh",
      "created_at": "2025-10-21T10:29:05.613Z",
      "blurb": "夸克网盘： https://pan.quark.cn/s/99758a147076",
      "topic_id": 1067663
    }
  ],
  "topics": [
    {
      "id": 1067663,
      "title": "遮天 第132集＆紫川2更15集 【4K高码】",
      "tags": ["夸克网盘", "影视", "动漫"]
    }
  ]
}
```

### 2. 详情API 示例

#### 请求
```
GET https://linux.do/t/1067663.json?track_visit=true&forceLoad=true
```

#### 响应（简化）
```json
{
  "post_stream": {
    "posts": [
      {
        "id": 9619992,
        "link_counts": [
          {
            "url": "https://pan.quark.cn/s/d6b8b0908959",
            "internal": false,
            "clicks": 29
          },
          {
            "url": "https://pan.baidu.com/s/1KJylsrBbKbMhi9e-i9YMVA?pwd=tn44",
            "internal": false,
            "clicks": 16
          }
        ]
      }
    ]
  },
  "title": "遮天 第132集＆紫川2更15集 【4K高码】"
}
```

