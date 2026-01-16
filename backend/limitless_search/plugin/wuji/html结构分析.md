# Wuji (无极磁链) HTML结构分析

## 网站信息

- **网站名称**: ØMagnet 无极磁链
- **基础URL**: https://xcili.net/
- **功能**: 磁力链接搜索引擎
- **搜索URL格式**: `/search?q={keyword}`

## 搜索页面结构

### 1. 搜索URL参数说明

```
https://xcili.net/search?q=%E5%87%A1%E4%BA%BA%E4%BF%AE%E4%BB%99%E4%BC%A0
                             ^关键词(URL编码)
```

**参数说明**:
- `q`: URL编码的搜索关键词

### 2. 搜索结果容器

```html
<table class="table table-hover file-list">
    <tbody>
        <tr>
            <!-- 单个搜索结果 -->
        </tr>
        <!-- 更多结果... -->
    </tbody>
</table>
```

### 3. 单个搜索结果结构

```html
<tr>
    <td>
        <a href="/!k5mO">
            【高清剧集网发布 www.DDHDTV.com】<b>凡人修仙传</b>：星海飞驰篇[第103集][国语配音+中文字幕]...
            <p class="sample"><b>凡人修仙传</b>.A.Mortal's.Journey.2020.E103.2160p.WEB-DL.H264.AAC-ColorWEB.mp4</p>
        </a>
    </td>
    <td class="td-size">2.02GB</td>
</tr>
```

**提取要点**:
- 详情页链接：`td a` 的 `href` 属性（如 `/!k5mO`）
- 标题：`td a` 的直接文本内容（不包括 `<p class="sample">`）
- 文件名：`p.sample` 的文本内容
- 文件大小：`td.td-size` 的文本内容

## 详情页面结构

### 1. 详情页URL格式
```
https://xcili.net/!k5mO
                   ^资源ID
```

### 2. 详情页关键元素

#### 标题区域
```html
<h2 class="magnet-title">凡人修仙传156</h2>
```

#### 磁力链接区域
```html
<div class="input-group magnet-box">
    <input id="input-magnet" class="form-control" type="text" 
           value="magnet:?xt=urn:btih:73fb26f819ac2582c56ec9089c85cad4b0d42545&dn=..." />
</div>
```

#### 文件信息区域
```html
<dl class="dl-horizontal torrent-info col-sm-9">
    <dt>种子特征码 :</dt>  
    <dd>73fb26f819ac2582c56ec9089c85cad4b0d42545</dd>
    
    <dt>文件大小 :</dt> 
    <dd>288.6 MB</dd>
    
    <dt>发布日期 :</dt>  
    <dd>2025-08-16 14:51:15</dd>
</dl>
```

#### 文件列表区域
```html
<table class="table table-hover file-list">
    <thead>
        <tr>
            <th>文件 ( 2 )</th>
            <th class="th-size">大小</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>专属高速VPN介绍.txt</td>
            <td class="td-size">470 B</td>
        </tr>
        <tr>
            <td>凡人修仙传156.mp4</td>
            <td class="td-size">288.6 MB</td>
        </tr>
    </tbody>
</table>
```

## 数据提取要点

### 搜索页面提取信息

1. **基本信息**:
   - 标题: `tr td a` 的直接文本内容（移除子元素文本）
   - 详情页链接: `tr td a` 的 `href` 属性
   - 文件大小: `tr td.td-size` 的文本内容
   - 文件名预览: `tr td a p.sample` 的文本内容

### 详情页面提取信息

1. **磁力链接**:
   - 磁力链接: `input#input-magnet` 的 `value` 属性

2. **元数据**:
   - 标题: `h2.magnet-title` 的文本内容
   - 种子哈希: `dl.torrent-info` 中 "种子特征码" 对应的 `dd` 内容
   - 文件大小: `dl.torrent-info` 中 "文件大小" 对应的 `dd` 内容
   - 发布日期: `dl.torrent-info` 中 "发布日期" 对应的 `dd` 内容

3. **文件列表**:
   - 文件列表: `table.file-list tbody tr` 中的文件名和大小

### CSS选择器

```css
/* 搜索页面 */
table.file-list tbody tr          /* 搜索结果行 */
tr td a                          /* 标题链接 */
tr td a p.sample                 /* 文件名预览 */
tr td.td-size                    /* 文件大小 */

/* 详情页面 */
h2.magnet-title                  /* 标题 */
input#input-magnet               /* 磁力链接 */
dl.torrent-info                  /* 元数据信息 */
table.file-list tbody tr         /* 文件列表 */
```

## 广告内容清理

### 需要清理的广告格式

1. **【】格式广告**:
   - `【高清剧集网发布 www.DDHDTV.com】`
   - `【不太灵影视 www.3BT0.com】`
   - `【8i2.fit】名称：`

2. **其他格式**:
   - 数字+【xxx】格式: `48【孩子你要相信光】`

### 清理规则

```javascript
// 移除【】及其内容
title = title.replace(/【[^】]*】/g, '');

// 移除数字+【】格式
title = title.replace(/^\d+【[^】]*】/, '');

// 移除多余空格
title = title.replace(/\s+/g, ' ').trim();
```

## 插件流程设计

### 1. 搜索流程
1. 构造搜索URL: `https://xcili.net/search?q={keyword}`
2. 解析搜索结果页面，提取基本信息和详情页链接
3. 对每个结果访问详情页获取磁力链接
4. 合并信息并返回最终结果

### 2. 详情页处理
1. 访问详情页URL
2. 提取磁力链接和详细信息
3. 解析文件列表

## 请求头要求

建议设置常见的浏览器请求头:
- User-Agent: 现代浏览器UA
- Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
- Accept-Language: zh-CN,zh;q=0.9,en;q=0.8

## 注意事项

1. 需要进行两次请求：搜索页面 + 详情页面
2. 磁力链接在详情页面，不在搜索页面
3. 标题需要清理多种格式的广告内容
4. 文件大小格式多样：B, KB, MB, GB
5. 详情页链接格式: `/!{resourceId}`
6. 需要适当的请求间隔避免被限制