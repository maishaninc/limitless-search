# Quarksoo HTML 结构分析

## 基本信息
- **数据源类型**: HTML 页面  
- **API URL格式**: `https://quarksoo.cc/search.php?q={关键词}`
- **请求方法**: `GET`
- **Content-Type**: `text/html`
- **特殊说明**: 该网站返回 HTML 格式的搜索结果页面，需要从 HTML 表格中解析剧名和网盘链接

## HTML 页面结构

### 搜索请求
```
GET https://quarksoo.cc/search.php?q=华山论剑
```

### HTML 响应结构

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>搜索完整剧名</title>
</head>
<body>
    <h1>搜索完整剧名</h1>
    <form method="get" action="">
        <input type="text" name="q" value="华山论剑">
        <button type="submit">搜索</button>
    </form>
    
    <h2>搜索结果：4 条</h2>
    <table>
        <tr>
            <th>剧名</th>
            <th>网盘链接</th>
        </tr>
        <tr>
            <td>华山论剑之九阴真经</td>
            <td>
                <a href="https://pan.qoark.cn/s/hslj" target="_blank">
                    夸克网盘
                </a>
            </td>
        </tr>
        <tr>
            <td>华山论剑之东邪西毒</td>
            <td>
                <a href="https://pan.qoark.cn/s/dxxd" target="_blank">
                    夸克网盘
                </a>
            </td>
        </tr>
        <!-- 更多结果... -->
    </table>
</body>
</html>
```

## 数据结构分析

### 表格结构
- **容器**: `<table>` 标签
- **表头**: `<tr><th>剧名</th><th>网盘链接</th></tr>`（第一行，可忽略）
- **数据行**: `<tr><td>剧名</td><td><a href="链接">夸克网盘</a></td></tr>`

### 数据提取规则

| 数据项 | HTML 位置 | 提取方法 |
|--------|----------|----------|
| **剧名** | `<tr>` 内第一个 `<td>` | 提取文本内容 |
| **网盘链接** | `<tr>` 内第二个 `<td>` 中的 `<a href="...">` | 提取 href 属性值 |

### 网盘链接格式

| 网盘类型 | 域名特征 | 示例链接 | 说明 |
|---------|----------|----------|------|
| **夸克网盘** | `pan.qoark.cn` | `https://pan.qoark.cn/s/hslj` | 主要网盘类型 |

**注意**: 
- 域名是 `pan.qoark.cn`（注意是 qoark，不是 quark）
- 但按照系统标准，这应该识别为 `quark` 类型
- 需要在识别时同时支持 `pan.quark.cn` 和 `pan.qoark.cn`

## 插件所需字段映射

| HTML 字段 | 目标字段 | 说明 |
|-----------|----------|------|
| 第一个 `<td>` 文本 | `Title` | 剧名 |
| `<a href="...">` 的 href | `Links[].URL` | 网盘链接 |
| `""` | `Links[].Password` | 无密码（默认为空） |
| `"quark"` | `Links[].Type` | 网盘类型（夸克网盘） |
| `""` | `Channel` | 插件搜索结果Channel为空 |
| `[]` | `Tags` | 标签数组（可选） |
| 当前时间 | `Datetime` | 发布时间（页面中无时间信息，使用当前时间） |
| `quarksoo-{行号}` | `UniqueID` | 唯一ID |

## HTML 解析策略

### 方法1: 正则表达式（推荐）

使用正则表达式匹配表格行：
```go
// 匹配表格行的正则表达式
pattern := `<tr>\s*<td>([^<]+)</td>\s*<td>\s*<a[^>]*href\s*=\s*["']([^"']+)["'][^>]*>`

// 提取所有匹配
re := regexp.MustCompile(pattern)
matches := re.FindAllStringSubmatch(htmlContent, -1)

for _, match := range matches {
    title := strings.TrimSpace(match[1])      // 剧名
    linkURL := strings.TrimSpace(match[2])    // 网盘链接
}
```

### 方法2: 字符串分割（备选）

```go
// 按 <tr> 分割
rows := strings.Split(htmlContent, "<tr>")

for _, row := range rows {
    // 跳过表头
    if strings.Contains(row, "<th>") {
        continue
    }
    
    // 提取第一个 <td> 内容（剧名）
    // 提取 <a href="..."> 中的链接
}
```

### 链接验证和处理

1. **链接格式验证**: 确保链接包含 `pan.qoark.cn` 或 `pan.quark.cn`
2. **网盘类型识别**: 识别为 `quark` 类型
3. **URL 清理**: 移除多余的空白字符和参数

## 插件开发指导

### 请求示例
```go
searchURL := fmt.Sprintf("https://quarksoo.cc/search.php?q=%s", url.QueryEscape(keyword))
```

### 请求头设置
```go
req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")
req.Header.Set("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8")
req.Header.Set("Connection", "keep-alive")
req.Header.Set("Referer", "https://quarksoo.cc/")
```

### SearchResult构建示例
```go
result := model.SearchResult{
    UniqueID: fmt.Sprintf("quarksoo-%d", index),
    Title:    title,
    Links: []model.Link{
        {
            Type:     "quark",
            URL:      linkURL,
            Password: "", // 无密码
        },
    },
    Channel:  "", // 插件搜索结果Channel为空
    Datetime: time.Now(), // 页面无时间信息，使用当前时间
}
```

### HTML解析函数示例
```go
// 从HTML中解析搜索结果
func parseSearchResults(htmlContent string, keyword string) []model.SearchResult {
    var results []model.SearchResult
    
    // 提前过滤：检查标题是否包含关键词
    lowerKeyword := strings.ToLower(keyword)
    keywords := strings.Fields(lowerKeyword)
    
    // 使用正则表达式提取表格行
    pattern := `<tr>\s*<td>([^<]+)</td>\s*<td>\s*<a[^>]*href\s*=\s*["']([^"']+)["'][^>]*>`
    re := regexp.MustCompile(pattern)
    matches := re.FindAllStringSubmatch(htmlContent, -1)
    
    for i, match := range matches {
        if len(match) < 3 {
            continue
        }
        
        title := strings.TrimSpace(match[1])
        linkURL := strings.TrimSpace(match[2])
        
        // 验证链接是否为夸克网盘
        if !strings.Contains(linkURL, "pan.qoark.cn") && !strings.Contains(linkURL, "pan.quark.cn") {
            continue
        }
        
        // 检查标题是否包含关键词
        lowerTitle := strings.ToLower(title)
        titleMatched := true
        for _, kw := range keywords {
            if !strings.Contains(lowerTitle, kw) {
                titleMatched = false
                break
            }
        }
        if !titleMatched {
            continue
        }
        
        // 识别网盘类型
        linkType := "quark"
        
        result := model.SearchResult{
            UniqueID: fmt.Sprintf("quarksoo-%d", i),
            Title:    title,
            Links: []model.Link{
                {
                    Type:     linkType,
                    URL:      linkURL,
                    Password: "",
                },
            },
            Channel:  "",
            Datetime: time.Now(),
        }
        
        results = append(results, result)
    }
    
    return results
}
```

## 特殊处理逻辑

### 1. 标题过滤
- 在解析时直接检查标题是否包含关键词
- 支持多关键词搜索（空格分隔）
- 不区分大小写

### 2. 链接验证
- 验证链接是否包含 `pan.qoark.cn` 或 `pan.quark.cn`
- 过滤无效链接

### 3. 网盘类型识别
- `pan.qoark.cn` 和 `pan.quark.cn` 都识别为 `quark` 类型

### 4. 去重处理
- 基于 `UniqueID` 进行去重
- `UniqueID` 格式: `quarksoo-{行号}`

## 与其他插件的差异

| 特性 | quarksoo | 其他插件 | 说明 |
|------|---------|----------|------|
| **数据源** | HTML 页面 | JSON API | 需要解析 HTML |
| **链接格式** | HTML 表格 | JSON 对象 | 需要从 HTML 中提取 |
| **解析方法** | 正则表达式 | JSON解析 | HTML 解析更复杂 |
| **时间信息** | 无 | 有 | 使用当前时间 |

## 注意事项

1. **HTML 解析**: 使用正则表达式解析 HTML，注意处理各种格式变化
2. **链接验证**: 确保提取的链接都是有效的夸克网盘链接
3. **标题过滤**: 在解析时就进行标题过滤，提高效率
4. **错误处理**: HTML 格式可能变化，需要健壮的错误处理
5. **反爬虫**: 使用随机 UA 避免反爬虫检测
6. **去重**: 确保结果不重复

## 开发建议

- **优先级设置**: 建议设置为优先级3，数据质量一般
- **Service层过滤**: 启用Service层过滤，使用 `NewBaseAsyncPlugin("quarksoo", 3)`
- **HTML解析**: 使用正则表达式解析，注意处理边界情况
- **链接提取**: 只处理夸克网盘链接（`pan.qoark.cn` 或 `pan.quark.cn`）
- **缓存策略**: 建议使用较短的缓存TTL
- **错误日志**: 详细记录HTML解析错误信息

## API调用示例

### 搜索请求示例
```bash
curl "https://quarksoo.cc/search.php?q=华山论剑" \
  -H "Referer: https://quarksoo.cc/" \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
```

### 完整流程示例
1. **发送搜索请求**: 获取 HTML 搜索结果页面
2. **解析 HTML**: 使用正则表达式提取表格数据
3. **提取剧名和链接**: 从 `<tr>` 行中提取剧名和网盘链接
4. **标题过滤**: 检查标题是否包含关键词
5. **链接验证**: 验证链接是否为有效的夸克网盘链接
6. **构建搜索结果**: 转换为Limitless Search标准格式
7. **返回结果**: 包含标题、链接等信息
