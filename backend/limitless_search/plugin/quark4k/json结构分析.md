# Quark4K API 数据结构分析

## 基本信息
- **数据源类型**: JSON API  
- **API URL格式**: `https://quark4k.com/api/discussions?include=user%2ClastPostedUser%2CmostRelevantPost%2CmostRelevantPost.user%2Ctags%2Ctags.parent%2CfirstPost&filter[q]={关键词}&sort&page[offset]=0`
- **请求方法**: `GET`
- **Content-Type**: `application/json`
- **Referer**: `https://quark4k.com/`
- **特殊说明**: 该网站**主要提供夸克网盘(quark)链接**，域名固定为`pan.quark.cn`，需要从HTML内容中解析网盘链接和密码

## API响应结构

### 顶层结构
```json
{
    "links": {
        "first": "https://quark4k.com/api/discussions?include=..."
    },
    "data": [
        // 讨论帖子数组
    ],
    "included": [
        // 相关回复内容、用户、标签数组
    ]
}
```

### `data`数组中的讨论帖子结构
```json
{
    "type": "discussions",
    "id": "1006",
    "attributes": {
        "title": "【印度剧】黑手遮天 第2季  (2025)  4K HDR 内封简中 夸克网盘资源下载",
        "slug": "1006-yin-du-ju-hei-shou-zhe-tian-di-2ji-2025-4k-hdr-nei-feng-jian-zhong-kua-ke-wang-pan-zi-yuan-xia-zai",
        "commentCount": 1,
        "participantCount": 1,
        "createdAt": "2025-06-13T12:55:57+00:00",
        "lastPostedAt": "2025-06-13T12:55:57+00:00",
        "lastPostNumber": 1,
        "canReply": false,
        "isApproved": true,
        "isLocked": false
    },
    "relationships": {
        "user": {
            "data": {
                "type": "users",
                "id": "2"
            }
        },
        "mostRelevantPost": {
            "data": {
                "type": "posts",
                "id": "1124"
            }
        },
        "tags": {
            "data": [
                {
                    "type": "tags",
                    "id": "1"
                }
            ]
        },
        "firstPost": {
            "data": {
                "type": "posts",
                "id": "1124"
            }
        }
    }
}
```

### `included`数组中的回复内容结构
```json
{
    "type": "posts",
    "id": "1124",
    "attributes": {
        "number": 1,
        "createdAt": "2025-06-13T12:55:57+00:00",
        "contentType": "comment",
        "contentHtml": "<p><img src=\"...\" title=\"\" alt=\"黑手遮天 第2季\"><br>\n剧名：黑手遮天 第2季 Rana Naidu Season 2<br>\n类型: 剧情<br>\n制片国家/地区: 印度<br>\n语言: 印地语<br>\n首播: 2025-06-13(印度网络)<br>\nIMDb: tt27547185</p>\n\n<p>黑手遮天 第2季的剧情............</p>\n\n<p>《黑手遮天 第2季》夸克网盘链接：<a href=\"https://pan.quark.cn/s/5881dd6b25e4\" rel=\"ugc noopener nofollow\" target=\"_blank\">https://pan.quark.cn/s/5881dd6b25e4</a></p>",
        "renderFailed": false,
        "editedAt": "2025-09-18T07:31:04+00:00",
        "isApproved": true,
        "likesCount": 0
    },
    "relationships": {
        "user": {
            "data": {
                "type": "users",
                "id": "2"
            }
        }
    }
}
```

## 插件所需字段映射

| 源字段 | 目标字段 | 说明 |
|--------|----------|------|
| `data[].id` | `UniqueID` | 格式: `quark4k-{discussion_id}` |
| `data[].attributes.title` | `Title` | 讨论标题 |
| `data[].attributes.createdAt` | `Datetime` | 创建时间 |
| `included[].attributes.contentHtml` | `Content` | HTML内容，需要解析提取网盘链接 |
| `""` | `Channel` | 插件搜索结果Channel为空 |
| `[]` | `Tags` | 标签数组（从标题或内容中提取） |
| 解析的网盘链接 | `Links` | 从HTML内容中提取的网盘链接 |

## 网盘链接解析

### HTML内容特点
- **格式**: 包含HTML标签的文本内容，需要清理HTML标签获取纯文本
- **链接**: 以`<a href="...">`标签形式存在，但更多是纯文本格式
- **示例**: 
  - HTML格式: `<a href="https://pan.quark.cn/s/5881dd6b25e4" rel="ugc noopener nofollow" target="_blank">https://pan.quark.cn/s/5881dd6b25e4</a>`
  - 纯文本格式: `https://pan.quark.cn/s/5881dd6b25e4`

### 支持的网盘类型（quark4k专用）

| 网盘类型 | 域名特征 | 示例链接 | 密码关键词 |
|---------|----------|----------|------------|
| **夸克网盘** | `pan.quark.cn` | `https://pan.quark.cn/s/5881dd6b25e4` | 提取码、密码 |

**重要说明**: quark4k插件**主要支持夸克网盘**，所有链接都是`pan.quark.cn`域名，也可能包含其他网盘类型。

### 链接解析策略（quark4k专用）
1. **HTML清理**: 移除HTML标签，保留纯文本内容
2. **链接提取**: 从纯文本中提取**夸克网盘链接**（主要处理`pan.quark.cn`）
3. **密码匹配**: 匹配"提取码"或"密码"关键词
4. **位置关联**: 密码通常出现在链接附近的行中

## 插件开发指导

### 请求示例
```go
searchURL := fmt.Sprintf("https://quark4k.com/api/discussions?include=user%%2ClastPostedUser%%2CmostRelevantPost%%2CmostRelevantPost.user%%2Ctags%%2Ctags.parent%%2CfirstPost&filter[q]=%s&sort&page[offset]=%d&page[limit]=%d", url.QueryEscape(keyword), offset, PageSize)
```

### 请求头设置（参考pan666实现）
```go
req.Header.Set("User-Agent", getRandomUA()) // 使用随机UA避免反爬虫
req.Header.Set("X-Forwarded-For", generateRandomIP()) // 随机IP
req.Header.Set("Accept", "application/json, text/plain, */*")
req.Header.Set("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8")
req.Header.Set("Connection", "keep-alive")
req.Header.Set("Sec-Fetch-Dest", "empty")
req.Header.Set("Sec-Fetch-Mode", "cors")
req.Header.Set("Sec-Fetch-Site", "same-origin")
req.Header.Set("Referer", "https://quark4k.com/")
```

### SearchResult构建示例
```go
result := model.SearchResult{
    UniqueID: fmt.Sprintf("quark4k-%s", discussion.ID),
    Title:    discussion.Attributes.Title,
    Content:  extractTextFromHTML(post.Attributes.ContentHTML),
    Links:    extractLinksFromHTML(post.Attributes.ContentHTML),
    Tags:     extractTagsFromTitle(discussion.Attributes.Title),
    Channel:  "", // 插件搜索结果Channel为空
    Datetime: parseTime(discussion.Attributes.CreatedAt),
}
```

### HTML内容解析函数（参考pan666实现）
```go
// 清理HTML内容（参考pan666的cleanHTML函数）
func (p *Quark4KAsyncPlugin) cleanHTML(html string) string {
    // 移除<br>标签
    html = strings.ReplaceAll(html, "<br>", "\n")
    html = strings.ReplaceAll(html, "<br/>", "\n")
    html = strings.ReplaceAll(html, "<br />", "\n")
    
    // 移除其他HTML标签
    var result strings.Builder
    inTag := false
    
    for _, r := range html {
        if r == '<' {
            inTag = true
            continue
        }
        if r == '>' {
            inTag = false
            continue
        }
        if !inTag {
            result.WriteRune(r)
        }
    }
    
    // 处理HTML实体
    output := result.String()
    output = strings.ReplaceAll(output, "&amp;", "&")
    output = strings.ReplaceAll(output, "&lt;", "<")
    output = strings.ReplaceAll(output, "&gt;", ">")
    output = strings.ReplaceAll(output, "&quot;", "\"")
    output = strings.ReplaceAll(output, "&apos;", "'")
    output = strings.ReplaceAll(output, "&#39;", "'")
    output = strings.ReplaceAll(output, "&nbsp;", " ")
    
    // 处理多行空白
    lines := strings.Split(output, "\n")
    var cleanedLines []string
    
    for _, line := range lines {
        trimmed := strings.TrimSpace(line)
        if trimmed != "" {
            cleanedLines = append(cleanedLines, trimmed)
        }
    }
    
    return strings.Join(cleanedLines, "\n")
}

// 从文本中提取链接（参考pan666的extractLinksFromText函数）
func (p *Quark4KAsyncPlugin) extractLinksFromText(content string) []model.Link {
    var allLinks []model.Link
    
    lines := strings.Split(content, "\n")
    
    // 收集所有可能的链接信息
    var linkInfos []struct {
        link     model.Link
        position int
        category string
    }
    
    // 收集所有可能的密码信息
    var passwordInfos []struct {
        keyword   string
        position  int
        password  string
    }
    
    // 第一遍：查找所有的链接和密码
    for i, line := range lines {
        line = strings.TrimSpace(line)
        
        // 主要检查夸克网盘
        if strings.Contains(line, "pan.quark.cn") {
            url := p.extractURLFromText(line)
            if url != "" {
                linkInfos = append(linkInfos, struct {
                    link     model.Link
                    position int
                    category string
                }{
                    link:     model.Link{URL: url, Type: "quark"},
                    position: i,
                    category: "quark",
                })
            }
        }
        
        // 检查提取码/密码
        passwordKeywords := []string{"提取码", "密码"}
        for _, keyword := range passwordKeywords {
            if strings.Contains(line, keyword) {
                // 寻找冒号后面的内容
                colonPos := strings.Index(line, ":")
                if colonPos == -1 {
                    colonPos = strings.Index(line, "：")
                }
                
                if colonPos != -1 && colonPos+1 < len(line) {
                    password := strings.TrimSpace(line[colonPos+1:])
                    // 如果密码长度超过10个字符，可能不是密码
                    if len(password) <= 10 {
                        passwordInfos = append(passwordInfos, struct {
                            keyword   string
                            position  int
                            password  string
                        }{
                            keyword:   keyword,
                            position:  i,
                            password:  password,
                        })
                    }
                }
            }
        }
    }
    
    // 第二遍：将密码与链接匹配
    for i := range linkInfos {
        // 检查链接自身是否包含密码
        password := p.extractPasswordFromURL(linkInfos[i].link.URL)
        if password != "" {
            linkInfos[i].link.Password = password
            continue
        }
        
        // 查找最近的密码
        minDistance := 1000000
        var closestPassword string
        
        for _, pwInfo := range passwordInfos {
            // 夸克网盘匹配提取码或密码
            match := false
            
            if linkInfos[i].category == "quark" && (pwInfo.keyword == "提取码" || pwInfo.keyword == "密码") {
                match = true
            }
            
            if match {
                distance := abs(pwInfo.position - linkInfos[i].position)
                if distance < minDistance {
                    minDistance = distance
                    closestPassword = pwInfo.password
                }
            }
        }
        
        // 只有当距离较近时才认为是匹配的密码
        if minDistance <= 3 {
            linkInfos[i].link.Password = closestPassword
        }
    }
    
    // 收集所有有效链接
    for _, info := range linkInfos {
        allLinks = append(allLinks, info.link)
    }
    
    return allLinks
}
```

### 辅助函数（参考pan666实现）
```go
// 从文本中提取URL
func (p *Quark4KAsyncPlugin) extractURLFromText(text string) string {
    // 查找URL的起始位置
    urlPrefixes := []string{"http://", "https://"}
    start := -1
    
    for _, prefix := range urlPrefixes {
        pos := strings.Index(text, prefix)
        if pos != -1 {
            start = pos
            break
        }
    }
    
    if start == -1 {
        return ""
    }
    
    // 查找URL的结束位置
    end := len(text)
    endChars := []string{" ", "\t", "\n", "\"", "'", "<", ">", ")", "]", "}", ",", ";"}
    
    for _, char := range endChars {
        pos := strings.Index(text[start:], char)
        if pos != -1 && start+pos < end {
            end = start + pos
        }
    }
    
    return text[start:end]
}

// 从URL中提取密码
func (p *Quark4KAsyncPlugin) extractPasswordFromURL(url string) string {
    // 查找密码参数
    pwdParams := []string{"pwd=", "password=", "passcode=", "code="}
    
    for _, param := range pwdParams {
        pos := strings.Index(url, param)
        if pos != -1 {
            start := pos + len(param)
            end := len(url)
            
            // 查找参数结束位置
            for i := start; i < len(url); i++ {
                if url[i] == '&' || url[i] == '#' {
                    end = i
                    break
                }
            }
            
            if start < end {
                return url[start:end]
            }
        }
    }
    
    return ""
}

// 绝对值函数
func abs(n int) int {
    if n < 0 {
        return -n
    }
    return n
}

// 生成随机UA
func getRandomUA() string {
    userAgents := []string{
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Safari/605.1.15",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36",
    }
    return userAgents[rand.Intn(len(userAgents))]
}

// 生成随机IP
func generateRandomIP() string {
    return fmt.Sprintf("%d.%d.%d.%d", 
        rand.Intn(223)+1,  // 避免0和255
        rand.Intn(255),
        rand.Intn(255),
        rand.Intn(254)+1)  // 避免0
}
```

### 时间解析函数
```go
func (p *Quark4KAsyncPlugin) parseTime(timeStr string) time.Time {
    // 解析ISO 8601格式时间
    t, err := time.Parse(time.RFC3339, timeStr)
    if err != nil {
        return time.Now()
    }
    return t
}
```

## 数据结构定义

### API响应结构体
```go
type Quark4KResponse struct {
    Links    Quark4KLinks `json:"links"`
    Data     []Quark4KDiscussion `json:"data"`
    Included []Quark4KIncludedItem `json:"included"`
}

type Quark4KLinks struct {
    First string `json:"first"`
    Next  string `json:"next,omitempty"`
}

type Quark4KDiscussion struct {
    Type         string `json:"type"`
    ID           string `json:"id"`
    Attributes   Quark4KDiscussionAttributes `json:"attributes"`
    Relationships Quark4KRelationships `json:"relationships"`
}

type Quark4KDiscussionAttributes struct {
    Title           string    `json:"title"`
    Slug            string    `json:"slug"`
    CommentCount    int       `json:"commentCount"`
    ParticipantCount int      `json:"participantCount"`
    CreatedAt       string    `json:"createdAt"`
    LastPostedAt    string    `json:"lastPostedAt"`
    LastPostNumber  int       `json:"lastPostNumber"`
    IsApproved      bool      `json:"isApproved"`
    IsLocked        bool      `json:"isLocked"`
}

type Quark4KRelationships struct {
    MostRelevantPost Quark4KPostRef `json:"mostRelevantPost"`
}

type Quark4KPostRef struct {
    Data Quark4KPostData `json:"data"`
}

type Quark4KPostData struct {
    Type string `json:"type"`
    ID   string `json:"id"`
}

// Included 数组中可能包含多种类型（posts, users, tags）
type Quark4KIncludedItem struct {
    Type       string      `json:"type"`
    ID         string      `json:"id"`
    Attributes json.RawMessage `json:"attributes"` // 使用RawMessage以便灵活处理
}

// Quark4KPost 帖子内容（从Included中提取）
type Quark4KPost struct {
    Type       string `json:"type"`
    ID         string `json:"id"`
    Attributes Quark4KPostAttributes `json:"attributes"`
}

type Quark4KPostAttributes struct {
    Number           int    `json:"number"`
    CreatedAt        string `json:"createdAt"`
    ContentType      string `json:"contentType"`
    ContentHTML      string `json:"contentHtml"`
    RenderFailed     bool   `json:"renderFailed"`
    EditedAt         string `json:"editedAt,omitempty"`
    IsApproved       bool   `json:"isApproved"`
    LikesCount       int    `json:"likesCount"`
}
```

## 特殊处理逻辑

### 1. 讨论与回复关联
- 通过`relationships.mostRelevantPost.data.id`关联讨论和回复
- 需要在`included`数组中查找对应的回复内容
- `included`数组可能包含多种类型（posts, users, tags），需要过滤出posts类型

### 2. HTML内容清理
- 移除HTML标签获取纯文本内容
- 解码HTML实体（如`&lt;`、`&gt;`等）
- 提取链接时保留原始URL

### 3. 链接验证
- 验证链接是否为有效的网盘链接
- 过滤掉无效链接（如`javascript:`、`#`等）
- 提取链接中的密码信息

### 4. 标签提取
- 从讨论标题中提取关键词作为标签
- 可以基于内容类型、年份等信息生成标签
- 支持中文和英文标签

## 与pan666/bixin插件的相似性

| 特性 | quark4k | pan666/bixin | 说明 |
|------|---------|-------------|------|
| **数据源** | 论坛讨论API | 论坛讨论API | 使用相同的论坛系统 |
| **API结构** | 相同 | 相同 | JSON结构完全一致 |
| **链接解析** | 文本解析 | 文本解析 | 都需要从HTML清理后的文本中提取 |
| **主要网盘** | 夸克网盘 | 移动云盘/多种网盘 | 主要提供不同网盘链接 |
| **密码匹配** | 位置关联 | 位置关联 | 使用相同的密码匹配策略 |
| **过滤策略** | 跳过Service层过滤 | 跳过Service层过滤 | 都使用`NewBaseAsyncPluginWithFilter` |

## 与其他插件的差异

| 特性 | quark4k/pan666/bixin | 其他插件 | 说明 |
|------|---------------------|----------|------|
| **数据源** | 论坛讨论API | 网盘搜索API | 需要解析HTML内容 |
| **链接格式** | 纯文本格式 | 直接URL字符串 | 需要从文本中提取 |
| **内容结构** | 讨论+回复 | 直接资源信息 | 需要关联处理 |
| **链接验证** | 必需 | 可选 | 论坛可能包含无效链接 |
| **过滤策略** | 跳过Service层过滤 | 启用Service层过滤 | 论坛内容需要宽泛搜索 |

## 注意事项

1. **HTML解析**: 需要正确处理HTML标签和实体，参考pan666的cleanHTML函数
2. **链接提取**: 主要从纯文本中提取链接，而非HTML标签
3. **内容关联**: 需要将讨论和回复内容正确关联
4. **链接验证**: 论坛内容可能包含无效链接，需要过滤
5. **时间解析**: 使用ISO 8601格式解析时间
6. **错误处理**: API可能返回空数据或格式错误
7. **反爬虫**: 使用随机UA和IP避免反爬虫检测
8. **密码匹配**: 使用位置关联策略匹配密码和链接
9. **Included数组处理**: 需要区分posts、users、tags等不同类型

## 开发建议

- **优先级设置**: 建议设置为优先级3，数据质量一般
- **Service层过滤**: 跳过Service层过滤，使用`NewBaseAsyncPluginWithFilter("quark4k", 3, true)`
- **HTML处理**: 重点处理HTML内容的解析和清理，参考pan666实现
- **链接提取**: 实现robust的链接提取和验证机制，**主要处理夸克网盘**（pan.quark.cn）
- **缓存策略**: 建议使用较短的缓存TTL，论坛内容更新频繁
- **错误日志**: 详细记录HTML解析和链接提取的错误信息
- **基于pan666/bixin**: 可以直接基于pan666或bixin插件进行修改，主要更改API URL和插件名称

## API调用示例

### 搜索请求示例
```bash
curl "https://quark4k.com/api/discussions?include=user%2ClastPostedUser%2CmostRelevantPost%2CmostRelevantPost.user%2Ctags%2Ctags.parent%2CfirstPost&filter[q]=遮天&sort&page[offset]=0&page[limit]=50" \
  -H "Referer: https://quark4k.com/" \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
```

### 完整流程示例
1. **发送搜索请求**: 获取讨论列表和回复内容
2. **解析讨论数据**: 提取标题、时间等基本信息
3. **关联回复内容**: 通过ID关联讨论和回复（从included数组中查找posts类型）
4. **清理HTML内容**: 移除HTML标签，获取纯文本
5. **提取网盘链接**: 从纯文本中提取**夸克网盘链接**（主要处理pan.quark.cn）
6. **匹配密码**: 使用位置关联策略匹配密码和链接
7. **验证链接有效性**: 过滤无效链接
8. **构建搜索结果**: 转换为Limitless Search标准格式
9. **返回结果**: 包含标题、内容、链接等信息

### 插件实现建议
```go
// 基于pan666/bixin插件进行修改
func NewQuark4KAsyncPlugin() *Quark4KAsyncPlugin {
    return &Quark4KAsyncPlugin{
        BaseAsyncPlugin: plugin.NewBaseAsyncPluginWithFilter("quark4k", 3, true), // 跳过Service层过滤
        retries:         MaxRetries,
    }
}

// 主要修改点：
// 1. 更改API URL: "https://quark4k.com/api/discussions"
// 2. 更改插件名称: "quark4k"
// 3. 简化链接提取：主要处理夸克网盘（pan.quark.cn）
// 4. 简化密码匹配：只匹配"提取码"和"密码"关键词
// 5. 保持相同的HTML解析逻辑
// 6. 处理included数组时区分不同类型
```
