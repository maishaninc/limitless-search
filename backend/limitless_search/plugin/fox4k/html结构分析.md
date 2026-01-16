# 极狐4K (4kfox.com) 网站搜索结果HTML结构分析

## 网站信息

- **网站名称**: 极狐4K
- **网站域名**: www.4kfox.com
- **搜索URL格式**: `https://www.4kfox.com/search/{关键词}-------------.html`
- **详情页URL格式**: `https://www.4kfox.com/video/{ID}.html`
- **主要特点**: 专注于4K高清影视资源，提供磁力链接和在线播放

## 搜索结果页面结构

搜索结果页面的主要内容位于`.hl-list-wrap .hl-one-list`元素内，每个搜索结果项包含在`.hl-list-item`元素中。

```html
<div class="hl-list-wrap">
    <ul class="hl-one-list hl-theme-by362695000 clearfix">
        <li class="hl-list-item hl-col-xs-12">
            <!-- 单个搜索结果 -->
        </li>
        <!-- 更多搜索结果... -->
    </ul>
</div>
```

### 单个搜索结果结构

每个搜索结果包含以下主要元素：

#### 1. 封面图片和详情页链接

封面图片位于`.hl-item-wrap .hl-item-pic`元素中：

```html
<div class="hl-item-wrap clearfix">
    <div class="hl-item-div">
        <div class="hl-item-pic">
            <a class="hl-item-thumb hl-lazy" href="/video/61516.html" title="变形金刚：赛博坦之战第二季" data-original="/upload/vod/20250724-17/759cc2eabfa1a13ff498481d1a8f0b36.jpg">
                <div class="hl-pic-icon hl-hidden-xs"><i class="iconfont hl-icon-bofang-fill"></i></div>
                <div class="hl-pic-text">
                    <span class="hl-lc-1 remarks">已完结</span>
                </div>
            </a>
        </div>
    </div>
</div>
```

- 详情页链接：`href`属性，格式为`/video/{ID}.html`
- 封面图片：`data-original`属性
- 资源状态：`.hl-pic-text .remarks`元素中的文本（如"已完结"、"HD"等）

#### 2. 标题和基本信息

标题和基本信息位于`.hl-item-content`元素中：

```html
<div class="hl-item-content">
    <div class="hl-item-title hl-text-site hl-lc-2">
        <a href="/video/61516.html" title="变形金刚：赛博坦之战第二季">变形金刚：赛博坦之战第二季</a>
    </div>
    <p class="hl-item-sub hl-lc-1">
        <span class="hl-text-conch score">6.9</span>&nbsp;·&nbsp;2020&nbsp;·&nbsp;美国&nbsp;·&nbsp;科幻&nbsp;机战&nbsp;
    </p>
    <p class="hl-item-sub hl-text-muted hl-lc-1 hl-hidden-xs"></p>
    <p class="hl-item-sub hl-text-muted hl-lc-2">
        《变形金刚：赛博坦之战 第二季》讲述的是：　　《赛博坦之战》推出第二章"地出"！...
    </p>
    <div class="hl-item-btn">
        <a class="hl-btn-border" href="/video/61516.html">查看详情</a>
    </div>
</div>
```

- 标题：`.hl-item-title a`的文本内容
- 评分：`.hl-text-conch.score`的文本内容
- 年份、地区、类型：第一个`.hl-item-sub`中的信息，以`·`分隔
- 简介：最后一个`.hl-item-sub`的文本内容

#### 3. 分页信息

分页信息位于`.hl-page-wrap`元素中：

```html
<ul class="hl-page-wrap hl-text-center cleafix">
    <li class="hl-hide-sm"><a href="/search/...----------1---.html" class="hl-disad"><i class="iconfont hl-icon-jiantoushou"></i></a></li>
    <li><a href="/search/...----------1---.html" class="hl-disad">上一页</a></li>
    <li class="hl-hidden-xs"><a href="javascript:;" class="active">1</a></li>
    <li class="hl-hidden-xs"><a href="/search/...----------2---.html">2</a></li>
    <li><a href="/search/...----------2---.html">下一页</a></li>
    <li class="hl-hide-sm"><a href="/search/...----------2---.html"><i class="iconfont hl-icon-jiantouwei"></i></a></li>
</ul>
```

## 详情页面结构

详情页面包含更完整的资源信息，特别是磁力链接和播放源等下载信息。

### 1. 基本信息

基本信息位于`.hl-detail-content`元素中：

```html
<div class="hl-detail-content hl-marg-right50 clearfix">
    <div class="hl-dc-pic">
        <span class="hl-item-thumb hl-lazy" title="变形金刚：赛博坦之战第二季" data-original="/upload/vod/20250724-17/759cc2eabfa1a13ff498481d1a8f0b36.jpg">
            <div class="hl-pic-tag">
                <span class="douban">6.9</span>
            </div>
        </span>
    </div>
    <div class="hl-dc-content">
        <div class="hl-dc-headwrap">
            <h2 class="hl-dc-title hl-data-menu">变形金刚：赛博坦之战第二季 (2020)</h2>
        </div>
    </div>
</div>
```

### 2. 详细信息

详细信息位于`.hl-vod-data`元素中：

```html
<div class="hl-vod-data hl-full-items">
    <div class="hl-data-sm hl-full-alert hl-full-x100">
        <div class="hl-full-box clearfix">
            <ul class="clearfix">
                <li class="hl-col-xs-12"><em class="hl-text-muted">类型：</em><a href="/search/----%E7%A7%91%E5%B9%BB---------.html" target="_blank">科幻</a><i>/</i><a href="/search/----%E6%9C%BA%E6%88%98---------.html" target="_blank">机战</a><i>/</i></li>
                <li class="hl-col-xs-12"><em class="hl-text-muted">地区：</em>美国</li>
                <li class="hl-col-xs-12"><em class="hl-text-muted">语言：</em>英语</li>
                <li class="hl-col-xs-12"><em class="hl-text-muted">上映：</em>2020-12-30(美国)</li>
                <li class="hl-col-xs-12"><em class="hl-text-muted">时长：</em>30分钟</li>
            </ul>
        </div>
    </div>
</div>
```

### 3. 播放列表

播放列表位于`.hl-rb-playlist`元素中：

```html
<div class="hl-row-box hl-rb-playlist hl-tabs-item clearfix" id="playlist">
    <div class="hl-rb-head clearfix">
        <h3 class="hl-rb-title">播放列表</h3>
    </div>
    <div class="hl-play-source hl-hidden">
        <div class="hl-plays-from hl-tabs swiper-wrapper clearfix">
            <a class="hl-tabs-btn hl-slide-swiper active" href="javascript:void(0);" alt="天堂源">天堂源</a>
            <a class="hl-tabs-btn hl-slide-swiper" href="javascript:void(0);" alt="暴风源">暴风源</a>
            <a class="hl-tabs-btn hl-slide-swiper" href="javascript:void(0);" alt="非凡源">非凡源</a>
        </div>
        <div class="hl-tabs-box hl-fadeIn" style="display: block;">
            <div class="hl-list-wrap">
                <ul class="hl-plays-list hl-sort-list clearfix" id="hl-plays-list">
                    <li class="hl-col-xs-4 hl-col-sm-2"><a href="/play/61516-1-1.html">第01集</a></li>
                    <li class="hl-col-xs-4 hl-col-sm-2"><a href="/play/61516-1-2.html">第02集</a></li>
                    <!-- 更多集数... -->
                </ul>
            </div>
        </div>
    </div>
</div>
```

### 4. 磁力&网盘下载区域

下载链接区域位于`.hl-rb-downlist`元素中：

```html
<div class="hl-row-box hl-rb-downlist hl-tabs-item clearfix" id="downlist">
    <div class="hl-rb-head clearfix">
        <h3 class="hl-rb-title">磁力&网盘</h3>
    </div>
    <div class="hl-play-source hl-hidden">
        <div class="hl-plays-from hl-tabs swiper-wrapper clearfix">
            <a class="hl-tabs-btn hl-slide-swiper active" href="javascript:void(0);" alt="中字720P">中字720P <span>6</span></a>
            <a class="hl-tabs-btn hl-slide-swiper" href="javascript:void(0);" alt="中字1080P">中字1080P <span>1</span></a>
        </div>
        <div class="hl-tabs-box hl-fadeIn" style="display: block;">
            <div class="hl-list-wrap">
                <ul class="swiper-slide hl-downs-list hl-sort-list clearfix" id="hl-downs-list">
                    <li>
                        <div class="hl-downs-box">
                            <span class="text hl-lc-1">
                                <a class="down-name" href="magnet:?xt=urn:btih:E18A64B7A04B52891C520427D1565697031A1201" target="_blank">
                                    <em class="filename">变形金刚：赛博坦之战.Transformers.War.For.Cybertron.Trilogy.S02E01.官方中字.WEBrip.720P.mp4[262.49MB]</em>
                                    <em class="filesize"></em>
                                </a>
                            </span>
                            <span class="btns">
                                <a class="hl-text-white down-copy conch-copy down-xm" href="javascript:void(0)" 
                                   data-clipboard-action="copy" 
                                   data-clipboard-text="magnet:?xt=urn:btih:E18A64B7A04B52891C520427D1565697031A1201">复制链接</a>
                            </span>
                        </div>
                    </li>
                    <!-- 更多下载链接... -->
                </ul>
            </div>
        </div>
    </div>
</div>
```

#### 4.1 磁力链接

磁力链接位于`.down-name`元素的`href`属性中，或者`.down-copy`元素的`data-clipboard-text`属性中。

- 链接格式：`magnet:?xt=urn:btih:...`
- 文件名：`.filename`元素的文本内容
- 文件大小：`.filesize`元素的文本内容（可能为空）

### 5. 剧情简介

剧情简介位于`.hl-rb-content`元素中：

```html
<div class="hl-row-box hl-rb-content clearfix">
    <div class="hl-rb-head clearfix">
        <h3 class="hl-rb-title">剧情简介</h3>
    </div>
    <div class="hl-content-wrap hl-content-hide">
        <span class="hl-content-text">
            <em>《赛博坦之战》推出第二章"地出"！随着火种源的消失，威震天被迫面对残酷的现实...</em>
        </span>
    </div>
</div>
```

## 提取逻辑

### 搜索结果页面提取逻辑

1. 定位所有的`.hl-list-item`元素
2. 对于每个元素：
   - 从`.hl-item-pic a`的`href`属性提取详情页链接
   - 从链接中提取资源ID（格式：`/video/(\d+)\.html`）
   - 从`.hl-item-title a`提取标题
   - 从`.hl-pic-text .remarks`提取资源状态
   - 从`.hl-text-conch.score`提取评分
   - 从第一个`.hl-item-sub`提取年份、地区、类型信息
   - 从最后一个`.hl-item-sub`提取简介
   - 从`data-original`属性提取封面图片URL

3. 检查分页：
   - 从`.hl-page-wrap`中提取分页链接，用于继续抓取后续页面

### 详情页面提取逻辑

1. 获取资源基本信息：
   - 标题：`h2.hl-dc-title`的文本内容
   - 评分：`.hl-pic-tag .douban`的文本内容
   - 封面图片：`.hl-dc-pic .hl-item-thumb`的`data-original`属性

2. 提取详细信息：
   - 从`.hl-vod-data ul li`中提取类型、地区、语言、上映日期、时长等信息

3. 提取磁力链接：
   - 定位`.hl-rb-downlist`区域
   - 遍历所有`.hl-tabs-btn`获取不同质量版本
   - 从`.hl-downs-list li`中提取磁力链接：
     - 磁力链接：`.down-name`的`href`属性或`.down-copy`的`data-clipboard-text`属性
     - 文件名：`.filename`的文本内容
     - 文件大小：`.filesize`的文本内容

4. 提取剧情简介：
   - 从`.hl-content-wrap .hl-content-text`提取剧情简介

## 注意事项

1. **搜索URL格式**: `https://www.4kfox.com/search/{关键词}-------------.html`，关键词需要URL编码
2. **详情页URL格式**: `https://www.4kfox.com/video/{ID}.html`
3. **资源类型**: 主要提供磁力链接，以4K高清资源为主
4. **分页处理**: 搜索结果支持分页，需要根据`.hl-page-wrap`中的链接继续抓取
5. **图片延迟加载**: 封面图片使用`data-original`属性进行延迟加载
6. **ID提取**: 从URL中提取ID的正则表达式：`/video/(\d+)\.html`
7. **磁力链接**: 提供多种质量版本（720P、1080P等），每个版本可能有多集
8. **播放源**: 提供多个在线播放源（天堂源、暴风源、非凡源等）
9. **网站编码**: 页面使用UTF-8编码
10. **反爬虫**: 需要设置合适的User-Agent和请求头，避免被反爬虫机制拦截