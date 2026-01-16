# daishudj (袋鼠短剧网) HTML结构分析

## 搜索页面

- **URL**: `https://www.daishuduanju.com/?s={关键词}`
- **页面结构**:
  - 列表容器：`div.item-jx.item-blog`
  - 缩略图：`.thumb img`
  - 标题：`.subtitle h5 a`
  - 摘要：`.subtitle p.pdesc`
  - 分类：`.sortbox a.sort`
  - 作者/时间：`.pmbox .l` 内的 `.author`、`.time`

### 单条结果结构
```html
<div class="item-jx item-blog">
  <div class="jxbox">
    <div class="thumb">
      <a href="https://www.daishuduanju.com/1047/">
        <div class="thumb-inner">
          <img src="..." alt="短剧《将军回乡》...">
        </div>
      </a>
      <div class="sortbox"><a href="https://www.daishuduanju.com/duanju/" class="sort sort-1">短剧</a></div>
    </div>
    <div class="subtitle">
      <h5 class="line-tow"><a href="https://www.daishuduanju.com/1047/">短剧《将军回乡》高清完整版全集免费在线观看</a></h5>
      <p class="pdesc">📺 ... 夸克网盘：... https://pan.quark.cn/...</p>
      <div class="pmbox">
        <div class="l">
          <a class="author" href="...">袋鼠短剧网</a>
          <span class="time">2025年11月16日</span>
        </div>
      </div>
    </div>
  </div>
</div>
```

### 提取要点
- **标题**：`h5 a` 文本
- **详情 URL**：`h5 a` 的 `href`
- **摘要**：`p.pdesc` 文本（通常包含观看地址和部分链接）
- **分类标签**：`.sortbox a`
- **发布时间**：`.pmbox .time`（格式含中文，如 `2025年11月16日`）
- **作者**：`.pmbox .author`
- **附带链接**：摘要可能直接包含下载链接，可做快速过滤，但最终以详情页为准

## 详情页面

- **URL 规则**：`https://www.daishuduanju.com/{post_id}/`
- **主体容器**：`.article-body`
- **常见内容顺序**：
  1. 顶部信息框（观看地址、夸克链接按钮）
  2. 介绍/剧情文案（多段 `<p>`）
  3. 相关文章、评论等

### 下载信息块
```html
<div style="...">
  <div style="font-size:18px;font-weight:bold;">📺 观看地址</div>
  <div>
    <span>夸克网盘：将军回乡</span><br/>
    <a href="https://pan.quark.cn/s/703f4c422d24" target="_blank" rel="noopener nofollow">https://pan.quark.cn/s/703f4c422d24</a>
  </div>
  <div style="...">
    <a href="https://pan.quark.cn/s/703f4c422d24" ...>观看全集</a>
  </div>
  ...
</div>
```

### 其他形式
- 纯文本段落：`<p>夸克：https://pan.quark.cn/s/... </p>`
- 多链接场景：介绍底部 `p.pdesc` 或相关内容中附带多个 `https://pan.quark.cn/s/...` 链接
- 可能含有二维码、外部提示、群组链接，可忽略

### DOM 选择建议
- 优先在 `.article-body` 内查找 `<a href>`，筛选包含网盘域名的链接
- 若 `.article-body` 缺失，则回退到整篇文章 `article.post`
- 提取码通常写在同段文本或链接 `href` 参数中，使用关键字匹配 `提取码/密码/pwd`

## 支持的网盘域名
- 夸克：`pan.quark.cn`
- （可扩展）百度、阿里、迅雷等，如出现可重用通用判断逻辑

## 实现要点
1. **搜索**：直接请求 HTML 列表，解析 `.item-jx`，提取基础信息。
2. **详情**：抓取 `.article-body`，搜集 `<a>` 链接，并结合文本解析裸露 URL。
3. **提取码**：在链接周围文本、父节点、相邻节点中搜 `提取码/密码/pwd/code`。
4. **时间格式**：中文日期需转换成 `YYYY-MM-DD`，可替换 `年/月/日`。
5. **去重**：使用文章 ID (`/1047/`) 作为 `UniqueID` 的一部分。 

