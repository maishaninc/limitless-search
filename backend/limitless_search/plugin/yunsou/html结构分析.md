# 云搜影视 (yunsou) 网站搜索结果HTML结构分析

## 网站信息

- **网站名称**: 云搜影视
- **域名**: `yunsou.xyz`
- **搜索URL格式**: `https://yunsou.xyz/s/{关键词}.html`
- **主要特点**: 提供网盘资源搜索，支持夸克、百度、UC、迅雷、阿里云盘等多种网盘

## 搜索源类型

云搜影视提供两种搜索源：
1. **本地搜** (currentSource=0): 结果直接内嵌在HTML中
2. **全网搜** (currentSource=1): 通过SSE流式接口获取

本插件实现**本地搜**功能，因为：
- 结果更稳定可靠
- 响应速度更快
- 数据格式规范

## HTML结构

### 搜索结果页面结构

搜索结果直接内嵌在HTML的JavaScript代码中，以JSON格式存储：

```html
<script type="text/javascript" charset="utf-8">
    function linkBtn(element) {
        const index = element.getAttribute('data-index');
        var jsonData = '[{"id":51199,"source_category_id":3,"title":"凡人修仙传 真人版 [2025][奇幻 古装 大陆][杨洋 金晨]","is_type":4,"code":null,"url":"https://pan.xunlei.com/s/VOW9WQT6nyFBDjHwYjjGj13YA1?pwd=v2m9","is_time":0,"name":"凡人修仙传 真人版 [2025][奇幻 古装 大陆][杨洋 金晨]","times":"2025-07-27","category":{"source_category_id":3,"name":"电视剧"}},...]';
        // ...
    }
</script>
```

### JSON数据结构

每个搜索结果项的JSON结构如下：

```json
{
  "id": 51199,
  "source_category_id": 3,
  "title": "凡人修仙传 真人版 [2025][奇幻 古装 大陆][杨洋 金晨]",
  "is_type": 4,
  "code": null,
  "url": "https://pan.xunlei.com/s/VOW9WQT6nyFBDjHwYjjGj13YA1?pwd=v2m9",
  "is_time": 0,
  "name": "凡人修仙传 真人版 [2025][奇幻 古装 大陆][杨洋 金晨]",
  "times": "2025-07-27",
  "category": {
    "source_category_id": 3,
    "name": "电视剧"
  }
}
```

#### JSON字段说明

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `id` | number | 资源唯一ID | 51199 |
| `title` | string | 资源标题 | "凡人修仙传 真人版 [2025][奇幻 古装 大陆][杨洋 金晨]" |
| `is_type` | number | 网盘类型标识 | 0=夸克, 1=阿里, 2=百度, 3=UC, 4=迅雷 |
| `code` | string\|null | 提取码（可能为null） | "v2m9" 或 null |
| `url` | string | 网盘链接 | "https://pan.xunlei.com/s/..." |
| `times` | string | 发布时间 | "2025-07-27" |
| `category.name` | string | 资源分类 | "电视剧", "动漫", "电影"等 |

#### 网盘类型映射 (is_type)

```
0 -> 夸克网盘 (quark)
1 -> 阿里云盘 (aliyun)
2 -> 百度网盘 (baidu)
3 -> UC网盘 (uc)
4 -> 迅雷网盘 (xunlei)
```

### HTML展示结构

虽然数据在JS中，HTML中也有对应的展示结构：

```html
<div class="list">
    <div class="item">
        <a href="javascript:;" onclick="linkBtn(this)" data-index="0" class="title">
            凡人修仙传 真人版 [2025][奇幻 古装 大陆][杨洋 金晨]
        </a>
        <div class="type cate">分类：电视剧</div>
        <div class="type time">2025-07-27</div>
        <div class="type">
            <span>来源：迅雷网盘</span>
        </div>
        <div class="btns">
            <div class="btn">复制分享</div>
            <a href="/d/51199.html" class="btn">查看详情</a>
            <a href="javascript:;" onclick="linkBtn(this)" data-index="0" class="btn">立即访问</a>
        </div>
    </div>
</div>
```

## 提取逻辑

### 1. 搜索结果提取流程

```
1. 发送GET请求到搜索URL
   ├─ URL: https://yunsou.xyz/s/{URL编码的关键词}.html
   └─ 设置完整的浏览器请求头

2. 解析HTML响应
   ├─ 查找包含 "var jsonData = " 的script标签
   └─ 提取JSON字符串

3. 清理并解析JSON
   ├─ 移除控制字符和转义
   ├─ 解析为结构化数据
   └─ 处理异常数据

4. 转换为SearchResult格式
   ├─ 生成UniqueID: "yunsou-{id}"
   ├─ 设置标题、内容、时间
   ├─ 根据is_type确定网盘类型
   ├─ 构建Link对象（包含URL和提取码）
   └─ 添加分类标签

5. 关键词过滤
   └─ 使用FilterResultsByKeyword过滤结果
```

### 2. JSON提取正则表达式

```go
// 提取JSON数据的正则表达式
var jsonData = '[...]';
```

匹配模式：
- 查找 `var jsonData = '` 开头
- 提取单引号内的完整JSON字符串
- 处理转义字符和特殊字符

### 3. 网盘链接处理

#### 提取码处理

提取码可能存在于两个位置：
1. **JSON中的code字段**: 单独的提取码字段
2. **URL中的pwd参数**: `?pwd=xxxx` 格式

处理逻辑：
```go
password := ""
if code != nil && *code != "" {
    password = *code
} else if strings.Contains(url, "?pwd=") {
    // 从URL中提取pwd参数
    password = extractPwdFromURL(url)
}
```

#### 网盘类型转换

```go
func convertNetDiskType(isType int) string {
    switch isType {
    case 0:
        return "quark"   // 夸克网盘
    case 1:
        return "aliyun"  // 阿里云盘
    case 2:
        return "baidu"   // 百度网盘
    case 3:
        return "uc"      // UC网盘
    case 4:
        return "xunlei"  // 迅雷网盘
    default:
        return "others"
    }
}
```

### 4. 时间格式转换

时间格式为 "2025-07-27"，需要解析为 time.Time：

```go
// 解析时间字符串
const timeLayout = "2006-01-02"
parsedTime, err := time.Parse(timeLayout, times)
if err != nil {
    parsedTime = time.Now() // 解析失败使用当前时间
}
```

### 5. 内容构建

内容字段组合多个信息：

```go
contentParts := []string{}
if category != "" {
    contentParts = append(contentParts, "【"+category+"】")
}
// 可以添加更多描述信息
content := strings.Join(contentParts, " ")
```

## 实现要点

### 1. HTTP请求

必须设置完整的浏览器请求头：

```go
req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")
req.Header.Set("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8")
req.Header.Set("Connection", "keep-alive")
req.Header.Set("Referer", "https://yunsou.xyz/")
```

### 2. JSON提取

需要处理的特殊情况：
- 单引号包裹的JSON字符串
- 转义的双引号 `\"`
- 可能存在的控制字符（`\x00-\x1F`, `\x7F`）
- Unicode转义序列

清理代码：
```go
// 移除控制字符
jsonStr = regexp.MustCompile(`[\x00-\x1F\x7F]`).ReplaceAllString(jsonStr, "")

// 处理转义
jsonStr = strings.ReplaceAll(jsonStr, `\"`, `"`)
jsonStr = strings.ReplaceAll(jsonStr, `\/`, `/`)
```

### 3. 错误处理

需要处理的错误情况：
- 网络请求失败
- HTTP状态码非200
- 未找到JSON数据
- JSON解析失败
- 空结果集

### 4. 数据验证

在添加到结果前验证：
- UniqueID 不为空
- Title 不为空
- URL 是有效的网盘链接
- Links 数组不为空（系统会自动过滤无链接结果）

## 注意事项

1. **URL编码**: 关键词必须进行URL编码
2. **中文支持**: 确保正确处理UTF-8编码
3. **提取码位置**: 优先使用code字段，其次从URL提取
4. **时间解析**: 处理时间解析失败的情况
5. **空值处理**: code字段可能为null，需要类型断言
6. **链接验证**: 确保网盘链接格式正确
7. **插件规范**: 
   - Channel字段必须为空字符串
   - Links不能为空（会被系统过滤）
   - 使用FilterResultsByKeyword进行关键词过滤

## 示例代码片段

### JSON数据提取

```go
import (
    "regexp"
    "strings"
)

// 提取JSON数据
func extractJSONData(htmlContent string) (string, error) {
    // 查找 var jsonData = '...'
    pattern := regexp.MustCompile(`var jsonData = '(.+?)';`)
    matches := pattern.FindStringSubmatch(htmlContent)
    
    if len(matches) < 2 {
        return "", fmt.Errorf("未找到JSON数据")
    }
    
    jsonStr := matches[1]
    
    // 清理控制字符
    jsonStr = regexp.MustCompile(`[\x00-\x1F\x7F]`).ReplaceAllString(jsonStr, "")
    
    // 处理转义字符
    jsonStr = strings.ReplaceAll(jsonStr, `\\/`, `/`)
    jsonStr = strings.ReplaceAll(jsonStr, `\\"`, `"`)
    
    return jsonStr, nil
}
```

### 网盘链接构建

```go
// 构建Link对象
func buildLink(item YunsouItem) model.Link {
    link := model.Link{
        Type: convertNetDiskType(item.IsType),
        URL:  item.URL,
    }
    
    // 处理提取码
    if item.Code != nil && *item.Code != "" {
        link.Password = *item.Code
    } else if strings.Contains(item.URL, "?pwd=") {
        link.Password = extractPwdFromURL(item.URL)
    }
    
    return link
}
```

## 优先级建议

根据云搜影视的特点，建议设置优先级为 **2**：
- ✅ 数据源质量良好，资源较新
- ✅ 支持多种网盘类型
- ✅ 响应速度较快
- ✅ 数据格式规范，易于解析
- ⚠️ 作为聚合搜索站点，可能有少量失效链接

## 相关链接

- 搜索示例: `https://yunsou.xyz/s/凡人修仙传.html`
- 详情页示例: `https://yunsou.xyz/d/51199.html` (可选，插件不需要访问)

