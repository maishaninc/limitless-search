# 微博用户搜索 API 文档

---

## 一、Cookie认证

### 1.1 Cookie字段分类

微博Cookie包含多种类型的字段，有效期各不相同：

| Cookie字段 | 有效期 | 作用 |
|-----------|--------|------|
| **SUB** | 30天 | 用户认证令牌（长期） |
| **SUBP** | 30天 | 用户权限令牌（长期） |
| **SCF** | 30天 | 安全Cookie标识（长期） |
| **ALF** | 30天 | 认证过期时间（长期） |
| **ALC** | 6天 | PC端登录Cookie（中期） |
| **XSRF-TOKEN** | 2小时 | CSRF防护令牌（短期，需定期刷新） |
| **WBPSESS** | 2小时 | PC端会话令牌（短期，需定期刷新） |
| **mweibo_short_token** | 2小时 | 移动端短令牌（短期，需定期刷新） |
| **SSOLoginState** | 2小时 | 登录状态时间戳（短期） |
| **_T_WM** | 永久 | 移动端设备标识 |
| **WEIBOCN_FROM** | 永久 | 来源标识 |
| **MLOGIN** | 永久 | 移动端登录标识 |
| **M_WEIBOCN_PARAMS** | 永久 | 移动端参数 |

### 1.2 获取Cookie

#### 方式1: 二维码登录（推荐）

**接口**: `https://passport.weibo.com/sso/v2/qrcode/image`

**流程**:
1. 获取二维码图片和qrid
2. 轮询检查扫码状态: `https://passport.weibo.com/sso/v2/qrcode/check?qrid={qrid}`
3. 扫码成功后获取跳转URL
4. 访问跳转URL获取PC端Cookie
5. 使用PC端Cookie访问 `https://m.weibo.cn/` 获取移动端Cookie

**优势**: 自动获取PC端和移动端完整Cookie，包含所有必需字段

#### 方式2: 浏览器手动复制

1. 浏览器登录 [https://m.weibo.cn](https://m.weibo.cn)
2. 打开开发者工具（F12），移动模式
3. 切换到 Network（网络）标签
4. 刷新页面
5. 查找任意请求的 Request Headers
6. 复制 Cookie 字段的完整值

**注意**: 浏览器复制的Cookie确保包含移动端字段（`_T_WM`、`mweibo_short_token`等）

### 1.3 Cookie域名设置

不同API需要不同域名的Cookie：

| API | 域名 | 必需Cookie域 |
|-----|------|-------------|
| PC搜索API | `weibo.com` | `.weibo.com` |
| 移动评论API | `m.weibo.cn` | `.weibo.cn` |

**建议**: 将Cookie同时设置到 `.weibo.com` 和 `.weibo.cn` 两个域名

### 1.4 Cookie保活机制

**核心问题**: 短期令牌（2小时有效期）过期后会导致API请求失败

**解决方案**: 定期访问微博首页刷新短期令牌

**刷新方法**:
1. 每小时访问 `https://weibo.com/` 和 `https://m.weibo.cn/`
2. 从响应的Set-Cookie中提取更新后的令牌
3. 更新本地Cookie存储

**刷新的字段**:
- `XSRF-TOKEN` - 从响应头自动更新
- `WBPSESS` - 从Set-Cookie更新
- `mweibo_short_token` - 从Set-Cookie更新
- `ALC` - 从Set-Cookie更新（延长6天）

**保活效果**: 通过持续刷新，Cookie可保持有效最长30天（长期令牌的有效期）

---

## 二、用户微博搜索API

### 2.1 接口概述

**接口地址**: `https://weibo.com/ajax/profile/searchblog`  
**请求方法**: `GET`  
**认证方式**: Cookie 认证（需要登录态）

### 2.2 请求参数

| 参数名 | 类型 | 必填 | 描述 | 示例值 |
|--------|------|------|------|--------|
| uid | string | 是 | 用户唯一ID | `"5487050770"` |
| feature | number | 否 | 微博类型筛选<br>• `0` - 全部微博（默认）<br>• `1` - 原创微博 | `0` |
| q | string | 是 | 搜索关键词 | `"传说"` |
| page | number | 否 | 页码，从1开始 | `1` |

### 2.3 请求头（Headers）

```http
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36
Referer: https://weibo.com/
Accept: application/json, text/plain, */*
Accept-Language: zh-CN,zh;q=0.9
Cookie: <your_weibo_cookie>
```

**重要**: Cookie 必须包含有效的登录凭证，否则API会返回401错误。

### 2.4 响应数据结构

#### 成功响应

```json
{
  "ok": 1,
  "data": {
    "list": [
      {
        "id": 5230754395068367,
        "idstr": "5230754395068367",
        "mid": "5230754395068367",
        "mblogid": "QcU3RlgvR",
        "created_at": "Sat Nov 08 17:01:33 +0800 2025",
        "text": "微博正文内容（HTML格式）",
        "text_raw": "微博正文内容（纯文本）",
        "source": "动漫博主",
        "user": {
          "id": 5487050770,
          "idstr": "5487050770",
          "screen_name": "百特丸maru",
          "profile_image_url": "https://tvax1.sinaimg.cn/crop.0.0.1080.1080.50/005Zl6ySly8i4dfx694lrj30u00u040d.jpg",
          "verified": true,
          "verified_type": 0,
          "avatar_large": "https://tvax1.sinaimg.cn/...",
          "avatar_hd": "https://tvax1.sinaimg.cn/...",
          "following": true,
          "follow_me": true
        },
        "pic_ids": [
          "005Zl6ySly1i74wjjvwrmj315o0ng7av"
        ],
        "pic_num": 1,
        "pic_infos": {
          "005Zl6ySly1i74wjjvwrmj315o0ng7av": {
            "thumbnail": {
              "url": "https://wx3.sinaimg.cn/wap180/...",
              "width": 180,
              "height": 101
            },
            "large": {
              "url": "https://wx3.sinaimg.cn/orj960/...",
              "width": 1500,
              "height": 844
            },
            "original": {
              "url": "https://wx3.sinaimg.cn/orj1080/...",
              "width": 1500,
              "height": 844
            }
          }
        },
        "reposts_count": 2,
        "comments_count": 2,
        "attitudes_count": 7,
        "isLongText": false,
        "region_name": "其他",
        "title_source": {
          "name": "银河英雄传说超话",
          "url": "https://huati.weibo.com/k/银河英雄传说",
          "image": "http://wx2.sinaimg.cn/thumbnail/..."
        }
      }
    ]
  }
}
```

#### 字段说明

**响应根对象**:

| 字段名 | 类型 | 描述 |
|--------|------|------|
| ok | number | 请求状态<br>• `1` - 成功<br>• `0` - 失败 |
| data | object | 数据对象 |
| data.list | array | 微博列表 |

**微博对象 (list[])**:

| 字段名 | 类型 | 描述 |
|--------|------|------|
| id | number | 微博唯一ID（数字） |
| idstr | string | 微博唯一ID（字符串） |
| mid | string | 微博消息ID |
| mblogid | string | 微博短ID（用于分享链接） |
| created_at | string | 发布时间（格式：`"Sat Nov 08 17:01:33 +0800 2025"`） |
| text | string | 微博正文（HTML格式，包含表情、链接等标签） |
| text_raw | string | 微博正文（纯文本） |
| source | string | 发布来源（如"动漫博主"、"iPhone客户端"等） |
| user | object | 用户信息对象 |
| pic_ids | array | 图片ID列表 |
| pic_num | number | 图片数量 |
| pic_infos | object | 图片详细信息（键为pic_id） |
| reposts_count | number | 转发数 |
| comments_count | number | 评论数 |
| attitudes_count | number | 点赞数 |
| isLongText | boolean | 是否为长文本微博 |
| region_name | string | 发布地区 |
| title_source | object | 超话信息（如果来自超话） |

**用户对象 (user)**:

| 字段名 | 类型 | 描述 |
|--------|------|------|
| id | number | 用户ID（数字） |
| idstr | string | 用户ID（字符串） |
| screen_name | string | 用户昵称 |
| profile_image_url | string | 头像URL（小图） |
| avatar_large | string | 头像URL（大图） |
| avatar_hd | string | 头像URL（高清） |
| verified | boolean | 是否认证 |
| verified_type | number | 认证类型<br>• `0` - 个人认证<br>• `2` - 企业认证<br>• `-1` - 未认证 |
| following | boolean | 当前用户是否关注该用户 |
| follow_me | boolean | 该用户是否关注当前用户 |

**图片信息对象 (pic_infos)**:

每个图片ID对应的值包含以下尺寸：

| 字段名 | 描述 |
|--------|------|
| thumbnail | 缩略图（180px） |
| bmiddle | 中等尺寸（360px） |
| large | 大图（960px） |
| original | 原图（1080px） |
| largest | 最大尺寸 |

每个尺寸对象包含：
- `url`: 图片URL
- `width`: 宽度
- `height`: 高度
- `cut_type`: 裁剪类型
- `type`: 图片类型

**超话信息对象 (title_source)**:

| 字段名 | 类型 | 描述 |
|--------|------|------|
| name | string | 超话名称 |
| url | string | 超话链接 |
| image | string | 超话图标 |

### 2.5 请求示例

#### Python 示例

```python
import requests

# 配置
url = "https://weibo.com/ajax/profile/searchblog"
headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://weibo.com/",
    "Accept": "application/json, text/plain, */*",
    "Cookie": "your_cookie_here"  # 需要替换为实际的Cookie
}

params = {
    "uid": "5487050770",    # 用户ID
    "feature": 0,           # 全部微博
    "q": "传说",            # 关键词
    "page": 1               # 页码
}

# 发送请求
response = requests.get(url, params=params, headers=headers)
data = response.json()

# 处理结果
if data.get("ok") == 1:
    weibo_list = data.get("data", {}).get("list", [])
    print(f"获取到 {len(weibo_list)} 条微博")
    
    for weibo in weibo_list:
        print(f"ID: {weibo['id']}")
        print(f"内容: {weibo.get('text_raw', '')}")
        print(f"发布时间: {weibo['created_at']}")
        print(f"点赞数: {weibo['attitudes_count']}")
        print("-" * 50)
else:
    print("请求失败")
```

#### cURL 示例

```bash
curl -X GET \
  'https://weibo.com/ajax/profile/searchblog?uid=5487050770&feature=0&q=传说&page=1' \
  -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' \
  -H 'Referer: https://weibo.com/' \
  -H 'Accept: application/json, text/plain, */*' \
  -H 'Cookie: your_cookie_here'
```

### 2.6 错误处理

#### 1. 未登录/Cookie失效

```json
{
  "ok": 0,
  "msg": "未登录",
  "errno": "100005"
}
```

**解决方案**: 更新Cookie为有效的登录凭证

#### 2. 用户不存在

```json
{
  "ok": 0,
  "msg": "用户不存在",
  "errno": "100003"
}
```

**解决方案**: 检查uid参数是否正确

#### 3. 请求过于频繁

```json
{
  "ok": 0,
  "msg": "请求过于频繁，请稍后再试"
}
```

**解决方案**: 添加请求间隔（建议1-3秒）

### 2.7 使用限制

1. **认证要求**: 必须提供有效的Cookie
2. **频率限制**: 建议每次请求间隔1-3秒，避免触发反爬虫
3. **分页限制**: 单次最多返回20条微博，需要翻页获取更多
4. **Cookie有效期**: Cookie会过期，需要定期更新

---

## 三、微博评论API

### 3.1 接口概述

**接口地址**: `https://m.weibo.cn/comments/hotflow`  
**请求方法**: `GET`  
**认证方式**: Cookie 认证

### 3.2 请求参数

| 参数名 | 类型 | 必填 | 描述 | 示例值 |
|--------|------|------|------|--------|
| id | string | 是 | 微博ID | `"5230754395068367"` |
| mid | string | 是 | 微博MID（与id相同） | `"5230754395068367"` |
| max_id | number | 否 | 分页参数（第一页传0） | `0` |
| max_id_type | number | 否 | 分页类型（第一页传0） | `0` |

### 3.3 请求头（Headers）

```http
User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15
Referer: https://m.weibo.cn/
Accept: application/json, text/plain, */*
Cookie: <your_weibo_cookie>
```

**注意**: 评论API使用移动端User-Agent，Cookie必须包含移动端字段（`_T_WM`、`mweibo_short_token`等）

### 3.4 响应数据结构

```json
{
  "ok": 1,
  "data": {
    "data": [
      {
        "id": 4968123456789,
        "text": "评论内容（HTML格式）",
        "user": {
          "id": 1234567890,
          "screen_name": "评论用户昵称"
        },
        "created_at": "Thu Nov 09 10:30:00 +0800 2025"
      }
    ],
    "max_id": 4968123456788,
    "max_id_type": 0
  }
}
```

#### 字段说明

| 字段名 | 类型 | 描述 |
|--------|------|------|
| ok | number | 请求状态（1-成功，0-失败） |
| data.data | array | 评论列表 |
| data.max_id | number | 下一页的max_id参数（0表示没有更多） |
| data.max_id_type | number | 下一页的max_id_type参数 |

**评论对象**:

| 字段名 | 类型 | 描述 |
|--------|------|------|
| id | number | 评论ID |
| text | string | 评论内容（HTML格式，可能包含链接） |
| user | object | 评论用户信息 |
| created_at | string | 评论时间 |

### 3.5 请求示例

```python
import requests

url = "https://m.weibo.cn/comments/hotflow"
headers = {
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15",
    "Referer": "https://m.weibo.cn/",
    "Accept": "application/json, text/plain, */*",
    "Cookie": "your_cookie_here"
}

params = {
    "id": "5230754395068367",
    "mid": "5230754395068367",
    "max_id": 0,
    "max_id_type": 0
}

response = requests.get(url, params=params, headers=headers)
data = response.json()

if data.get("ok") == 1:
    comments = data.get("data", {}).get("data", [])
    print(f"获取到 {len(comments)} 条评论")
    
    for comment in comments:
        print(f"用户: {comment['user']['screen_name']}")
        print(f"内容: {comment['text']}")
        print("-" * 50)
```

### 3.6 错误处理

#### 1. Cookie失效（retcode=6102）

```json
{
  "ok": 0,
  "retcode": 6102,
  "msg": "未登录"
}
```

**原因**: Cookie缺少移动端字段或短期令牌过期  
**解决方案**: 使用二维码登录获取完整Cookie，或刷新Cookie
