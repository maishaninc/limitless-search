# mikuclub JSON结构分析

## 搜索接口
- **URL**
```
https://www.mikuclub.uk/wp-json/utils/v2/post_list?search={kw}&s={kw}&page_type=search&paged=1&custom_orderby=relevance&no_cache=1&custom_cat={catId}
```
- **分类 ID**
  - `9305`: 影视区
  - `942`: 动漫区
- **请求方式**: GET，关键词需要 URL 编码，两个分类需并发请求后合并结果。

### 响应示例
```json
{
  "max_num_pages": 0,
  "posts": [
    {
      "id": 1909169,
      "post_title": "凡人修仙传【真人】...",
      "post_href": "https://www.mikuclub.uk/1909169",
      "post_image": "https://file6.mikuhome.top/.../326x280.webp",
      "post_views": 3094,
      "post_likes": 17,
      "post_rank_description": "多半好评",
      "post_comments": 20,
      "post_author": {
        "id": 474211,
        "display_name": "南缘DH2",
        "user_href": "https://www.mikuclub.uk/author/qq_1743601741"
      },
      "post_main_cat_id": 9305,
      "post_main_cat_name": "影视区",
      "post_cat_id": 21306,
      "post_cat_name": "电视剧-网剧",
      "post_cat_href": "https://www.mikuclub.uk/videos/tv-series",
      "post_date": "2025-07-28 21:16:11",
      "post_down_total_count": "558"
    }
  ]
}
```

### 字段说明
| 字段 | 说明 |
|------|------|
| `id` | 文章 ID（用于详情/唯一标识） |
| `post_title` | 标题 |
| `post_href` | 详情页 URL |
| `post_image` | 封面图 |
| `post_main_cat_name` | 主分类（影视区/动漫区） |
| `post_cat_name` | 子分类 |
| `post_date` | 发布时间 |
| `post_views`, `post_likes`, ... | 统计指标，可用于扩展 |

## 详情接口
- **URL**
```
https://www.mikuclub.uk/wp-json/wp/v2/posts/{post_id}
```
- **关键字段**
```json
{
  "id": 1909169,
  "date": "2025-07-28T21:16:11",
  "link": "https://www.mikuclub.uk/1909169",
  "content": {
    "rendered": "<p>...含夸克/百度等网盘链接...</p>"
  }
}
```
- `content.rendered` 为完整 HTML，包含下载信息、图片和广告。

### 链接提取
1. 优先解析 `<a href>`，根据域名识别网盘类型：
   - 夸克 `https://pan.quark.cn/s/...`
   - 百度 `https://pan.baidu.com/s/...`
   - 阿里云盘 `https://www.aliyundrive.com/s/...`
   - 其他：迅雷、123网盘等，可按需扩展
2. 文本中可能存在裸露 URL（无 `<a>`），需用正则额外匹配。
3. 提取码/密码通常与链接在同一段落，或以 `?pwd=` 参数出现，需要关键词匹配 `提取码/密码/pwd/code`。

## 实现要点
1. **双区并发搜索**  
   - 同时向 `custom_cat=9305` 与 `custom_cat=942` 发起请求，待双方返回后合并结果。  
   - 若某分类请求失败，仅记录日志，另一分类结果仍可返回；若全部失败则整体报错。
2. **详情页并发解析**  
   - 对候选文章再次并发请求 `wp-json/wp/v2/posts/{id}`，并通过缓存（TTL）避免重复抓取。
3. **结果合并**  
   - `UniqueID` 建议使用 `mikuclub-{id}`，合并两个分类后去重。  
   - `Tags` 可包含主分类、子分类及站内标签。
4. **性能优化**  
   - 自定义 `http.Client`（连接池、HTTP/2、TLS 超时）。  
   - 请求加入指数退避重试。  
   - 详情内容解析使用 goquery + 正则组合，抽取链接与提取码。  
   - 对正文文本传入 `substring` 限制上下文长度，降低扫描开销。

