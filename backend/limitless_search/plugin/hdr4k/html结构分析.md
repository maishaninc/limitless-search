# 4KHDR网站搜索结果HTML结构分析

## 搜索接口

- **搜索URL**: `https://www.4khdr.cn/search.php?mod=forum`
- **请求方法**: POST
- **请求参数**: 
  - `srchtxt`: 搜索关键词
  - `searchsubmit`: "yes"
  - Content-Type: `application/x-www-form-urlencoded`

## 页面整体结构

搜索结果页面的主要内容位于`.slst.mtw`元素内，每个搜索结果项包含在`<li class="pbw">`元素中。

```html
<div class="slst mtw" id="threadlist">
    <ul>
        <li class="pbw" id="32374">
            <!-- 单个搜索结果 -->
        </li>
        <li class="pbw" id="26211">
            <!-- 单个搜索结果 -->
        </li>
    </ul>
</div>
```

## 单个搜索结果结构

### 1. 帖子ID

帖子ID可以从以下位置提取：
- li元素的id属性：`<li class="pbw" id="32374">`，其中`32374`为帖子ID
- 详情页链接：`href="thread-32374-1-1.html"`

### 2. 标题

标题位于`.xs3 a`元素中：

```html
<h3 class="xs3">
    <a href="thread-32374-1-1.html" target="_blank">
        机动战士<strong><font color="#ff0000">高达</font></strong>：跨时之战 機動戦士Gundam GQuuuuuuX -Beginning- 2025
        机动战士<strong><font color="#ff0000">高达</font></strong>GQuuuuuuX序章/機動戦士ガンダム ジークアクス
        -Beginning-‎/Mobile Suit Gundam GQuuuuuuX -Beginning- 日本 6.8
    </a>
</h3>
```

**注意**: 需要清理HTML标签，特别是高亮搜索关键词的`<strong><font>`标签。

### 3. 内容描述

内容描述位于h3下方的第一个`<p>`元素中：

```html
<p>名 称: 机动战士<strong><font color="#ff0000">高达</font></strong>：跨时之战 機動戦士Gundam GQuuuuuuX
    -Beginning-
    年 代: 2025
    又 名: 机动战士<strong><font color="#ff0000">高达</font></strong>GQuuuuuuX序章 / 機動戦士ガンダム ジークアクス
    -Beginning-‎ / Mobile Suit Gundam GQuuuuuuX -Be ...
</p>
```

### 4. 日期时间

日期时间信息位于最后一个`<p>`元素的第一个`<span>`中：

```html
<p>
    <span>2025-4-9 19:55</span>
    -
    <span>
        <a href="space-uid-3.html" target="_blank">4KHDR世界</a>
    </span>
    -
    <span><a href="forum-2-1.html" target="_blank" class="xi1">4K电影美剧下载 - HDR杜比视界资源</a></span>
</p>
```

### 5. 分类信息

分类信息位于最后一个`<p>`元素的最后一个链接中：

```html
<span><a href="forum-2-1.html" target="_blank" class="xi1">4K电影美剧下载 - HDR杜比视界资源</a></span>
```

### 6. 作者信息

作者信息位于日期和分类之间：

```html
<span>
    <a href="space-uid-3.html" target="_blank">4KHDR世界</a>
</span>
```

## 详情页面结构分析

### 详情页URL格式

- **URL模式**: `https://www.4khdr.cn/thread-{帖子ID}-1-1.html`
- **示例**: `https://www.4khdr.cn/thread-32358-1-1.html`

### 详情页内容结构

#### 1. 页面标题

页面标题位于`<h1 class="ts">`元素中：

```html
<h1 class="ts">
    <a href="forum.php?mod=forumdisplay&amp;fid=37&amp;filter=typeid&amp;typeid=55">[夸克网盘]</a>
    <span id="thread_subject">机动战士高达GQuuuuuuX 機動戦士Gundam GQuuuuuuX 2025 Mobile Suit Gundam GQuuuuuuX/機動戦士ガンダム ジークアクス 日本</span>
</h1>
```

#### 2. 海报图片

海报图片位于`.t_f`元素内的第一个img标签：

```html
<img id="aimg_39462" aid="39462" src="static/image/common/none.gif" 
     zoomfile="data/attachment/forum/202504/09/100901qjr9gkl33339tk7g.jpg" 
     file="data/attachment/forum/202504/09/100901qjr9gkl33339tk7g.jpg" 
     class="zoom" width="270" />
```

**注意**: 实际图片URL在`zoomfile`或`file`属性中。

#### 3. 影片基本信息

影片信息在`.t_f`元素中，以`<strong>`标签标识字段名：

```html
<strong>名 称:&nbsp;&nbsp;</strong> 机动战士高达GQuuuuuuX 機動戦士Gundam GQuuuuuuX<br />
<strong>年 代:&nbsp;&nbsp;</strong> 2025<br />
<strong>又 名:&nbsp;&nbsp;</strong> Mobile Suit Gundam GQuuuuuuX / 機動戦士ガンダム ジークアクス<br />
<strong>导 演:&nbsp;&nbsp;</strong> 鹤卷和哉<br />
<strong>编 剧:&nbsp;&nbsp;</strong> 榎户洋司 / 庵野秀明<br />
<strong>类 型:&nbsp;&nbsp;</strong> 科幻 / 动画<br />
<strong>地 区:&nbsp;&nbsp;</strong> 日本<br />
<strong>语 言:&nbsp;&nbsp;</strong> 日语<br />
<strong>首 播:&nbsp;&nbsp;</strong> 2025-04-08(日本)<br />
<strong>豆 瓣:&nbsp;&nbsp;</strong> 分 (共0人参与评分)<br />
```

#### 4. 主演信息

主演信息位于"主演名单"标题后：

```html
<hr class="l" /><strong>主演名单</strong><br />
黑泽朋世 / 石川由依 / 土屋神叶 / 川田绅司 / 山下诚一郎 / 藤田茜 / 钉宫理惠<br />
```

#### 5. 剧情简介

剧情简介位于"剧情简介"标题后：

```html
<hr class="l" /><strong>剧情简介</strong><br />
&nbsp; &nbsp;&nbsp; &nbsp;天手让叶是名女高中生，在空中的宇宙殖民卫星过着平静的生活。<br />
但在遇到难民少女尼娅安后，她被卷入了非法MS决斗竞技"军团战"之中。她化名"玛秋"参赛，驾驶着GQuuuuuuX，每日投身激烈的战斗。<br />
同时，被宇宙军和警察两方追捕的神秘MS"高达"及其驾驶员──少年修司，出现在她们面前。<br />
接着，世界迎向了新时代。<br />
```

#### 6. 下载地址

下载地址位于"下载地址⏬"标题后的链接：

```html
<strong>下载地址⏬</strong><br />
<br />
<br />
<a href="https://pan.quark.cn/s/7a19ff270969" target="_blank">https://pan.quark.cn/s/7a19ff270969</a><br />
```

## 数据提取要点

### 1. 网盘链接类型识别

根据URL域名识别网盘类型：
- `pan.quark.cn` → `quark`
- `pan.baidu.com` → `baidu`
- `alipan.com`, `aliyundrive.com` → `aliyun`
- `pan.xunlei.com` → `xunlei`
- `cloud.189.cn` → `tianyi`
- 其他 → `others`

### 2. HTML标签清理

需要清理的HTML标签：
- `<strong>` 和 `</strong>`
- `<font color="#ff0000">` 和 `</font>`
- `<br />` 转换为换行符
- `&nbsp;` 转换为空格
- `&hellip;` 转换为省略号

### 3. 时间格式

时间格式为：`YYYY-M-D H:MM`，如 `2025-4-9 19:55`
需要解析为标准时间格式。

### 4. 分类标签提取

从分类链接中提取分类名称，去除HTML标签后作为标签使用。

## 注意事项

1. **搜索结果可能包含求片帖**：标题以"求片"、"求阿里云盘"等开头的帖子需要过滤或特殊处理
2. **搜索关键词高亮**：搜索结果中的关键词会被`<strong><font>`标签包围，需要正确清理
3. **详情页访问**：需要构造正确的详情页URL进行二次请求获取完整信息
4. **图片URL处理**：需要将相对路径转换为绝对路径
5. **字符编码**：网站使用UTF-8编码，注意正确处理中文字符