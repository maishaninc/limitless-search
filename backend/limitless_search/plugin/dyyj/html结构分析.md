# DYYJ（电影云集）插件HTML结构分析

## 网站概述
- **网站名称**: 电影云集
- **域名**: https://bbs.dyyjmax.org
- **类型**: 影视资源论坛，提供网盘下载链接
- **技术栈**: Flarum论坛系统

## API流程概述

### 搜索页面
- **请求URL**: `https://bbs.dyyjmax.org/?q={keyword}`
- **方法**: GET
- **Headers**: 标准浏览器请求头
- **特点**: Flarum论坛，搜索结果在noscript标签中

### 详情页面
- **请求URL**: `https://bbs.dyyjmax.org/d/{id}`
- **方法**: GET
- **Headers**: 标准浏览器请求头
- **特点**: 网盘链接在HTML内容中

## 搜索结果结构

### 搜索结果页面HTML结构
```html
<noscript id="flarum-content">
    <div class="container">
        <h1>全部主题</h1>
        <ul>
            <li>
                <a href="https://bbs.dyyjmax.org/d/7208">
                    遮天 (2023)
                </a>
            </li>
            <li>
                <a href="https://bbs.dyyjmax.org/d/7285">
                    重生之医手遮天 (2024)
                </a>
            </li>
        </ul>
    </div>
</noscript>
```

### 详情页面HTML结构
```html
<noscript id="flarum-content">
    <div class="container">
        <article>
            <div class="PostUser">
                <h3 class="PostUser-name">dyyjpro</h3>
            </div>
            <div class="Post-body">
                <p><strong>剧情简介</strong></p>
                <p>本作动画改编自起点白金作者辰东遮天三部曲的第一部——遮天...</p>
                
                <p><strong>夸克网盘</strong></p>
                <p><a href="https://pan.quark.cn/s/f05fc94a755a" rel="ugc noopener nofollow" target="_blank">https://pan.quark.cn/s/f05fc94a755a</a></p>
                
                <p><strong>百度网盘 1-65</strong></p>
                <p><a href="https://pan.baidu.com/s/1c2ZQGzzCYFvEw6j0fuimaA?pwd=dyyj" rel="ugc noopener nofollow" target="_blank">https://pan.baidu.com/s/1c2ZQGzzCYFvEw6j0fuimaA?pwd=dyyj</a></p>
                
                <p><strong>迅雷云盘</strong></p>
                <p><a href="https://pan.xunlei.com/s/VNx8hVvMfSH5PjUnM8tO-DzVA1?pwd=jxdp#" rel="ugc noopener nofollow" target="_blank">https://pan.xunlei.com/s/VNx8hVvMfSH5PjUnM8tO-DzVA1?pwd=jxdp#</a></p>
            </div>
        </article>
    </div>
</noscript>
```

## 数据提取要点

### 搜索结果页面
1. **结果容器**: `noscript#flarum-content .container ul` - 搜索结果列表
2. **结果项**: `li` - 每个搜索结果
3. **标题**: `li > a` - 获取文本和href属性
4. **详情页链接**: `li > a[href]` - 格式为 `https://bbs.dyyjmax.org/d/{id}`
5. **ID提取**: 从URL中提取，如 `/d/7208` 中的 `7208`

### 详情页面  
1. **内容容器**: `noscript#flarum-content .container article .Post-body`
2. **标题**: 从URL或meta标签中提取（如 `<title>遮天 (2023) - ...</title>`）
3. **发布时间**: `<meta name="article:published_time" content="2024-05-05T17:04:11+00:00">`
4. **网盘链接提取**: 
   - 模式: `<p><strong>{网盘名}</strong></p><p><a href="{链接}">{链接文本}</a></p>`
   - 支持的网盘: 夸克网盘、百度网盘、迅雷云盘等
   - 链接格式: 直接是网盘URL，可能包含密码参数（如 `?pwd=dyyj`）
5. **提取码提取**:
   - 从URL参数中提取: `?pwd=xxx` 或 `pwd=xxx`
   - 从链接文本附近搜索

## 网盘链接识别规则

### 支持的网盘类型
- **夸克网盘**: `pan.quark.cn`
- **百度网盘**: `pan.baidu.com`  
- **阿里云盘**: `aliyundrive.com` / `alipan.com`
- **天翼云盘**: `cloud.189.cn`
- **迅雷网盘**: `pan.xunlei.com`
- **115网盘**: `115.com`
- **123网盘**: `123pan.com`

### 链接提取策略
1. 在详情页的 `.Post-body` 内容区域搜索
2. 查找 `<strong>` 标签包含网盘名称的段落
3. 在下一个 `<p>` 标签中查找 `<a>` 标签的href属性
4. 从URL参数中提取密码（如 `?pwd=xxx`）
5. 链接去重和验证

## 特殊处理

### 时间解析
- 格式: ISO 8601格式 `2024-05-05T17:04:11+00:00`
- 来源: `<meta name="article:published_time">` 或 `<meta name="article:updated_time">`

### 内容清理
- 移除HTML标签
- 处理特殊字符和编码
- 清理多余空格和换行

### 错误处理
- 网络超时重试
- 解析失败的降级处理
- 空结果的处理
- 详情页访问失败的处理

## 注意事项

1. **反爬虫**: 网站可能有基础的反爬虫措施，需要设置合理的请求头
2. **限频**: 避免请求过于频繁
3. **编码**: 处理中文关键词的URL编码
4. **更新**: 网站结构可能会变化，需要定期维护选择器
5. **noscript标签**: 搜索结果和详情页内容都在 `<noscript>` 标签中，需要特别注意
6. **并发控制**: 详情页需要并发获取，需要控制并发数避免被封IP

