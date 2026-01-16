# Wanou API 数据结构分析

## 基本信息
- **数据源类型**: JSON API
- **API URL格式**: `https://woog.nxog.eu.org/api.php/provide/vod?ac=detail&wd={关键词}`
- **数据特点**: 视频点播(VOD)系统API，提供结构化影视资源数据

## API响应结构

### 顶层结构
```json
{
    "code": 1,                    // 状态码：1表示成功
    "msg": "数据列表",             // 响应消息
    "page": 1,                    // 当前页码
    "pagecount": 1,               // 总页数
    "limit": 20,                  // 每页限制条数
    "total": 3,                   // 总记录数
    "list": []                    // 数据列表数组
}
```

### 单个视频对象结构

#### 核心识别字段
```json
{
    "vod_id": 18010,                      // 视频唯一ID
    "vod_name": "凡人修仙传",               // 视频标题
    "vod_sub": "The Immortal Ascension", // 副标题/英文名
    "vod_en": "fanrenxiuxianchuan",      // 英文标识
    "type_name": "剧集"                   // 类型名称
}
```

#### 内容描述字段
```json
{
    "vod_actor": "杨洋,金晨,汪铎,赵小棠...",    // 演员列表（逗号分隔）
    "vod_director": "杨阳",                   // 导演
    "vod_blurb": "该剧改编自忘语的同名小说...", // 剧情简介
    "vod_content": "<p>该剧改编自...</p>",    // HTML格式详细描述
    "vod_remarks": "第11集",                  // 更新状态/备注
    "vod_class": "奇幻,古装,内地剧,大陆剧,剧集", // 分类标签（逗号分隔）
    "vod_tag": "凡人修仙传,大夫,玄门,修仙..."   // 关键词标签（逗号分隔）
}
```

#### 时间和地区字段
```json
{
    "vod_year": "2025",                        // 年份
    "vod_area": "中国大陆",                     // 地区
    "vod_lang": "汉语普通话",                   // 语言
    "vod_pubdate": "2025-07-27(中国大陆)",     // 发布日期
    "vod_time": "2025-07-31 14:36:58"         // 更新时间
}
```

#### 下载链接字段（重要）
```json
{
    "vod_down_from": "bd$$$KG$$$UC",           // 下载源标识（用$$$分隔）
    "vod_down_server": "no$$$no$$$no",        // 服务器标识
    "vod_down_note": "$$$$$$",                // 下载备注
    "vod_down_url": "https://pan.baidu.com/s/13milLJZV5_7DCzGDQu-fcA?pwd=8888$$$https://pan.quark.cn/s/0fe46ed6eefc$$$https://drive.uc.cn/s/d83caf5d4fb74"
}
```

## 下载链接解析规则

### 分隔符规则
- **多个下载源**: 使用 `$$$` 分隔
- **对应关系**: `vod_down_from`、`vod_down_url`、`vod_down_note` 按相同位置对应

### 下载源标识映射
| API标识 | 网盘类型 | 域名示例 |
|---------|----------|----------|
| `bd`    | baidu (百度网盘) | `pan.baidu.com` |
| `KG`    | quark (夸克网盘) | `pan.quark.cn` |
| `UC`    | uc (UC网盘) | `drive.uc.cn` |
| `ALY`   | aliyun (阿里云盘) | `aliyundrive.com`, `alipan.com` |
| `XL`    | xunlei (迅雷网盘) | `pan.xunlei.com` |
| `TY`    | tianyi (天翼云盘) | `cloud.189.cn` |
| `115`   | 115 (115网盘) | `115.com` |
| `MB`    | mobile (移动网盘) | `caiyun.feixin.10086.cn` |
| `WY`    | weiyun (微云) | `share.weiyun.com` |
| `LZ`    | lanzou (蓝奏云) | `lanzou.com`, `lanzoui.com` |
| `JGY`   | jianguoyun (坚果云) | `jianguoyun.com` |
| `123`   | 123 (123网盘) | `123pan.com` |
| `PK`    | pikpak (PikPak) | `mypikpak.com` |

### 链接格式示例
```
百度网盘: https://pan.baidu.com/s/13milLJZV5_7DCzGDQu-fcA?pwd=8888
夸克网盘: https://pan.quark.cn/s/0fe46ed6eefc
UC网盘:   https://drive.uc.cn/s/d83caf5d4fb74
```

## 插件开发映射关系

### SearchResult字段映射
```go
// 基础信息
UniqueID: fmt.Sprintf("wanou-%d", vod_id)
Title:    vod_name
Content:  构建描述（vod_blurb + 演员导演信息）
Channel:  ""  // 插件搜索结果不设置频道名
Datetime: 解析vod_time字段

// 分类标签
Tags: 解析vod_class字段（按逗号分割）

// 下载链接
Links: 解析vod_down_url和vod_down_from字段
```

### Link字段映射
```go
model.Link{
    Type:     根据vod_down_from映射网盘类型
    URL:      从vod_down_url解析具体链接
    Password: 从URL参数中提取密码（如?pwd=8888）
}
```

## 支持的网盘类型（16种）

### 主流网盘
- **baidu (百度网盘)**: `https://pan.baidu.com/s/{分享码}?pwd={密码}`
- **quark (夸克网盘)**: `https://pan.quark.cn/s/{分享码}`
- **aliyun (阿里云盘)**: `https://aliyundrive.com/s/{分享码}`, `https://www.alipan.com/s/{分享码}`
- **uc (UC网盘)**: `https://drive.uc.cn/s/{分享码}`
- **xunlei (迅雷网盘)**: `https://pan.xunlei.com/s/{分享码}`

### 运营商网盘
- **tianyi (天翼云盘)**: `https://cloud.189.cn/t/{分享码}`
- **mobile (移动网盘)**: `https://caiyun.feixin.10086.cn/{分享码}`

### 专业网盘
- **115 (115网盘)**: `https://115.com/{分享码}`
- **weiyun (微云)**: `https://share.weiyun.com/{分享码}`
- **lanzou (蓝奏云)**: `https://lanzou.com/{分享码}`
- **jianguoyun (坚果云)**: `https://jianguoyun.com/{分享码}`
- **123 (123网盘)**: `https://123pan.com/s/{分享码}`
- **pikpak (PikPak)**: `https://mypikpak.com/s/{分享码}`

### 其他协议
- **magnet (磁力链接)**: `magnet:?xt=urn:btih:{hash}`
- **ed2k (电驴链接)**: `ed2k://|file|{filename}|{size}|{hash}|/`
- **others (其他类型)**: 其他不在上述分类中的链接

## 注意事项
1. **数据格式**: 纯JSON API，无需HTML解析
2. **分隔符处理**: 多个值使用`$$$`分隔，需要split处理
3. **密码提取**: 部分百度网盘链接包含`?pwd=`参数
4. **错误处理**: 检查`code`字段确认API响应状态
5. **空值处理**: 某些字段可能为空字符串，需要验证
6. **编码处理**: URL参数需要正确的URL编码处理

## API调用示例
```
搜索请求: https://woog.nxog.eu.org/api.php/provide/vod?ac=detail&wd=%E5%87%A1%E4%BA%BA%E4%BF%AE%E4%BB%99%E4%BC%A0
请求方法: GET
响应格式: application/json
编码格式: UTF-8
```