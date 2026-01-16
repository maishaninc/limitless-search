# 小鸡影视 (xiaojitv.com) 搜索结果HTML结构分析

## 网站信息

- **网站名称**: 小鸡影视
- **域名**: `www.xiaojitv.com`
- **搜索URL格式**: `https://www.xiaojitv.com/?s={关键词}`
- **详情页URL格式**: `https://www.xiaojitv.com/{ID}.html`
- **主要特点**: 影视资源站，提供多种网盘链接，使用base64编码保护真实链接

## HTML结构

### 搜索结果页面结构

搜索结果页面使用poster布局，主要内容位于`.poster-grid`元素内：

```html
<div class="poster-grid">
    <article class="poster-item excerpt-1">
        <!-- 单个搜索结果 -->
    </article>
    <article class="poster-item excerpt-2">
        <!-- 单个搜索结果 -->
    </article>
    <!-- 更多搜索结果... -->
</div>
```

### 单个搜索结果结构

每个搜索结果包含以下主要元素：

#### 1. 封面图片和详情页链接

```html
<div class="poster-image">
    <a class="poster-link" href="https://www.xiaojitv.com/656.html">
        <img src="https://www.xiaojitv.com/wp-content/uploads/2025/09/47a3352110f7e36.webp" 
             alt="凡人修仙传(2020) | 小鸡影视" 
             class="thumb">
    </a>
    <div class="poster-top-left"></div>
    <div class="poster-rating poster-top-right">
        <span class="rating-score">7.9</span>
    </div>
    <div class="poster-category poster-bottom-left">
        <a href="https://www.xiaojitv.com/dongman">动漫</a>
    </div>
    <div class="poster-views">阅读(<span class="ajaxlistpv" data-id="656"></span>)</div>
</div>
```

#### 2. 标题和标签信息

```html
<div class="poster-content">
    <h2 class="poster-title">
        <a href="https://www.xiaojitv.com/656.html" title="凡人修仙传(2020) | 小鸡影视">
            凡人修仙传(2020)
        </a>
    </h2>
    <div class="poster-tags">
        <a href="https://www.xiaojitv.com/tag/2020年">2020年</a> / 
        <a href="https://www.xiaojitv.com/tag/7-9分">7.9分</a> / 
        <a href="https://www.xiaojitv.com/tag/中国大陆">中国大陆</a> / 
        <a href="https://www.xiaojitv.com/tag/动画">动画</a> / 
        <a href="https://www.xiaojitv.com/tag/奇幻">奇幻</a>
    </div>
</div>
```

## 详情页面结构

详情页面包含完整的影片信息和网盘下载链接。

### 1. 页面标题和基本信息

```html
<h1 class="article-title">
    <a href="https://www.xiaojitv.com/656.html">凡人修仙传(2020)</a>
</h1>
```

### 2. 相关资源区域 ⭐ 重要

网盘下载链接位于相关资源区域，这是xiaoji插件的核心提取目标：

```html
<div class="cloud-search-resource-results" data-post-id="656">
    <div class="cloud-search-resource-header">
        <h3>相关资源</h3>
        <!-- 操作按钮 -->
    </div>
    
    <!-- 资源列表 -->
    <div class="resource-compact-item">
        <div class="resource-compact-link">
            <a href="https://www.xiaojitv.com/go.html?url=aHR0cHM6Ly9wYW4ucXVhcmsuY24vcy9kNjQ5MWJmZWQxNmI=" 
               target="_blank" rel="nofollow">
                凡人修仙传 2024 4K 持续更新中
            </a>
        </div>
        <div class="resource-compact-info">
            <span class="resource-compact-source">聚合盘</span>
        </div>
    </div>
    
    <div class="resource-compact-item">
        <div class="resource-compact-link">
            <a href="https://www.xiaojitv.com/go.html?url=aHR0cHM6Ly9jbG91ZC4xODkuY24vdC9JYmFVVnpFN1puZXk=" 
               target="_blank" rel="nofollow">
                凡人修仙传 2024 4K 持续更新中 txb
            </a>
        </div>
        <div class="resource-compact-info">
            <span class="resource-compact-source">小愛盘②</span>
        </div>
    </div>
    
    <!-- 更多资源... -->
</div>
```

### 3. Base64编码链接解析 🔑 关键特性

xiaoji网站使用特殊的链接保护机制：

**原始链接格式**：
```
https://www.xiaojitv.com/go.html?url=aHR0cHM6Ly9wYW4ucXVhcmsuY24vcy9kNjQ5MWJmZWQxNmI=
```

**提取步骤**：
1. 提取URL参数中的base64字符串：`aHR0cHM6Ly9wYW4ucXVhcmsuY24vcy9kNjQ5MWJmZWQxNmI=`
2. 进行base64解码：`https://pan.quark.cn/s/d6491bfed16b`
3. 得到真实的网盘链接

## 提取逻辑

### 搜索结果页面提取逻辑

1. 定位所有的`article.poster-item`元素
2. 对于每个元素：
   - 从`.poster-link`的`href`属性提取详情页链接
   - 从链接中提取资源ID（正则：`/(\d+)\.html`）
   - 从`.poster-title a`提取标题
   - 从`.poster-rating .rating-score`提取评分
   - 从`.poster-category a`提取分类
   - 从`.poster-image img`的`src`属性提取封面图片URL
   - 从`.poster-tags a`提取标签信息

### 详情页面提取逻辑

1. 获取资源基本信息：
   - 标题：`.article-title a`的文本内容
   - 资源ID：从URL中提取

2. 提取网盘链接 ⭐ 核心逻辑：
   ```go
   // 1. 查找所有资源链接
   doc.Find(".resource-compact-link a").Each(func(i int, s *goquery.Selection) {
       href, exists := s.Attr("href")
       if !exists {
           return
       }
       
       var realURL string
       
       // 2. 检查链接类型并处理
       if strings.Contains(href, "/go.html?url=") {
           // Base64编码链接，需要解码
           parts := strings.Split(href, "url=")
           if len(parts) == 2 {
               encoded := parts[1]
               decoded, err := base64.StdEncoding.DecodeString(encoded)
               if err == nil {
                   realURL = string(decoded)
               }
           }
       } else if strings.HasPrefix(href, "http://") || strings.HasPrefix(href, "https://") || 
                 strings.HasPrefix(href, "magnet:") || strings.HasPrefix(href, "ed2k://") {
           // 直接链接，无需解码
           realURL = href
       }
       
       // 3. 处理有效链接
       if realURL != "" {
           link := model.Link{
               Type:     determineCloudType(realURL),
               URL:      realURL,
               Password: "", // xiaoji网站通常无密码
           }
           links = append(links, link)
       }
   })
   ```

3. 提取资源描述：
   - 资源名称：`.resource-compact-link a`的文本内容
   - 资源来源：`.resource-compact-source`的文本内容

## 支持的网盘类型

根据分析，xiaoji网站支持多种网盘类型：

- **夸克网盘**: `https://pan.quark.cn/s/xxxxx`
- **天翼云盘**: `https://cloud.189.cn/t/xxxxx`
- **阿里云盘**: `https://www.alipan.com/s/xxxxx`
- **百度网盘**: `https://pan.baidu.com/s/xxxxx`
- **115网盘**: `https://115.com/s/xxxxx`、`https://115cdn.com/s/xxxxx`
- **城通网盘**: `https://url91.ctfile.com/f/xxxxx` (归类到others)
- **磁力链接**: `magnet:?xt=urn:btih:xxxxx`
- **ED2K链接**: `ed2k://xxxxx`

## 重要发现和注意事项

### 1. Base64编码保护 🔐

网站使用base64编码保护真实的网盘链接，这是xiaoji插件的最大特点：
- 所有网盘链接都经过base64编码
- 链接格式：`/go.html?url={base64字符串}`
- 必须解码才能获得真实链接

### 2. 搜索结果布局

使用现代的poster布局，与传统的列表布局不同：
- 使用CSS Grid布局
- 每个结果都有封面图片
- 包含评分和分类信息

### 3. 动态加载

页面可能使用了AJAX动态加载：
- 某些内容可能需要等待JavaScript执行
- 建议在请求时设置适当的User-Agent

### 4. 反爬虫措施

网站可能有一定的反爬虫措施：
- 需要设置完整的浏览器请求头
- 可能需要处理JavaScript渲染的内容

## 提取字段映射

| 字段 | HTML位置 | 提取方法 |
|------|----------|----------|
| 标题 | `.poster-title a` | 文本内容 |
| 详情页链接 | `.poster-link` | href属性 |
| 资源ID | 详情页URL | 正则提取 |
| 封面图片 | `.poster-image img` | src属性 |
| 评分 | `.rating-score` | 文本内容 |
| 分类 | `.poster-category a` | 文本内容 |
| 标签 | `.poster-tags a` | 文本内容数组 |
| 网盘链接 | `.resource-compact-link a` | href属性（需base64解码） |
| 资源描述 | `.resource-compact-link a` | 文本内容 |
| 资源来源 | `.resource-compact-source` | 文本内容 |

## 实现优先级

1. **高优先级**: xiaoji是影视资源站，质量较好，建议设置为优先级2
2. **Service层过滤**: 使用标准的Service层过滤，不跳过
3. **缓存策略**: 建议设置合理的缓存时间，避免频繁请求

## 开发注意事项

1. **Base64解码**: 必须实现base64解码逻辑
2. **网盘类型识别**: 使用系统自带的`determineCloudType`函数
3. **错误处理**: 处理base64解码失败的情况
4. **链接去重**: 避免重复的网盘链接
5. **请求头设置**: 使用完整的浏览器请求头避免被拦截
