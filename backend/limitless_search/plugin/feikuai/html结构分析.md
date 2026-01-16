# Feikuai网站 (飞快TV) HTML结构分析

## 网站信息

- **网站名称**: 飞快TV
- **域名**: `feikuai.tv`
- **搜索URL格式**: `https://feikuai.tv/vodsearch/-------------.html?wd={关键词}`
- **详情页URL格式**: `https://feikuai.tv/voddetail/{ID}.html`
- **主要特点**: 影视网盘资源站，支持多种网盘类型下载

## 搜索结果页面结构

搜索结果页面的主要内容位于 `.module-items.module-card-items` 元素内，每个搜索结果项包含在 `.module-card-item.module-item` 元素中。

```html
<div class="module-main module-page" id="ajaxRoot">
  <div class="module-items module-card-items" id="resultList">
    <div class="module-card-item module-item">
      <!-- 单个搜索结果 -->
    </div>
  </div>
</div>
```

### 单个搜索结果结构

每个搜索结果包含以下主要元素：

#### 1. 分类标签

```html
<div class="module-card-item-class">剧集</div>
```

- 类型：电影、剧集、综艺、动漫

#### 2. 封面图片和详情页链接

```html
<a href="/voddetail/157546.html" class="module-card-item-poster">
  <div class="module-item-cover">
    <div class="module-item-note">30集完结</div>
    <div class="module-item-douban">豆瓣:9.3分</div>
    <div class="module-item-pic">
      <img class="lazy lazyload" 
           data-original="/upload/vod/20250727-1/5a8143a6b2e3fea89e11df8090bbdeff.jpg" 
           alt="凡人修仙传" 
           referrerpolicy="no-referrer" 
           src="/upload/mxprocms/20250310-1/4dd2e7fd412a71590c02b9514bf1805c.gif">
    </div>
  </div>
</a>
```

- **详情页链接**: 从 `<a>` 标签的 `href` 属性提取
- **资源ID**: 从URL中提取（如 `157546`）
- **更新状态**: `.module-item-note` 包含集数信息
- **豆瓣评分**: `.module-item-douban` 包含评分（可选）
- **封面图片**: `img` 标签的 `data-original` 属性

#### 3. 标题和基本信息

```html
<div class="module-card-item-info">
  <div class="module-card-item-title">
    <a href="/voddetail/157546.html"><strong>凡人修仙传</strong></a>
  </div>
  <div class="module-info-item">
    <div class="module-info-item-content">2025 <span class="slash">/</span>中国大陆 <span class="slash">/</span> 奇幻,古装</div>
  </div>
  <div class="module-info-item">
    <div class="module-info-item-content">杨洋,金晨,汪铎,赵小棠,...</div>
  </div>
</div>
```

- **标题**: `.module-card-item-title strong` 的文本内容
- **年份/地区/类型**: 第一个 `.module-info-item-content` 包含，用 `/` 分隔
- **演员信息**: 第二个 `.module-info-item-content` 包含演员列表

#### 4. 操作按钮

```html
<div class="module-card-item-footer">
  <a href="/vodplay/157546-1-1.html" class="play-btn icon-btn">
    <i class="icon-play"></i><span>播放</span>
  </a>
  <a href="/voddetail/157546.html" class="play-btn-o"><span>详情</span></a>
</div>
```

### 搜索结果数量

```html
<div class="module-heading-search-result">
  搜索 "<strong>凡人修仙传</strong>"，
  找到 <strong class="mac_total">26</strong> <span class="mac_suffix">部影片</span>
</div>
```

- **搜索关键词**: `.module-heading-search-result strong` (第一个)
- **结果数量**: `.mac_total` 的文本内容

### 分页结构

```html
<div id="resultPaging">
  <div id="page">
    <a href="/vodsearch/%E5%87%A1%E4%BA%BA%E4%BF%AE%E4%BB%99%E4%BC%A0----------1---.html" class="page-link page-previous">首页</a>
    <span class="page-link page-number page-current display">1</span>
    <a href="/vodsearch/%E5%87%A1%E4%BA%BA%E4%BF%AE%E4%BB%99%E4%BC%A0----------2---.html" class="page-link page-number display">2</a>
    <a href="/vodsearch/%E5%87%A1%E4%BA%BA%E4%BF%AE%E4%BB%99%E4%BC%A0----------2---.html" class="page-link page-next">下一页</a>
  </div>
</div>
```

## 详情页面结构

### 1. 基本信息区域

```html
<div class="module module-info">
  <div class="module-main">
    <div class="module-info-poster">
      <div class="module-item-cover">
        <div class="module-item-pic">
          <img class="ls-is-cached lazy lazyload" 
               data-original="/upload/vod/20250727-1/5a8143a6b2e3fea89e11df8090bbdeff.jpg" 
               alt="凡人修仙传">
        </div>
      </div>
    </div>
    <div class="module-info-main">
      <div class="module-info-heading">
        <h1>凡人修仙传</h1>
        <div class="module-info-tag">
          <div class="module-info-tag-link"><a title="2025" href="/vodshow/13-----------2025.html">2025</a></div>
          <div class="module-info-tag-link"><a title="中国大陆" href="/vodshow/13-%E4%B8%AD%E5%9B%BD%E5%A4%A7%E9%99%86----------.html">中国大陆</a></div>
          <div class="module-info-tag-link">
            <a href="/vodshow/13---%E5%A5%87%E5%B9%BB--------.html">奇幻</a><span class="slash">/</span>
            <a href="/vodshow/13---%E5%8F%A4%E8%A3%85--------.html">古装</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

- **标题**: `h1` 标签的文本内容
- **年份**: 第一个 `.module-info-tag-link a` 的 `title` 属性
- **地区**: 第二个 `.module-info-tag-link a` 的 `title` 属性
- **类型**: 第三个 `.module-info-tag-link` 内的所有 `a` 标签文本

### 2. 详细信息

```html
<div class="module-info-content">
  <div class="module-info-items">
    <div class="module-info-item module-info-introduction">
      <div class="module-info-introduction-content">
        <p>该剧改编自忘语的同名小说...</p>
      </div>
    </div>
    <div class="module-info-item">
      <span class="module-info-item-title">导演：</span>
      <div class="module-info-item-content">
        <a href="/vodsearch/-----%E6%9D%A8%E9%98%B3--------.html" target="_blank">杨阳</a><span class="slash">/</span>
      </div>
    </div>
    <div class="module-info-item">
      <span class="module-info-item-title">主演：</span>
      <div class="module-info-item-content">
        <a href="/vodsearch/-%E6%9D%A8%E6%B4%8B------------.html" target="_blank">杨洋</a><span class="slash">/</span>
        <a href="/vodsearch/-%E9%87%91%E6%99%A8------------.html" target="_blank">金晨</a><span class="slash">/</span>
        ...
      </div>
    </div>
  </div>
</div>
```

- **剧情简介**: `.module-info-introduction-content p` 的文本内容
- **导演**: 查找包含 "导演：" 的 `.module-info-item-title`，然后提取 `.module-info-item-content` 中的演员链接
- **主演**: 查找包含 "主演：" 的 `.module-info-item-title`，然后提取 `.module-info-item-content` 中的演员链接

### 3. 网盘下载链接区域 ⭐ 核心

```html
<div class="module" id="download-list" name="download-list">
  <div class="module-heading player-heading">
    <h2 class="module-title">影片下载</h2>
    <div class="module-tab">
      <div class="module-tab-items">
        <div class="module-tab-items-box hisSwiper" id="y-downList">
          <div class="module-tab-item tab-item selected active" 
               data-index="3" 
               data-dropdown-value="百度网盘">
            <span>百度网盘</span>
            <small>1</small>
          </div>
          <div class="module-tab-item tab-item" 
               data-index="2" 
               data-dropdown-value="夸克网盘">
            <span>夸克网盘</span>
            <small>1</small>
          </div>
          <!-- 更多网盘类型... -->
        </div>
      </div>
    </div>
  </div>
</div>
```

#### 网盘类型标签

- **网盘类型**: `.module-tab-item span` 的文本内容
- **数量**: `.module-tab-item small` 的文本内容
- **网盘标识**: `data-dropdown-value` 属性或 `span` 文本

支持的网盘/链接类型：
- 百度网盘 (`baidu`)
- 夸克网盘 (`quark`)
- 迅雷云盘 (`xunlei`)
- 阿里云盘 (`aliyun`)
- 天翼云盘 (`tianyi`)
- UC网盘 (`uc`)
- 115网盘 (`115`)
- 123云盘 (`123`)
- 移动云盘 (`mobile`)
- 磁力链接 (`magnet`)

#### 下载链接列表

```html
<div class="module-list module-player-list sort-list module-downlist">
  <div class="tab-content selected" id="tab-content-3">
    <div class="module-row-info">
      <a class="module-row-text copy"
         href="https://pan.baidu.com/s/1u9aaXsTkL1GdOMIH9qnPCA?pwd=B5B3" 
         target="_blank"
         title="下载《凡人修仙传》">
        <i class="icon-video-file"></i>
        <div class="module-row-title-dlist">
          <h4>凡人修仙传（2025）4K 高码率 更至EP169@一键搜片-2025-11-16 18:55:25</h4>
          <p>https://pan.baidu.com/s/1u9aaXsTkL1GdOMIH9qnPCA?pwd=B5B3</p>
        </div>
      </a>
    </div>
  </div>
  
  <div class="tab-content" id="tab-content-2">
    <div class="module-row-info">
      <a class="module-row-text copy"
         href="https://pan.quark.cn/s/063ce74fbf41" 
         target="_blank"
         title="下载《凡人修仙传》">
        <i class="icon-video-file"></i>
        <div class="module-row-title-dlist">
          <h4>凡人修仙传：外海风云篇 4K [更新至169集]@一键搜片-2025-11-16 18:55:25</h4>
          <p>https://pan.quark.cn/s/063ce74fbf41</p>
        </div>
      </a>
    </div>
  </div>
  
  <div class="tab-content" id="tab-content-6">
    <div class="module-row-info">
      <a class="module-row-text copy"
         href="magnet:?xt=urn:btih:C3A3A53C2408396D64450046361F00650CB9E53E&dn=Strange.Tales.of.Tang.Dynasty.S03E07.2025.2160p.IQ.WEB-DL.H265.DDP5.1-BlackTV.mkv&xl=2458041664" 
         target="_blank"
         title="下载《唐朝诡事录之长安》">
        <i class="icon-video-file"></i>
        <div class="module-row-title-dlist">
          <h4>Strange.Tales.of.Tang.Dynasty.S03E07.2025.2160p.IQ.WEB-DL.H265.DDP5.1-BlackTV.mkv · 2.29GB@一键搜片-2025-11-18 17:09:52</h4>
          <p>magnet:?xt=urn:btih:C3A3A53C2408396D64450046361F00650CB9E53E&dn=Strange.Tales.of.Tang.Dynasty.S03E07.2025.2160p.IQ.WEB-DL.H265.DDP5.1-BlackTV.mkv&xl=2458041664</p>
        </div>
      </a>
    </div>
  </div>
</div>
```

##### 链接数据提取

- **下载链接URL**: `.module-row-text` 的 `href` 属性 或 `.module-row-title-dlist p` 的文本内容
- **网盘/链接类型**: 根据链接URL自动识别
  - 网盘链接：`baidu`, `quark`, `aliyun`, `xunlei`, `tianyi`, `uc`, `115`, `123`, `mobile`
  - 磁力链接：`magnet:?xt=urn:btih:` 开头识别为 `magnet`
  
- **独立标题** (⭐ 重要 - 对应API的 `work_title` 字段):
  - **基础提取**: 从 `.module-row-title-dlist h4` 提取文本内容
  - **清洗处理**: 
    1. 去除末尾的日期时间部分（`@来源-日期 时间`）
    2. 去除文件扩展名（如 `.mkv`, `.mp4` 等）
    3. 去除文件大小信息（如 `· 2.29GB`）
  - **标题拼接规则** (关键):
    - 检查清洗后的独立标题是否包含详情页主标题的关键词
    - **判断方法**: 将详情页标题分词，检查独立标题中是否包含任一关键词（忽略标点和空格）
    - **需要拼接**: 如果不包含关键词，则拼接格式为 `{详情页主标题}-{独立标题}`
    - **无需拼接**: 如果包含关键词，直接使用独立标题
  - **示例**:
    - 网盘链接：`凡人修仙传（2025）4K 高码率 更至EP169@一键搜片-2025-11-16 18:55:25` 
      → 清洗后：`凡人修仙传（2025）4K 高码率 更至EP169`
      → 包含关键词"凡人修仙传"，无需拼接
    - 磁力链接：`Strange.Tales.of.Tang.Dynasty.S03E07.2025.2160p.IQ.WEB-DL.H265.DDP5.1-BlackTV.mkv · 2.29GB@一键搜片-2025-11-18 17:09:52`
      → 详情页标题：`唐朝诡事录之长安`
      → 清洗后：`Strange.Tales.of.Tang.Dynasty.S03E07.2025.2160p.IQ.WEB-DL.H265.DDP5.1-BlackTV`
      → 不包含关键词，需要拼接
      → 最终：`唐朝诡事录之长安-Strange.Tales.of.Tang.Dynasty.S03E07.2025.2160p.IQ.WEB-DL.H265.DDP5.1-BlackTV`

- **日期提取** (对应API的 `datetime` 字段):
  - 从独立标题中提取日期时间信息
  - 日期格式：`@来源-YYYY-MM-DD HH:mm:ss`
  - 正则表达式：`@[^-]+-(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})`
  - 示例：从 `@一键搜片-2025-11-16 18:55:25` 提取 `2025-11-16 18:55:25`

## 提取逻辑

### 搜索结果页面提取逻辑

1. 定位所有的 `.module-card-item.module-item` 元素
2. 对于每个元素：
   - 从 `.module-card-item-poster` 的 `href` 属性提取详情页链接
   - 从链接中提取资源ID（如 `157546`）
   - 从 `.module-card-item-title strong` 提取标题
   - 从 `.module-card-item-class` 提取分类
   - 从 `.module-item-note` 提取更新状态
   - 从 `.module-item-douban` 提取豆瓣评分（可选）
   - 从第一个 `.module-info-item-content` 提取年份/地区/类型
   - 从第二个 `.module-info-item-content` 提取演员列表
   - 从 `img` 的 `data-original` 属性提取封面图片URL

### 详情页面提取逻辑

1. 获取资源基本信息：
   - 标题：`h1` 的文本内容
   - 年份：第一个 `.module-info-tag-link a[title]` 的 `title` 属性
   - 地区：第二个 `.module-info-tag-link a[title]` 的 `title` 属性
   - 类型：第三个 `.module-info-tag-link` 内的所有 `a` 标签文本
   - 封面图片：`.module-info-poster img` 的 `data-original` 属性

2. 提取详细信息：
   - 剧情简介：`.module-info-introduction-content p` 的文本内容
   - 导演：查找包含 "导演：" 的 `.module-info-item`，提取其中的 `a` 标签文本
   - 主演：查找包含 "主演：" 的 `.module-info-item`，提取其中的 `a` 标签文本

3. 提取下载链接（⭐ 核心）：
   - 遍历所有 `.module-tab-item`，获取网盘类型和数量
   - 对应每个 `.tab-content`，提取其中的 `.module-row-info`
   - 对每个 `.module-row-info`：
     - **链接URL**: 从 `.module-row-text` 的 `href` 属性或 `.module-row-title-dlist p` 提取
     - **链接类型**: 根据链接URL自动识别（网盘类型或 `magnet`）
     - **原始标题**: 从 `.module-row-title-dlist h4` 提取完整文本
     - **独立标题** (`work_title`): 
       1. 清洗原始标题（去除日期、扩展名、文件大小）
       2. 检查是否包含详情页主标题关键词
       3. 如不包含，拼接为 `{详情页主标题}-{清洗后标题}`
     - **日期时间** (`datetime`): 从原始标题中提取日期，使用正则 `@[^-]+-(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})`
     - **密码**: 从URL参数中提取（如 `?pwd=xxx` 或 `?password=xxx`，仅适用于部分网盘）

## 网盘链接和磁力链接格式

| 类型 | URL特征 | 密码格式 |
|---------|---------|---------|
| 百度网盘 | `pan.baidu.com` | `?pwd=` 参数 |
| 夸克网盘 | `pan.quark.cn` | 无密码或单独提供 |
| 阿里云盘 | `alipan.com` 或 `aliyundrive.com` | 无密码 |
| 迅雷网盘 | `pan.xunlei.com` | `?pwd=` 参数 |
| 天翼云盘 | `cloud.189.cn` | 无密码 |
| UC网盘 | `drive.uc.cn` | 无密码 |
| 115网盘 | `115cdn.com` | `?password=` 参数 |
| 123网盘 | `123684.com`, `123685.com`, `123912.com` | 无密码 |
| 移动云盘 | `caiyun.139.com` | 无密码 |
| 磁力链接 | `magnet:?xt=urn:btih:` | 无密码 |

## API字段映射

根据README的API文档，Link对象字段映射关系：

| API字段 | HTML提取位置 | 提取方法 | 示例 |
|---------|------------|---------|------|
| `type` | 链接URL | 自动识别URL特征 | `baidu`, `quark`, `tianyi`, `magnet` 等 |
| `url` | `.module-row-title-dlist p` 或 `href` | 文本内容或属性值 | `https://pan.baidu.com/s/xxx` 或 `magnet:?xt=...` |
| `password` | 链接URL参数 | 提取 `?pwd=` 或 `?password=` | `B5B3`, `yyds` (仅部分网盘) |
| `datetime` | `.module-row-title-dlist h4` | 正则提取日期时间 | `2025-11-16 18:55:25` |
| `work_title` | `.module-row-title-dlist h4` + 详情页主标题 | 清洗+关键词检查+拼接 | 见下方详细说明 |

**`work_title` 字段详细处理流程**:

1. **提取原始标题**: 从 `.module-row-title-dlist h4` 获取完整文本
   - 示例1: `凡人修仙传（2025）4K 高码率 更至EP169@一键搜片-2025-11-16 18:55:25`
   - 示例2: `Strange.Tales.of.Tang.Dynasty.S03E07.2025.2160p.IQ.WEB-DL.H265.DDP5.1-BlackTV.mkv · 2.29GB@一键搜片-2025-11-18 17:09:52`

2. **清洗标题**:
   - 去除日期时间部分: 删除 `@来源-日期 时间` 格式的后缀
   - 去除文件扩展名: 删除 `.mkv`, `.mp4`, `.avi` 等
   - 去除文件大小: 删除 `· 2.29GB` 等文件大小信息
   - 清洗结果1: `凡人修仙传（2025）4K 高码率 更至EP169`
   - 清洗结果2: `Strange.Tales.of.Tang.Dynasty.S03E07.2025.2160p.IQ.WEB-DL.H265.DDP5.1-BlackTV`

3. **关键词检查与拼接**:
   - 获取详情页主标题（如 `唐朝诡事录之长安`）
   - 将主标题分词，提取关键词（忽略标点符号和空格）
   - 检查清洗后的独立标题是否包含任一关键词
   - **包含关键词**: 直接使用清洗后的标题
     - 示例: `凡人修仙传（2025）4K 高码率 更至EP169` (包含"凡人修仙传")
   - **不包含关键词**: 拼接格式为 `{详情页主标题}-{清洗后标题}`
     - 示例: `唐朝诡事录之长安-Strange.Tales.of.Tang.Dynasty.S03E07.2025.2160p.IQ.WEB-DL.H265.DDP5.1-BlackTV`

**其他字段说明**:
- `datetime`: 从原始 `h4` 标题中提取的时间戳，格式为 `YYYY-MM-DD HH:mm:ss`
- `password`: 部分网盘（百度、迅雷、115）的密码在URL参数中，需要单独提取；磁力链接无密码

## 注意事项

1. **图片延迟加载**: 封面图片使用了 `lazy lazyload` 类，实际图片URL在 `data-original` 属性中

2. **资源ID提取**: 从URL中提取ID的正则表达式：`/voddetail/(\d+)\.html`

3. **链接类型识别**:
   - 网盘链接：通过域名识别（`pan.baidu.com`, `pan.quark.cn` 等）
   - 磁力链接：通过 `magnet:?xt=urn:btih:` 前缀识别

4. **网盘链接密码**: 某些网盘的密码包含在URL参数中（如 `?pwd=B5B3`），需要分离链接和密码；磁力链接无密码

5. **独立标题处理** (⭐ 核心重点):
   - 每个链接都有独立的 `h4` 标题，必须单独提取
   - 需要清洗标题（去除日期、扩展名、文件大小）
   - **关键词检查**: 必须检查清洗后标题是否包含详情页主标题的关键词
   - **拼接规则**: 不包含关键词时，需拼接为 `{详情页主标题}-{清洗后标题}`
   - 特别注意磁力链接的标题通常是英文文件名，大概率需要拼接中文标题

6. **日期时间提取** (重要): 
   - 从 `h4` 标题末尾提取日期时间
   - 格式为 `@来源-YYYY-MM-DD HH:mm:ss`
   - 正则表达式: `@[^-]+-(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})`

7. **多链接支持**: 一个资源可能有多个网盘和磁力链接，每个链接都有独立的标题、时间和密码

8. **分页处理**: 搜索结果有分页，URL格式为 `/vodsearch/{关键词}----------{页码}---.html`

9. **AJAX加载**: 网站使用AJAX动态加载搜索结果，需要注意异步请求处理

10. **反爬虫**: 图片设置了 `referrerpolicy="no-referrer"`，需要在请求头中处理
