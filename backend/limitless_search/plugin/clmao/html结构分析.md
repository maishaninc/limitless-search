# Clmao (磁力猫) HTML结构分析

## 网站信息

- **网站名称**: 磁力猫 - 磁力搜索引擎
- **基础URL**: https://www.8800492.xyz/
- **功能**: BT种子磁力链接搜索
- **搜索URL格式**: `/search-{keyword}-{category}-{sort}-{page}.html`

## 搜索页面结构

### 1. 搜索URL参数说明

```
https://www.8800492.xyz/search-%E5%87%A1%E4%BA%BA%E4%BF%AE%E4%BB%99%E4%BC%A0-0-0-1.html
                                    ^关键词(URL编码)   ^分类 ^排序 ^页码
```

**参数说明**:
- `keyword`: URL编码的搜索关键词
- `category`: 分类筛选 (0=全部, 1=影视, 2=音乐, 3=图像, 4=文档书籍, 5=压缩文件, 6=安装包, 7=其他)
- `sort`: 排序方式 (0=相关程度, 1=文件大小, 2=添加时间, 3=热度, 4=最近访问)
- `page`: 页码 (从1开始)

### 2. 搜索结果容器

```html
<div class="tbox">
    <div class="ssbox">
        <!-- 单个搜索结果 -->
    </div>
    <!-- 更多结果... -->
</div>
```

### 3. 单个搜索结果结构

#### 标题区域
```html
<div class="title">
    <h3>
        <span>[影视]</span>  <!-- 分类标签 -->
        <a href="/hash/a6cfa78f3c36e78c7f6342ff12de9590a25db441.html" target="_blank">
            19<span class="red">凡人修仙传</span>20<span class="red">凡人修仙传</span>21天龙八部...
        </a>
    </h3>
</div>
```

#### 文件列表区域
```html
<div class="slist">
    <ul>
        <li>rw.mp4&nbsp;<span class="lightColor">145.5 MB</span></li>
        <!-- 更多文件... -->
    </ul>
</div>
```

#### 信息栏区域
```html
<div class="sbar">
    <span><a href="magnet:?xt=urn:btih:A6CFA78F3C36E78C7F6342FF12DE9590A25DB441" target="_blank">[磁力链接]</a></span>
    <span>添加时间:<b>2022-06-28</b></span>
    <span>大小:<b class="cpill yellow-pill">145.5 MB</b></span>
    <span>最近下载:<b>2025-08-19</b></span>
    <span>热度:<b>2348</b></span>
</div>
```

### 4. 分页区域

```html
<div class="pager">
    <span>共61页</span>
    <a href="#">上一页</a>
    <span>1</span>  <!-- 当前页 -->
    <a href="/search-%E5%87%A1%E4%BA%BA%E4%BF%AE%E4%BB%99%E4%BC%A0-0-0-2.html">2</a>
    <!-- 更多页码... -->
    <a href="/search-%E5%87%A1%E4%BA%BA%E4%BF%AE%E4%BB%99%E4%BC%A0-0-0-2.html">下一页</a>
</div>
```

## 数据提取要点

### 需要提取的信息

1. **搜索结果基本信息**:
   - 标题: `.title h3 a` 的文本内容
   - 分类: `.title h3 span` 的文本内容
   - 详情页链接: `.title h3 a` 的 `href` 属性

2. **磁力链接信息**:
   - 磁力链接: `.sbar a[href^="magnet:"]` 的 `href` 属性
   - 文件大小: `.sbar .cpill` 的文本内容
   - 添加时间: `.sbar` 中 "添加时间:" 后的 `<b>` 标签内容
   - 热度: `.sbar` 中 "热度:" 后的 `<b>` 标签内容

3. **文件列表**:
   - 文件名和大小: `.slist ul li` 的文本内容

### CSS选择器

```css
/* 搜索结果容器 */
.tbox .ssbox

/* 标题和分类 */
.title h3 span    /* 分类 */
.title h3 a       /* 标题和详情链接 */

/* 磁力链接 */
.sbar a[href^="magnet:"]

/* 文件信息 */
.slist ul li

/* 元数据 */
.sbar span b      /* 时间、大小、热度等 */
```

## 特殊处理

### 1. 关键词高亮
搜索关键词在结果中用 `<span class="red">` 标签高亮显示

### 2. 文件大小格式
文件大小格式多样: `145.5 MB`、`854.2 MB`、`41.5 GB` 等

### 3. 磁力链接格式
标准磁力链接格式: `magnet:?xt=urn:btih:{40位哈希值}`

### 4. 分类映射
- [影视] → movie/video
- [音乐] → music
- [图像] → image
- [文档书籍] → document
- [压缩文件] → archive
- [安装包] → software
- [其他] → others

## 请求头要求

建议设置常见的浏览器请求头:
- User-Agent: 现代浏览器UA
- Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
- Accept-Language: zh-CN,zh;q=0.9,en;q=0.8

## 注意事项

1. 网站可能有反爬虫机制，需要适当的请求间隔
2. 搜索关键词需要进行URL编码
3. 磁力链接是直接可用的，无需额外处理
4. 部分结果可能包含大量无关文件，需要进行过滤
5. 网站域名可能会变更，需要支持域名更新