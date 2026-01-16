# xiaozhang插件HTML结构分析

## 网站信息
- 网站名称：校长影视
- 主域名：https://xzys.fun
- 网站类型：影视资源搜索网站

## 1. 搜索页面结构

### 搜索URL格式
```
https://xzys.fun/search.html?keyword={关键词}
```

### 页面结构分析

#### 搜索结果容器
- 主容器：`<div class="container tc-main">`
- 结果列表：`<div class="col-md-9">`
- 单个结果：`<div class="list-boxes">`

#### 搜索结果项结构
```html
<div class="list-boxes" style="position: relative;">
    <h2>
        <div class="left_ly">
            <a href="/subject/9861.html">
                <img class="image_left" src="https://img9.doubanio.com/view/photo/s/public/p2610801866.webp" 
                     alt="凡人修仙传 [2020][7.9分]" class="img-responsive" referrerPolicy="no-referrer"/>
            </a>
        </div>
        <a class="text_title_p" href="/subject/9861.html">凡人修仙传 [2020][7.9分][更156]</a>
    </h2>
    <p class="text_p">
        平凡少年韩立出生贫困，为了让家人过上更好的生活，自愿前去七玄门参加入门考核...
    </p>
    <div>
        <div class="pull-left">
            <div class="list-actions">
                <span>2025-08-16&nbsp;&nbsp;</span>
                <i class="fa fa-eye like_p"></i><span>61591</span>
            </div>
        </div>
        <div class="pull-right">
            <a class="btn btn-warning btn-sm pull-right" href="/subject/9861.html">查看详情</a>
        </div>
    </div>
</div>
```

#### 字段提取要点
- **标题**：`a.text_title_p` 的文本内容
- **详情页链接**：`a.text_title_p` 的 `href` 属性
- **描述**：`p.text_p` 的文本内容
- **发布时间**：`.list-actions span:first-child` 的文本
- **查看次数**：`.list-actions .like_p + span` 的文本
- **封面图片**：`.left_ly img` 的 `src` 属性

## 2. 详情页面访问流程

### 两步访问机制
1. **第一步**：访问搜索结果中的详情页链接（如：`/subject/9861.html`）
2. **第二步**：从响应头的`Location`字段获取真实详情页URL（如：`/article/p/98/9861.html`）
3. **第三步**：访问真实详情页URL获取下载链接

### 详情页URL构建
```
第一步URL：https://xzys.fun + /subject/9861.html
第二步URL：https://xzys.fun + /article/p/98/9861.html
```

## 3. 详情页面结构

### 页面基本信息
- 标题：`<h1 class="articl_title">凡人修仙传 [2020][7.9分][更156]</h1>`
- 发布时间：`.article-infobox span:first-child`
- 更新时间：`.d-tag2 .label-success`
- 类型标签：`.d-tag2 .label-warning`

### 下载链接结构
```html
<p><a href=https://pan.quark.cn/s/e4b1762e9b48 target="_blank">
    <button style="width:auto;height:40px;font-weight:bold;background-color:#D85670" class="btn btn-info">
        夸克网盘
    </button>
</a></p><br/>

<p><a href=https://pan.baidu.com/s/1yFPbKsyeAhXuPBMzh6hk-Q?pwd=v2sa target="_blank">
    <button style="width:auto;height:40px;font-weight:bold;background-color:#009FD4" class="btn btn-info">
        百度网盘
    </button>
</a> 提取码：v2sa</p><br/>
```

#### 下载链接提取要点
- **链接选择器**：`p a[href*="pan."]` 或 `p a[href*="://"]`
- **网盘类型判断**：
  - 夸克网盘：包含 `pan.quark.cn`，按钮颜色 `#D85670`
  - 百度网盘：包含 `pan.baidu.com`，按钮颜色 `#009FD4`
  - 其他网盘：根据域名判断
- **密码提取**：
  - 在链接所在的 `<p>` 标签后面查找 `提取码：{密码}`
  - 或者从URL参数中提取 `?pwd={密码}`

## 4. 支持的网盘类型

根据HTML结构分析，网站支持以下网盘：
- 夸克网盘（pan.quark.cn）
- 百度网盘（pan.baidu.com）
- 可能还包括迅雷、阿里等其他网盘

## 5. 特殊处理事项

### 重定向处理
- 搜索结果中的详情页链接需要进行重定向处理
- 必须获取Location头信息才能得到真实的详情页URL

### 密码提取
- 密码可能在URL参数中（如：`?pwd=v2sa`）
- 也可能在页面文本中（如：`提取码：v2sa`）

### 错误处理
- 需要处理重定向失败的情况
- 需要处理详情页无下载链接的情况

## 6. 实现建议

1. **搜索实现**：直接解析搜索页面HTML，提取结果列表
2. **详情页处理**：实现两步访问机制，先获取重定向，再提取链接
3. **链接类型识别**：根据域名判断网盘类型
4. **密码提取**：同时支持URL参数和页面文本两种方式
5. **并发处理**：对详情页访问进行并发优化