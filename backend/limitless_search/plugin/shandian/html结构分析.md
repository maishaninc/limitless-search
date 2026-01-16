# Shandian网站 (闪电优汐) 搜索结果HTML结构分析

## 网站信息

- **网站名称**: 闪电优汐
- **主域名**: `1.95.79.193`
- **备用域名**: `feimaouc.cloud:666`
- **搜索URL格式**: `http://1.95.79.193/index.php/vod/search/wd/{关键词}.html`
- **详情页URL格式**: `http://1.95.79.193/index.php/vod/detail/id/{ID}.html`
- **主要特点**: 闪电系列网盘资源站，提供高清影视资源

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
            <a href="/index.php/vod/detail/id/185331.html" title="立刻播放凡人修仙传真人版">
                <i class="icon-play"></i>
            </a>
            <img class="lazy lazyload" data-src="https://pic.youkupic.com/upload/vod/20250727-1/7136e1260ec9eed9d762742fd5191afa.jpg" src="/template/DYXS2/static/picture/loading.png" alt="凡人修仙传真人版">
        </div>
    </div>
</div>
```

#### 2. 详情页链接和ID

详情页链接在多个位置出现，格式为`/index.php/vod/detail/id/{ID}.html`，其中`{ID}`是资源的唯一标识符（如`185331`）。

#### 3. 标题和资源类型

标题位于`.video-info-header`元素中：

```html
<div class="video-info-header">
    <a class="video-serial" href="/index.php/vod/detail/id/185331.html" title="凡人修仙传真人版">更新至11集</a>
    <h3><a href="/index.php/vod/detail/id/185331.html" title="凡人修仙传真人版">凡人修仙传真人版</a></h3>
    <div class="video-info-aux">
        <a href="/index.php/vod/type/id/2.html" title="闪电剧集" class="tag-link">
            <span class="video-tag-icon">
                <i class="icon-cate-ds"></i>
                闪电剧集
            </span>
        </a>
        <div class="tag-link"><a href="/index.php/vod/search/year/2025.html" target="_blank">2025</a></div>
        <div class="tag-link"><a href="/index.php/vod/search/area/%E5%A4%A7%E9%99%86.html" target="_blank">大陆</a></div>
    </div>
</div>
```

- 资源类型/质量信息在`.video-serial`元素中（如"更新至11集"、"更新至第153集"等）
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
            <a href="/index.php/vod/search/director/%E6%9D%A8%E9%98%B3.html" target="_blank">杨阳</a>
            <span class="slash">/</span>
        </div>
    </div>
    <div class="video-info-items">
        <span class="video-info-itemtitle">主演：</span>
        <div class="video-info-item video-info-actor">
            <span class="slash">/</span>
            <a href="/index.php/vod/search/actor/%E6%9D%A8%E6%B4%8B.html" target="_blank">杨洋</a>
            <span class="slash">/</span>
            <a href="/index.php/vod/search/actor/%E9%87%91%E6%99%A8.html" target="_blank">金晨</a>
            <!-- 更多演员... -->
        </div>
    </div>
    <div class="video-info-items">
        <span class="video-info-itemtitle">剧情：</span>
        <div class="video-info-item">该剧改编自忘语的同名小说，讲述了普通的山村穷小子韩立（杨洋 饰）...</div>
    </div>
</div>
```

#### 5. 操作按钮

操作按钮位于`.video-info-footer`元素中：

```html
<div class="video-info-footer">
    <a href="/index.php/vod/detail/id/185331.html" class="btn-important btn-base" title="立刻播放凡人修仙传真人版">
        <i class="icon-play"></i><strong>查看详情</strong>
    </a>
    <a href="/index.php/vod/detail/id/185331.html" class="btn-aux btn-aux-o btn-base" title="下载凡人修仙传真人版">
        <i class="icon-download"></i><strong>下载</strong>
    </a>
</div>
```

## 详情页面结构

详情页面包含更完整的资源信息，特别是下载链接等详细信息。

### 1. 页面标题和基本信息

页面标题和基本信息位于`.box.view-heading`元素中，结构与搜索结果页面类似。

### 2. 下载链接区域

下载链接是该网站的核心功能，位于`#download-list`元素中：

```html
<div class="module" id="download-list" name="download-list">
    <div class="module-heading">
        <h2 class="module-title" title="凡人修仙传真人版的影片下载列表">影片下载</h2>
        <div class="module-tab module-player-tab">
            <div class="module-tab-items">
                <div class="module-tab-content">
                    <div class="module-tab-item downtab-item selected">
                        <span data-dropdown-value="UC云盘">UC云盘</span><small>1</small>
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
                       data-clipboard-text="https://drive.uc.cn/s/acee11d5310a4?public=1"
                       title="复制《凡人修仙传真人版》第1集下载地址">
                        <i class="icon-video-file"></i>
                        <div class="module-row-title">
                            <h4>凡人修仙传真人版 - 第1集</h4>
                            <p>https://drive.uc.cn/s/acee11d5310a4?public=1</p>
                        </div>
                    </a>
                    <div class="module-row-shortcuts">
                        <a class="btn-pc btn-down" href="https://drive.uc.cn/s/acee11d5310a4?public=1"
                           title="下载《凡人修仙传真人版》第1集">
                            <i class="icon-download"></i><span>下载</span>
                        </a>
                        <a class="btn-copyurl copy" href="javascript:;"
                           data-clipboard-text="https://drive.uc.cn/s/acee11d5310a4?public=1"
                           title="复制《凡人修仙传真人版》第1集下载地址">
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

网盘类型信息在`.module-tab-item`元素中，通过`data-dropdown-value`属性或文本内容获取（如"UC云盘"）。

#### 2.2 下载链接

下载链接有多个位置可以提取：
- `data-clipboard-text`属性：`https://drive.uc.cn/s/acee11d5310a4?public=1`
- `.module-row-title p`元素的文本内容
- `.btn-down`元素的`href`属性

### 3. 相关影片推荐

相关影片推荐位于页面底部，结构类似搜索结果，位于`.module-lines-list .module-items`中。

## 提取逻辑

### 搜索结果页面提取逻辑

1. 定位所有的`.module-search-item`元素
2. 对于每个元素：
   - 从`.module-item-pic a`的`href`属性提取详情页链接
   - 从链接中提取资源ID（如`185331`）
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

## 与 Labi 网站对比

| 项目 | Shandian (闪电优汐) | Labi (免费的云盘分享平台) |
|------|---------------------|---------------------------|
| 域名 | 1.95.79.193 / feimaouc.cloud:666 | xiaocge.fun / duopan.fun |
| 网站名 | 闪电优汐 | 免费的云盘分享平台 |
| 分类名 | 闪电电影、闪电剧集、闪电动漫等 | 蜡笔电影、蜡笔剧集、蜡笔动漫等 |
| 主要网盘 | UC云盘 | 夸克网盘 |
| HTML结构 | **完全一致** | **完全一致** |

## 注意事项

1. **网盘链接格式**: 主要使用UC云盘，格式为`https://drive.uc.cn/s/{分享码}?public=1`，无需单独的密码
2. **图片处理**: 封面图片使用了不同的CDN（pic.youkupic.com、img.ffzy888.com等）
3. **资源分类**: 
   - 闪电电影、闪电剧集、闪电综艺、闪电动漫
   - 闪电短剧等分类
4. **延迟加载**: 图片使用了`lazy lazyload`类进行延迟加载
5. **ID提取**: 从URL中提取ID的正则表达式：`/vod/detail/id/(\d+)\.html`
6. **资源状态**: 通过`.video-serial`可以获取资源状态（如"更新至11集"、"更新至第153集"等）
7. **模板系统**: 使用与Labi相同的DYXS2模板系统，HTML结构几乎完全一致