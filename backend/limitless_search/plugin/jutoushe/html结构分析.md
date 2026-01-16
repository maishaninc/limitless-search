# JUTOUSHE（剧透社）HTML结构分析

## 网站信息
- **网站名称**: 剧透社
- **域名**: https://1.star2.cn/
- **类型**: 网盘资源分享站，主要提供电视剧、电影、短剧、综艺等影视资源
- **特点**: 提供多种网盘下载链接（夸克、百度、阿里等）

## 搜索页面结构

### 1. 搜索URL模式
```
https://1.star2.cn/search/?keyword={关键词}

示例:
https://1.star2.cn/search/?keyword=%E7%91%9E%E5%85%8B%E5%92%8C%E8%8E%AB%E8%92%82
https://1.star2.cn/search/?keyword=%E4%B8%8E%E6%99%8B%E9%95%BF%E5%AE%89

参数说明:
- keyword: URL编码的搜索关键词
```

### 2. 搜索结果容器
- **父容器**: `<ul class="erx-list">`
- **结果项**: `<li class="item">` (每个搜索结果)

### 3. 单个搜索结果结构

#### 标题和链接区域 (.a)
```html
<div class="a">
    <a href="/dm/8100.html" class="main">【动漫】瑞克和莫蒂8.全集</a>
    <span class="tags"></span>
</div>

提取要素:
- 详情页链接: a.main 的 href 属性 (需要拼接完整域名)
- 标题: a.main 的文本内容 (包含分类标签)
```

#### 时间信息区域 (.i)
```html
<div class="i">
    <span class="erx-num-font time">2025-05-26</span>
</div>

提取要素:
- 发布时间: span.time 的文本内容 (格式: YYYY-MM-DD)
```

## 详情页面结构

### 1. 详情页URL模式
```
https://1.star2.cn/{分类}/{ID}.html

示例:
https://1.star2.cn/dm/8100.html  (动漫类别)
https://1.star2.cn/ju/8737.html  (国剧类别)

分类说明:
- /dm/ : 动漫
- /ju/ : 国剧  
- /dj/ : 短剧
- /zy/ : 综艺
- /mv/ : 电影
- /rh/ : 韩日剧
- /ym/ : 英美剧
- /wj/ : 外剧
- /qt/ : 其他
```

### 2. 详情页面关键区域

#### 标题区域
```html
<h1>【动漫】瑞克和莫蒂8.全集</h1>

提取要素:
- 标题: h1 的文本内容
```

#### 元信息区域
```html
<section class="erx-tct i">
    <span class="time">2025-05-26</span>
    <span class="view">823次浏览</span>
</section>

提取要素:
- 发布时间: span.time 的文本内容
- 浏览次数: span.view 的文本内容 (可选)
```

#### 下载链接区域
```html
<div class="dlipp-cont-wp">
    <div class="dlipp-cont-inner">
        <div class="dlipp-cont-hd">
            <img src="/skin/images/tv.png" alt="影片地址">
            <span>影片地址</span>
        </div>
        <div class="dlipp-cont-bd">
            <a class="dlipp-dl-btn j-wbdlbtn-dlipp" href="https://pan.quark.cn/s/2b941bc45d86" target="_blank">
                <img src="/skin/images/kk.png" alt="夸克网盘">
                <span>夸克网盘</span>
            </a>
            <a class="dlipp-dl-btn j-wbdlbtn-dlipp" href="https://pan.baidu.com/s/1E92Hy50UxJnTTrU3qD9jqQ?pwd=8888" target="_blank">
                <img src="/skin/images/bd.png" alt="百度网盘">
                <span>百度网盘</span>
            </a>
        </div>
    </div>
</div>

提取要素:
- 网盘链接: .dlipp-cont-bd a.dlipp-dl-btn 的 href 属性
- 网盘类型: 从链接URL自动识别 (quark.cn, baidu.com 等)
- 提取码: 从URL参数中提取 (如 ?pwd=8888)
```

## CSS选择器总结

| 数据项 | 页面类型 | CSS选择器 | 提取方式 |
|--------|----------|-----------|----------|
| 搜索结果列表 | 搜索页 | `ul.erx-list li.item` | 遍历所有结果项 |
| 标题 | 搜索页 | `.a a.main` | 文本内容 |
| 详情页链接 | 搜索页 | `.a a.main` | href 属性 |
| 发布时间 | 搜索页 | `.i span.time` | 文本内容 |
| 详情页标题 | 详情页 | `h1` | 文本内容 |
| 详情页时间 | 详情页 | `section.i span.time` | 文本内容 |
| 浏览次数 | 详情页 | `section.i span.view` | 文本内容 |
| 下载链接 | 详情页 | `.dlipp-cont-bd a.dlipp-dl-btn` | href 属性 |

## 实现要点

### 1. 网盘类型自动识别
根据链接URL自动识别网盘类型：
```
pan.quark.cn     → quark     (夸克网盘)
pan.baidu.com    → baidu     (百度网盘)
aliyundrive.com  → aliyun    (阿里云盘)
alipan.com       → aliyun    (阿里云盘新域名)
cloud.189.cn     → tianyi    (天翼云盘)
pan.xunlei.com   → xunlei    (迅雷网盘)
115.com          → 115       (115网盘)
123pan.com       → 123       (123网盘)
caiyun.139.com   → mobile    (移动云盘)
```

### 2. 提取码处理
- 百度网盘: `?pwd=1234` 格式
- 其他网盘: 一般无需提取码或在URL中已包含

### 3. 标题清理
- 保留分类标签如 `【动漫】`、`【国剧】` 等
- 去除多余空格和特殊字符

### 4. 时间格式处理
- 原格式: `2025-05-26`
- 需转换为标准时间对象

### 5. 内容描述
- 可以从标题中提取分类信息作为描述
- 或使用固定描述如 "剧透社影视资源"

## 支持的分类

| 分类代码 | 中文名称 | 路径 | 说明 |
|----------|----------|------|------|
| dm | 动漫 | /dm/ | 动画、动漫作品 |
| ju | 国剧 | /ju/ | 国产电视剧 |
| dj | 短剧 | /dj/ | 短视频剧集 |
| zy | 综艺 | /zy/ | 综艺节目 |
| mv | 电影 | /mv/ | 电影作品 |
| rh | 韩日 | /rh/ | 韩国、日本影视剧 |
| ym | 英美 | /ym/ | 英美影视剧 |
| wj | 外剧 | /wj/ | 其他外国影视剧 |
| qt | 其他 | /qt/ | 其他类型内容 |

## 错误处理

1. **网络超时**: 设置合理的超时时间，实现重试机制
2. **解析失败**: 对于解析失败的页面，记录日志但不中断流程
3. **空结果**: 搜索无结果时返回空数组
4. **链接失效**: 验证链接格式，过滤掉明显无效的链接

## 反爬虫处理

1. **请求头设置**: 使用标准浏览器User-Agent
2. **请求频率**: 控制请求间隔，避免被封IP
3. **错误重试**: 遇到403/429等状态码时适当延迟重试

## 特殊说明

1. **域名**: 网站可能使用多个域名或动态域名，需要灵活处理
2. **编码**: 确保中文关键词正确URL编码
3. **链接拼接**: 详情页链接为相对路径，需要拼接完整URL
4. **缓存**: 建议缓存搜索结果，避免重复请求
