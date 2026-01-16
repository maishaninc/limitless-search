# kkmao (夸克猫) HTML结构分析

## 网站信息
- **网站名称**: 夸克猫资源
- **域名**: `www.kuakemao.com`
- **类型**: 夸克网盘影视资源分享站（WordPress 主题站）
- **特点**: 每篇文章提供 1~N 个夸克网盘链接，正文结构高度统一，仅包含夸克网盘

## 搜索页结构

### 1. 搜索入口
```
https://www.kuakemao.com/?s={关键词}

示例:
https://www.kuakemao.com/?s=物
```
- 直接使用 UTF-8 中文或 URL 编码均可
- 页面为标准 WordPress 搜索结果页

### 2. 结果容器
- **父容器**: `section.container > div.content-wrap > div.content`
- **结果项**: `article.excerpt`（会附带 `excerpt-1/2` 等序号类名）

### 3. 单个结果结构

#### 封面/详情链接
```html
<a class="focus" href="https://www.kuakemao.com/653.html">
    <img data-src="https://img.kuakemao.com/.../c4ac4195bed96c7-220x150.webp" class="thumb">
</a>
```
- `href` 即详情页地址，形如 `/数字.html`

#### 标题
```html
<header>
  <h2>
    <a href="https://www.kuakemao.com/653.html"
       title="某种物质 (2024) 夸克网盘 法国 恐怖 4K 豆瓣7.5 - 夸克猫资源">
       某种物质 (2024) 夸克网盘 法国 恐怖 4K 豆瓣7.5
    </a>
  </h2>
</header>
```
- 提取要素:
  - **标题**: `h2 > a` 文本
  - **详情页 URL**: `h2 > a` 的 `href`

#### 简介
```html
<p class="note">
  某种物质 夸克网盘资源 https://pan.quark.cn/s/631243a6189a ... 
</p>
```
- 用于填充 `SearchResult.Content`
- 文本中偶尔包含裸露的夸克链接，但仍需访问详情页获取规范链接

#### 元数据
```html
<div class="meta">
  <time>2025-11-26</time>
  <a class="cat" href="https://www.kuakemao.com/dy">电影</a>
  <span class="pv">阅读(...)</span>
</div>
```
- **发布时间**: `<time>` 文本（`YYYY-MM-DD`）
- **分类标签**: `.meta a.cat` 文本

## 详情页结构

### 1. URL 规则
```
https://www.kuakemao.com/{文章ID}.html
示例: https://www.kuakemao.com/653.html
```
- 文章 ID 可由 `/{id}.html` 提取，用于唯一 ID

### 2. 主要节点
- **标题**: `.article-title`
- **元信息**: `.article-meta .item`（日期、分类、阅读数等）
- **正文容器**: `.article-content`

### 3. 夸克链接位置
```html
<div class="article-content">
  <h2>某种物质 夸克网盘资源</h2>
  <p>
    <a rel="nofollow" href="https://pan.quark.cn/s/631243a6189a" target="_blank">
      https://pan.quark.cn/s/631243a6189a
    </a>
  </p>
  ...
</div>
```
- 所有下载链接位于 `.article-content` 中
- 仅出现夸克域名 (`pan.quark.cn`)
- 提取码通常在链接同一段落后续文字，需解析 `提取码/密码/pwd/code` 关键词

## CSS 选择器速查表

| 数据项 | 选择器 / 规则 | 备注 |
|--------|---------------|------|
| 结果列表 | `article.excerpt` | 遍历搜索结果 |
| 标题 | `article.excerpt h2 a` | 文本 & `href` |
| 简介 | `article.excerpt p.note` | 文本描述 |
| 分类 | `article.excerpt .meta a.cat` | 可能 0/1 个 |
| 发布时间 | `article.excerpt .meta time` | `YYYY-MM-DD` |
| 详情正文 | `.article-content` | 包含所有下载信息 |
| 夸克链接 | `.article-content a[href*="pan.quark.cn"]` | href 即下载地址 |
| 提取码 | 链接文本 / 父节点文本 | 关键词：`提取码/密码/pwd/code` |

## 实现要点

1. **请求策略**
   - 搜索页：`GET https://www.kuakemao.com/?s=关键词`
   - 设置常规浏览器 UA、Referer，必要时加入重试
2. **列表解析**
   - 遍历 `article.excerpt`，提取标题、摘要、分类、时间
   - 由详情 URL 提取 `articleID` 作为唯一后缀
3. **详情页抓取**
   - 进入 `.article-content`，收集 `a[href*="pan.quark.cn"]`
   - 一篇可能提供多条夸克链接，需要全部返回
   - 通过父节点/兄弟文本匹配提取码
4. **链接过滤**
   - 本站只提供夸克网盘，其他域名全部忽略
5. **结果构建**
   - `UniqueID = kkmao-{articleID}`
   - `Channel` 置空
   - `Datetime` 使用搜索结果页的 `<time>`（格式 `2006-01-02`）
   - `Links` 仅包含 `Type="quark"` 的条目

## 示例流程
```
关键词: 物
↓
搜索页: https://www.kuakemao.com/?s=物
  - 解析 article.excerpt
  - 取得标题「某种物质 (2024)...」、详情链接 https://www.kuakemao.com/653.html
↓
详情页: https://www.kuakemao.com/653.html
  - 在 .article-content 中找到 <a href="https://pan.quark.cn/s/631243a6189a">
↓
结果:
  UniqueID: kkmao-653
  Title: 某种物质 (2024) 夸克网盘 法国 恐怖 4K 豆瓣7.5
  Content: 搜索结果页的摘要
  Links: [{Type:"quark", URL:"https://pan.quark.cn/s/631243a6189a", Password:""}]
  Tags: ["电影"]
  Datetime: 2025-11-26
```

## 注意事项
1. 搜索页的 `<time>` 可能缺失，需兜底为当前时间
2. `.note` 中的裸露链接可忽略，以详情页数据为准
3. 页面加载较快，但仍建议设置 10~12 秒超时与 2~3 次重试
4. 站点仅有夸克网盘，插件实现时可直接过滤其它域名
5. 文章正文含大量 `<h2>` 与 `<pre>`，解析提取码时需遍历父节点文本，避免遗漏

