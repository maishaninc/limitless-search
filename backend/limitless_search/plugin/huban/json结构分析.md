# Huban API 数据结构分析

## 基本信息
- **数据源类型**: JSON API  
- **特殊架构**: **双域名支持** - 需要处理两个不同的API端点
- **API URL格式1**: `http://103.45.162.207:20720/api.php/provide/vod?ac=detail&wd={关键词}`
- **API URL格式2**: `http://xsayang.fun:12512/api.php/provide/vod?ac=detail&wd={关键词}`
- **数据特点**: 视频点播(VOD)系统API，使用独特的链接格式和网盘标识符

## 双域名架构设计

### 实现策略
1. **主备模式**: 优先使用域名1，失败时切换到域名2
2. **并发模式**: 同时请求两个域名，取更快响应
3. **负载均衡**: 随机选择域名或按策略分配

### 域名差异
| 特性 | 域名1 (103.45.162.207:20720) | 域名2 (xsayang.fun:12512) |
|------|------------------------------|---------------------------|
| **协议** | HTTP | HTTP |
| **响应速度** | 待测试 | 待测试 |
| **数据完整性** | 9条记录 | 11条记录 |
| **网盘支持** | 6种类型 | 6种类型 |

## API响应结构

### 顶层结构
```json
{
    "code": 1,                    // 状态码：1表示成功
    "msg": "数据列表",             // 响应消息
    "page": 1,                    // 当前页码
    "pagecount": 1,               // 总页数
    "limit": "20",                // 每页限制条数（字符串格式）
    "total": 9,                   // 总记录数（域名1）/ 11（域名2）
    "list": []                    // 数据列表数组
}
```

### `list`数组中的数据项结构
```json
{
    "vod_id": 437206,                   // 资源唯一ID
    "vod_name": "凡人修仙传真人版（臻彩）", // 资源标题
    "vod_actor": ",杨洋,金晨,汪铎...",   // 主演（前后有逗号）
    "vod_director": ",杨阳,",           // 导演（前后有逗号）
    "vod_area": "",                     // 地区（可能为空）
    "vod_lang": "",                     // 语言（可能为空）
    "vod_year": "2025",                 // 年份
    "vod_remarks": "4K SDR 60HZ",       // 更新状态/备注
    "vod_pubdate": "",                  // 发布日期（通常为空）
    "vod_blurb": "[小虎斑的口粮]...",    // 简介（包含特殊标记）
    "vod_content": "[小虎斑的口粮]...",  // 内容描述（包含特殊标记）
    "vod_pic": "https://...",           // 封面图片URL
    
    // 关键字段：下载链接相关（huban特有格式）
    "vod_down_from": "UCWP$$$KKWP",
    "vod_down_server": "$$$",
    "vod_down_note": "$$$",
    "vod_down_url": "小虎斑$https://drive.uc.cn/s/3544ba9f8ac64#凡人修仙传真人版（臻彩）$https://drive.uc.cn/s/7e1c30d8e41d4#$$$小虎斑$https://pan.quark.cn/s/409afef6d77c#凡人修仙传真人版（臻彩）$https://pan.quark.cn/s/6f70c1f66e54#凡人修仙传真人版（臻彩）$https://pan.quark.cn/s/d228bf3a6e44#"
}
```

## 插件所需字段映射

| 源字段 | 目标字段 | 说明 |
|--------|----------|------|
| `vod_id` | `UniqueID` | 格式: `huban-{vod_id}` |
| `vod_name` | `Title` | 资源标题 |
| `vod_actor`, `vod_director`, `vod_year`, `vod_remarks` | `Content` | 组合描述信息（需清理逗号） |
| `vod_year` | `Tags` | 标签数组（area通常为空） |
| `vod_down_from` + `vod_down_url` | `Links` | 解析为Link数组 |
| `""` | `Channel` | 插件搜索结果Channel为空 |
| `time.Now()` | `Datetime` | 当前时间 |

## 下载链接解析（huban特有格式）

### 分隔符规则
- **一级分隔**: 多个网盘类型使用 `$$$` 分隔
- **二级分隔**: 每个网盘类型内的多个链接使用 `#` 分隔
- **格式**: `{来源}${链接1}#{标题1}${链接2}#{标题2}#$$$...`

### 下载源标识映射（huban特有）
| API标识 | 网盘类型 | 域名示例 | 备注 |
|---------|----------|----------|------|
| `UCWP` | uc (UC网盘) | `drive.uc.cn` | UC网盘 |
| `KKWP` | quark (夸克网盘) | `pan.quark.cn` | 夸克网盘 |
| `ALWP` | aliyun (阿里云盘) | `alipan.com` | 阿里云盘 |
| `bdWP` | baidu (百度网盘) | `pan.baidu.com` | 百度网盘 |
| `123WP` | 123 (123网盘) | `123pan.com` | 123网盘 |
| `115WP` | 115 (115网盘) | `115.com` | 115网盘 |
| `TYWP` | tianyi (天翼云盘) | `cloud.189.cn` | 天翼云盘 |

### 复杂链接格式示例
```
原始格式:
"vod_down_from": "UCWP$$$KKWP$$$ALWP$$$bdWP$$$123WP$$$115WP"
"vod_down_url": "小虎斑$https://drive.uc.cn/s/3544ba9f8ac64#凡人修仙传$https://drive.uc.cn/s/3c3b890905a14?public=1#$$$小虎斑$https://pan.quark.cn/s/409afef6d77c#凡人修仙传$https://pan.quark.cn/s/c6a8281edf6b#$$$小虎斑$#凡人修仙传$https://www.alipan.com/s/7Ks9ccmdNcv#凡人修仙传$https://www.alipan.com/s/7Ks9ccmdNcv#$$$小虎斑$#凡人修仙传$https://pan.baidu.com/s/1nSz0-zft_h0Vg7rRhyJvxg?pwd=39qu#$$$小虎斑$#凡人修仙传$https://www.123912.com/s/gXCjTd-pVObv#$$$小虎斑$#凡人修仙传$https://115cdn.com/s/swhqwhw36c8?password=bc57#凡人修仙传$https://115cdn.com/s/swhqwhw36c8?password=bc57#"

解析后:
UC网盘: 
  - https://drive.uc.cn/s/3544ba9f8ac64 (凡人修仙传)
  - https://drive.uc.cn/s/3c3b890905a14?public=1
夸克网盘:
  - https://pan.quark.cn/s/409afef6d77c (凡人修仙传)
  - https://pan.quark.cn/s/c6a8281edf6b
阿里云盘:
  - https://www.alipan.com/s/7Ks9ccmdNcv (凡人修仙传, 重复)
百度网盘:
  - https://pan.baidu.com/s/1nSz0-zft_h0Vg7rRhyJvxg?pwd=39qu (凡人修仙传)
123网盘:
  - https://www.123912.com/s/gXCjTd-pVObv (凡人修仙传)
115网盘:
  - https://115cdn.com/s/swhqwhw36c8?password=bc57 (凡人修仙传, 重复)
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
- **115 (115网盘)**: `https://115.com/s/{分享码}`, `https://115cdn.com/s/{分享码}`
- **weiyun (微云)**: `https://share.weiyun.com/{分享码}`
- **lanzou (蓝奏云)**: `https://lanzou.com/{分享码}`
- **jianguoyun (坚果云)**: `https://jianguoyun.com/{分享码}`
- **123 (123网盘)**: `https://123pan.com/s/{分享码}`, `https://www.123912.com/s/{分享码}`
- **pikpak (PikPak)**: `https://mypikpak.com/s/{分享码}`

### 其他协议
- **magnet (磁力链接)**: `magnet:?xt=urn:btih:{hash}`
- **ed2k (电驴链接)**: `ed2k://|file|{filename}|{size}|{hash}|/`
- **others (其他类型)**: 其他不在上述分类中的链接

## 插件开发指导

### 双域名请求策略示例
```go
func (p *HubanAsyncPlugin) searchImpl(client *http.Client, keyword string, ext map[string]interface{}) ([]model.SearchResult, error) {
    // 定义双域名
    urls := []string{
        fmt.Sprintf("http://103.45.162.207:20720/api.php/provide/vod?ac=detail&wd=%s", url.QueryEscape(keyword)),
        fmt.Sprintf("http://xsayang.fun:12512/api.php/provide/vod?ac=detail&wd=%s", url.QueryEscape(keyword)),
    }
    
    // 策略1: 主备模式
    for _, searchURL := range urls {
        if results, err := p.tryRequest(searchURL, client); err == nil {
            return results, nil
        }
    }
    
    // 策略2: 并发模式（可选）
    // return p.requestConcurrently(urls, client)
}
```

### SearchResult构建示例
```go
result := model.SearchResult{
    UniqueID: fmt.Sprintf("huban-%d", item.VodID),
    Title:    item.VodName,
    Content:  p.buildContent(item), // 需要清理逗号和特殊标记
    Links:    p.parseHubanLinks(item.VodDownFrom, item.VodDownURL),
    Tags:     []string{item.VodYear}, // area通常为空
    Channel:  "", // 插件搜索结果Channel为空
    Datetime: time.Now(),
}
```

### 特殊链接解析函数
```go
func (p *HubanAsyncPlugin) parseHubanLinks(vodDownFrom, vodDownURL string) []model.Link {
    if vodDownFrom == "" || vodDownURL == "" {
        return nil
    }
    
    // 按$$$分隔网盘类型
    fromParts := strings.Split(vodDownFrom, "$$$")
    urlParts := strings.Split(vodDownURL, "$$$")
    
    var links []model.Link
    minLen := len(fromParts)
    if len(urlParts) < minLen {
        minLen = len(urlParts)
    }
    
    for i := 0; i < minLen; i++ {
        linkType := p.mapHubanCloudType(fromParts[i])
        if linkType == "" {
            continue
        }
        
        // 解析单个网盘类型的多个链接
        // 格式: "来源$链接1#标题1$链接2#标题2#"
        urlSection := urlParts[i]
        if strings.Contains(urlSection, "$") {
            urlSection = urlSection[strings.Index(urlSection, "$")+1:] // 移除来源前缀
        }
        
        // 按#分隔多个链接
        linkParts := strings.Split(urlSection, "#")
        for j := 0; j < len(linkParts); j += 2 { // 每两个为一组（链接和标题）
            if j < len(linkParts) && linkParts[j] != "" {
                linkURL := strings.TrimSpace(linkParts[j])
                if p.isValidNetworkDriveURL(linkURL) {
                    password := p.extractPassword(linkURL)
                    links = append(links, model.Link{
                        Type:     linkType,
                        URL:      linkURL,
                        Password: password,
                    })
                }
            }
        }
    }
    
    return links
}

func (p *HubanAsyncPlugin) mapHubanCloudType(apiType string) string {
    switch strings.ToUpper(apiType) {
    case "UCWP":
        return "uc"
    case "KKWP":
        return "quark"
    case "ALWP":
        return "aliyun"
    case "BDWP":
        return "baidu"
    case "123WP":
        return "123"
    case "115WP":
        return "115"
    case "TYWP":
        return "tianyi"
    default:
        return ""
    }
}
```

### 内容清理函数
```go
func (p *HubanAsyncPlugin) buildContent(item HubanAPIItem) string {
    var contentParts []string
    
    // 清理演员字段（移除前后逗号）
    if item.VodActor != "" {
        actor := strings.Trim(item.VodActor, ",")
        if actor != "" {
            contentParts = append(contentParts, fmt.Sprintf("主演: %s", actor))
        }
    }
    
    // 清理导演字段（移除前后逗号）
    if item.VodDirector != "" {
        director := strings.Trim(item.VodDirector, ",")
        if director != "" {
            contentParts = append(contentParts, fmt.Sprintf("导演: %s", director))
        }
    }
    
    if item.VodYear != "" {
        contentParts = append(contentParts, fmt.Sprintf("年份: %s", item.VodYear))
    }
    
    if item.VodRemarks != "" {
        contentParts = append(contentParts, fmt.Sprintf("状态: %s", item.VodRemarks))
    }
    
    return strings.Join(contentParts, " | ")
}
```

## 与其他插件的差异

| 特性 | huban | wanou/ouge/zhizhen | 说明 |
|------|-------|-------------------|------|
| **API架构** | 双域名 | 单域名 | 需要容错处理 |
| **链接格式** | `来源$链接#标题#` | `链接` | 复杂多层分隔 |
| **网盘标识** | `UCWP`, `KKWP` | `UC`, `KG` | 自定义后缀 |
| **数据清理** | 需要 | 不需要 | 字段有特殊字符 |
| **链接数量** | 多链接 | 单链接 | 每种类型多个链接 |

## 注意事项
1. **双域名处理**: 需要实现容错机制，一个失败时尝试另一个
2. **复杂解析**: 链接格式比其他插件复杂，需要多层分隔处理
3. **数据清理**: 演员、导演字段有多余逗号，需要清理
4. **重复链接**: 可能存在重复链接，需要去重
5. **空链接**: 某些位置可能为空，需要过滤
6. **特殊标记**: 内容包含`[小虎斑的口粮]`等标记，需要处理

## 开发建议
- **分步实现**: 先实现单域名，再扩展双域名支持
- **容错机制**: 重点测试网络异常和API错误的处理
- **解析测试**: 针对复杂链接格式编写详细的单元测试
- **性能优化**: 考虑并发请求双域名以提高响应速度
- **缓存策略**: 双域名结果可以合并缓存，避免重复请求