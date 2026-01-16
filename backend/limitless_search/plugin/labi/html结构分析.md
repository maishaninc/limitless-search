# Labi网站 (xiaocge.fun/duopan.fun) 搜索结果HTML结构分析

## 网站信息

- **网站名称**: 免费的云盘分享平台
- **搜索URL格式**: `http://xiaocge.fun/index.php/vod/search/wd/{关键词}.html`
- **详情页URL格式**: `http://xiaocge.fun/index.php/vod/detail/id/{ID}.html`
- **主要特点**: 蜡笔系列网盘资源站，提供4K高清影视资源

## 搜索结果页面结构

搜索结果页面的主要内容位于`.module .module-list .module-items`元素内，每个搜索结果项包含在`.module-search-item`元素中。

```html
<div class="module">
    <div class="module-list">
        <div class="module-items">
            <div class="module-search-item">
                <!-- 单个搜索结果 -->
            </div>
            <div class="module-search-item">
                <!-- 单个搜索结果 -->
            </div>
        </div>
    </div>
</div>
```

### 单个搜索结果结构

每个搜索结果包含以下主要元素：

#### 1. 封面图片和详情页链接

封面图片和播放按钮位于`.video-cover .module-item-cover .module-item-pic`元素中：

```html
<div class="video-cover">
    <div class="module-item-cover">
        <div class="module-item-pic">
            <a href="/index.php/vod/detail/id/11277.html" title="立刻播放折腰(臻彩)">
                <i class="icon-play"></i>
            </a>
            <img class="lazy lazyload" data-src="https://wsrv.nl/?url=https://img9.doubanio.com/view/photo/s_ratio_poster/public/p2921477016.jpg" src="/template/DYXS2/static/picture/loading.png" alt="折腰(臻彩)">
        </div>
    </div>
</div>
```

#### 2. 详情页链接和ID

详情页链接在多个位置出现，格式为`/index.php/vod/detail/id/{ID}.html`，其中`{ID}`是资源的唯一标识符（如`11277`）。

#### 3. 标题和资源类型

标题位于`.video-info-header`元素中：

```html
<div class="video-info-header">
    <a class="video-serial" href="/index.php/vod/detail/id/11277.html" title="折腰(臻彩)">4K HDR 60帧</a>
    <h3><a href="/index.php/vod/detail/id/11277.html" title="折腰(臻彩)">折腰(臻彩)</a></h3>
    <div class="video-info-aux">
        <a href="/index.php/vod/type/id/29.html" title="蜡笔臻彩" class="tag-link">
            <span class="video-tag-icon">蜡笔臻彩</span>
        </a>
        <div class="tag-link"><a href="/index.php/vod/search/year/2025.html" target="_blank">2025</a></div>
        <div class="tag-link"><a href="/index.php/vod/search/area/%E4%B8%AD%E5%9B%BD%E5%A4%A7%E9%99%86.html" target="_blank">中国大陆</a></div>
    </div>
</div>
```

- 资源类型/质量信息在`.video-serial`元素中（如"4K HDR 60帧"、"第36集完结"等）
- 主标题在`h3 a`标签中
- 分类、年代、地区信息在`.video-info-aux`中

#### 4. 导演和主演信息

导演和主演信息位于`.video-info-main`元素中：

```html
<div class="video-info-main">
    <div class="video-info-items">
        <span class="video-info-itemtitle">导演：</span>
        <div class="video-info-item video-info-actor">
            <span class="slash">/</span>
            <a href="/index.php/vod/search/director/%E9%82%93%E7%A7%91.html" target="_blank">邓科</a>
            <span class="slash">/</span>
        </div>
    </div>
    <div class="video-info-items">
        <span class="video-info-itemtitle">主演：</span>
        <div class="video-info-item video-info-actor">
            <span class="slash">/</span>
            <a href="/index.php/vod/search/actor/%E5%AE%8B%E7%A5%96%E5%84%BF.html" target="_blank">宋祖儿</a>
            <span class="slash">/</span>
            <a href="/index.php/vod/search/actor/%E5%88%98%E5%AE%87%E5%AE%81.html" target="_blank">刘宇宁</a>
            <!-- 更多演员... -->
        </div>
    </div>
    <div class="video-info-items">
        <span class="video-info-itemtitle">剧情：</span>
        <div class="video-info-item">小乔（宋祖儿 饰）祖父曾因阵前撤兵致魏氏祖孙被害...</div>
    </div>
</div>
```

#### 5. 操作按钮

操作按钮位于`.video-info-footer`元素中：

```html
<div class="video-info-footer">
    <a href="/index.php/vod/detail/id/11277.html" class="btn-important btn-base" title="立刻播放折腰(臻彩)">
        <i class="icon-play"></i><strong>查看详情</strong>
    </a>
    <a href="/index.php/vod/detail/id/11277.html" class="btn-aux btn-aux-o btn-base" title="下载折腰(臻彩)">
        <i class="icon-download"></i><strong>下载</strong>
    </a>
</div>
```

## 详情页面结构

详情页面包含更完整的资源信息，特别是下载链接等详细信息。

### 1. 页面标题和基本信息

页面标题和基本信息位于`.box.view-heading`元素中：

```html
<div class="box view-heading">
    <div class="video-cover">
        <div class="module-item-cover">
            <div class="module-item-pic">
                <a href="" title="立刻播放折腰(臻彩)"><i class="icon-play"></i></a>
                <img class="lazyload" alt="折腰(臻彩)" data-src="https://wsrv.nl/?url=https://img9.doubanio.com/view/photo/s_ratio_poster/public/p2921477016.jpg" src="/template/DYXS2/static/picture/loading.png">
            </div>
        </div>
    </div>
    <div class="video-info">
        <div class="video-info-header">
            <h1 class="page-title">折腰(臻彩)</h1>
            <h2 class="video-subtitle" title="又名：zheyaozhencai">zheyaozhencai</h2>
            <!-- 分类、年代、地区等信息 -->
        </div>
        <!-- 导演、主演、剧情等详细信息 -->
    </div>
</div>
```

### 2. 下载链接区域

下载链接是该网站的核心功能，位于`#download-list`元素中：

```html
<div class="module" id="download-list" name="download-list">
    <div class="module-heading">
        <h2 class="module-title" title="折腰(臻彩)的影片下载列表">影片下载</h2>
        <div class="module-tab module-player-tab">
            <div class="module-tab-items">
                <div class="module-tab-content">
                    <div class="module-tab-item downtab-item selected">
                        <span data-dropdown-value="夸克云盘">夸克云盘</span><small>1</small>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div class="module-list module-player-list sort-list module-downlist selected">
        <div class="scroll-box-y">
            <div class="module-row-one">
                <div class="module-row-info">
                    <a class="module-row-text copy" href="javascript:;" 
                       data-clipboard-text="https://pan.quark.cn/s/c406e7634b0d"
                       title="复制《折腰(臻彩)》第1集下载地址">
                        <i class="icon-video-file"></i>
                        <div class="module-row-title">
                            <h4>折腰(臻彩) - 第1集</h4>
                            <p>https://pan.quark.cn/s/c406e7634b0d</p>
                        </div>
                    </a>
                    <div class="module-row-shortcuts">
                        <a class="btn-pc btn-down" href="https://pan.quark.cn/s/c406e7634b0d"
                           title="下载《折腰(臻彩)》第1集">
                            <i class="icon-download"></i><span>下载</span>
                        </a>
                        <a class="btn-copyurl copy" href="javascript:;"
                           data-clipboard-text="https://pan.quark.cn/s/c406e7634b0d"
                           title="复制《折腰(臻彩)》第1集下载地址">
                            <i class="icon-url"></i><span class="btn-pc">复制链接</span>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
```

#### 2.1 网盘类型

网盘类型信息在`.module-tab-item`元素中，通过`data-dropdown-value`属性或文本内容获取（如"夸克云盘"）。

#### 2.2 下载链接

下载链接有多个位置可以提取：
- `data-clipboard-text`属性：`https://pan.quark.cn/s/c406e7634b0d`
- `.module-row-title p`元素的文本内容
- `.btn-down`元素的`href`属性

### 3. 相关影片推荐

相关影片推荐位于页面底部，结构类似搜索结果，位于`.module-lines-list .module-items`中。

## 提取逻辑

### 搜索结果页面提取逻辑

1. 定位所有的`.module-search-item`元素
2. 对于每个元素：
   - 从`.module-item-pic a`的`href`属性提取详情页链接
   - 从链接中提取资源ID（如`11277`）
   - 从`h3 a`提取标题
   - 从`.video-serial`提取资源类型/质量信息
   - 从`.video-info-aux`提取分类、年代、地区信息
   - 从`.video-info-main`提取导演、主演、剧情信息
   - 从`img`的`data-src`属性提取封面图片URL

### 详情页面提取逻辑

1. 获取资源基本信息：
   - 标题：`h1.page-title`的文本内容
   - 又名：`h2.video-subtitle`的`title`属性
   - 封面图片：`.module-item-pic img`的`data-src`属性

2. 提取下载链接：
   - 网盘类型：`.module-tab-item span[data-dropdown-value]`的属性值
   - 下载链接：`data-clipboard-text`属性或`.module-row-title p`的文本内容
   - 集数信息：`.module-row-title h4`的文本内容

3. 提取分类和详细信息：
   - 从`.video-info-aux`提取分类、年代、地区
   - 从`.video-info-main`提取导演、主演、剧情等详细信息

## 注意事项

1. **网盘链接格式**: 主要使用夸克网盘，格式为`https://pan.quark.cn/s/{分享码}`，无需单独的密码
2. **图片处理**: 封面图片使用了代理服务`https://wsrv.nl/?url=`来处理原始图片URL
3. **资源分类**: 
   - 蜡笔电影、蜡笔剧集、蜡笔动漫、蜡笔综艺
   - 臻彩4K、蜡笔臻彩、蜡笔短剧等高清分类
4. **延迟加载**: 图片使用了`lazy lazyload`类进行延迟加载
5. **ID提取**: 从URL中提取ID的正则表达式：`/vod/detail/id/(\d+)\.html`
6. **搜索结果分页**: 需要检查是否有分页结构（本次示例中未涉及）
7. **资源状态**: 通过`.video-serial`可以获取资源状态（如"第36集完结"、"4K HDR 60帧"等）