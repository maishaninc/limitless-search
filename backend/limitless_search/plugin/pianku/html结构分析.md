# 片库网 (btnull.pro) 网站搜索结果HTML结构分析

## 网站信息

- **网站名称**: 片库网 BTNULL
- **网站域名**: btnull.pro  
- **搜索URL格式**: `https://btnull.pro/search/-------------.html?wd={关键词}`
- **详情页URL格式**: `https://btnull.pro/movie/{ID}.html`
- **播放页URL格式**: `https://btnull.pro/play/{ID}-{源ID}-{集ID}.html`
- **主要特点**: 提供电影、剧集、动漫等多类型影视资源，支持在线播放

## 搜索结果页面结构

搜索结果页面的主要内容位于`.sr_lists`元素内，每个搜索结果项包含在`dl`元素中。

```html
<div class="sr_lists">
    <dl>
        <dt><a href="/movie/63114.html"><img src="..." referrerpolicy="no-referrer"></a></dt>
        <dd>
            <!-- 详细信息 -->
        </dd>
    </dl>
    <!-- 更多搜索结果... -->
</div>
```

### 单个搜索结果结构

每个搜索结果包含以下主要元素：

#### 1. 封面图片和详情页链接

封面图片和链接位于`dt`元素中：

```html
<dt>
    <a href="/movie/63114.html">
        <img src="https://www.4kfox.com/upload/vod/20250727-1/a75d775236aec4128ef805c6461ef07a.jpg" referrerpolicy="no-referrer">
    </a>
</dt>
```

- 详情页链接：`dt > a`的`href`属性，格式为`/movie/{ID}.html`
- 封面图片：`dt > a > img`的`src`属性
- ID提取：从链接URL中提取数字ID（如63114）

#### 2. 详细信息

详细信息位于`dd`元素中，包含多个`p`元素：

```html
<dd>
    <p>名称：<strong><a href="/movie/63114.html">凡人修仙传(2025)</a></strong><span class="ss1"> [剧集][30集全]</span></p>
    <p class="p0">又名：The Immortal Ascension</p>
    <p>地区：大陆　　类型：奇幻,古装</p>
    <p class="p0">主演：杨洋,金晨,汪铎,赵小棠,赵晴,...</p>
    <p>简介：《凡人修仙传》讲述的是：该剧改编自忘语的同名小说，...</p>
</dd>
```

##### 字段解析

| 字段类型 | 选择器 | 说明 | 示例 |
|---------|--------|------|------|
| **标题** | `dd > p:first-child strong a` | 影片名称和详情页链接 | `凡人修仙传(2025)` |
| **状态标签** | `dd > p:first-child span.ss1` | 影片状态和类型 | `[剧集][30集全]` |
| **又名** | `dd > p.p0:contains('又名：')` | 影片别名（可能不存在） | `The Immortal Ascension` |
| **地区类型** | `dd > p:contains('地区：')` | 地区和类型信息 | `地区：大陆　　类型：奇幻,古装` |
| **主演** | `dd > p.p0:contains('主演：')` | 主要演员列表 | `主演：杨洋,金晨,汪铎,...` |
| **简介** | `dd > p:last-child` | 影片简介描述 | `《凡人修仙传》讲述的是：...` |

##### 数据处理说明

1. **标题提取**: 从`strong > a`的文本内容中提取，通常包含年份
2. **状态解析**: 从`span.ss1`中提取类型（剧集/电影/动漫）和状态信息
3. **地区类型分离**: 需要解析"地区：xxx　　类型：xxx"格式的文本
4. **主演处理**: 从以"主演："开头的段落中提取，多个演员用逗号分隔
5. **简介清理**: 提取纯文本内容，去除HTML标签

## 详情页面结构

详情页面包含更完整的影片信息、播放源链接和下载资源。

### 1. 基本信息

详情页的基本信息位于`.main-ui-meta`元素中：

```html
<div class="main-ui-meta">
    <h1>凡人修仙传<span class="year">(2025)</span></h1>
    <div class="otherbox">当前为 30集全 资源，最后更新于 23小时前</div>
    <div><span>导演：</span><a href="..." target="_blank">杨阳</a></div>
    <div class="text-overflow"><span>主演：</span><a href="..." target="_blank">杨洋</a>...</div>
    <div><span>类型：</span><a href="..." target="_blank">奇幻</a>...</div>
    <div><span>地区：</span>大陆</div>
    <div><span>语言：</span>国语</div>
    <div><span>上映：</span>2025-07-27(中国大陆)</div>
    <div><span>时长：</span>45分钟</div>
    <div><span>又名：</span>The Immortal Ascension</div>
</div>
```

### 2. 播放源信息

播放源信息位于`.sBox`元素中：

```html
<div class="sBox wrap row">
    <h2>在线播放
        <div class="hd right">
            <ul class="py-tabs">
                <li class="on">量子源</li>
                <li class="">如意源</li>
            </ul>
        </div>
    </h2>
    <div class="bd">
        <ul class="player ckp gdt bf-w">
            <li><a href="/play/63114-1-1.html">第01集</a></li>
            <li><a href="/play/63114-1-2.html">第02集</a></li>
            <!-- 更多集数... -->
        </ul>
        <ul class="player ckp gdt bf-w">
            <li><a href="/play/63114-2-1.html">第01集</a></li>
            <li><a href="/play/63114-2-2.html">第02集</a></li>
            <!-- 其他播放源... -->
        </ul>
    </div>
</div>
```

#### 播放链接解析

- **播放源切换**: `.py-tabs li`元素，通过`class="on"`识别当前选中源
- **播放链接**: `.player li a`的`href`属性
- **链接格式**: `/play/{ID}-{源ID}-{集ID}.html`
- **集数标题**: `a`元素的文本内容

### 3. 磁力&网盘下载部分 ⭐ 重要

这是详情页最有价值的部分，位于`#donLink`元素中：

```html
<div class="wrap row">
    <h2>磁力&网盘</h2>
    <div class="down-link" id="donLink">
        <div class="hd">
            <ul class="nav-tabs tab-title">
                <li class="title">中字1080P</li>
                <li class="title">中字4K</li>
                <li class="title">百度网盘</li>
                <li class="title">迅雷网盘</li>
                <li class="title">夸克网盘</li>
                <li class="title">阿里网盘</li>
                <li class="title">天翼网盘</li>
                <li class="title">115网盘</li>
                <li class="title">UC网盘</li>
            </ul>
        </div>
        <div class="down-list tab-content">
            <!-- 各个标签页的内容 -->
        </div>
    </div>
</div>
```

#### 下载链接分类

| 标签页类型 | 说明 | 内容 |
|-----------|------|------|
| **中字1080P** | 磁力链接 | 1080P分辨率的磁力资源 |
| **中字4K** | 磁力链接 | 4K分辨率的磁力资源 |
| **百度网盘** | 网盘链接 | 百度网盘分享链接 |
| **迅雷网盘** | 网盘链接 | 迅雷网盘分享链接 |
| **夸克网盘** | 网盘链接 | 夸克网盘分享链接 |
| **阿里网盘** | 网盘链接 | 阿里云盘分享链接 |
| **天翼网盘** | 网盘链接 | 天翼云盘分享链接 |
| **115网盘** | 网盘链接 | 115网盘分享链接 |
| **UC网盘** | 网盘链接 | UC网盘分享链接 |

#### 单个下载链接结构

每个下载项都采用统一的HTML结构：

```html
<ul class="gdt content">
    <li class="down-list2">
        <p class="down-list3">
            <a href="实际链接" title="完整标题" class="folder">
                显示标题
            </a>
        </p>
        <span>
            <a href="javascript:void(0);" class="copy-btn" data-clipboard-text="实际链接">
                <i class="far fa-copy"></i> 复制
            </a>
        </span>
    </li>
</ul>
```

#### 链接类型和格式

##### 磁力链接格式

```html
<a href="magnet:?xt=urn:btih:dde51e7d23800702e9d946f103b5c54c93d538a8&dn=The.Immortal.Ascension.2025.EP01-30.HD1080P.X264.AAC.Mandarin.CHS.XLYS" 
   title="The.Immortal.Ascension.2025.EP0130.HD1080P.X264.AAC.Mandarin.CHS.XLYS[12.28G]" 
   class="folder">
    The.Immortal.Ascension.2025.EP0130.HD1080P.X264.AAC.Mandarin.CHS.XLYS[12.28G]
</a>
```

##### 网盘链接格式

**百度网盘**:
```html
<a href="https://pan.baidu.com/s/1qg5KF7J-guvt8-jCORPf0w?pwd=1234&v=918" 
   title="【国剧】凡人修仙传（2025）4K 持续更新中奇幻 古装 杨洋 金晨 4K60FPS" 
   class="folder">
    【国剧】凡人修仙传（2025）4K 持续更新中奇幻 古装 杨洋 金晨 4K60FPS
</a>
```

**迅雷网盘**:
```html
<a href="https://pan.xunlei.com/s/VOW_0D7L3HlSe9g4m5XN-c8XA1?pwd=3suf" 
   title=". ⊙o⊙【全30集.已完结】 【凡人修仙传2025】【4K高码】【国语中字】【类型：奇幻 古装】【主演：杨洋 金晨 汪铎】" 
   class="folder">
    . ⊙o⊙【全30集.已完结】 【凡人修仙传2025】【4K高码】【国语中字】【类型：奇幻 古装】【主演：杨洋 金晨 汪铎】
</a>
```

**夸克网盘**:
```html
<a href="https://pan.quark.cn/s/914548c6f323" 
   title="⊙o⊙【全30集已完结】【凡人修仙传2025】【4K高码率】【国语中字】【类型：奇幻 古装】【主演：杨洋金晨汪铎.】【纯净分享】" 
   class="folder">
    ⊙o⊙【全30集已完结】【凡人修仙传2025】【4K高码率】【国语中字】【类型：奇幻 古装】【主演：杨洋金晨汪铎.】【纯净分享】
</a>
```

#### 下载链接提取策略

```go
// 提取所有下载链接
func extractDownloadLinks(doc *goquery.Document) map[string][]DownloadLink {
    links := make(map[string][]DownloadLink)
    
    // 遍历每个标签页
    doc.Find("#donLink .nav-tabs .title").Each(func(i int, title *goquery.Selection) {
        tabName := strings.TrimSpace(title.Text())
        
        // 找到对应的内容区域
        contentArea := doc.Find("#donLink .tab-content").Eq(i)
        
        var tabLinks []DownloadLink
        contentArea.Find(".down-list2").Each(func(j int, item *goquery.Selection) {
            link, exists := item.Find(".down-list3 a").Attr("href")
            if !exists {
                return
            }
            
            title := item.Find(".down-list3 a").Text()
            fullTitle, _ := item.Find(".down-list3 a").Attr("title")
            
            linkType := determineLinkType(link)
            password := extractPassword(link, title)
            
            downloadLink := DownloadLink{
                Type:     linkType,
                URL:      link,
                Title:    strings.TrimSpace(title),
                FullTitle: fullTitle,
                Password: password,
            }
            
            tabLinks = append(tabLinks, downloadLink)
        })
        
        if len(tabLinks) > 0 {
            links[tabName] = tabLinks
        }
    })
    
    return links
}

// 判断链接类型
func determineLinkType(url string) string {
    switch {
    case strings.Contains(url, "magnet:"):
        return "magnet"
    case strings.Contains(url, "pan.baidu.com"):
        return "baidu"
    case strings.Contains(url, "pan.xunlei.com"):
        return "xunlei"
    case strings.Contains(url, "pan.quark.cn"):
        return "quark"
    case strings.Contains(url, "aliyundrive.com"), strings.Contains(url, "alipan.com"):
        return "aliyun"
    case strings.Contains(url, "cloud.189.cn"):
        return "tianyi"
    case strings.Contains(url, "115.com"):
        return "115"
    case strings.Contains(url, "drive.uc.cn"):
        return "uc"
    default:
        return "others"
    }
}

// 提取密码
func extractPassword(url, title string) string {
    // 从URL中提取
    if match := regexp.MustCompile(`[?&]pwd=([^&]+)`).FindStringSubmatch(url); len(match) > 1 {
        return match[1]
    }
    
    // 从标题中提取
    patterns := []string{
        `提取码[：:]\s*([0-9a-zA-Z]+)`,
        `密码[：:]\s*([0-9a-zA-Z]+)`,
        `pwd[：:]\s*([0-9a-zA-Z]+)`,
    }
    
    for _, pattern := range patterns {
        if match := regexp.MustCompile(pattern).FindStringSubmatch(title); len(match) > 1 {
            return match[1]
        }
    }
    
    return ""
}
```

## 分页结构

由于提供的HTML示例中没有明显的分页结构，可能需要进一步分析或该网站采用Ajax加载更多结果的方式。

## 请求头要求

根据搜索请求信息，建议设置以下请求头：

```http
GET /search/-------------.html?wd={关键词} HTTP/1.1
Host: btnull.pro
Referer: https://btnull.pro/
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Connection: keep-alive
```

## 数据提取策略

### 1. 搜索结果提取

```go
// 伪代码示例
func extractSearchResults(doc *goquery.Document) []SearchResult {
    var results []SearchResult
    
    doc.Find(".sr_lists dl").Each(func(i int, s *goquery.Selection) {
        // 提取链接和ID
        link, _ := s.Find("dt a").Attr("href")
        id := extractIDFromURL(link) // 从 /movie/63114.html 提取 63114
        
        // 提取封面图片
        image, _ := s.Find("dt a img").Attr("src")
        
        // 提取标题
        title := s.Find("dd p:first-child strong a").Text()
        
        // 提取状态标签
        status := s.Find("dd p:first-child span.ss1").Text()
        
        // 提取其他信息
        var actors, description, region, types string
        s.Find("dd p").Each(func(j int, p *goquery.Selection) {
            text := p.Text()
            if strings.Contains(text, "主演：") {
                actors = strings.TrimPrefix(text, "主演：")
            } else if strings.Contains(text, "地区：") {
                // 解析地区和类型
                parseRegionAndTypes(text, &region, &types)
            } else if j == s.Find("dd p").Length()-1 {
                // 最后一个p元素通常是简介
                description = strings.TrimPrefix(text, "简介：")
            }
        })
        
        result := SearchResult{
            ID:          id,
            Title:       title,
            Status:      status,
            Image:       image,
            Link:        link,
            Actors:      actors,
            Description: description,
            Region:      region,
            Types:       types,
        }
        results = append(results, result)
    })
    
    return results
}
```

### 2. 详情页信息提取

详情页可以提取更完整的信息，包括：
- 导演信息
- 完整的演员列表  
- 上映时间
- 影片时长
- 播放源和集数列表

### 3. 播放源提取

```go
func extractPlaySources(doc *goquery.Document) []PlaySource {
    var sources []PlaySource
    
    // 提取播放源名称
    sourceNames := []string{}
    doc.Find(".py-tabs li").Each(func(i int, s *goquery.Selection) {
        sourceNames = append(sourceNames, s.Text())
    })
    
    // 提取每个播放源的集数链接
    doc.Find(".player").Each(func(i int, player *goquery.Selection) {
        source := PlaySource{
            Name: sourceNames[i],
            Episodes: []Episode{},
        }
        
        player.Find("li a").Each(func(j int, a *goquery.Selection) {
            href, _ := a.Attr("href")
            title := a.Text()
            
            episode := Episode{
                Title: title,
                URL:   href,
            }
            source.Episodes = append(source.Episodes, episode)
        })
        
        sources = append(sources, source)
    })
    
    return sources
}
```

## 注意事项

1. **图片防盗链**: 图片标签包含`referrerpolicy="no-referrer"`属性，需要注意请求头设置
2. **URL编码**: 搜索关键词需要进行URL编码
3. **容错处理**: 某些字段（如又名、主演）可能不存在，需要进行空值检查
4. **ID提取**: 需要从URL路径中正确提取数字ID
5. **文本清理**: 需要去除多余的空格、换行符等字符
6. **播放源**: 不同播放源可能有不同的集数，需要分别处理

## 总结

片库网采用较为标准的HTML结构，搜索结果以列表形式展示，每个结果包含基本的影片信息。详情页提供更完整的信息和播放源。在实现插件时需要注意处理各种边界情况和数据清理工作。