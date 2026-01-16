# 兄弟盘 (xiongdipan.com) HTML结构分析

## 网站信息

- **网站名称**: 兄弟盘
- **域名**: xiongdipan.com
- **类型**: 百度网盘资源搜索引擎
- **特点**: 专门搜索百度网盘资源，支持多种文件类型筛选

## 搜索流程

### 搜索URL模式

```
https://xiongdipan.com/search?page={页码}&k={关键词}&s={排序}&t={类型}

示例:
https://xiongdipan.com/search?page=1&k=凡人修仙传

参数说明:
- page: 页码，从1开始
- k: 搜索关键词（URL编码）
- s: 排序方式（可选）
  - 0: 默认排序
  - 1: 时间排序  
  - 2: 完全匹配
- t: 文件类型（可选）
  - -1: 全部类别
  - 1: 视频
  - 2: 音乐
  - 3: 图片
  - 4: 文档
  - 5: 压缩包
  - 6: 其他
  - 7: 文件夹
```

## 搜索结果页面结构

### 主要容器
- **页面容器**: `#app`
- **结果项容器**: `van-row` (每个搜索结果)

### 单个搜索结果结构

每个搜索结果包含在一个 `van-row` 元素中：

```html
<van-row>
    <!-- 隐藏的avail值 -->
    <div style="display: none;">
        <input name="avail" value="f03c5bdc457e067076eef46386379b8cc18af5320b64b369d5df35925a0603bd">
    </div>
    
    <!-- 详情页链接 -->
    <a href="/s/S1UVAU3m37" target="_blank">
        <van-col span="8" offset="8">
            <van-card thumb="/img/folder.png">
                <!-- 标题区域 -->
                <template #title>
                    <div name="content-title" style="font-size:medium;font-weight: 550;padding-top: 5px;">
                        <span style='color:red;'>凡人</span><span style='color:red;'>修仙</span><span style='color:red;'>传</span>
                    </div>
                </template>
                
                <!-- 元信息区域 -->
                <template #bottom>
                    <div style="padding-bottom: 20px;">
                        时间: 2025-10-16 &nbsp;&nbsp;格式:<b>文件夹</b>
                    </div>
                </template>
            </van-card>
        </van-col>
    </a>
    <van-divider></van-divider>
</van-row>
```

### 提取要素

1. **详情页链接**: `van-row > a` 的 `href` 属性
   - 格式: `/s/{资源ID}`
   - 完整URL: `https://xiongdipan.com/s/{资源ID}`

2. **标题**: `div[name="content-title"]` 的文本内容
   - 需要提取所有 `span` 标签的文本并拼接
   - 关键词会被标红显示

3. **分享时间**: `template #bottom` 中 "时间:" 后的内容
   - 格式: `YYYY-MM-DD`

4. **文件格式**: `template #bottom` 中 "格式:" 后的 `<b>` 标签内容
   - 常见值: "文件夹", "视频", "文档" 等

5. **avail值**: 隐藏的 `input[name="avail"]` 的 `value` 属性
   - 用于后续获取真实下载链接

## 详情页面结构

### 详情页URL模式
```
https://xiongdipan.com/s/{资源ID}

示例:
https://xiongdipan.com/s/S1UVAU3m37
```

### 详情页关键信息

```html
<van-row>
    <van-col span="8" offset="8">
        <h3 align="center">凡人修仙传</h3>
    </van-col>
</van-row>

<!-- 资源信息 -->
<van-cell title="名称" value="凡人修仙传"></van-cell>
<van-cell title="类型">文件夹</van-cell>
<van-cell title="类别">其他</van-cell>
<van-cell title="分享时间">2025-10-16</van-cell>

<!-- 重要：密码信息 -->
<van-cell title="密码">
    <b style="color: red">1314</b>
</van-cell>

<!-- 下载按钮（包含真实链接） -->
<van-goods-action-button type="info" text="同意声明,继续访问下载" @click="onDownload();"></van-goods-action-button>
```

### JavaScript中的真实链接

在详情页的JavaScript代码中可以找到真实的百度网盘链接：

```javascript
onDownload() {
    window.open("https://pan.baidu.com/s/15ebI1HYr-BERAnv1A7kOTQ?pwd=1314", "target");
}
```

### 提取要素

1. **资源名称**: `van-cell[title="名称"]` 的 `value` 属性
2. **文件类型**: `van-cell[title="类型"]` 的文本内容
3. **分享时间**: `van-cell[title="分享时间"]` 的文本内容
4. **密码**: `van-cell[title="密码"] b` 的文本内容
5. **百度网盘链接**: JavaScript中 `onDownload()` 函数内的 `window.open()` URL

## CSS选择器总结

| 数据项 | CSS选择器 | 提取方式 |
|--------|-----------|----------|
| 搜索结果列表 | `van-row:has(a[href^="/s/"])` | 遍历所有结果项 |
| 详情页链接 | `van-row > a[href^="/s/"]` | href 属性 |
| 标题 | `div[name="content-title"]` | 文本内容，拼接所有span |
| 分享时间 | `template #bottom` 中时间部分 | 正则提取 |
| 文件格式 | `template #bottom b` | 文本内容 |
| avail值 | `input[name="avail"]` | value 属性 |

## 详情页选择器

| 数据项 | CSS选择器 | 提取方式 |
|--------|-----------|----------|
| 资源名称 | `van-cell[title="名称"]` | value 属性或文本 |
| 密码 | `van-cell[title="密码"] b` | 文本内容 |
| 百度网盘链接 | JavaScript代码 | 正则提取onDownload函数中的URL |

## 实现要点

### 1. 两步搜索流程
1. **搜索页面**: 获取资源列表和详情页链接
2. **详情页面**: 获取真实的百度网盘链接和密码

### 2. 标题处理
- 标题由多个 `<span>` 标签组成，需要拼接
- 关键词会被标红显示，需要保留完整文本

### 3. 密码提取
- 密码在详情页的 `van-cell[title="密码"]` 中
- 通常为4位数字，显示为红色

### 4. 链接提取
- 真实的百度网盘链接在JavaScript的 `onDownload()` 函数中
- 需要使用正则表达式从JavaScript代码中提取
- 链接格式: `https://pan.baidu.com/s/{shareId}?pwd={password}`

### 5. 性能优化
- 只获取第一页结果（根据需求文档）
- 可以考虑并发获取详情页信息
- 建议添加请求间隔避免被限制

## 注意事项

1. **仅支持百度网盘**: 该网站专门提供百度网盘资源
2. **需要访问详情页**: 真实下载链接只在详情页的JavaScript中
3. **密码提取重要**: 百度网盘链接通常需要提取码
4. **请求频率控制**: 避免过快请求被网站限制
5. **JavaScript解析**: 需要从HTML中的JavaScript代码提取真实链接

## 示例数据结构

```json
{
  "title": "凡人修仙传",
  "detailUrl": "https://xiongdipan.com/s/S1UVAU3m37",
  "shareTime": "2025-10-16",
  "fileType": "文件夹",
  "password": "1314",
  "baiduUrl": "https://pan.baidu.com/s/15ebI1HYr-BERAnv1A7kOTQ?pwd=1314"
}
```
