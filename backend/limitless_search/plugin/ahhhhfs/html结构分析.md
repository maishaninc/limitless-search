# ahhhhfs (A姐分享) HTML结构分析

## 网站信息
- **网站名称**: ahhhhfs (A姐分享)
- **域名**: www.ahhhhfs.com
- **类型**: 资源分享网站（WordPress 站点）
- **特点**: 分享各类学习资源、软件、教程等

## 搜索页面结构

### 1. 搜索URL模式
```
https://www.ahhhhfs.com/search/{关键词}
或
https://www.ahhhhfs.com/?s={关键词}

示例:
https://www.ahhhhfs.com/search/小红书
https://www.ahhhhfs.com/?s=小红书

参数说明:
- 关键词: 直接使用中文或URL编码都可以
```

### 2. 搜索结果容器
- **父容器**: `.row` (结果列表容器)
- **结果项**: `<article class="post-item item-list">` (每个搜索结果)

### 3. 单个搜索结果结构

#### 标题区域 (.entry-title)
```html
<h2 class="entry-title">
    <a target="_blank" href="https://www.ahhhhfs.com/76567/" 
       title="AI小红书虚拟电商全链路实战课：从选品到变现的AI爆款打法">
        AI小红书虚拟电商全链路实战课：从选品到变现的AI爆款打法
    </a>
</h2>

提取要素:
- 标题: a 的文本内容或 title 属性
- 详情页链接: a 的 href 属性
```

#### 分类标签 (.entry-cat-dot)
```html
<div class="entry-cat-dot">
    <a href="https://www.ahhhhfs.com/recourse/%e7%9f%ad%e8%a7%86%e9%a2%91/">短视频</a>
    <a href="https://www.ahhhhfs.com/recourse/">资源</a>
</div>

提取要素:
- 分类: 所有 a 标签的文本内容
```

#### 描述区域 (.entry-desc)
```html
<div class="entry-desc">
    AI小红书虚拟电商全链路实战课程概览 《AI小红书虚拟电商5.0实战课》是一门聚焦AI与小红书生态融合的系统课程，围绕AI赋能选品、创作、运营与变现四大环节展开...
</div>

提取要素:
- 描述: div 的文本内容
```

#### 元数据栏 (.entry-meta)
```html
<div class="entry-meta">
    <span class="meta-date">
        <i class="far fa-clock me-1"></i>
        <time class="pub-date" datetime="2025-10-18T13:43:10+08:00">1 周前</time>
    </span>
    <span class="meta-likes d-none d-md-inline-block"><i class="far fa-heart me-1"></i>0</span>
    <span class="meta-fav d-none d-md-inline-block"><i class="far fa-star me-1"></i>1</span>
</div>

提取要素:
- 发布时间: time 标签的 datetime 属性或文本内容
```

## 详情页面结构

### 1. 详情页URL模式
```
https://www.ahhhhfs.com/{文章ID}/

示例:
https://www.ahhhhfs.com/76567/
```

### 2. 下载链接位置
下载链接在文章正文内容中 `.post-content` 里面，通常在文章末尾部分。

#### 下载链接格式示例
```html
<p>
    学习地址：
    <a title="..." 
       href="https://pan.quark.cn/s/c16a5ae18ea0" 
       target="_blank" 
       rel="nofollow noopener noreferrer">夸克</a>
</p>

或者

<p>
    下载地址：
    <a href="https://pan.baidu.com/s/xxxxx" 
       target="_blank" 
       rel="nofollow noopener noreferrer">百度网盘</a>
    提取码: xxxx
</p>

或者多个网盘链接：
<p>
    阿里云盘：<a href="...">链接</a><br>
    夸克网盘：<a href="...">链接</a><br>
    百度网盘：<a href="...">链接</a> 提取码: xxxx
</p>

提取要素:
- 网盘链接: .post-content 中包含网盘域名的 a 标签的 href 属性
- 提取码/密码: 链接附近的文本内容，可能包含 "提取码"、"密码"、"pwd" 等关键词
```

## CSS选择器总结

| 数据项 | CSS选择器 | 提取方式 |
|--------|-----------|----------|
| 搜索结果列表 | `article.post-item.item-list` | 遍历所有结果项 |
| 标题 | `.entry-title a` | 文本内容或 title 属性 |
| 详情页链接 | `.entry-title a` | href 属性 |
| 分类标签 | `.entry-cat-dot a` | 所有 a 标签的文本内容 |
| 描述 | `.entry-desc` | 文本内容 |
| 发布时间 | `.entry-meta .meta-date time` | datetime 属性或文本内容 |
| 文章内容 | `.post-content` | HTML 内容 |
| 网盘链接 | `.post-content a[href*="pan"]` 或匹配网盘域名 | href 属性 |

## 实现要点

### 1. 支持的网盘类型
- 夸克网盘: `pan.quark.cn`
- 阿里云盘: `aliyundrive.com`, `alipan.com`
- 百度网盘: `pan.baidu.com`
- UC网盘: `drive.uc.cn`
- 迅雷网盘: `pan.xunlei.com`
- 天翼云盘: `cloud.189.cn`
- 115网盘: `115.com`
- 123网盘: `123pan.com`

### 2. 提取码识别
提取码可能出现在以下位置：
- 链接后面的文本: `提取码: xxxx` 或 `密码: xxxx`
- 链接的 title 属性中
- `<br>` 标签分隔的下一行
- 括号内: `(提取码: xxxx)`

常见关键词：
- 提取码
- 密码
- pwd
- code
- 取码

### 3. 链接提取策略
1. 先从搜索结果页获取文章列表
2. 访问每篇文章的详情页
3. 在详情页的 `.post-content` 中查找包含网盘域名的链接
4. 提取链接和相应的提取码
5. 如果文章没有网盘链接，则跳过

### 4. 时间格式处理
- 相对时间: "1 周前"、"2 天前" 需要转换为具体日期
- 绝对时间: "2025-10-18" 可以直接使用
- datetime 属性: "2025-10-18T13:43:10+08:00" 标准ISO格式

### 5. 去重标识
- 使用文章ID作为唯一标识: 从详情页URL中提取 `/76567/`

## 注意事项

1. **搜索结果可能为空**: 如果关键词没有匹配结果，页面会显示"没有找到相关内容"
2. **分页**: 搜索结果可能有多页，但通常只抓取第一页即可
3. **网盘链接位置不固定**: 链接可能在文章开头、中间或结尾，需要遍历整个 `.post-content`
4. **广告干扰**: 页面包含广告，需要准确定位到实际内容区域
5. **需要访问详情页**: 搜索结果页不包含下载链接，必须访问详情页才能获取
6. **请求频率**: 需要访问详情页，建议控制请求频率避免被封

## 示例数据流

```
1. 搜索请求: https://www.ahhhhfs.com/search/小红书
   ↓
2. 解析搜索结果页，提取文章列表
   - 标题: "AI小红书虚拟电商全链路实战课：从选品到变现的AI爆款打法"
   - 详情页URL: https://www.ahhhhfs.com/76567/
   - 分类: ["短视频", "资源"]
   - 发布时间: 2025-10-18
   ↓
3. 访问详情页: https://www.ahhhhfs.com/76567/
   ↓
4. 解析详情页 .post-content，提取网盘链接
   - 夸克网盘: https://pan.quark.cn/s/c16a5ae18ea0
   - 提取码: (如果有)
   ↓
5. 构建最终结果
   - UniqueID: ahhhhfs-76567
   - Title: "AI小红书虚拟电商全链路实战课：从选品到变现的AI爆款打法"
   - Content: 文章描述
   - Links: [{Type: "quark", URL: "...", Password: ""}]
   - Tags: ["短视频", "资源"]
   - Datetime: 2025-10-18T13:43:10+08:00
```

