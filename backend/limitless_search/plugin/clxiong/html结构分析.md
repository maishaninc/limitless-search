# 磁力熊(CiLiXiong) HTML结构分析文档

## 网站信息
- **域名**: `www.cilixiong.org`  
- **名称**: 磁力熊
- **类型**: 影视磁力链接搜索网站
- **特点**: 两步式搜索流程，需要先POST获取searchid，再GET搜索结果

## 搜索流程分析

### 第一步：提交搜索请求
#### 请求信息
- **URL**: `https://www.cilixiong.org/e/search/index.php`
- **方法**: POST
- **Content-Type**: `application/x-www-form-urlencoded`
- **Referer**: `https://www.cilixiong.org/`

#### POST参数
```
classid=1%2C2&show=title&tempid=1&keyboard={URL编码的关键词}
```
参数说明：
- `classid=1,2` - 搜索分类（1=电影，2=剧集）
- `show=title` - 搜索字段
- `tempid=1` - 模板ID
- `keyboard` - 搜索关键词（需URL编码）

#### 响应处理
- **状态码**: 302重定向
- **关键信息**: 从响应头`Location`字段获取searchid
- **格式**: `result/?searchid=7549`

### 第二步：获取搜索结果
#### 请求信息  
- **URL**: `https://www.cilixiong.org/e/search/result/?searchid={searchid}`
- **方法**: GET
- **Referer**: `https://www.cilixiong.org/`

## 搜索结果页面结构

### 页面布局
- **容器**: `.container`
- **结果提示**: `.text-white.py-3` - 显示"找到 X 条符合搜索条件"
- **结果网格**: `.row.row-cols-2.row-cols-lg-4.align-items-stretch.g-4.py-2`

### 单个结果项结构
```html
<div class="col">
    <div class="card card-cover h-100 overflow-hidden text-bg-dark rounded-4 shadow-lg position-relative">
        <a href="/drama/4466.html">
            <div class="card-img" style="background-image: url('海报图片URL');"><span></span></div>
            <div class="card-body position-absolute d-flex w-100 flex-column text-white">
                <h2 class="pt-5 lh-1 pb-2 h4">影片标题</h2>
                <ul class="d-flex list-unstyled mb-0">
                    <li class="me-auto"><span class="rank bg-success p-1">8.9</span></li>
                    <li class="d-flex align-items-center small">2025</li>
                </ul>
            </div>
        </a>
    </div>
</div>
```

### 数据提取选择器

#### 结果列表
- **选择器**: `.row.row-cols-2.row-cols-lg-4 .col`
- **排除**: 空白或无效的卡片

#### 单项数据提取
1. **详情链接**: `.col a[href*="/drama/"]` 或 `.col a[href*="/movie/"]`
2. **标题**: `.col h2.h4`
3. **评分**: `.col .rank`
4. **年份**: `.col .small`（最后一个li元素）
5. **海报**: `.col .card-img[style*="background-image"]` - 从style属性提取url

#### 链接格式
- 电影：`/movie/ID.html`
- 剧集：`/drama/ID.html`
- 需补全为绝对URL：`https://www.cilixiong.org/drama/ID.html`

## 详情页面结构

### 基本信息区域
```html
<div class="mv_detail lh-2 px-3">
    <p class="mb-2"><h1>影片标题</h1></p>
    <p class="mb-2">豆瓣评分: <span class="db_rank">8.9</span></p>
    <p class="mb-2">又名：英文名称</p>
    <p class="mb-2">上映日期：2025-05-25(美国)</p>
    <p class="mb-2">类型：|喜剧|冒险|科幻|动画|</p>
    <p class="mb-2">单集片长：22分钟</p>
    <p class="mb-2">上映地区：美国</p>
    <p class="mb-2">主演：演员列表</p>
</div>
```

### 磁力链接区域
```html
<div class="mv_down p-5 pb-3 rounded-4 text-center">
    <h2 class="h6 pb-3">影片名磁力下载地址</h2>
    <div class="container">
        <div class="border-bottom pt-2 pb-4 mb-3">
            <a href="magnet:?xt=urn:btih:HASH">文件名.mkv[文件大小]</a>
            <a class="ms-3 text-muted small" href="/magnet.php?url=..." target="_blank">详情</a>
        </div>
    </div>
</div>
```

### 磁力链接提取
- **容器**: `.mv_down .container`
- **链接项**: `.border-bottom`
- **磁力链接**: `a[href^="magnet:"]`
- **文件名**: 链接的文本内容
- **大小信息**: 通常包含在文件名的方括号中

## 错误处理

### 常见问题
1. **搜索无结果**: 页面会显示"找到 0 条符合搜索条件"
2. **searchid失效**: 可能需要重新发起搜索请求
3. **详情页无磁力链接**: 某些内容可能暂时无下载资源

### 限流检测
- **状态码**: 检测429或403状态码
- **页面内容**: 检测是否包含"访问频繁"等提示

## 实现要点

### 请求头设置
```http
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36
Content-Type: application/x-www-form-urlencoded (POST请求)
Referer: https://www.cilixiong.org/
```

### Cookie处理
- 网站可能需要维持会话状态
- 建议在客户端中启用Cookie存储

### 搜索策略
1. **首次搜索**: POST提交 → 解析Location → GET结果页
2. **结果解析**: 提取基本信息，构建搜索结果
3. **详情获取**: 可选，异步获取磁力链接

### 数据字段映射
- **Title**: 影片中文标题
- **Content**: 评分、年份、类型等信息组合
- **UniqueID**: 使用详情页URL的ID部分
- **Links**: 磁力链接数组
- **Tags**: 影片类型标签

## 技术注意事项

### URL编码
- 搜索关键词必须进行URL编码
- 中文字符使用UTF-8编码

### 重定向处理
- POST请求会返回302重定向
- 需要从响应头提取Location信息
- 不要自动跟随重定向，需要手动解析

### 异步处理
- 搜索结果可以先返回基本信息
- 磁力链接通过异步请求详情页获取
- 设置合理的并发限制和超时时间