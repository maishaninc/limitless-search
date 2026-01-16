# CLDI (磁力帝) HTML结构分析

## 网站信息
- **网站名称**: 磁力帝
- **域名**: cldcld.cc (通过动态域名访问)
- **类型**: 磁力搜索引擎
- **特点**: 专门搜索BT种子和磁力链接

## 搜索页面结构

### 1. 搜索URL模式
```
https://[域名]/search-[关键词]-[分类]-[排序]-[页码].html

示例:
https://wvmzbxki.1122132.xyz/search-%E5%87%A1%E4%BA%BA%E4%BF%AE%E4%BB%99%E4%BC%A0-0-2-1.html

参数说明:
- 关键词: URL编码的搜索关键词
- 分类: 0=全部, 1=影视, 2=音乐, 3=图像, 4=文档书籍, 5=压缩文件, 6=安装包, 7=其他
- 排序: 0=相关程度, 1=文件大小, 2=添加时间, 3=热度, 4=最近访问
- 页码: 从1开始
```

### 2. 搜索结果容器
- **父容器**: `.tbox`
- **结果项**: `.ssbox` (每个搜索结果)

### 3. 单个搜索结果结构

#### 标题区域 (.title)
```html
<div class="title">
    <h3>
        <span>[影视]</span>
        <a href="/hash/186e709110410a995f1a4bece816d70c5986a5d5.html" target="_blank">
            【不太灵影视 www.2BT0.com】<span class="red">凡人修仙传</span>[60帧率版本][全30集][国语配音+中文字幕].2025.2160p.WEB-DL.H265.60FPS.AAC-DeePTV
        </a>
    </h3>
</div>

提取要素:
- 分类: span 文本内容 (如 "[影视]")
- 详情页链接: a 的 href 属性 (用于构造磁力链接)
- 标题: a 的文本内容 (需要去掉广告标记)
```

#### 文件列表 (.slist)
```html
<div class="slist">
    <ul>
        <li>凡人修仙传.The.Immortal.Ascension.S01E08.2025.2160p.WEB-DL.H265.60FPS.AAC-DeePTV.mp4&nbsp;<span class="lightColor">2.7 GB</span></li>
        <li>凡人修仙传.The.Immortal.Ascension.S01E01.2025.2160p.WEB-DL.H265.60FPS.AAC-DeePTV.mp4&nbsp;<span class="lightColor">2.4 GB</span></li>
        <!-- 更多文件... -->
    </ul>
</div>

提取要素:
- 文件名: li 文本内容 (去掉 &nbsp; 后的内容)
- 文件大小: span.lightColor 文本内容
```

#### 元数据栏 (.sbar)
```html
<div class="sbar">
    <span><a href="magnet:?xt=urn:btih:186E709110410A995F1A4BECE816D70C5986A5D5" target="_blank">[磁力链接]</a></span>
    <span>添加时间:<b>2025-08-19</b></span>
    <span>大小:<b class="cpill yellow-pill">54.3 GB</b></span>
    <span>最近下载:<b>2025-08-20</b></span>
    <span>热度:<b>73</b></span>
</div>

提取要素:
- 磁力链接: a[href^="magnet:"] 的 href 属性
- 添加时间: "添加时间:" 后的 b 标签文本
- 总大小: "大小:" 后的 b 标签文本
- 最近下载: "最近下载:" 后的 b 标签文本  
- 热度: "热度:" 后的 b 标签文本
```

## CSS选择器总结

| 数据项 | CSS选择器 | 提取方式 |
|--------|-----------|----------|
| 搜索结果列表 | `.tbox .ssbox` | 遍历所有结果项 |
| 分类标签 | `.title h3 span` | 文本内容，去掉 `[]` |
| 标题 | `.title h3 a` | 文本内容，需要清理广告 |
| 详情页链接 | `.title h3 a` | href 属性 |
| 文件列表 | `.slist ul li` | 文本内容，分割文件名和大小 |
| 磁力链接 | `.sbar a[href^="magnet:"]` | href 属性 |
| 添加时间 | `.sbar span:contains("添加时间:") b` | 文本内容 |
| 总大小 | `.sbar span:contains("大小:") b` | 文本内容 |
| 热度 | `.sbar span:contains("热度:") b` | 文本内容 |

## 实现要点

### 1. 标题清理
- 需要移除 `【xxx】` 格式的广告标记
- 示例: `【不太灵影视 www.2BT0.com】凡人修仙传[...]` → `凡人修仙传[...]`

### 2. 分类映射
```
[影视] → 影视
[音乐] → 音乐  
[图像] → 图像
[文档书籍] → 文档
[压缩文件] → 压缩包
[安装包] → 软件
[其他] → 其他
```

### 3. 文件列表解析
- 每个 li 包含: `文件名&nbsp;<span class="lightColor">大小</span>`
- 需要分离文件名和大小信息

### 4. 时间格式
- 格式: `YYYY-MM-DD`
- 需要转换为标准时间格式

### 5. 磁力链接处理
- 直接从搜索页提取，无需访问详情页
- 链接格式: `magnet:?xt=urn:btih:[HASH]`

## 搜索参数
- 支持中文关键词 (需要URL编码)
- 默认使用全部分类 (0) 和按添加时间排序 (2)
- 支持分页 (从第1页开始)