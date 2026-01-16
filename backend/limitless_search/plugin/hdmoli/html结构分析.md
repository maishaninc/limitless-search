# HDMOLI（HDmoli）插件HTML结构分析

## 网站概述
- **网站名称**: HDmoli
- **域名**: https://www.hdmoli.pro/
- **类型**: 影视资源网站，主要提供网盘下载链接（夸克网盘、百度网盘）

## API流程概述

### 搜索页面
- **请求URL**: `https://www.hdmoli.pro/search.php?searchkey={keyword}&submit=`
- **方法**: GET
- **Headers**: 需要设置 `Referer: https://www.hdmoli.pro/`
- **特点**: 简单的GET请求搜索

## 搜索结果结构

### 搜索结果页面HTML结构
```html
<ul class="myui-vodlist__media clearfix" id="searchList">
    <li class="active clearfix">
        <div class="thumb">
            <a class="myui-vodlist__thumb" href="/movie/index2976.html" title="怪兽8号 第二季">
                <span class="pic-tag pic-tag-top" style="background-color: #5bb7fe;">
                    7.6分
                </span>
                <span class="pic-text text-right">
                    更新至06集
                </span>
            </a>
        </div>
        <div class="detail">
            <h4 class="title">
                <a href="/movie/index2976.html">怪兽8号 第二季</a>
            </h4>
            <p><span class="text-muted">导演：</span>宫繁之</p>
            <p><span class="text-muted">主演：</span>
                <a href="...">福西胜也</a>&nbsp;
                <a href="...">濑户麻沙美</a>&nbsp;
            </p>
            <p><span class="text-muted">分类：</span>日本
                <span class="split-line"></span>
                <span class="text-muted hidden-xs">地区：</span>日本
                <span class="split-line"></span>
                <span class="text-muted hidden-xs">年份：</span>2025
            </p>
            <p class="hidden-xs"><span class="text-muted">简介：</span>...</p>
            <p class="margin-0">
                <a class="btn btn-lg btn-warm" href="/movie/index2976.html">立即播放</a>
            </p>
        </div>
    </li>
</ul>
```

### 详情页面HTML结构
```html
<div class="myui-content__detail">
    <h1 class="title text-fff">怪兽8号 第二季</h1>
    
    <!-- 评分 -->
    <div id="rating" class="score" data-id="2976">
        <span class="branch">7.6</span>
    </div>
    
    <!-- 基本信息 -->
    <p class="data">
        <span class="text-muted">分类：</span>动作,科幻
        <span class="text-muted hidden-xs">地区：</span>日本
        <span class="text-muted hidden-xs">年份：</span>2025
    </p>
    <p class="data"><span class="text-muted">演员：</span>...</p>
    <p class="data"><span class="text-muted">导演：</span>...</p>
    <p class="data hidden-sm"><span class="text-muted hidden-xs">更新：</span>2025-08-24 02:21</p>
</div>

<!-- 视频下载区域 -->
<div class="myui-panel myui-panel-bg clearfix">
    <div class="myui-panel_hd">
        <h3 class="title">视频下载</h3>
    </div>
    <ul class="stui-vodlist__text downlist col-pd clearfix">
        <div class="row">
            <p class="text-muted col-pd">
                <b>夸 克：</b>
                <a title="夸克链接" href="https://pan.quark.cn/s/a061332a75e9" target="_blank">
                    https://pan.quark.cn/s/a061332a75e9
                </a>
            </p>
            <p class="text-muted col-pd">
                <b>百 度：</b>
                <a title="百度网盘" href="https://pan.baidu.com/s/xxx?pwd=moil" target="_blank">
                    https://pan.baidu.com/s/...
                </a>
            </p>
        </div>
    </ul>
</div>
```

## 数据提取要点

### 搜索结果页面
1. **结果列表**: `#searchList > li.active.clearfix` - 每个搜索结果
2. **标题**: `.detail h4.title a` - 获取文本和href属性
3. **详情页链接**: `.detail h4.title a[href]` 或 `.thumb a[href]`
4. **评分**: `.pic-tag` - 数字+分
5. **更新状态**: `.pic-text` - 如"更新至06集"、"12集全"
6. **导演**: 包含"导演："的`<p>`标签内容
7. **主演**: 包含"主演："的`<p>`标签内的链接
8. **分类信息**: 包含"分类："的`<p>`标签 - 分类/地区/年份
9. **简介**: 包含"简介："的`<p>`标签（可能为空或很短）

### 详情页面
1. **标题**: `h1.title` - 影片完整标题
2. **豆瓣评分**: `.score .branch` - 数字评分
3. **基本信息**: `.data`标签中的各种信息
   - 分类: "分类：" 后的内容
   - 地区: "地区：" 后的内容  
   - 年份: "年份：" 后的内容
   - 又名: "又名：" 后的内容（如有）
4. **演员**: 包含"演员："的`.data`标签内的链接
5. **导演**: 包含"导演："的`.data`标签内的链接
6. **更新时间**: 包含"更新："的`.data`标签
7. **网盘链接提取**:
   - 夸克网盘: `<b>夸 克：</b>` 后的 `<a>` 标签
   - 百度网盘: `<b>百 度：</b>` 后的 `<a>` 标签
   - 其他可能的网盘类型

## 网盘链接识别规则

### 支持的网盘类型
- **夸克网盘**: `pan.quark.cn`
- **百度网盘**: `pan.baidu.com`
- **阿里云盘**: `aliyundrive.com` / `alipan.com`（可能出现）
- **天翼云盘**: `cloud.189.cn`（可能出现）

### 链接提取策略
1. 在详情页的"视频下载"区域搜索
2. 按网盘类型标识符匹配（夸 克：、百 度：等）
3. 提取对应的`<a>`标签的`href`属性
4. 从URL或周围文本提取可能的提取码（如`?pwd=xxx`）

## 特殊处理

### 时间解析
- 搜索结果页无明确时间信息
- 详情页有更新时间：格式 `2025-08-24 02:21`
- 可使用更新时间作为发布时间

### 内容处理
- 评分处理：提取数字部分
- 更新状态：如"更新至06集"、"完结"等
- 简介可能很短或为空
- 标题清理：移除多余空格

### 分页处理
- 搜索结果有分页：`.myui-page` 区域
- 分页链接格式：`?page=2&searchkey=xxx&searchtype=`

## 注意事项

1. **网盘为主**: 此网站主要提供网盘下载链接，而非在线播放
2. **referer必需**: 请求时需要设置正确的referer头
3. **编码处理**: 关键词需要URL编码
4. **链接验证**: 网盘链接可能失效，需要验证有效性
5. **提取码**: 百度网盘链接通常有提取码，在URL参数或文本中