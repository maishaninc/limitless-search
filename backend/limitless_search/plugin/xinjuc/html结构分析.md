# 新剧坊 (xinjuc.com) 网站结构分析

## 网站信息

- **网站名称**: 新剧坊 - 一个网盘资源分享小站
- **网站URL**: https://www.xinjuc.com
- **网站类型**: 影视资源网盘分享站
- **数据源**: HTML页面爬虫
- **网盘类型**: 仅百度网盘

## 搜索URL格式

```
https://www.xinjuc.com/?s={关键词}
```

### URL编码
- 关键词需要进行URL编码
- 示例: `凡人修仙传` → `%E5%87%A1%E4%BA%BA%E4%BF%AE%E4%BB%99%E4%BC%A0`

## 搜索结果页面结构

### 主容器

搜索结果显示在以下结构中：

```html
<div class="list-post">
  <div class="card">
    <div class="card-body">
      <div class="section-header">
        <h5>搜索"凡人修仙传"的结果...</h5>
      </div>
      <div class="row-xs post-list">
        <!-- 搜索结果项 -->
      </div>
    </div>
  </div>
</div>
```

### 单个搜索结果结构

每个搜索结果是一个 `<article class="post-item">` 元素：

```html
<div class="col-4 col-md-3 col-lg-2">
  <article class="post-item">
    <!-- 封面图 -->
    <div class="post-image">
      <a href="/30839.html" rel="bookmark" title="凡人修仙传 (2020)更至163集-百度网盘1080P高清免费动漫资源">
        <img src="/wp-content/uploads/2024/09/07044626660.webp" class="post-thumb" alt="..." title="...">
        <div class="mark"><span>更至163</span></div>
      </a>
    </div>
    
    <!-- 标题和更新时间 -->
    <div class="post-body">
      <h5 class="post-title line-hide-1">
        <a href="/30839.html" rel="bookmark">凡人修仙传 (2020)更至163集-百度网盘1080P高清免费动漫资源</a>
      </h5>
      <div class="post-footer">
        <span class="time">2025-04-21 更新</span>
      </div>
    </div>
  </article>
</div>
```

### 字段提取规则

| 字段 | CSS选择器 | 说明 |
|------|-----------|------|
| **详情链接** | `div.post-image > a[href]` | 相对路径，如 `/30839.html` |
| **标题** | `h5.post-title a` | 资源完整标题 |
| **封面图** | `img.post-thumb[src]` | 封面图片URL |
| **标记** | `div.mark span` | 状态标记，如"更至163"、"1080P" |
| **更新时间** | `div.post-footer span.time` | 更新日期 |

## 详情页面结构

### 详情URL格式
```
https://www.xinjuc.com/{ID}.html
```

### 主要内容区域

```html
<div class="article-main">
  <h1 class="article-title">凡人修仙传 (2020)更至163集-百度网盘1080P高清免费动漫资源</h1>
  
  <div class="article-meta">
    <span class="item"><i class="icon icon-time"></i> 04-21</span>
    <span class="item"><i class="icon icon-fenlei"></i> <a href="/dongman">动漫</a></span>
  </div>
  
  <div class="article-content">
    <p><strong>凡人修仙传 (2020)百度云网盘资源下载地址：</strong></p>
    <p><strong>链接：  <a href="https://pan.baidu.com/s/1b5TLAN2s-ss8lDKcswlD2g?pwd=1234" rel="nofollow">
      https://pan.baidu.com/s/1b5TLAN2s-ss8lDKcswlD2g?pwd=1234
    </a></strong></p>
    <p><strong>提取码：1234</strong></p>
    
    <!-- 影视信息 -->
    <p>导演: 伍镇焯 / 王裕仁<br>
    编剧: 金增辉 / 李欣雨<br>
    主演: 钱文青 / 杨天翔 / 杨默 / 歪歪 / 谷江山<br>
    类型: 动画 / 奇幻 / 武侠<br>
    制片国家/地区: 中国大陆<br>
    语言: 汉语普通话<br>
    首播: 2020-07-25(中国大陆)</p>
  </div>
</div>
```

### 百度盘链接提取

#### 链接格式

1. **完整链接（带pwd参数）**:
   ```
   https://pan.baidu.com/s/1b5TLAN2s-ss8lDKcswlD2g?pwd=1234
   ```

2. **短链接（不带pwd参数）**:
   ```
   https://pan.baidu.com/s/1b5TLAN2s-ss8lDKcswlD2g
   ```

#### 提取码格式

提取码通常出现在以下位置：
- **在单独的段落中**: `<p><strong>提取码：1234</strong></p>`
- **在链接URL中**: `?pwd=1234`
- **在文本描述中**: 使用正则匹配 `提取码[:：]\s*([a-zA-Z0-9]{4})`

#### 提取策略（优化后）

```go
// 1. 严格的百度盘链接正则（要求s/后至少10个字符）
baiduRegex := regexp.MustCompile(`https?://pan\.baidu\.com/s/[0-9a-zA-Z_\-]{10,}(?:\?pwd=[0-9a-zA-Z]+)?`)

// 2. 提取码正则
pwdRegex := regexp.MustCompile(`提取码[:：]\s*([a-zA-Z0-9]{4})`)

// 3. 从URL参数提取提取码
pwdURLRegex := regexp.MustCompile(`\?pwd=([0-9a-zA-Z]+)`)

// 4. 链接验证（避免误匹配）
func isValidBaiduLink(link string) bool {
    // 必须是百度盘域名开头
    if !strings.HasPrefix(link, "https://pan.baidu.com") {
        return false
    }
    // 必须包含 /s/ 路径
    if !strings.Contains(link, "/s/") {
        return false
    }
    // 使用正则验证格式
    return baiduRegex.MatchString(link)
}

// 5. 链接清理和去重
baiduURL = strings.TrimSpace(baiduURL)  // 去除首尾空格
linkMap[baiduURL] = true  // 使用map去重
```

#### 常见问题和解决方案

**问题1：匹配到不完整的链接**
- ❌ 错误：`https://pan.baidu.com/s/1`
- ✅ 解决：正则要求s/后至少10个字符

**问题2：匹配到分享链接中的百度盘URL**
- ❌ 错误：`https://sns.qzone.qq.com/...&summary=...pan.baidu.com/...`
- ✅ 解决：验证链接必须以 `pan.baidu.com` 开头

**问题3：重复链接（带空格和不带空格）**
- ❌ 错误：`https://pan.baidu.com/s/xxx` 和 `https://pan.baidu.com/s/xxx `
- ✅ 解决：使用 `strings.TrimSpace()` 清理

## 数据字段映射

### SearchResult 字段设置

| 源字段 | SearchResult字段 | 说明 |
|-------|------------------|------|
| 标题 | Title | 完整资源标题 |
| 影视信息 | Content | 导演、主演、类型等信息 |
| 百度盘链接 | Links[0].URL | 完整的百度网盘链接 |
| 提取码 | Links[0].Password | 4位提取码 |
| 更新时间 | Datetime | 解析时间字符串 |
| 分类 | Tags[0] | 如"动漫"、"电影" |
| ID | UniqueID | xinjuc-{ID} |
| 频道 | Channel | 空字符串（插件搜索） |

## 反爬虫策略

### 请求头设置

```go
req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...")
req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
req.Header.Set("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8")
req.Header.Set("Referer", "https://www.xinjuc.com/")
req.Header.Set("Connection", "keep-alive")
```

### 访问控制
- 建议请求间隔：100-200ms
- 超时时间：搜索10秒，详情页8秒
- 重试次数：3次，指数退避

## 性能优化

### 1. HTTP连接池配置
```go
MaxIdleConns:        50
MaxIdleConnsPerHost: 20
MaxConnsPerHost:     30
IdleConnTimeout:     90 * time.Second
```

### 2. 并发控制
- 最大并发获取详情页：15个goroutine
- 使用信号量控制并发数量

### 3. 缓存策略
- 详情页缓存：1小时TTL
- 定期清理：30分钟清理一次过期缓存
- 使用 `sync.Map` 实现线程安全缓存

### 4. 超时设置
- 搜索请求超时：10秒
- 详情页请求超时：8秒
- 重试间隔：指数退避（200ms, 400ms, 800ms）

## 插件设计

### 基本信息
- **插件名称**: xinjuc
- **优先级**: 2（质量良好的数据源）
- **Service层过滤**: 启用（标准网盘搜索插件）
- **缓存TTL**: 1小时

### 搜索流程

```
1. 构建搜索URL（URL编码关键词）
   ↓
2. 发送HTTP请求（带重试）
   ↓
3. 解析搜索结果页面（goquery）
   ↓
4. 提取基本信息（标题、链接、时间）
   ↓
5. 并发获取详情页（最多15个并发）
   ↓
6. 从详情页提取百度盘链接和提取码
   ↓
7. 构建SearchResult对象
   ↓
8. 关键词过滤
   ↓
9. 返回结果
```

### 关键实现细节

#### 1. 百度盘链接提取（精简版）

```go
// 百度盘链接正则（支持带pwd参数）
baiduRegex := regexp.MustCompile(`https?://pan\.baidu\.com/s/[0-9a-zA-Z_\-]+(?:\?pwd=[0-9a-zA-Z]+)?`)

// 提取所有百度盘链接
baiduLinks := baiduRegex.FindAllString(htmlContent, -1)
```

#### 2. 提取码提取（多种方式）

```go
// 方式1: 从URL参数提取
if strings.Contains(baiduURL, "?pwd=") {
    password = extractPwdFromURL(baiduURL)
}

// 方式2: 从文本中提取
pwdRegex := regexp.MustCompile(`提取码[:：]\s*([a-zA-Z0-9]{4})`)
if match := pwdRegex.FindStringSubmatch(htmlContent); len(match) > 1 {
    password = match[1]
}
```

#### 3. Channel字段设置

```go
result.Channel = ""  // 插件搜索结果必须为空字符串
```

## 使用示例

### API请求
```bash
curl "http://localhost:8888/api/search?kw=凡人修仙传&plugins=xinjuc"
```

### 预期响应
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "results": [
      {
        "unique_id": "xinjuc-30839",
        "title": "凡人修仙传 (2020)更至163集-百度网盘1080P高清免费动漫资源",
        "content": "导演: 伍镇焯 / 王裕仁 | 类型: 动画 / 奇幻 / 武侠",
        "datetime": "2025-04-21T00:00:00Z",
        "links": [
          {
            "type": "baidu",
            "url": "https://pan.baidu.com/s/1b5TLAN2s-ss8lDKcswlD2g?pwd=1234",
            "password": "1234"
          }
        ],
        "tags": ["动漫", "更至163"],
        "channel": ""
      }
    ]
  }
}
```

## 注意事项

### 优点
- ✅ **专注影视资源**: 影视资源专业垂直站
- ✅ **网盘链接质量高**: 仅使用百度网盘，链接稳定
- ✅ **更新及时**: 资源更新频率较快
- ✅ **提供提取码**: 自动提取百度盘分享提取码
- ✅ **详细的影视信息**: 导演、主演、类型等信息完整

### 注意事项
- ⚠️ **需要访问详情页**: 网盘链接在详情页，需要二次请求
- ⚠️ **仅百度盘**: 只提供百度网盘资源
- ⚠️ **需要反爬虫措施**: 设置完整的请求头
- ⚠️ **建议使用缓存**: 减少重复请求详情页

## 维护建议

1. **定期检查网站结构**: WordPress主题可能更新
2. **监控成功率**: 检查链接提取成功率
3. **优化性能**: 根据实际情况调整并发数和超时时间
4. **缓存策略**: 根据网站更新频率调整缓存TTL
5. **链接有效性**: 定期检查百度盘链接的有效性
