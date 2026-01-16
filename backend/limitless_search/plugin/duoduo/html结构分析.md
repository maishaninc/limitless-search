# Duoduo网站 (多多) 搜索结果HTML结构分析

## 网站信息

- **网站名称**: 多多
- **域名**: `tv.yydsys.top`
- **搜索URL格式**: `https://tv.yydsys.top/index.php/vod/search/wd/{关键词}.html`
- **详情页URL格式**: `https://tv.yydsys.top/index.php/vod/detail/id/{ID}.html`
- **主要特点**: 多多系列网盘资源站，提供高清影视资源

## HTML结构

基于DYXS2模板系统，与 Labi、Shandian、Muou 网站使用**完全相同的HTML结构**：

### 搜索结果页面结构

```html
<div class="module">
    <div class="module-list">
        <div class="module-items">
            <div class="module-search-item">
                <!-- 单个搜索结果 -->
            </div>
        </div>
    </div>
</div>
```

### 单个搜索结果结构

- **封面图片**: `.video-cover .module-item-cover .module-item-pic`
- **详情页链接**: `href="/index.php/vod/detail/id/{ID}.html"`
- **标题**: `.video-info-header h3 a`
- **资源状态**: `.video-serial`（如"更新至11集"）
- **分类信息**: `.video-info-aux .tag-link`
- **导演主演**: `.video-info-main .video-info-items`
- **操作按钮**: `.video-info-footer`

### 详情页面结构

- **下载链接区域**: `#download-list`
- **网盘类型**: `.module-tab-item span[data-dropdown-value]`
- **下载链接**: `data-clipboard-text` 属性或 `.module-row-title p`

## 与其他网站对比

| 项目 | Duoduo (多多) | Labi | Shandian | Muou |
|------|---------------|------|----------|------|
| 域名 | tv.yydsys.top | xiaocge.fun | 1.95.79.193 | 123.666291.xyz |
| 协议 | HTTPS | HTTP | HTTP | HTTP |
| HTML结构 | **完全一致** | **完全一致** | **完全一致** | **完全一致** |
| 模板系统 | DYXS2 | DYXS2 | DYXS2 | DYXS2 |

## 提取逻辑

与 Labi、Shandian、Muou 插件使用相同的提取逻辑：

1. **搜索结果页面**: 查找 `.module-search-item` 元素
2. **详情页面**: 查找 `#download-list .module-row-one` 获取下载链接
3. **网盘类型**: 根据链接URL自动识别（可能是夸克、UC、百度等）

## 重要发现和修正

### 1. 详情页链接提取 ⚠️ 重要修正

**错误的提取方式：**
```html
<!-- 这是播放页链接，不是详情页链接 -->
<div class="module-item-pic">
    <a href="/index.php/vod/play/id/8468/sid/1/nid/1.html">
</div>
```

**正确的提取方式：**
```html
<!-- 这是详情页链接，应该从这里提取 -->
<div class="video-info-header">
    <h3><a href="/index.php/vod/detail/id/8468.html" title="凡人修仙传真人剧">凡人修仙传真人剧</a></h3>
</div>
```

### 2. 反爬虫机制 🚫

网站具有时间限制的反爬虫遮罩层：
- **限制时间**: 05:00-18:00 显示遮罩
- **可用时间**: 18:00-05:00 不显示遮罩
- **绕过方式**: 设置适当的请求头，模拟正常浏览器行为

### 3. 网盘类型支持 💾

该网站支持四种主要网盘：
- **夸克网盘**: `https://pan.quark.cn/s/5c258bac77e9`
- **百度网盘**: `https://pan.baidu.com/s/1-3T82ScmmHORlxNCzBiDxQ?pwd=yyds`
- **UC网盘**: `https://drive.uc.cn/s/985330f160cd4`
- **迅雷网盘**: `https://pan.xunlei.com/s/VOW914w3izuHrOBPtJlwFYkuA1?pwd=nxv9`

### 4. 下载链接提取

在详情页中，下载链接位于：
```html
<div id="download-list">
    <div class="module-row-one">
        <a class="module-row-text copy" data-clipboard-text="网盘链接">
        <a class="btn-down" href="网盘链接">
    </div>
</div>
```

## 注意事项

1. **协议**: 使用HTTPS，安全性更高
2. **反爬虫**: 注意时间限制，可能需要在特定时间段访问
3. **多网盘**: 支持夸克、百度、UC、迅雷四种网盘
4. **链接提取**: 必须从 `.video-info-header h3 a` 提取详情页链接
5. **域名稳定性**: 注意域名可能变化，需要支持域名切换