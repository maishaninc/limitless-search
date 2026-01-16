# QQ频道搜索插件 (QQPD)

## 📖 简介

QQPD是Limitless Search的QQ频道搜索插件，支持多用户登录QQ频道并配置频道列表，在搜索时自动聚合所有用户的频道资源。

## ✨ 核心特性

- ✅ **多用户支持** - 每个用户独立配置，互不干扰
- ✅ **扫码登录** - 手机QQ扫码，自动获取Cookie
- ✅ **Session保活** - 自动定期访问保持Cookie活跃，防止失效 🆕
- ✅ **智能去重** - 多用户配置相同频道时自动去重
- ✅ **负载均衡** - 任务均匀分配，避免单用户限流
- ✅ **内存缓存** - 用户数据和guild_id缓存到内存，搜索性能极高
- ✅ **持久化存储** - Cookie和频道配置自动保存，重启不丢失
- ✅ **Web管理界面** - 一站式配置，简单易用
- ✅ **RESTful API** - 支持程序化调用

## 🚀 快速开始

### 步骤1: 启动服务

```bash
cd /Users/macbookpro/Desktop/fish2018/pansou
ENABLED_PLUGINS=qqpd go run main.go

# 或者编译后运行
go build -o pansou main.go
ENABLED_PLUGINS=qqpd ./pansou
```

### 步骤2: 访问管理页面

浏览器打开：
```
http://localhost:8888/qqpd/你的QQ号
```

**示例**：
```
http://localhost:8888/qqpd/1234567
```

系统会自动：
1. 根据QQ号生成专属64位hash（不可逆）
2. 重定向到专属管理页面：`http://localhost:8888/qqpd/{hash}`
3. 显示二维码供扫码登录

**📌 提示**：请收藏hash后的URL（包含你的专属hash），方便下次访问。

### 步骤3: 扫码登录

1. 页面会自动显示QQ登录二维码
2. 使用**手机QQ**扫描二维码
3. 扫码后系统会**自动检测登录状态**（每2秒检查一次）
4. 登录成功后自动显示用户信息

### 步骤4: 配置频道

在"频道管理"区域输入频道号，**每行一个**：

```
pd97631607
languan8K115
m250319e25
```

**支持格式**：
- ✅ 纯频道号：`pd97631607`
- ✅ 完整URL：`https://pd.qq.com/g/pd97631607`

点击"**保存频道配置**"按钮。

### 步骤5: 开始搜索

在Limitless Search主页搜索框输入关键词，系统会**自动聚合所有用户**的QQ频道结果！

```bash
# 通过API搜索
curl "http://localhost:8888/api/search?kw=遮天"

# 只搜索插件（包括qqpd）
curl "http://localhost:8888/api/search?kw=遮天&src=plugin"
```

## 📡 API文档

### 统一接口

所有操作通过统一的POST接口：

```
POST /qqpd/{hash}
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
| `set_channels` | 设置频道列表 | ✅ | 用户点击保存按钮 |
| `test_search` | 测试搜索 | ✅ | 用户点击搜索按钮 |

---

### 1️⃣ get_status - 获取用户状态

**作用**：获取当前用户的登录状态、频道配置等信息

**请求**：
```bash
curl -X POST "http://localhost:8888/qqpd/{hash}" \
  -H "Content-Type: application/json" \
  -d '{"action": "get_status"}'
```

**成功响应（已登录）**：
```json
{
  "success": true,
  "message": "获取成功",
  "data": {
    "hash": "1dd868cc...",
    "logged_in": true,
    "status": "active",
    "qq_masked": "1851****32",
    "login_time": "2025-10-24 12:00:00",
    "expire_time": "2035-10-24 12:00:00",
    "expires_in_days": 3650,
    "channels": ["pd97631607", "kuake12345"],
    "channel_count": 2,
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
    "hash": "1dd868cc...",
    "logged_in": false,
    "status": "pending",
    "qq_masked": "",
    "channels": [],
    "channel_count": 0,
    "qrcode_base64": "data:image/png;base64,iVBORw0KGgo..."  // Base64二维码
  }
}
```

---

### 2️⃣ refresh_qrcode - 刷新二维码

**作用**：强制生成新的二维码（当二维码过期时）

**请求**：
```bash
curl -X POST "http://localhost:8888/qqpd/{hash}" \
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
- 二维码有效期约2分钟
- 系统会自动缓存30秒，避免频繁生成
- 过期后需要点击刷新

---

### 3️⃣ check_login - 检查登录状态

**作用**：检查二维码是否被扫描，登录是否成功（扫码后轮询调用）

**请求**：
```bash
curl -X POST "http://localhost:8888/qqpd/{hash}" \
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
    "qq_masked": "1851****32"
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
curl -X POST "http://localhost:8888/qqpd/{hash}" \
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

### 5️⃣ set_channels - 设置频道列表

**作用**：配置或更新频道列表（覆盖式更新）

**请求**：
```bash
curl -X POST "http://localhost:8888/qqpd/{hash}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "set_channels",
    "channels": ["pd97631607", "kuake12345", "https://pd.qq.com/g/languan8K115"]
  }'
```

**成功响应**：
```json
{
  "success": true,
  "message": "频道列表已更新",
  "data": {
    "channels": ["pd97631607", "kuake12345", "languan8K115"],
    "channel_count": 3,
    "invalid_channels": [],
    "guild_ids_cached": 3
  }
}
```

**说明**：
- 自动提取频道号（支持URL格式）
- 自动去重
- 自动获取并缓存guild_id（首次添加频道时）
- guild_id永久缓存，搜索时0网络请求

---

### 6️⃣ test_search - 测试搜索

**作用**：在管理页面测试搜索功能

**请求**：
```bash
curl -X POST "http://localhost:8888/qqpd/{hash}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "test_search",
    "keyword": "遮天",
    "max_results": 10
  }'
```

**参数**：
- `keyword`（必需）：搜索关键词
- `max_results`（可选）：最大返回数量，默认10

**成功响应**：
```json
{
  "success": true,
  "message": "找到 5 条结果",
  "data": {
    "keyword": "遮天",
    "total_results": 5,
    "channels_searched": ["pd97631607", "kuake12345", "languan8K115"],
    "results": [
      {
        "unique_id": "qqpd-pd97631607-0",
        "title": "遮天 (2023) 臻彩4K.更新至109集",
        "links": [
          {
            "type": "quark",
            "url": "https://pan.quark.cn/s/779d98f49e88",
            "password": ""
          }
        ]
      },
      ...
    ]
  }
}
```

---

## 🔧 配置说明

### 环境变量（可选）

```bash
# Hash Salt（推荐自定义，增强安全性）
export QQPD_HASH_SALT="your-custom-salt-here"

# Cookie加密密钥（32字节，推荐自定义）
export QQPD_ENCRYPTION_KEY="your-32-byte-key-here!!!!!!!!!!"
```

### 代码内配置

在 `qqpd.go` 第33-37行修改：

```go
const (
    MaxConcurrentUsers    = 10              // 最多使用的用户数（搜索时）
    MaxConcurrentChannels = 50              // 最大并发频道数
    KeepAliveInterval     = 3 * time.Minute // Session保活间隔
    DebugLog              = false           // 调试日志开关
)
```

**参数说明**：

| 参数 | 默认值 | 说明 | 建议 |
|------|--------|------|------|
| `MaxConcurrentUsers` | 10 | 单次搜索最多使用的用户数 | 10-20足够 |
| `MaxConcurrentChannels` | 50 | 最大并发频道数 | 50-100 |
| `KeepAliveInterval` | 3分钟 | Session保活间隔 | 2-5分钟 |
| `DebugLog` | false | 是否开启调试日志 | 生产环境false |

## 📂 数据存储

### 存储位置

```
cache/qqpd_users/{hash}.json
```

### 数据结构

```json
{
  "hash": "1dd868cc97f5540db170bb3208a4ad737cd7aea3e8df85535178dcbacfa46300",
  "qq_masked": "123**67",
  "cookie": "p_skey=xxx; uin=xxx; ...",
  "status": "active",
  "channels": ["pd97631607", "kuake12345", "languan8K115"],
  "channel_guild_ids": {
    "pd97631607": "592843764045681811",
    "kuake12345": "987654321098765432",
    "languan8K115": "612109904026776189"
  },
  "created_at": "2025-10-24T12:00:00+08:00",
  "login_at": "2025-10-24T12:05:00+08:00",
  "expire_at": "2035-10-24T12:05:00+08:00",
  "last_access_at": "2025-10-24T13:00:00+08:00"
}
```

**字段说明**：
- `hash`: 用户唯一标识（SHA256，不可逆推QQ号）
- `qq_masked`: 脱敏QQ号（如`1851****32`）
- `cookie`: QQ登录Cookie（明文存储，建议配置加密）
- `status`: 用户状态（`pending`/`active`/`expired`）
- `channels`: 频道号列表
- `channel_guild_ids`: 频道号→guild_id映射（性能优化缓存）
- `expire_at`: Cookie过期时间

## 🔒 安全特性

### 1. QQ号隐私保护

- ✅ **不存储明文QQ号**：只存储SHA256 hash（64位十六进制）
- ✅ **不可逆**：无法从hash反推QQ号
- ✅ **加盐hash**：支持自定义salt，进一步增强安全性

### 2. Cookie安全

- ⚠️ **当前**：明文存储到JSON（方便调试）
- ✅ **可选**：通过环境变量配置加密密钥
- ✅ **建议**：生产环境配置`QQPD_ENCRYPTION_KEY`

### 3. 自动清理

**定期清理任务**（每24小时）：
- 删除：状态为`expired`且30天未访问的用户
- 标记：90天未访问的用户标记为`expired`

### 4. 二维码安全

- ✅ 每次生成新的qrsig
- ✅ 30秒缓存，减少暴露
- ✅ 2分钟自动过期

## ⚙️ 高级特性

### 1. Session保活机制 🆕

**问题**：QQ频道的Cookie会在2天左右失效，导致搜索失败。

**解决方案**：自动保活机制

```
插件启动后:
  ↓ 延迟3分钟
  ↓
定期执行保活 (每3分钟):
  ↓
遍历所有active用户:
  ↓ 异步执行
  访问 https://pd.qq.com/ (带Cookie)
  ↓
刷新服务器端session
  ↓
Cookie保持活跃状态 ✅
```

**工作原理**：
- 🔄 每3分钟访问一次QQ频道首页
- 🍪 携带用户Cookie发送请求
- 💓 让QQ服务器知道session还活跃
- ⚡ 异步执行，不阻塞搜索功能

**日志示例**（DebugLog=true时）：
```
[QQPD] 💓 Session保活: 已为 2 个用户执行保活任务
[QQPD] 💓 Session保活成功: 1851****32 (状态码: 200)
[QQPD] 💓 Session保活成功: 1234****56 (状态码: 200)
```

**配置建议**：
- 默认间隔：3分钟（推荐）
- 可调整范围：2-5分钟
- 太频繁：可能被视为异常
- 太慢：可能无法防止超时

### 2. 多用户支持

**场景**：多个用户各自配置不同的频道

```
用户A (QQ: 111111111)
  ↓
配置频道: [频道1, 频道2, 频道3]

用户B (QQ: 222222222)
  ↓
配置频道: [频道2, 频道4, 频道5]

用户C (QQ: 333333333)
  ↓
配置频道: [频道3, 频道5, 频道6]

搜索时:
  ↓
去重后的频道: [频道1, 频道2, 频道3, 频道4, 频道5, 频道6]
  ↓
负载均衡分配:
  - 用户A: 搜索频道1, 频道4
  - 用户B: 搜索频道2, 频道5
  - 用户C: 搜索频道3, 频道6
```

### 3. guild_id缓存优化

**性能提升**：
```
首次保存频道:
  pd97631607 → 访问 https://pd.qq.com/g/pd97631607
              → 提取 guild_id: 592843764045681811
              → 缓存到JSON

搜索时:
  pd97631607 → 从内存读取 guild_id: 592843764045681811
              → 0网络请求 ⚡
              → 直接调用搜索API
```

**效果**：
- 首次配置：稍慢（需要获取guild_id）
- 后续搜索：极快（从内存读取）
- 性能提升：每个频道节省100-200ms

### 4. 智能去重

```
用户A配置: [频道1, 频道2, 频道3]
用户B配置: [频道2, 频道3, 频道4]

去重后:
  频道1 → 分配给用户A
  频道2 → 分配给用户A（负载均衡）
  频道3 → 分配给用户B（负载均衡）
  频道4 → 分配给用户B
```

### 5. 负载均衡

```
任务分配算法:
  for each 频道:
    选择当前任务数最少的用户来执行
  
效果:
  - 避免单用户请求过多被限流
  - 任务均匀分配
  - 提高成功率
```