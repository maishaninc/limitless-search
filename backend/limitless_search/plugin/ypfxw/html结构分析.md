# ypfxw (网盘资源分享网) HTML结构分析

## 网站信息
- **站点名称**: 网盘资源分享网
- **域名**: `ypfxw.com`
- **系统**: Z-Blog (主题 `qk_teat`)
- **特点**: 资源覆盖影视/动漫/学习等，搜索结果页为图文列表，正文直接放出多个网盘链接（夸克、百度等），常伴随广告段落

## 搜索 / 列表页面

### 1. 搜索 URL
```
https://ypfxw.com/search.php?q={关键词}
```
- 也可通过 `search.php?act=search&q=...` 发起
- 关键词可直接使用 UTF-8 中文

### 2. DOM 结构
- 列表容器：`div.list > ul`
- 列表项：`div.list ul > li`

#### 单项结构
```html
<li>
  <div class="img">
    <a href="https://ypfxw.com/post/103580.html">
      <span class="img-box"><img src="..." alt="..."></span>
    </a>
  </div>
  <div class="imgr">
    <h2><a href="https://ypfxw.com/post/103580.html"><span>标题</span></a></h2>
    <p>简介/描述，末尾可能带 “链接：https://pan.quark.cn/s/...”</p>
    <div class="info">
      <span><a href="..."><i class="fa fa-columns"></i>影视资源</a></span>
      <span><i class="fa fa-clock-o"></i>2025-11-25</span>
      <span><i class="fa fa-eye"></i>44</span>
      <span><i class="fa fa-comments"></i>0</span>
      <span class="tag">
        <a href="...">夸克网盘</a>
        <a href="...">2025</a>
      </span>
    </div>
  </div>
</li>
```

#### 需要提取
- **标题**: `div.imgr h2 a` 文本
- **详情链接**: 同上 `href`
- **摘要**: `div.imgr p` 文本（含“名称/描述/链接”）
- **分类**: `.info span:first-child a` 文本，可入 `Tags`
- **发布时间**: `.info span i.fa-clock-o` 的父节点文本（格式 `YYYY-MM-DD`）
- **标签**: `.info span.tag a`

## 详情页

### 1. URL 模式
```
https://ypfxw.com/post/{文章ID}.html
```
- ID 可用于 `UniqueID`

### 2. 关键节点
- 标题：`.post .title h1`
- 元信息：`.post .title .info`
- 正文：`.post .article_content`
- 标签：`.post span.tag a`

### 3. 下载信息
- 正文内 `p` 标签通常按照 “链接：URL” 或直接裸露 URL
- 可能出现多条链接（夸克、百度、群组等），需要根据域名筛选
- 有些链接是 `<a href="URL">`，也有纯文本 `https://...` 形式
- 提取码一般紧随链接，例如 `https://pan.baidu.com/... ?pwd=2222`、`提取码：xxxx`、`密码：xxxx`

### 4. 常见网盘域名
- 夸克：`https://pan.quark.cn/s/...`
- 百度：`https://pan.baidu.com/s/...`
- 夸克群：`https://pan.quark.cn/g/...`
- 其他：视情况扩展（如 `aliyundrive.com`, `123pan.com` 等）

## 提取策略
1. **列表页**
   - 请求 `search.php?q=关键字`
   - 遍历 `div.list ul > li`
   - 提取标题/链接/摘要/分类/时间/标签
   - 通过 `/post/{id}.html` 提取唯一 ID

2. **详情页**
   - 访问 `.article_content`
   - 解析所有 `<a href>`，按域名判断是否为网盘链接
   - 额外对正文纯文本使用正则匹配 `https?://...`，以捕获未包裹 `<a>` 的链接
   - 针对链接周围文本或 `title`、父节点文本匹配提取码关键词（`提取码`/`密码`/`pwd`/`code` 等）
   - 多链接去重；同一篇返回多个 `model.Link`

3. **时间处理**
   - 列表页 `span` 文本即 `YYYY-MM-DD`
   - 详情页元信息含完整时间 `YYYY-MM-DD HH:MM:SS`，可作为 fallback

4. **性能/稳定性**
   - 采用自定义 `http.Client`（连接池、HTTP/2、TLS 超时）
   - 搜索/详情请求均加指数退避重试
   - 详情解析结果加入 TTL 缓存，减少重复访问
   - 使用信号量控制并发抓取，避免压垮目标站点

## 示例
1. 搜索 `凡人修仙传` -> 结果项 `https://ypfxw.com/post/103580.html`
2. 详情页正文出现：
```
链接：https://pan.quark.cn/s/08211da2cb83
```
3. 输出：
```
UniqueID: ypfxw-103580
Title: 凡人修仙传 ... 重返天南 ...
Links: [{Type:"quark", URL:"https://pan.quark.cn/s/08211da2cb83", Password:""}]
Tags: ["影视资源","夸克网盘","2025","免费下载"]
Datetime: 2025-11-25
```

