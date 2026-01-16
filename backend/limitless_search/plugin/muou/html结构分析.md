# 木偶(muou)网站HTML结构分析

## 基本信息
- **网站名称**: 中华人民共和国万岁(木偶网站)
- **域名**: `123.666291.xyz`
- **搜索URL格式**: `http://123.666291.xyz/index.php/vod/search/wd/{关键词}.html`
- **详情页URL格式**: `http://123.666291.xyz/index.php/vod/detail/id/{ID}.html`
- **网站特点**: 影视资源搜索网站，支持多种网盘下载

## 搜索结果页面结构

### 主要容器
```html
<div class="module">
    <div class="module-list">
        <div class="module-items">
            <!-- 搜索结果列表 -->
        </div>
    </div>
</div>
```

### 单个搜索结果项
```html
<div class="module-search-item">
    <div class="video-cover">
        <div class="module-item-cover">
            <div class="module-item-pic">
                <a href="/index.php/vod/play/id/{id}/sid/1/nid/1.html" title="立刻播放{标题}">
                    <i class="icon-play"></i>
                </a>
                <img class="lazy lazyload" data-src="{封面图片}" alt="{标题}">
            </div>
        </div>
    </div>
    <div class="video-info">
        <div class="video-info-header">
            <a class="video-serial" href="/index.php/vod/detail/id/{id}.html" title="{标题}">更新至11集</a>
            <h3><a href="/index.php/vod/detail/id/{id}.html" title="{标题}">{标题}</a></h3>
            <div class="video-info-aux">
                <a href="/index.php/vod/type/id/2.html" title="木偶剧集" class="tag-link">
                    <span class="video-tag-icon">
                        <i class="icon-cate-ds"></i>
                        木偶剧集
                    </span>
                </a>
                <!-- 年份、地区等信息 -->
            </div>
        </div>
        <!-- 导演、主演、剧情等详细信息 -->
    </div>
</div>
```

## 详情页面结构

### 下载链接容器
```html
<div class="module" id="download-list" name="download-list">
    <div class="module-heading">
        <h2 class="module-title" title="凡人修仙传的影片下载列表">影片下载</h2>
        <div class="module-tab module-player-tab">
            <div class="module-tab-content">
                <div class="module-tab-item downtab-item selected">
                    <span data-dropdown-value="KK">KK</span><small>1</small>
                </div>
                <div class="module-tab-item downtab-item">
                    <span data-dropdown-value="UC">UC</span><small>1</small>
                </div>
            </div>
        </div>
    </div>
    <div class="module-list module-player-list sort-list module-downlist selected">
        <div class="scroll-box-y">
            <!-- 下载链接列表 -->
        </div>
    </div>
</div>
```

### 单个下载链接项
```html
<div class="module-row-one">
    <div class="module-row-info">
        <a class="module-row-text copy" href="javascript:;" 
           data-clipboard-text="https://pan.quark.cn/s/c6a8281edf6b" 
           title="复制《凡人修仙传》第1集下载地址">
            <i class="icon-video-file"></i>
            <div class="module-row-title">
                <h4>凡人修仙传 - 第1集</h4>
                <p>https://pan.quark.cn/s/c6a8281edf6b</p>
            </div>
        </a>
        <div class="module-row-shortcuts">
            <a class="btn-pc btn-down" href="https://pan.quark.cn/s/c6a8281edf6b" 
               title="下载《凡人修仙传》第1集">
                <i class="icon-download"></i><span>下载</span>
            </a>
            <a class="btn-copyurl copy" href="javascript:;" 
               data-clipboard-text="https://pan.quark.cn/s/c6a8281edf6b" 
               title="复制《凡人修仙传》第1集下载地址">
                <i class="icon-url"></i><span class="btn-pc">复制链接</span>
            </a>
        </div>
    </div>
</div>
```

## CSS选择器总结

### 搜索结果提取
- **搜索结果容器**: `.module-search-item`
- **标题**: `.video-info-header h3 a` (文本内容)
- **详情页链接**: `.video-info-header h3 a` (href属性) - **重要：不是播放链接**
- **播放链接**: `.module-item-pic a` (href属性，直接播放用)

### 详情页下载链接提取
- **下载链接容器**: `.module-row-one`
- **下载链接**: `.module-row-text` (data-clipboard-text属性)
- **文件标题**: `.module-row-title h4` (文本内容)
- **直接链接**: `.module-row-title p` (文本内容，与data-clipboard-text相同)

## 支持的网盘类型
- **Quark网盘**: `https://pan.quark.cn/s/{分享码}`
- **UC网盘**: `https://drive.uc.cn/s/{分享码}?public=1`

## 反爬虫机制
1. **时间延迟遮罩层**: 页面加载后显示全屏遮罩层覆盖内容
2. **开发者工具检测**: 使用debugger语句检测开发者工具
3. **右键菜单禁用**: 阻止右键菜单并显示警告
4. **按键监听**: 禁用F12和Ctrl+Shift+I快捷键
5. **域名弹窗**: 2秒后显示域名列表弹窗

## 注意事项
1. 需要设置完整的请求头模拟真实浏览器行为
2. 应该提取详情页链接而不是播放链接进行下载信息获取
3. 网站有多个域名备用，需要考虑域名切换的情况
4. 下载链接支持多种网盘类型，需要正确识别链接类型