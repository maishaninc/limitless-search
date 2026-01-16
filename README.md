# Limitless Search

Limitless Search 是一个高性能的开源网盘资源搜索工具，由Freeanime.org与Maishan Inc开发。 

## 🌐 在线访问

**在线体验地址：** [https://search.freeanime.org](https://search.freeanime.org)

> 由 [Freeanime.org](https://freeanime.org) 赞助

## 📸 界面预览

![主页](img/1.jpg)

![底部](img/2.jpg)

![人机验证页面](img/3.jpg)

![搜索中](img/4.jpg)

![展示资源](img/5.jpg)

## 🚀 快速部署

### 使用 Docker Compose（推荐）

1. 克隆项目文件

```bash
# HTTPS
git clone https://github.com/maishaninc/limitless-search.git

# SSH
git clone git@github.com:maishaninc/limitless-search.git

# GitHub CLI
gh repo clone maishaninc/limitless-search
```

2. 进入项目目录：
```bash
cd limitless-search
```

3. 启动服务：
```bash
docker-compose up -d
```

4. 访问服务：
- Web 界面：http://localhost:3200
- 后端 API：http://localhost:8888 [默认不开放外部端口]

### 查看日志

```bash
docker-compose logs -f
```

### 停止服务

```bash
docker-compose down
```

## 🔐 人机验证配置

Web 前端支持人机验证功能，可以防止恶意爬虫和滥用。配置文件位于 `web/limitless_search_web/.env`。

### 支持的验证服务

| 服务提供商 | 说明 |
|-----------|------|
| `turnstile` | Cloudflare Turnstile（推荐） |
| `hcaptcha` | hCaptcha （推荐） |
| `none` | 不启用验证（默认） |

### 配置方法

编辑 `web/limitless_search_web/.env` 文件：

```env
# 后端 API 地址
NEXT_PUBLIC_API_BASE=http://backend:8888

# --- 人机验证配置 ---
# 选择验证服务提供商: "turnstile" | "hcaptcha" | "none" 
NEXT_PUBLIC_CAPTCHA_PROVIDER=none

# [Cloudflare Turnstile 配置]
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-site-key
TURNSTILE_SECRET_KEY=your-secret-key

# [hCaptcha 配置]
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=your-site-key
HCAPTCHA_SECRET_KEY=your-secret-key
```

### Cloudflare Turnstile 配置步骤

1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Turnstile** 页面
3. 点击 **Add Site** 创建新站点
4. 获取 **Site Key** 和 **Secret Key**
5. 在 `.env` 文件中配置：
   ```env
   NEXT_PUBLIC_CAPTCHA_PROVIDER=turnstile
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAA...
   TURNSTILE_SECRET_KEY=0x4AAAAAAA...
   ```

### hCaptcha 配置步骤

1. 访问 [hCaptcha Dashboard](https://dashboard.hcaptcha.com/)
2. 注册并创建新站点
3. 获取 **Site Key** 和 **Secret Key**
4. 在 `.env` 文件中配置：
   ```env
   NEXT_PUBLIC_CAPTCHA_PROVIDER=hcaptcha
   NEXT_PUBLIC_HCAPTCHA_SITE_KEY=your-site-key
   HCAPTCHA_SECRET_KEY=your-secret-key
   ```

## ⚙️ 配置说明

### 后端环境变量

在 `docker-compose.yml` 中配置后端服务的环境变量：

| 环境变量 | 描述 | 默认值 |
|----------|------|--------|
| `PORT` | 后端监听端口 | `8888` |
| `CHANNELS` | TG 频道列表（逗号分隔） | 见下方说明 |
| `ENABLED_PLUGINS` | 启用的插件列表（逗号分隔） | 见下方说明 |
| `CACHE_ENABLED` | 是否启用缓存 | `true` |
| `CACHE_PATH` | 缓存路径 | `/app/cache` |
| `CACHE_MAX_SIZE` | 最大缓存大小(MB) | `100` |
| `CACHE_TTL` | 缓存有效期(分钟) | `60` |
| `ASYNC_PLUGIN_ENABLED` | 是否启用异步插件 | `true` |
| `ASYNC_RESPONSE_TIMEOUT` | 异步响应超时(秒) | `4` |
| `ASYNC_MAX_BACKGROUND_WORKERS` | 最大后台工作者数量 | `20` |
| `ASYNC_MAX_BACKGROUND_TASKS` | 最大后台任务数量 | `100` |
| `ASYNC_CACHE_TTL_HOURS` | 异步缓存有效期(小时) | `1` |
| `PROXY` | 代理设置（可选） | 无 |

### TG 频道配置 (CHANNELS)

`CHANNELS` 环境变量用于配置要搜索的 Telegram 频道列表，多个频道用逗号分隔。

**当前配置的频道列表：**

```
tgsearchers4,Aliyun_4K_Movies,bdbdndn11,yunpanx,bsbdbfjfjff,yp123pan,sbsbsnsqq,
yunpanxunlei,tianyifc,BaiduCloudDisk,txtyzy,peccxinpd,gotopan,PanjClub,kkxlzy,
baicaoZY,MCPH01,MCPH02,MCPH03,bdwpzhpd,ysxb48,jdjdn1111,yggpan,MCPH086,zaihuayun,
Q66Share,ucwpzy,shareAliyun,alyp_1,dianyingshare,Quark_Movies,XiangxiuNBB,
ydypzyfx,ucquark,xx123pan,yingshifenxiang123,zyfb123,tyypzhpd,tianyirigeng,
cloudtianyi,hdhhd21,Lsp115,oneonefivewpfx,qixingzhenren,taoxgzy,Channel_Shares_115,
tyysypzypd,vip115hot,wp123zy,yunpan139,yunpan189,yunpanuc,yydf_hzl,leoziyuan,
pikpakpan,Q_dongman,yoyokuakeduanju,TG654TG,WFYSFX02,QukanMovie,yeqingjie_GJG666,
movielover8888_film3,Baidu_netdisk,D_wusun,FLMdongtianfudi,KaiPanshare,QQZYDAPP,
rjyxfx,PikPak_Share_Channel,btzhi,newproductsourcing,cctv1211,duan_ju,QuarkFree,
yunpanNB,kkdj001,xxzlzn,pxyunpanxunlei,jxwpzy,kuakedongman,liangxingzhinan,
xiangnikanj,solidsexydoll,guoman4K,zdqxm,kduanju,cilidianying,CBduanju,
SharePanFilms,dzsgx,BooksRealm,Oscar_4Kmovies,douerpan,baidu_yppan,Q_jilupian,
Netdisk_Movies,yunpanquark,ammmziyuan,ciliziyuanku,cili8888,jzmm_123pan
```

### 插件配置 (ENABLED_PLUGINS)

`ENABLED_PLUGINS` 环境变量用于配置要启用的搜索插件，多个插件用逗号分隔。

**当前配置的插件列表：**

```
labi,zhizhen,shandian,duoduo,muou,wanou,hunhepan,jikepan,panwiki,pansearch,
panta,qupansou,hdr4k,pan666,susu,thepiratebay,xuexizhinan,panyq,ouge,huban,
cyg,erxiao,miaoso,fox4k,pianku,clmao,wuji,cldi,xiaozhang,libvio,leijing,
xb6v,xys,ddys,hdmoli,yuhuage,u3c3,javdb,clxiong,jutoushe,sdso,xiaoji,xdyh,
haisou,bixin,djgou,nyaa,xinjuc,aikanzy,qupanshe,xdpan,discourse,yunsou,qqpd,
ahhhhfs,nsgame,gying,quark4k,quarksoo,sousou,ash
```

**插件说明：**
- 如果不设置 `ENABLED_PLUGINS`，则不启用任何插件
- 设置为空字符串也表示不启用任何插件
- 只有在列表中的插件才会被启用

### 认证配置（可选）

如需启用 API 认证，取消注释以下环境变量：

```yaml
environment:
  - AUTH_ENABLED=true
  - AUTH_USERS=admin:admin123,user:pass456
  - AUTH_TOKEN_EXPIRY=24
  - AUTH_JWT_SECRET=your-secret-key-here
```

| 环境变量 | 描述 | 默认值 |
|----------|------|--------|
| `AUTH_ENABLED` | 是否启用认证 | `false` |
| `AUTH_USERS` | 用户账号配置（格式：user1:pass1,user2:pass2） | 无 |
| `AUTH_TOKEN_EXPIRY` | Token 有效期（小时） | `24` |
| `AUTH_JWT_SECRET` | JWT 签名密钥 | 自动生成 |

### 代理配置（可选）

如需使用代理访问 Telegram，取消注释以下环境变量：

```yaml
environment:
  - PROXY=socks5://proxy:7897
```

## 📁 项目结构

```
.
├── docker-compose.yml          # Docker Compose 配置文件
├── README.md                   # 项目说明文档
├── backend/
│   └── limitless_search/       # 后端服务
│       ├── Dockerfile
│       ├── main.go
│       ├── api/                # API 处理
│       ├── config/             # 配置管理
│       ├── model/              # 数据模型
│       ├── plugin/             # 搜索插件
│       └── docs/               # 文档
└── web/
    └── limitless_search_web/   # Web 前端
        ├── Dockerfile
        ├── .env                # 环境变量配置
        └── src/                # 源代码
```

## 🌐 支持的网盘类型

- 百度网盘 (`baidu`)
- 阿里云盘 (`aliyun`)
- 夸克网盘 (`quark`)
- 天翼云盘 (`tianyi`)
- UC网盘 (`uc`)
- 移动云盘 (`mobile`)
- 115网盘 (`115`)
- PikPak (`pikpak`)
- 迅雷网盘 (`xunlei`)
- 123网盘 (`123`)
- 磁力链接 (`magnet`)
- 电驴链接 (`ed2k`)

## 📖 API 文档

### 搜索接口

**POST /api/search**

```bash
curl -X POST http://localhost:8888/api/search \
  -H "Content-Type: application/json" \
  -d '{"kw": "速度与激情"}'
```

**GET /api/search**

```bash
curl "http://localhost:8888/api/search?kw=速度与激情"
```

### 健康检查

```bash
curl http://localhost:8888/api/health
```

## 🔧 常见问题

### 1. 如何添加新的 TG 频道？

修改 `docker-compose.yml` 中的 `CHANNELS` 环境变量，添加新的频道名称（用逗号分隔），然后重启服务：

```bash
docker-compose down
docker-compose up -d
```

### 2. 如何启用/禁用插件？

修改 `docker-compose.yml` 中的 `ENABLED_PLUGINS` 环境变量，然后重启服务。

### 3. 搜索结果为空？

- 检查网络连接是否正常
- 如果在中国大陆，可能需要配置代理访问 Telegram
- 检查 TG 频道名称是否正确

### 4. 如何配置代理？

在 `docker-compose.yml` 中取消注释 `PROXY` 环境变量并设置代理地址：

```yaml
environment:
  - PROXY=socks5://your-proxy:port
```

## 📄 许可证

Maishan Inc. - [免费开源软解协议](https://www.maishanzero.com/license/free-opensource-software-licensing-agreement/)

## 🔗 相关链接

- [后端详细文档](backend/limitless_search/docs/README.md)
- [插件开发指南](backend/limitless_search/docs/插件开发指南.md)
- [系统设计文档](backend/limitless_search/docs/系统开发设计文档.md)

---

基于 [PanSou](https://github.com/fish2018/pansou) 项目开发
