# 微博搜索插件 (Weibo)

## 📖 简介

Weibo是Limitless Search的微博搜索插件，支持多用户登录微博并配置要搜索的微博用户，在搜索时自动聚合所有配置的微博用户发布的资源链接（从微博正文和评论中提取）。

## ✨ 核心特性

- ✅ **多账户支持** - 每个微博账户独立配置，互不干扰
- ✅ **扫码登录** - 手机微博扫码，自动获取Cookie
- ✅ **多微博用户** - 每个账户可配置多个要搜索的微博用户
- ✅ **评论提取** - 自动提取微博正文和评论中的网盘链接
- ✅ **智能去重** - 多账户配置相同微博用户时自动去重
- ✅ **负载均衡** - 任务均匀分配，避免单账户限流
- ✅ **内存缓存** - 用户数据缓存到内存，搜索性能极高
- ✅ **持久化存储** - Cookie和配置自动保存，重启不丢失
- ✅ **Web管理界面** - 一站式配置，简单易用
- ✅ **RESTful API** - 支持程序化调用

## 🚀 快速开始

### 步骤1: 启动服务

```bash
cd /path/to/pansou
ENABLED_PLUGINS=weibo go run main.go

# 或者编译后运行
go build -o pansou main.go
ENABLED_PLUGINS=weibo ./pansou
```

### 步骤2: 访问管理页面

浏览器打开：
```
http://localhost:8888/weibo/你的微博用户名
```

**示例**：
```
http://localhost:8888/weibo/pansou123
```

系统会自动：
1. 根据用户名生成专属64位hash（不可逆）
2. 重定向到专属管理页面：`http://localhost:8888/weibo/{hash}`
3. 显示二维码供扫码登录

**📌 提示**：请收藏hash后的URL（包含你的专属hash），方便下次访问。

### 步骤3: 扫码登录

1. 页面会自动显示微博登录二维码
2. 使用**手机微博APP**扫描二维码
3. 扫码后系统会**自动检测登录状态**（每2秒检查一次）
4. 登录成功后自动显示用户信息

### 步骤4: 配置微博用户

在"微博用户管理"区域输入要搜索的微博用户ID，**每行一个**：

```
1234567890
2345678901
3456789012
```

**支持格式**：
- ✅ 纯用户ID：`1234567890`
- ✅ 完整URL：`https://weibo.com/u/1234567890`

点击"**保存配置**"按钮。

**📌 如何获取微博用户ID？**
1. 访问目标微博用户主页
2. 查看URL：`https://weibo.com/u/1234567890`
3. 其中 `1234567890` 就是用户ID

### 步骤5: 开始搜索

在Limitless Search主页搜索框输入关键词，系统会**自动搜索所有配置的微博用户**的微博内容！

```bash
# 通过API搜索
curl "http://localhost:8888/api/search?kw=唐朝诡事录"

# 只搜索插件（包括weibo）
curl "http://localhost:8888/api/search?kw=唐朝诡事录&src=plugin"
```

## 📡 API文档

### 统一接口

所有操作通过统一的POST接口：

```
POST /weibo/{hash}
Content-Type: application/json

{
  "action": "操作类型",
  ...其他参数
}
```

### API列表

| Action | 说明 | 需要登录 | 前端调用时机 |
|--------|------|---------|-------------|
| `get_status` | 获取状态 | ❌ | 每3秒自动调用 |
| `refresh_qrcode` | 刷新二维码 | ❌ | 用户点击刷新按钮 |
| `check_login` | 检查登录状态 | ❌ | 未登录时每2秒调用 |
| `logout` | 退出登录 | ✅ | 用户点击退出按钮 |
| `set_users` | 设置微博用户列表 | ✅ | 用户点击保存按钮 |
| `test_search` | 测试搜索 | ✅ | 用户点击搜索按钮 |

---

### 1️⃣ get_status - 获取账户状态

**作用**：获取当前账户的登录状态、配置的微博用户等信息

**请求**：
```bash
curl -X POST "http://localhost:8888/weibo/{hash}" \
  -H "Content-Type: application/json" \
  -d '{"action": "get_status"}'
```

**成功响应（已登录）**：
```json
{
  "success": true,
  "message": "获取成功",
  "data": {
    "hash": "abc123...",
    "logged_in": true,
    "status": "active",
    "username_masked": "pa****ou",
    "login_time": "2025-10-28 12:00:00",
    "expire_time": "2026-10-28 12:00:00",
    "expires_in_days": 365,
    "weibo_users": ["1234567890", "2345678901"],
    "user_count": 2,
    "qrcode_base64": ""
  }
}
```

**成功响应（未登录）**：
```json
{
  "success": true,
  "message": "获取成功",
  "data": {
    "hash": "abc123...",
    "logged_in": false,
    "status": "pending",
    "username_masked": "",
    "weibo_users": [],
    "user_count": 0,
    "qrcode_base64": "data:image/png;base64,iVBORw0KGgo..."
  }
}
```

---

### 2️⃣ refresh_qrcode - 刷新二维码

**作用**：强制生成新的二维码（当二维码过期时）

**请求**：
```bash
curl -X POST "http://localhost:8888/weibo/{hash}" \
  -H "Content-Type: application/json" \
  -d '{"action": "refresh_qrcode"}'
```

**成功响应**：
```json
{
  "success": true,
  "message": "二维码已刷新",
  "data": {
    "qrcode_base64": "data:image/png;base64,iVBORw0KGgo..."
  }
}
```

**说明**：
- 二维码有效期约2-3分钟
- 过期后需要点击刷新

---

### 3️⃣ check_login - 检查登录状态

**作用**：检查二维码是否被扫描，登录是否成功（扫码后轮询调用）

**请求**：
```bash
curl -X POST "http://localhost:8888/weibo/{hash}" \
  -H "Content-Type: application/json" \
  -d '{"action": "check_login"}'
```

**响应（等待扫码）**：
```json
{
  "success": true,
  "message": "等待扫码",
  "data": {
    "login_status": "waiting"
  }
}
```

**响应（登录成功）**：
```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "login_status": "success",
    "username_masked": "pa****ou"
  }
}
```

**响应（二维码过期）**：
```json
{
  "success": false,
  "message": "二维码已失效，请刷新"
}
```

**说明**：
- 前端未登录时每2秒自动调用
- 登录成功后前端会停止轮询
- 后端会自动获取完整Cookie并保存

---

### 4️⃣ logout - 退出登录

**作用**：清除Cookie，退出登录状态

**请求**：
```bash
curl -X POST "http://localhost:8888/weibo/{hash}" \
  -H "Content-Type: application/json" \
  -d '{"action": "logout"}'
```

**成功响应**：
```json
{
  "success": true,
  "message": "已退出登录",
  "data": {
    "status": "pending"
  }
}
```

---

### 5️⃣ set_users - 设置微博用户列表

**作用**：配置或更新要搜索的微博用户列表（覆盖式更新）

**请求**：
```bash
curl -X POST "http://localhost:8888/weibo/{hash}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "set_users",
    "users": ["1234567890", "2345678901", "https://weibo.com/u/3456789012"]
  }'
```

**成功响应**：
```json
{
  "success": true,
  "message": "微博用户列表已更新",
  "data": {
    "weibo_users": ["1234567890", "2345678901", "3456789012"],
    "user_count": 3,
    "invalid_users": []
  }
}
```

**说明**：
- 自动提取用户ID（支持URL格式）
- 自动去重
- 只保存数字格式的用户ID

---

### 6️⃣ test_search - 测试搜索

**作用**：在管理页面测试搜索功能

**请求**：
```bash
curl -X POST "http://localhost:8888/weibo/{hash}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "test_search",
    "keyword": "唐朝诡事录"
  }'
```

**参数**：
- `keyword`（必需）：搜索关键词

**成功响应**：
```json
{
  "success": true,
  "message": "找到 3 条结果",
  "data": {
    "keyword": "唐朝诡事录",
    "total_results": 3,
    "users_searched": ["1234567890", "2345678901"],
    "results": [
      {
        "unique_id": "weibo-1234567890-M_Pqs5eOb",
        "title": "唐朝诡事录 全集",
        "content": "唐朝诡事录更新至40集...",
        "links": [
          {
            "type": "quark",
            "url": "https://pan.quark.cn/s/xxxxx",
            "password": ""
          }
        ]
      }
    ]
  }
}
```

---

## 🔧 配置说明

### 环境变量（可选）

```bash
# Hash Salt（推荐自定义，增强安全性）
export WEIBO_HASH_SALT="your-custom-salt-here"

# Cookie加密密钥（32字节，推荐自定义）
export WEIBO_ENCRYPTION_KEY="your-32-byte-key-here!!!!!!!!!!"
```

### 代码内配置

在 `weibo.go` 第28-33行修改：

```go
const (
    MaxConcurrentUsers = 10  // 最多同时搜索多少个微博账户
    MaxConcurrentWeibo = 30  // 最多同时处理多少条微博（获取评论）
    MaxComments        = 1   // 每条微博最多获取多少条评论
    DebugLog           = false
)
```

**参数说明**：

| 参数 | 默认值 | 说明 | 建议 |
|------|--------|------|------|
| `MaxConcurrentUsers` | 10 | 单次搜索最多使用的微博账户数 | 5-10足够 |
| `MaxConcurrentWeibo` | 30 | 最大并发处理微博数（获取评论） | 20-50 |
| `MaxComments` | 1 | 每条微博最多获取多少条评论 | 1-3条 |
| `DebugLog` | false | 是否开启调试日志 | 生产环境false |

## 📂 数据存储

### 存储位置

```
cache/weibo_users/{hash}.json
```

### 数据结构

```json
{
  "hash": "abc123...",
  "username_masked": "pa****ou",
  "cookie": "SUB=xxx; SUBP=xxx; ...",
  "status": "active",
  "weibo_users": ["1234567890", "2345678901", "3456789012"],
  "created_at": "2025-11-19T12:00:00+08:00",
  "login_at": "2025-11-19T12:00:00+08:00",
  "expire_at": "2026-11-19T12:00:00+08:00",
  "last_access_at": "2025-11-19T13:00:00+08:00"
}
```

**字段说明**：
- `hash`: 账户唯一标识（SHA256，不可逆）
- `username_masked`: 脱敏用户名（如`pa****ou`）
- `cookie`: 微博登录Cookie（明文存储，建议配置加密）
- `status`: 账户状态（`pending`/`active`/`expired`）
- `weibo_users`: 要搜索的微博用户ID列表
- `expire_at`: Cookie过期时间

## 🔒 安全特性

### 1. 用户名隐私保护

- ✅ **不存储明文用户名**：只存储SHA256 hash（64位十六进制）
- ✅ **不可逆**：无法从hash反推用户名
- ✅ **加盐hash**：支持自定义salt，进一步增强安全性

### 2. Cookie安全

- ⚠️ **当前**：明文存储到JSON（方便调试）
- ✅ **可选**：通过环境变量配置加密密钥
- ✅ **建议**：生产环境配置`WEIBO_ENCRYPTION_KEY`

### 3. 自动清理

**定期清理任务**（每24小时）：
- 删除：状态为`expired`且30天未访问的账户
- 标记：90天未访问的账户标记为`expired`

## ⚙️ 工作原理

### 搜索流程

```
用户搜索关键词 "唐朝诡事录"
  ↓
加载所有active状态的微博账户
  ↓
取最近访问的前10个账户（负载均衡）
  ↓
为每个账户分配要搜索的微博用户
  ↓
并发执行:
  账户A → 搜索微博用户 1234567890
  账户B → 搜索微博用户 2345678901
  账户C → 搜索微博用户 3456789012
  ↓
  对每个微博用户:
    1. 获取前3页微博列表
    2. 过滤包含关键词的微博
    3. 提取微博正文中的网盘链接
    4. 获取第1条评论（可配置）
    5. 提取评论中的网盘链接
  ↓
合并所有账户的搜索结果
  ↓
去重（基于微博ID）
  ↓
返回最终结果
```

### 链接提取

**支持的网盘类型**：
- 夸克网盘：`https://pan.quark.cn/s/xxxxx`
- 阿里云盘：`https://www.alipan.com/s/xxxxx`
- 百度网盘：`https://pan.baidu.com/s/xxxxx`
- 其他常见网盘

**提取位置**：
1. 微博正文
2. 微博评论（默认取第1条）

### 负载均衡

```
账户A配置: [用户1, 用户2, 用户3, 用户4]
账户B配置: [用户2, 用户3, 用户5, 用户6]
账户C配置: [用户1, 用户5, 用户7]

去重后要搜索的微博用户:
  [用户1, 用户2, 用户3, 用户4, 用户5, 用户6, 用户7]

任务分配（轮询）:
  用户1 → 账户A
  用户2 → 账户B
  用户3 → 账户C
  用户4 → 账户A
  用户5 → 账户B
  用户6 → 账户C
  用户7 → 账户A
```

## 🎯 使用场景

### 场景1: 追剧更新

配置几个经常分享资源的微博用户，自动获取最新更新的剧集链接。

### 场景2: 资源聚合

配置多个不同领域的资源分享博主，一次搜索聚合所有相关资源。

### 场景3: 团队协作

团队成员各自配置自己的微博账户和关注的资源博主，共享搜索结果。

## 📝 注意事项

1. **Cookie有效期**：微博Cookie约1年有效，过期需要重新登录
2. **请求限制**：单个账户请求过快可能被限流，建议配置多个账户
3. **评论获取**：默认只获取每条微博的第1条评论，可通过`MaxComments`调整
4. **用户ID格式**：必须是纯数字格式（如`1234567890`），不支持个性化域名

## 🔍 故障排查

### 问题1: 搜索无结果

**可能原因**：
- 配置的微博用户没有发布包含关键词的内容
- Cookie已过期，需要重新登录
- 微博用户ID配置错误

**解决方法**：
1. 检查管理页面的登录状态
2. 使用"测试搜索"功能验证
3. 确认微博用户ID格式正确

### 问题2: 登录失败

**可能原因**：
- 二维码已过期
- 网络问题
- 微博安全策略限制

**解决方法**：
1. 点击"刷新二维码"重试
2. 检查网络连接
3. 尝试更换网络环境

### 问题3: Cookie频繁失效

**可能原因**：
- 账户在其他设备登录
- 账户安全策略
- 请求频率过高

**解决方法**：
1. 减少请求频率
2. 配置多个账户分散请求
3. 检查账户安全设置

## 📚 更多信息

- [Limitless Search 项目主页](https://github.com/fish2018/pansou)
- [插件开发指南](../../docs/插件开发指南.md)
- [常见问题](https://github.com/fish2018/pansou/issues)
