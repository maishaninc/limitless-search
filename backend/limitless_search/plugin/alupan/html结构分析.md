# alupan (阿里U盘) HTML结构分析

## 网站信息
- **站点名称**: 阿里U盘
- **域名**: `www.aliupan.com`
- **类型**: 影视/图书等资源聚合站（WordPress D8 主题）
- **特点**: 搜索结果页按文章列表展示，详情页正文直接给出阿里云盘/夸克网盘链接，文章数量大、分类细

## 搜索/列表页

### 1. 请求入口
```
https://www.aliupan.com/?s={关键词}
```
- 关键词直接 UTF-8；无需额外参数
- 返回 WordPress 搜索结果页（带 `archive-header`）

### 2. 结果容器
- 外层：`section.container > .content-wrap > .content`
- 列表项：`article.excerpt`（常见类名 `excerpt-titletype`）

### 3. 单条记录
```html
<article class="excerpt excerpt-titletype">
  <div class="focus">
    <a href="https://www.aliupan.com/?p=7078" class="thumbnail">
      <img src="..." alt="[阿里云盘][夸克网盘]《遮天》（2023年）" />
    </a>
  </div>
  <header>
    <a class="label label-important" href="https://www.aliupan.com/?cat=19">中国内地电视剧<i class="label-arrow"></i></a>
    <h2>
      <a href="https://www.aliupan.com/?p=7078" title="...">[阿里云盘][夸克网盘]《遮天》（2023年）</a>
    </h2>
  </header>
  <p>
    <span class="muted"><i class="icon-user"></i><a href="...">阿里U盘</a></span>
    <span class="muted"><i class="icon-time"></i> 1年前 (2024-07-27)</span>
    <span class="muted"><i class="icon-eye-open"></i> 745浏览</span>
    <span class="muted"><i class="icon-comment"></i><a href="...">0评论</a></span>
  </p>
  <p class="note">……摘要文本……</p>
</article>
```

#### 需要提取的字段
- **标题**: `h2 a` 文本
- **详情链接**: `h2 a[href]`
- **分类**: `.label.label-important` 文本（可作为 `Tags` 之一）
- **发布日期**: `p > span .icon-time` 所在 `<span>`，格式通常为 `1年前 (2024-07-27)`；取括号内日期
- **摘要**: `p.note`
- **封面**: `div.focus img[src]`（仅用于调试，不需要在结果中返回）

### 4. 分页
- 搜索页默认返回全部匹配列表，可根据需要继续解析分页链接（一般抓取第一页即可）。

## 详情页

### 1. URL 规则
```
https://www.aliupan.com/?p={文章ID}
```
- `文章ID` 来自列表页 URL，可直接作为唯一标识。

### 2. 主体定位
- 标题：`.article-header .article-title a`
- 元信息：`.meta`（含分类、作者、时间、阅读）
- 正文：`article.article-content`

### 3. 下载链接形态
正文中使用普通段落给出下载地址：
```html
<p>阿里云盘丨遮天：<a href="https://www.aliyundrive.com/s/xxxx" target="_blank" rel="nofollow">https://www.aliyundrive.com/s/xxxx</a></p>
<p>夸克网盘丨遮天：<a href="https://pan.quark.cn/s/5ad996dc0725" target="_blank" rel="noreferrer noopener nofollow">https://pan.quark.cn/s/5ad996dc0725</a></p>
```
- 个别文章会出现“待补”等文字；只返回真正包含链接的 `<a>`。
- 可能同文提供多个链接（夸克 / 阿里云盘 / 其他），需要全部收集。
- 提取码通常写在同一段落文本里，形如 `提取码：xxxx`、`密码：xxxx` 等。

### 4. 支持的网盘域名
- **阿里云盘**: `https://www.aliyundrive.com/s/`、`https://www.aliyundrive.com/drive/folder/`
- **夸克网盘**: `https://pan.quark.cn/s/`
- 可根据站点实际扩展（如出现 `pan.baidu.com` 等）

## CSS 选择器速览

| 数据项 | 选择器/规则 |
|--------|-------------|
| 列表项 | `article.excerpt` |
| 标题 & 链接 | `article.excerpt h2 a` |
| 分类标签 | `article.excerpt header .label` |
| 摘要 | `article.excerpt p.note` |
| 发布时间 | `article.excerpt p .icon-time` 所在 `<span>`；取括号中的日期 |
| 正文容器 | `article.article-content` |
| 网盘链接 | `.article-content a[href*="pan.quark.cn"]`、`a[href*="aliyundrive.com"]` 等 |

## 提取策略
1. **搜索页**  
   - 构建 `https://www.aliupan.com/?s=keyword`，使用浏览器 UA、防爬 Header。
   - 解析 `article.excerpt`，抓取基本元信息。
   - 由 `?p={id}` 提取 ID，构建唯一键 `alupan-{id}`。

2. **详情页**  
   - 访问正文 `.article-content`。
   - 遍历所有 `<a>`，通过域名判断网盘类型。
   - 在链接文本或父级文本中搜索提取码关键词（`提取码/密码/pwd/code`）。
   - 多个链接去重（同地址只保留一次）。

3. **时间解析**  
   - 优先解析括号内日期（`YYYY-MM-DD`）。  
   - 若无括号，只能是 `YYYY-MM-DD` 或 `YYYY年MM月DD日`，按常见格式匹配；失败则用当前时间。

4. **性能优化建议**
   - 统一使用定制 `http.Client`（连接池 + TLS/Expect 超时 + HTTP/2）。
   - 搜索与详情请求加入指数退避重试（至少 2~3 次）。
   - 对详情解析结果加 TTL 缓存（例如 1 小时），避免重复抓取。
   - 使用信号量控制同时抓取的详情页数量，推荐 10~15。

## 示例数据流
```
1. 请求 https://www.aliupan.com/?s=遮天
2. 列表项：
   - 标题: [阿里云盘][夸克网盘]《遮天》（2023年）
   - 分类: 中国内地电视剧
   - 日期: 1年前 (2024-07-27)
   - 摘要: 阿里云盘丨遮天：待补 夸克网盘丨遮天：https://pan.quark.cn/...
   - 详情: https://www.aliupan.com/?p=7078
3. 详情解析：
   - `https://pan.quark.cn/s/5ad996dc0725`
4. 构建结果：
   UniqueID: alupan-7078  
   Title: [阿里云盘][夸克网盘]《遮天》（2023年）  
   Links: [{Type:"quark", URL:"https://pan.quark.cn/s/5ad996dc0725", Password:""}]  
   Tags: ["中国内地电视剧"]  
   Datetime: 2024-07-27T00:00:00+08:00
```

## 注意事项
1. **摘要中的裸链**：虽然摘要有时包含 URL，但仍应以详情页数据为准。
2. **缺失链接**：如果正文中没有有效网盘链接（例如“待补”），忽略该文章。
3. **多链接**：同一篇可能同时提供阿里云盘与夸克链接，均需返回。
4. **缓存**：文章更新较频繁，建议缓存加入 TTL，并定时清理。
5. **编码**：站点内容大量中文，解析时确保使用 UTF-8。

