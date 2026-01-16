# ASH搜剧助手 HTML结构分析

## 网站信息
- **网站名称**: ASH搜剧助手
- **域名**: so.allsharehub.com
- **类型**: 影视资源搜索引擎
- **特点**: 专门搜索影视剧资源，主要提供夸克网盘链接
- **搜索模式**: 本地搜索（从网站数据库查询，不使用全网搜）

## 搜索页面结构

### 1. 搜索URL模式
```
https://so.allsharehub.com/s/[关键词].html

示例:
https://so.allsharehub.com/s/%E4%BB%99%E9%80%86.html

参数说明:
- 关键词: URL编码的搜索关键词
- 支持分页: /s/[关键词]-[页码].html
- 支持分类: /s/[关键词]-[页码]-[分类ID].html
```

### 2. 数据提取方式

#### JavaScript数据源（唯一方式）
搜索结果嵌入在页面JavaScript变量中（本地搜索数据）：
```javascript
var jsonData = '[{"id":987,"source_category_id":0,"title":"仙逆剧场版神临之战4K完整版","is_type":0,"code":null,"url":"https://pan.qualk.cn/s/095628b04e6c","is_time":0,"name":"仙逆剧场版神临之战4K完整版","times":"2025-08-31","category":null}]';
```

**注意**: 
- 只使用本地搜索数据（currentSource === 0）
- 不需要处理全网搜的SSE流式数据（currentSource === 1）

### 3. 数据字段说明

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `id` | number | 资源ID | 987 |
| `source_category_id` | number | 分类ID | 0 |
| `title` | string | 资源标题 | "仙逆剧场版神临之战4K完整版" |
| `is_type` | number | 网盘类型 (0=夸克) | 0 |
| `code` | string/null | 提取码 | null 或 "1234" |
| `url` | string | 网盘链接 | "https://pan.qualk.cn/s/095628b04e6c" |
| `is_time` | number | 时间标记 | 0 |
| `name` | string | 资源名称 | "仙逆剧场版神临之战4K完整版" |
| `times` | string | 发布时间 | "2025-08-31" |
| `category` | string/null | 分类 | null |

### 4. HTML结构（备用方式）

#### 搜索结果容器
- **父容器**: `.listBox .left .box .list`
- **结果项**: `.item` (每个搜索结果)

#### 单个搜索结果结构
```html
<div class="item">
    <!-- 标题 -->
    <a href="javascript:;" onclick="linkBtn(this)" data-index="0" class="title">
        仙逆剧场版神临之战4K完整版
    </a>
    
    <!-- 发布时间 -->
    <div class="type time">2025-08-31</div>
    
    <!-- 来源 -->
    <div class="type">
        <span>来源：夸克网盘</span>
    </div>
    
    <!-- 操作按钮 -->
    <div class="btns">
        <div class="btn" @click.stop="copyText(...)">
            <i class="iconfont icon-fenxiang1"></i>复制分享
        </div>
        <a href="/d/987.html" class="btn">
            <i class="iconfont icon-fangwen"></i>查看详情
        </a>
        <a href="javascript:;" onclick="linkBtn(this)" data-index="0" class="btn">
            立即访问
        </a>
    </div>
</div>
```

## 重要实现要点

### 1. 网盘链接转换 ⭐ 非常重要
页面返回的链接使用错误的域名，必须进行转换：
```
原始链接: https://pan.qualk.cn/s/095628b04e6c
正确链接: https://pan.quark.cn/s/095628b04e6c

转换规则: 将 "pan.qualk.cn" 替换为 "pan.quark.cn"
```

### 2. 数据提取正则表达式
```go
// 提取JSON数据
jsonDataRegex := regexp.MustCompile(`var jsonData = '(\[.*?\])';`)

// 清理JSON中的控制字符
jsonData = strings.ReplaceAll(jsonData, "\\/", "/")
jsonData = regexp.MustCompile(`[\x00-\x1F\x7F]`).ReplaceAllString(jsonData, "")
```

### 3. 网盘类型映射
```go
is_type 值映射:
0 -> "quark" (夸克网盘)
2 -> "baidu" (百度网盘) 
3 -> "uc" (UC网盘)
4 -> "xunlei" (迅雷网盘)
```

### 4. 时间格式
- 格式: `YYYY-MM-DD`
- 需要转换为标准时间格式: `time.Parse("2006-01-02", timeStr)`

### 5. 分类信息
页面支持按分类筛选：
- 0: 全部
- 1: 短剧
- 2: 电影
- 3: 电视剧
- 4: 动漫
- 5: 综艺
- 6: 充电视频

## CSS选择器总结

| 数据项 | CSS选择器 | 提取方式 |
|--------|-----------|----------|
| 搜索结果列表 | `.listBox .left .box .list .item` | 遍历所有结果项 |
| 标题 | `.item .title` | 文本内容 |
| 发布时间 | `.item .type.time` | 文本内容 |
| 来源类型 | `.item .type span` | 文本内容 |
| 详情页链接 | `.item a[href^="/d/"]` | href 属性 |

## 优先级建议
- **优先级**: 2-3 (质量良好的影视资源搜索)
- **跳过Service层过滤**: false (标准中文资源，保持过滤)
- **缓存TTL**: 2小时

## 搜索策略
1. 优先使用JavaScript变量提取数据（更快、更准确）
2. 如果JavaScript解析失败，回退到HTML解析
3. 必须对所有链接进行域名转换（pan.qualk.cn -> pan.quark.cn）
4. 只返回包含有效网盘链接的结果

