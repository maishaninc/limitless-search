# Gying 网站结构分析

## 基本信息
- **网站URL**: https://www.gying.net
- **数据源类型**: 混合型（HTML + JSON API）
- **特殊架构**: 需要登录 + 搜索结果在HTML内嵌JSON + 详情接口返回JSON
- **支持多账户**: 是（支持负载均衡搜索）

## 登录认证

### 登录接口
- **URL**: `https://www.gying.net/user/login`
- **方法**: POST
- **Content-Type**: `application/x-www-form-urlencoded`

### 登录请求参数
```
code=&siteid=1&dosubmit=1&cookietime=10506240&username={用户名}&password={密码}
```

| 参数 | 说明 | 示例值 |
|------|------|--------|
| `code` | 验证码（可为空） | `` |
| `siteid` | 站点ID（固定） | `1` |
| `dosubmit` | 提交标识（固定） | `1` |
| `cookietime` | Cookie有效期（秒） | `10506240` (约121天) |
| `username` | 用户名 | `xxx` |
| `password` | 密码 | `xxx` |

### 登录响应
```json
{"code":200}
```

### 登录Cookie
- **BT_auth**: 认证Cookie（HttpOnly, Secure, 121天有效期）
  ```
  BT_auth=433cnQGx2Obm5YAMWnGaG-ZCcuma9JvULO1CSvPz7JzBhj3-t4HhwhSXrxaEVO53lSVoFtT_0-Ilzglvh0vFvv7RLqFfPdE17Maen0B3sWPwnO5GSQszEW9ZyjOU4KLx8TuRvDj3mF7bVVX4rgtgOq9gP0ljq_X-APtIPf3tkliblls
  ```
- **BT_cookietime**: Cookie时间标识
  ```
  BT_cookietime=a9f5uPN9hZE-fXuzGhTxM8Vh6K5BUIVqeg4ESRHGbcU3jM7ZuuIB
  ```

### 重要请求头
```
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36
Accept: */*
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
Content-Type: application/x-www-form-urlencoded
Origin: https://www.gying.net
Referer: https://www.gying.net/user/login/
```

## 搜索接口

### 搜索URL
- **格式**: `https://www.gying.net/s/1---1/{关键词}`
- **方法**: GET
- **关键词**: 需要URL编码（如：`遮天` -> `%E9%81%AE%E5%A4%A9`）

### 搜索响应格式
搜索结果返回HTML页面，但实际数据在JavaScript变量 `_obj.search` 中：

```javascript
_obj.search = {
    "q": "遮天",                      // 搜索关键词
    "wd": ["天","遮"],                // 分词结果
    "n": "14",                        // 结果数量（字符串）
    "ns": [14,6,4,4,35],              // 各类型结果统计
    "ty": 0,                          // 类型标识
    "l": {                            // 详细信息列表
        "daoyan": [...],               // 导演
        "bianju": [...],               // 编剧
        "zhuyan": [...],               // 主演
        "info": [...],                 // 信息（地区/类型等）
        "pf": {...},                   // 平台评分（豆瓣/IMDb）
        "title": [...],                // 标题
        "name": [...],                 // 名称（英文等）
        "ename": [...],                // 别名
        "year": [...],                 // 年份
        "d": [...],                    // 类型（mv=电影，ac=动画，tv=电视剧）
        "i": [...]                     // 资源ID（用于详情页）
    }
}
```

### 搜索结果字段映射

| 字段 | 说明 | 示例 | 用途 |
|------|------|------|------|
| `l.i` | 资源ID数组 | `["xJe3", "rzoj", ...]` | 用于构建详情接口URL |
| `l.title` | 标题数组 | `["遮天：禁区", ...]` | 显示标题 |
| `l.year` | 年份数组 | `[2023, 2023, ...]` | 年份标签 |
| `l.d` | 类型数组 | `["mv", "ac", "tv"]` | 资源类型 |
| `l.info` | 信息数组 | `["大陆 / 动作 / 冒险 / 奇幻", ...]` | 描述信息 |
| `l.daoyan` | 导演数组 | `["罗乐", ...]` | 导演信息 |
| `l.zhuyan` | 主演数组 | `["冯荔军 / 彭高唱 / ...", ...]` | 主演信息 |

### 类型标识（d字段）
- `mv`: 电影
- `ac`: 动画
- `tv`: 电视剧

## 详情接口

### 详情URL
- **格式**: `https://www.gying.net/res/downurl/{类型}/{资源ID}`
- **示例**: `https://www.gying.net/res/downurl/mv/xJe3`
- **方法**: GET
- **认证**: 需要登录Cookie

### 详情响应结构
```json
{
    "code": 200,
    "wp": false,                      // 是否需要网盘
    "downlist": {                     // 下载列表
        "imdb": "",                   // IMDb ID
        "type": {
            "a": ["1080P", "中字1080P", "中字4K"],  // 清晰度类型数组
            "b": ["i3", "i7", "i4"]                 // 类型标识数组
        },
        "hex": "a0a74991cb03e4d43bb6564018c46c4034edff3cf4e32f356f735744258cbe5e",
        "list": {                     // 下载文件列表
            "m": ["hash1", "hash2", ...],           // 文件hash数组
            "t": ["文件名1.mkv", "文件名2.mkv", ...],  // 文件名数组
            "s": ["999.46M", "4.87G", ...],         // 文件大小数组
            "e": [3, 0, 2, ...],                    // 编码类型
            "p": ["i3", "i4", "i7", ...],           // 类型标识
            "u": ["短链1", "短链2", ...],              // 短链接数组
            "k": [0, 0, 0, ...],                    // 密码标识（0=无密码）
            "n": ["1年前", "2年前", ...]             // 上传时间
        }
    },
    "playlist": [...],                // 播放列表（在线播放）
    "panlist": {                      // 网盘链接列表
        "id": ["lYPNk", "oJ858", ...],              // 网盘分享ID
        "name": ["标题1", "标题2", ...],             // 分享标题
        "p": ["", "", "917d", ...],                 // 提取码数组
        "url": [                                    // 分享链接数组
            "https://pan.quark.cn/s/89f7aeef9681",
            "https://cloud.189.cn/t\/3aQbiynAzEVn（访问码：7dsf）",
            "https://pan.baidu.com/s/1B_BnI7IDtQexYiytiZXOwg?pwd=917d",
            ...
        ],
        "type": [2, 3, 0, ...],                     // 网盘类型标识
        "user": ["沸羊羊爱分享", "大狗熊A", ...],     // 分享用户
        "gid": [5, 4, 4, ...],                      // 用户组ID
        "time": ["7天前", "12天前", ...],            // 分享时间
        "e": [0, 0, 0, ...],                        // 过期标识
        "heart": [0, 0, 0, ...],                    // 点赞数
        "tname": ["百度网盘", "迅雷网盘", ...]       // 网盘类型名称数组
    }
}
```

### 网盘类型标识（panlist.type）
| 标识 | 网盘类型 | 说明 |
|-----|---------|------|
| `0` | 百度网盘 | baidu |
| `1` | 迅雷网盘 | xunlei |
| `2` | 夸克网盘 | quark |
| `3` | 天翼网盘 | tianyi |
| `4` | UC网盘 | uc |
| `5` | 阿里网盘 | aliyun |

### 提取码处理
- 提取码在 `panlist.p` 数组中
- 如果URL中包含 `?pwd=` 或 `访问码：`，优先从URL提取
- 如果 `panlist.p` 为空字符串，则无提取码

## 插件所需字段映射

### SearchResult构建
```go
result := model.SearchResult{
    UniqueID: fmt.Sprintf("gying-%s-%s", resourceType, resourceID),  // 如 gying-mv-xJe3
    Title:    title,                                                 // 从 l.title
    Content:  buildContent(info, director, actors),                  // 组合信息
    Links:    extractPanLinks(panlist),                              // 从详情接口获取
    Tags:     []string{year},                                        // 从 l.year
    Channel:  "",                                                    // 插件搜索结果Channel为空
    Datetime: time.Now(),                                            // 当前时间
}
```

### 链接提取逻辑
从 `panlist` 中提取，需要处理：
1. 识别网盘类型（通过type标识或URL域名）
2. 提取提取码（优先从URL，其次从p数组）
3. 过滤无效链接（空URL或过期）
4. 去重（同一URL只保留一次）

## 支持的网盘类型

### 主流网盘
- **quark (夸克网盘)**: `https://pan.quark.cn/s/{分享码}`
- **baidu (百度网盘)**: `https://pan.baidu.com/s/{分享码}?pwd={密码}`
- **aliyun (阿里云盘)**: `https://www.alipan.com/s/{分享码}`
- **uc (UC网盘)**: `https://drive.uc.cn/s/{分享码}`
- **xunlei (迅雷网盘)**: `https://pan.xunlei.com/s/{分享码}`
- **tianyi (天翼云盘)**: `https://cloud.189.cn/t/{分享码}`

## 插件开发指导

### 登录管理策略
参考QQPD插件实现：
1. **初始化登录**: 插件启动时，从缓存加载已登录用户
2. **Cookie持久化**: 将Cookie保存到 `cache/gying_users/{hash}.json`
3. **多账户支持**: 支持配置多个账户，进行负载均衡
4. **Web管理界面**: 提供 `/gying/:param` 路由管理账户

### 用户数据结构
```json
{
    "hash": "用户hash（SHA256）",
    "username": "用户名（脱敏）",
    "cookie": "BT_auth=xxx; BT_cookietime=xxx",
    "status": "active/pending/expired",
    "created_at": "2025-10-28T12:00:00+08:00",
    "login_at": "2025-10-28T12:00:00+08:00",
    "expire_at": "2026-02-26T12:00:00+08:00",  // 121天后
    "last_access_at": "2025-10-28T13:00:00+08:00"
}
```

### 搜索流程
```
1. 用户搜索 "遮天"
   ↓
2. 获取所有有效用户（status=active）
   ↓
3. 负载均衡分配任务（每个用户处理部分搜索）
   ↓
4. 并发执行搜索：
   a. 使用用户Cookie请求搜索页面
   b. 提取HTML中的 _obj.search JSON数据
   c. 遍历 l.i 数组，并发请求详情接口
   d. 解析网盘链接
   ↓
5. 合并所有用户的结果
   ↓
6. 去重并返回
```

### 关键函数示例

#### 登录函数
```go
func (p *GyingPlugin) login(username, password string) (string, error) {
    data := url.Values{}
    data.Set("code", "")
    data.Set("siteid", "1")
    data.Set("dosubmit", "1")
    data.Set("cookietime", "10506240")  // 121天
    data.Set("username", username)
    data.Set("password", password)
    
    req, _ := http.NewRequest("POST", "https://www.gying.net/user/login", 
                               strings.NewReader(data.Encode()))
    req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
    req.Header.Set("User-Agent", "Mozilla/5.0...")
    
    resp, err := client.Do(req)
    // ... 处理响应
    
    // 提取Cookie
    cookies := resp.Cookies()
    var btAuth, btCookietime string
    for _, cookie := range cookies {
        if cookie.Name == "BT_auth" {
            btAuth = cookie.Value
        } else if cookie.Name == "BT_cookietime" {
            btCookietime = cookie.Value
        }
    }
    
    return fmt.Sprintf("BT_auth=%s; BT_cookietime=%s", btAuth, btCookietime), nil
}
```

#### 搜索函数
```go
func (p *GyingPlugin) searchWithCookie(keyword, cookie string) ([]model.SearchResult, error) {
    // 1. 请求搜索页面
    searchURL := fmt.Sprintf("https://www.gying.net/s/1---1/%s", url.QueryEscape(keyword))
    req, _ := http.NewRequest("GET", searchURL, nil)
    req.Header.Set("Cookie", cookie)
    req.Header.Set("User-Agent", "Mozilla/5.0...")
    
    resp, err := client.Do(req)
    // ... 处理响应
    
    // 2. 提取 _obj.search JSON
    body, _ := ioutil.ReadAll(resp.Body)
    re := regexp.MustCompile(`_obj\.search=(\{.*?\});`)
    matches := re.FindSubmatch(body)
    if len(matches) < 2 {
        return nil, fmt.Errorf("未找到搜索结果")
    }
    
    var searchData SearchData
    json.Unmarshal(matches[1], &searchData)
    
    // 3. 并发请求详情接口
    var results []model.SearchResult
    for i, resourceID := range searchData.L.I {
        // 并发获取详情
        detail := p.fetchDetail(resourceID, searchData.L.D[i], cookie)
        result := p.buildResult(detail, searchData, i)
        results = append(results, result)
    }
    
    return results, nil
}
```

#### 详情获取函数
```go
func (p *GyingPlugin) fetchDetail(resourceID, resourceType, cookie string) (*DetailData, error) {
    detailURL := fmt.Sprintf("https://www.gying.net/res/downurl/%s/%s", resourceType, resourceID)
    req, _ := http.NewRequest("GET", detailURL, nil)
    req.Header.Set("Cookie", cookie)
    req.Header.Set("User-Agent", "Mozilla/5.0...")
    
    resp, err := client.Do(req)
    // ... 处理响应
    
    var detail DetailData
    json.NewDecoder(resp.Body).Decode(&detail)
    return &detail, nil
}
```

## 注意事项

1. **登录验证**: 每次请求前验证Cookie是否有效，失效则重新登录
2. **并发控制**: 控制详情接口的并发数，避免触发反爬虫（建议50并发）
3. **错误处理**: 处理网络超时、JSON解析失败等异常情况
4. **提取码处理**: 优先从URL中提取提取码，兼容多种格式
5. **去重逻辑**: 同一资源可能有多个网盘链接，需要去重
6. **Cookie刷新**: Cookie有效期121天，接近过期时提前刷新
7. **多账户负载**: 当用户数大于1时，均匀分配搜索任务

## 与其他插件的差异

| 特性 | gying | qqpd | huban |
|------|-------|------|-------|
| **认证方式** | 用户名密码 | QQ扫码 | 无需登录 |
| **数据格式** | HTML内嵌JSON + 详情API | API | JSON API |
| **多账户** | 支持 | 支持 | 不支持 |
| **Cookie管理** | 需要 | 需要 | 不需要 |
| **负载均衡** | 支持 | 支持 | 不支持 |

## 开发建议

1. **分步实现**: 
   - 先实现单账户登录和搜索
   - 再扩展多账户支持
   - 最后添加Web管理界面

2. **测试重点**:
   - Cookie失效后的自动重新登录
   - 并发详情请求的稳定性
   - 多账户负载均衡的正确性

3. **性能优化**:
   - 缓存搜索结果（5分钟）
   - 批量并发请求详情接口
   - 复用HTTP连接

4. **容错机制**:
   - 单个详情请求失败不影响整体
   - Cookie失效时自动降级到其他账户
   - 网络异常时自动重试3次

