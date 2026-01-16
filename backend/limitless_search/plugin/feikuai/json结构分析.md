# Feikuai API 数据结构分析

## 基本信息
- **数据源类型**: JSON API  
- **网站名称**: 飞快TV (feikuai.tv)
- **API URL格式**: `https://feikuai.tv/t_search/bm_search.php?kw={URL编码的关键词}`
- **数据特点**: 磁力链接搜索API，提供结构化的BT/磁力资源数据
- **特殊说明**: 专注于磁力链接，包含详细的种子信息（做种数、下载数等）

## API响应结构

### 顶层结构
```json
{
    "code": 0,                    // 状态码：0表示成功
    "msg": "ok",                  // 响应消息
    "keyword": "唐朝诡事录之长安", // 搜索关键词
    "count": 8,                   // 搜索结果总数
    "items": []                   // 数据列表数组
}
```

### `items`数组中的数据项结构
```json
{
    "content_id": null,           // 内容ID（通常为null）
    "title": "【高清剧集网发布 www.BPHDTV.com】唐朝诡事录之长安[第07-08集][国语音轨+简繁英字幕].2025.2160p.IQ.WEB-DL.H265.DDP5.1-BlackTV",
    "type": "movie",              // 资源类型（通常为movie）
    "year": null,                 // 年份（通常为null）
    "torrents": []                // 磁力链接数组
}
```

### `torrents`数组中的种子数据结构
```json
{
    "info_hash": "c3a3a53c2408396d64450046361f00650cb9e53e",  // 种子哈希值
    "magnet": "magnet:?xt=urn:btih:C3A3A53C2408396D64450046361F00650CB9E53E&dn=Strange.Tales.of.Tang.Dynasty.S03E07.2025.2160p.IQ.WEB-DL.H265.DDP5.1-BlackTV.mkv&xl=2458041664",
    "name": "Strange.Tales.of.Tang.Dynasty.S03E07.2025.2160p.IQ.WEB-DL.H265.DDP5.1-BlackTV.mkv",
    "size_bytes": 2458041664,     // 文件大小（字节）
    "size_gb": 2.29,              // 文件大小（GB）
    "seeders": 4,                 // 做种数
    "leechers": 4,                // 下载数
    "published_at": "2025-11-18 00:54:20.659664+00",  // 发布时间（带时区）
    "published_ago": "约 8 小时前",  // 发布时间（人类可读）
    "file_path": "Strange.Tales.of.Tang.Dynasty.S03E07.2025.2160p.IQ.WEB-DL.H265.DDP5.1-BlackTV.mkv",
    "file_ext": "mkv"             // 文件扩展名
}
```

## 插件所需字段映射

| 源字段 | 目标字段 | 说明 |
|--------|----------|------|
| `content_id` 或基于 `info_hash` | `UniqueID` | 格式: `feikuai-{info_hash}` 或 `feikuai-{index}` |
| `title` | `Title` | 资源标题（包含发布组信息） |
| `title` + `name` + `size_gb` + `seeders` + `leechers` | `Content` | 组合描述信息 |
| 从 `title` 或 `name` 提取 | `Tags` | 标签数组（如分辨率、格式等） |
| `torrents` | `Links` | 解析为Link数组，每个种子对应一个Link |
| `""` | `Channel` | 插件搜索结果Channel为空 |
| `published_at` | `Datetime` | 磁力链接发布时间 |

## 下载链接解析

### 磁力链接特点
- **链接类型**: 全部为 `magnet` 类型
- **无需密码**: 磁力链接不需要提取码
- **多种子支持**: 一个资源（item）可能包含多个种子（torrents）

### 磁力链接格式
```
magnet:?xt=urn:btih:{INFO_HASH}&dn={URL编码的文件名}&xl={文件大小}
```

**示例**:
```
magnet:?xt=urn:btih:C3A3A53C2408396D64450046361F00650CB9E53E&dn=Strange.Tales.of.Tang.Dynasty.S03E07.2025.2160p.IQ.WEB-DL.H265.DDP5.1-BlackTV.mkv&xl=2458041664
```

### 种子信息提取
从 `torrents` 数组中，每个种子可提取以下信息：
- **磁力链接**: `magnet` 字段
- **文件名**: `name` 或 `file_path` 字段
- **文件大小**: `size_gb` (GB) 或 `size_bytes` (字节)
- **做种/下载数**: `seeders` / `leechers`
- **发布时间**: `published_at` 或 `published_ago`

## work_title 处理规则

根据HTML结构分析中的规则，需要对每个磁力链接的标题进行处理：

### 处理流程
1. **提取标题**: 从 `name` 或 `file_path` 字段获取文件名
2. **清洗标题**:
   - 去除文件扩展名（`.mkv`, `.mp4` 等）
   - 去除文件大小信息（如果在文件名中）
3. **关键词检查**: 
   - 检查清洗后的文件名是否包含搜索关键词
   - 或检查是否包含 `title` 字段中的关键词
4. **拼接规则**:
   - **包含关键词**: 直接使用清洗后的文件名
   - **不包含关键词**: 拼接为 `{搜索关键词}-{清洗后文件名}`

### 示例

**场景1: 英文文件名，不包含中文关键词**
```
搜索关键词: "唐朝诡事录之长安"
文件名: "Strange.Tales.of.Tang.Dynasty.S03E07.2025.2160p.IQ.WEB-DL.H265.DDP5.1-BlackTV.mkv"
清洗后: "Strange.Tales.of.Tang.Dynasty.S03E07.2025.2160p.IQ.WEB-DL.H265.DDP5.1-BlackTV"
work_title: "唐朝诡事录之长安-Strange.Tales.of.Tang.Dynasty.S03E07.2025.2160p.IQ.WEB-DL.H265.DDP5.1-BlackTV"
```

**场景2: 中文文件名，包含关键词**
```
搜索关键词: "唐朝诡事录之长安"
文件名: "唐朝诡事录之长安.Horror.Stories.of.Tang.Dynasty.S03E05.2022.2160p.WEB-DL.H265.DDP5.1-ColorTV.mkv"
清洗后: "唐朝诡事录之长安.Horror.Stories.of.Tang.Dynasty.S03E05.2022.2160p.WEB-DL.H265.DDP5.1-ColorTV"
work_title: "唐朝诡事录之长安.Horror.Stories.of.Tang.Dynasty.S03E05.2022.2160p.WEB-DL.H265.DDP5.1-ColorTV"
(包含关键词，无需拼接)
```

## 插件开发指导

### 请求示例
```go
searchURL := fmt.Sprintf("https://feikuai.tv/t_search/bm_search.php?kw=%s", url.QueryEscape(keyword))
```

### SearchResult构建示例
```go
// 遍历items
for _, item := range apiResponse.Items {
    // 遍历每个item的torrents
    for _, torrent := range item.Torrents {
        // 清洗文件名
        cleanedName := cleanFileName(torrent.Name)
        
        // 检查是否包含关键词并拼接
        workTitle := buildWorkTitle(keyword, cleanedName)
        
        // 构建SearchResult
        result := model.SearchResult{
            UniqueID: fmt.Sprintf("feikuai-%s", torrent.InfoHash),
            Title:    item.Title,  // 或使用workTitle
            Content:  buildContent(item, torrent),
            Links:    []model.Link{
                {
                    Type:      "magnet",
                    URL:       torrent.Magnet,
                    Password:  "",  // 磁力链接无密码
                    Datetime:  parseTime(torrent.PublishedAt),
                    WorkTitle: workTitle,  // ⭐ 重要：独立标题
                },
            },
            Tags:     extractTags(item.Title, torrent.Name),
            Channel:  "", // 插件搜索结果Channel为空
            Datetime: parseTime(torrent.PublishedAt),
        }
        results = append(results, result)
    }
}
```

### 关键函数示例

#### 1. 清洗文件名
```go
func cleanFileName(fileName string) string {
    // 去除文件扩展名
    ext := filepath.Ext(fileName)
    if ext != "" {
        fileName = strings.TrimSuffix(fileName, ext)
    }
    
    // 去除文件大小信息（如果存在）
    fileName = regexp.MustCompile(`\s*·\s*[\d.]+\s*[KMGT]B\s*$`).ReplaceAllString(fileName, "")
    
    return strings.TrimSpace(fileName)
}
```

#### 2. 构建work_title
```go
func buildWorkTitle(keyword, cleanedName string) string {
    // 检查是否包含关键词（忽略大小写和标点）
    if containsKeywords(keyword, cleanedName) {
        return cleanedName
    }
    
    // 不包含关键词，需要拼接
    return fmt.Sprintf("%s-%s", keyword, cleanedName)
}

func containsKeywords(keyword, text string) bool {
    // 简单实现：分词后检查
    keywords := splitKeywords(keyword)
    for _, kw := range keywords {
        if strings.Contains(strings.ToLower(text), strings.ToLower(kw)) {
            return true
        }
    }
    return false
}
```

#### 3. 构建内容描述
```go
func buildContent(item FeikuaiAPIItem, torrent Torrent) string {
    var contentParts []string
    
    contentParts = append(contentParts, fmt.Sprintf("文件名: %s", torrent.Name))
    contentParts = append(contentParts, fmt.Sprintf("大小: %.2f GB", torrent.SizeGB))
    contentParts = append(contentParts, fmt.Sprintf("做种: %d", torrent.Seeders))
    contentParts = append(contentParts, fmt.Sprintf("下载: %d", torrent.Leechers))
    contentParts = append(contentParts, fmt.Sprintf("发布: %s", torrent.PublishedAgo))
    
    return strings.Join(contentParts, " | ")
}
```

#### 4. 提取标签
```go
func extractTags(title, fileName string) []string {
    var tags []string
    
    // 提取分辨率
    if strings.Contains(title, "2160p") || strings.Contains(fileName, "2160p") {
        tags = append(tags, "4K")
    } else if strings.Contains(title, "1080p") || strings.Contains(fileName, "1080p") {
        tags = append(tags, "1080p")
    }
    
    // 提取编码格式
    if strings.Contains(title, "H265") || strings.Contains(fileName, "H265") {
        tags = append(tags, "H265")
    }
    
    // 提取HDR
    if strings.Contains(title, "HDR") || strings.Contains(fileName, "HDR") {
        tags = append(tags, "HDR")
    }
    
    return tags
}
```

#### 5. 时间解析
```go
func parseTime(timeStr string) time.Time {
    // 解析ISO 8601格式: "2025-11-18 00:54:20.659664+00"
    t, err := time.Parse("2006-01-02 15:04:05.999999-07", timeStr)
    if err != nil {
        // 解析失败，返回当前时间
        return time.Now()
    }
    return t
}
```

## API字段映射表

| API字段 | Link对象字段 | 提取方法 | 示例 |
|---------|-------------|---------|------|
| `magnet` | `URL` | 直接使用 | `magnet:?xt=urn:btih:...` |
| - | `Type` | 固定值 | `magnet` |
| - | `Password` | 固定值 | `""` (空字符串) |
| `published_at` | `Datetime` | 时间解析 | `2025-11-18T00:54:20Z` |
| `name` | `WorkTitle` | 清洗+关键词检查+拼接 | `唐朝诡事录之长安-Strange.Tales...` |

## 与其他插件的差异

| 特性 | feikuai | wanou/ouge/zhizhen | huban | 说明 |
|------|---------|-------------------|-------|------|
| **链接类型** | 仅磁力链接 | 网盘链接 | 网盘链接 | 专注BT资源 |
| **多链接** | 一对多 | 多对一 | 多对多 | 一个资源多个种子 |
| **种子信息** | 详细 | 无 | 无 | 包含做种数等 |
| **work_title** | 必需拼接 | 可选 | 可选 | 文件名通常不含中文 |
| **时间信息** | 精确 | 当前时间 | 当前时间 | API提供发布时间 |

## 注意事项

1. **磁力链接专用**: 此API仅返回磁力链接，不包含网盘链接
2. **多种子处理**: 一个资源可能有多个种子，需要全部提取
3. **文件名处理**: 文件名通常是英文，需要拼接中文关键词
4. **时区处理**: `published_at` 包含时区信息（+00），需要正确解析
5. **做种数排序**: 建议按做种数（seeders）降序排序，优先显示热门资源
6. **空值处理**: `content_id` 和 `year` 通常为 null，需要处理
7. **标题清洗**: `title` 字段包含发布组信息（如【高清剧集网发布 www.BPHDTV.com】），可选择性去除

## 开发建议

1. **独立实现**: 不能复用网盘类插件的代码，需要专门处理磁力链接
2. **work_title关键**: 文件名拼接中文关键词是核心功能
3. **种子排序**: 实现按做种数排序，提升用户体验
4. **时间解析**: 正确解析带时区的ISO 8601时间格式
5. **内容丰富**: 充分利用API提供的文件大小、做种数等信息
6. **错误处理**: API可能返回 `code != 0` 的错误状态
7. **测试覆盖**: 重点测试中英文文件名的work_title拼接逻辑
