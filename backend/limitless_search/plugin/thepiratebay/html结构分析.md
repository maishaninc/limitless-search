# ThePirateBay 网站搜索结果HTML结构分析

## 网站概述

ThePirateBay (tpirbay.xyz) 是一个专门提供BitTorrent种子资源的搜索网站，**只提供磁力链接**，不提供网盘下载链接。搜索结果以表格形式展示，包含详细的种子信息。

## 搜索URL格式

```
https://tpirbay.xyz/search/{关键词}/{页码}/99/0
```

示例：
- 搜索"rick and morty"第1页：`https://tpirbay.xyz/search/rick%20and%20morty/1/99/0`
- 搜索"rick and morty"第2页：`https://tpirbay.xyz/search/rick%20and%20morty/2/99/0`

## 页面整体结构

搜索结果页面的主要内容位于`<table id="searchResult">`表格中，每个搜索结果占据一行`<tr>`元素。

```html
<table id="searchResult">
    <thead id="tableHead">
        <!-- 表头 -->
    </thead>
    <tr>
        <!-- 单个搜索结果 -->
    </tr>
    <tr class="alt">
        <!-- 另一个搜索结果（交替样式） -->
    </tr>
    <!-- 更多结果... -->
</table>
```

## 单个搜索结果结构

每个搜索结果包含4列信息：

### 1. 分类信息（第1列）

分类信息位于`.vertTh`元素中：

```html
<td class="vertTh">
    <center>
        <a href="https://tpirbay.xyz/browse/200" title="More from this category">Video</a><br>
        (<a href="https://tpirbay.xyz/browse/208" title="More from this category">HD - TV shows</a>)
    </center>
</td>
```

- **主分类**：如`Video`、`Audio`、`Applications`等
- **子分类**：如`HD - TV shows`、`Movies`、`Music`等

### 2. 种子详情（第2列）

这是主要的信息列，包含多个子元素：

#### 2.1 标题和详情页链接

```html
<div class="detName">
    <a href="https://tpirbay.xyz/torrent/79983434/Rick_and_Morty_S08E10_1080p_AMZN_WEB-DL_DDP5_1_H_264-BiOMA" 
       class="detLink" 
       title="Details for Rick and Morty S08E10 1080p AMZN WEB-DL DDP5 1 H 264-BiOMA">
        Rick and Morty S08E10 1080p AMZN WEB-DL DDP5 1 H 264-BiOMA
    </a>
</div>
```

- **详情页URL格式**：`https://tpirbay.xyz/torrent/{种子ID}/{种子名称}`
- **种子ID**：如`79983434`
- **标题**：完整的种子名称

#### 2.2 磁力链接

```html
<a href="magnet:?xt=urn:btih:BA0E267579FA62981795DCC059FB61E1AF5CA429&dn=Rick+and+Morty+S08E10+1080p+AMZN+WEB-DL+DDP5+1+H+264-BiOMA&tr=..." 
   title="Download this torrent using magnet">
    <img src="https://tpirbay.xyz/static/img/icon-magnet.gif" alt="Magnet link" height="12" width="12">
</a>
```

- **磁力链接**：以`magnet:?xt=urn:btih:`开头的完整磁力链接
- **识别方式**：通过`href`属性中以`magnet:`开头的链接

#### 2.3 用户信息和种子元数据

```html
<font class="detDesc">
    Uploaded 07-28&nbsp;05:35, Size 805.95&nbsp;MiB, ULed by  
    <a class="detDesc" href="https://tpirbay.xyz/user/jajaja/" title="Browse jajaja">jajaja</a> 
</font>
```

包含信息：
- **上传日期**：**有两种格式**
  - `MM-DD&nbsp;HH:MM` - 最近上传，只有月日时分，无年份
  - `MM-DD&nbsp;YYYY` - 较早上传，有月日年份，无时分
- **文件大小**：如`805.95&nbsp;MiB`、`2.3&nbsp;GiB`等
- **上传者**：用户名和链接

### 3. 种子数（第3列）

```html
<td align="right">5679</td>
```

显示当前种子的Seeders数量（做种者数量）。

### 4. 下载数（第4列）

```html
<td align="right">2609</td>
```

显示当前种子的Leechers数量（下载者数量）。

## 分页导航

页面底部包含分页链接：

```html
<td colspan="9" style="text-align:center;">
    <b>1</b>&nbsp;
    <a href="/search/rick and morty/2/99/0">2</a>&nbsp;
    <a href="/search/rick and morty/3/99/0">3</a>&nbsp;
    <!-- 更多页码... -->
</td>
```

## 提取逻辑

### 搜索结果页面提取逻辑

1. **定位搜索结果表格**：`table#searchResult`
2. **遍历每行结果**：`tr`元素（跳过表头）
3. **对于每个结果行**：
   - 提取分类信息：`.vertTh a`元素的文本
   - 提取标题：`.detName a.detLink`的文本和链接
   - 从详情链接中提取种子ID：URL路径中的数字部分
   - 提取磁力链接：查找`href`属性以`magnet:`开头的链接
   - 提取上传时间：`.detDesc`文本中的时间信息
   - 提取文件大小：`.detDesc`文本中的Size信息
   - 提取上传者：`.detDesc a`元素
   - 提取种子数和下载数：后两列的数字

### 数据字段映射

根据Limitless Search插件规范，ThePirateBay的数据映射如下：

| 字段 | 来源 | 示例 |
|------|------|------|
| `UniqueID` | `thepiratebay-{种子ID}` | `thepiratebay-79983434` |
| `Title` | `.detName a.detLink`文本 | `Rick and Morty S08E10 1080p AMZN WEB-DL...` |
| `Content` | 文件大小 + 上传时间组合 | `Size: 805.95 MiB, Uploaded: 07-28 05:35` |
| `Links` | 磁力链接数组 | `[{type: "magnet", url: "magnet:?xt=..."}]` |
| `Tags` | 分类信息数组 | `["Video", "HD - TV shows"]` |
| `Channel` | **必须为空字符串** | `""` |
| `Datetime` | 上传时间（需解析两种格式） | 解析后的完整时间戳 |

## 注意事项

1. **网络类型**：ThePirateBay只提供磁力链接，链接类型固定为`"magnet"`
2. **时间格式**：上传时间有**两种格式**需要区别处理：
   - `MM-DD HH:MM` - 最近上传（当年），需要补充当前年份
   - `MM-DD YYYY` - 历史上传，已包含年份信息
3. **分页处理**：支持多页搜索，页码从1开始
4. **交替样式**：表格行可能有`class="alt"`的交替样式，不影响数据提取
5. **VIP用户标识**：某些结果可能有VIP用户标识，可忽略
6. **反爬虫**：需要设置合适的User-Agent和请求头
7. **请求频率**：建议控制请求频率，避免被封禁

## 错误处理

1. **无搜索结果**：当表格中只有表头时，返回空结果
2. **页面格式变化**：当关键元素无法定位时，记录错误并返回空结果
3. **磁力链接缺失**：如果某个结果没有磁力链接，跳过该结果
4. **网络超时**：设置合理的超时时间和重试机制

## 示例代码结构

```go
// 提取单个搜索结果
func extractTorrentInfo(row *html.Node) model.SearchResult {
    result := model.SearchResult{
        UniqueID: fmt.Sprintf("thepiratebay-%s", torrentID),
        Title:    extractTitle(row),
        Content:  extractContentInfo(row),
        Links:    []model.Link{{Type: "magnet", URL: magnetURL}},
        Tags:     extractCategories(row),
        Channel:  "", // 插件搜索结果必须为空
        Datetime: parseUploadTime(row),
    }
    return result
}

// 解析上传时间的两种格式
func parseUploadTime(timeStr string) time.Time {
    // 去除&nbsp;
    timeStr = strings.ReplaceAll(timeStr, "&nbsp;", " ")
    
    // 格式1: "07-28 05:35" (当年)
    if matched, _ := regexp.MatchString(`^\d{2}-\d{2} \d{2}:\d{2}$`, timeStr); matched {
        currentYear := time.Now().Year()
        fullTimeStr := fmt.Sprintf("%d-%s", currentYear, timeStr)
        if t, err := time.Parse("2006-01-02 15:04", fullTimeStr); err == nil {
            return t
        }
    }
    
    // 格式2: "10-30 2023" (历史)
    if matched, _ := regexp.MatchString(`^\d{2}-\d{2} \d{4}$`, timeStr); matched {
        if t, err := time.Parse("01-02 2006", timeStr); err == nil {
            return t
        }
    }
    
    // 默认返回当前时间
    return time.Now()
}
```

## 搜索结果质量

ThePirateBay作为磁力资源站点，建议设置插件优先级为：
- **优先级3**（普通质量）：资源丰富但质量参差不齐
- 或**优先级2**（良好质量）：如果资源质量和时效性较好

## 插件实现建议

1. **并发控制**：避免过高的并发请求
2. **缓存策略**：磁力链接相对稳定，可以设置较长的缓存时间
3. **关键词过滤**：使用`plugin.FilterResultsByKeyword`提高结果相关性
4. **错误重试**：实现重试机制处理网络不稳定问题