# Limitless Search

[简体中文](README.md) | [繁體中文](README_zh-TW.md) | **English** | [日本語](README_ja.md) | [Русский](README_ru.md) | [Français](README_fr.md)

Limitless Search is a high-performance open-source cloud storage resource search tool, developed by Freeanime.org and Maishan Inc.

## 🌐 Online Access

**Live Demo:** [https://search.freeanime.org](https://search.freeanime.org)

**New Version Test URL:** [https://search-bate.freeanime.org](https://search-bate.freeanime.org)

**New Features in Test Version:**
- Added AI anime rankings entry and page (yearly / monthly / daily, with expand view)
- Ranking item click now jumps to homepage and pre-fills the keyword (no auto search)
- Localized keyword jump by current site language (Chinese UI prefers Chinese title)
- Ranking generation now includes retry, failure logs, and fallback page
- Added configurable ranking SEO pages and sitemap expansion

> Sponsored by [Freeanime.org](https://freeanime.org). Maishan Inc. and Freeanime.org organization own all copyrights of the limitless-search-web frontend. Commercial use is prohibited without permission.

## 📸 Interface Preview

<table>
  <tr>
    <td><img src="img/1.jpg" alt="Homepage" width="400"/></td>
    <td><img src="img/2.jpg" alt="Footer" width="400"/></td>
  </tr>
  <tr>
    <td><img src="img/3.jpg" alt="CAPTCHA Page" width="400"/></td>
    <td><img src="img/4.jpg" alt="Searching" width="400"/></td>
  </tr>
  <tr>
    <td colspan="2" align="center"><img src="img/5.jpg" alt="Resource Display" width="400"/></td>
  </tr>
</table>

## 🆕 Version Updates (2026-03-08)

- Frontend environment variables are now configured in the root `docker-compose.yml` under the `web` service
- The frontend no longer depends on `web/limitless_search_web/.env` by default
- The frontend now injects the backend address at build time via `NEXT_PUBLIC_API_BASE`
- Fixed hCaptcha frontend rendering and server-side verification

## 🌍 Multi-language Support

**100% translation** available for the following regions:

| Country/Region | Language | Documentation |
|----------------|----------|---------------|
| 🇨🇳 China | 简体中文 | [README.md](README.md) |
| 🇹🇼 Taiwan, China | 繁體中文 | [README_zh-TW.md](README_zh-TW.md) |
| 🇭🇰 Hong Kong, China | 繁體中文 | [README_zh-TW.md](README_zh-TW.md) |
| 🇺🇸 United States | English | [README_en.md](README_en.md) |
| 🇯🇵 Japan | 日本語 | [README_ja.md](README_ja.md) |
| 🇷🇺 Russia | Русский | [README_ru.md](README_ru.md) |
| 🇫🇷 France | Français | [README_fr.md](README_fr.md) |

> Need more languages? Submit an [Issue](https://github.com/maishaninc/limitless-search/issues)

## 🚀 Quick Deployment

### Using Docker Compose (Recommended)

1. Clone the project

```bash
# HTTPS
git clone https://github.com/maishaninc/limitless-search.git

# SSH
git clone git@github.com:maishaninc/limitless-search.git

# GitHub CLI
gh repo clone maishaninc/limitless-search
```

2. Enter the project directory:
```bash
cd limitless-search
```

3. Start the services:
```bash
docker-compose up -d
```

4. Access the services:
- Web Interface: http://localhost:3200
- Backend API: available only on the internal Docker network by default at `http://backend:8888`; it is not exposed directly to the host

### View Logs

```bash
docker-compose logs -f
```

### Stop Services

```bash
docker-compose down
```

## 🔧 Frontend Environment Configuration

Docker deployments no longer require `web/limitless_search_web/.env`. Frontend-related settings are configured in the root `docker-compose.yml` under `web.build.args` and `web.environment`.

### Docker Deployment Configuration

Update the `web:` service in `docker-compose.yml` directly:

```yaml
web:
  build:
    context: ./web/limitless_search_web
    dockerfile: Dockerfile
    args:
      - NEXT_PUBLIC_API_BASE=http://backend:8888
      - NEXT_PUBLIC_CAPTCHA_PROVIDER=none
      - NEXT_PUBLIC_TURNSTILE_SITE_KEY=
      - NEXT_PUBLIC_HCAPTCHA_SITE_KEY=
      - NEXT_PUBLIC_AI_SUGGEST_ENABLED=true
      - NEXT_PUBLIC_AI_SUGGEST_THRESHOLD=50
      - NEXT_PUBLIC_AI_SUGGEST_REQUIRE_CAPTCHA=false
  environment:
    - TURNSTILE_SECRET_KEY=
    - HCAPTCHA_SECRET_KEY=
    - AI_SUGGEST_BASE_URL=
    - AI_SUGGEST_MODEL=
    - AI_SUGGEST_API_KEY=
    - AI_SUGGEST_PROMPT=
```

### Local Development Only

If you run the frontend locally without Docker, copy the example file:

```bash
cp web/limitless_search_web/.env.example web/limitless_search_web/.env.local
```

### Configuration Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_BASE` | Backend API URL embedded at frontend build time | `http://backend:8888` |
| `NEXT_PUBLIC_CAPTCHA_PROVIDER` | CAPTCHA service provider | `none` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile Site Key | None |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile Secret Key | None |
| `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` | hCaptcha Site Key | None |
| `HCAPTCHA_SECRET_KEY` | hCaptcha Secret Key | None |
| `NEXT_PUBLIC_AI_SUGGEST_ENABLED` | Enable AI recommendation | `true` |
| `NEXT_PUBLIC_AI_SUGGEST_THRESHOLD` | AI recommendation trigger threshold | `50` |
| `NEXT_PUBLIC_AI_SUGGEST_REQUIRE_CAPTCHA` | Require CAPTCHA before AI suggestion | `false` |
| `AI_SUGGEST_BASE_URL` | OpenAI compatible API endpoint | None |
| `AI_SUGGEST_MODEL` | OpenAI compatible model name | None |
| `AI_SUGGEST_API_KEY` | OpenAI compatible API Key | None |
| `AI_SUGGEST_PROMPT` | Custom prompt | Built-in prompt |

> **Note**: For Docker deployments, do not create `web/limitless_search_web/.env`. Only local frontend development needs an optional `web/limitless_search_web/.env.local`.

> **Additional note**: The current root `docker-compose.yml` only publishes port `3200`. The backend `8888` port is reachable only from containers on `limitless-network`. If you need direct host access for backend debugging, add a `ports` mapping to the `backend` service yourself.

### Docker Deployment Update (Recommended)

Update to the latest version and rebuild on the server:

```bash
cd limitless-search

git pull

docker-compose down

docker-compose build --no-cache

docker-compose up -d
```

### Local Development Update

```bash
cd limitless-search

git pull
```

> If you have modified local code, please backup or use git stash to save changes first.

## ⚙️ Configuration Guide

### Backend Environment Variables

Configure backend service environment variables in `docker-compose.yml`:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Backend listening port | `8888` |
| `CHANNELS` | TG channel list (comma-separated) | See below |
| `ENABLED_PLUGINS` | Enabled plugins list (comma-separated) | See below |
| `CACHE_ENABLED` | Enable caching | `true` |
| `CACHE_PATH` | Cache path | `/app/cache` |
| `CACHE_MAX_SIZE` | Maximum cache size (MB) | `100` |
| `CACHE_TTL` | Cache TTL (minutes) | `60` |
| `ASYNC_PLUGIN_ENABLED` | Enable async plugins | `true` |
| `ASYNC_RESPONSE_TIMEOUT` | Async response timeout (seconds) | `4` |
| `ASYNC_MAX_BACKGROUND_WORKERS` | Max background workers | `20` |
| `ASYNC_MAX_BACKGROUND_TASKS` | Max background tasks | `100` |
| `ASYNC_CACHE_TTL_HOURS` | Async cache TTL (hours) | `1` |
| `PROXY` | Proxy settings (optional) | None |

### TG Channel Configuration (CHANNELS)

The `CHANNELS` environment variable configures the Telegram channel list to search, separated by commas.

**Currently configured channels:**

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

### Plugin Configuration (ENABLED_PLUGINS)

The `ENABLED_PLUGINS` environment variable configures the search plugins to enable, separated by commas.

**Currently configured plugins:**

```
labi,zhizhen,shandian,duoduo,muou,wanou,hunhepan,jikepan,panwiki,pansearch,
panta,qupansou,hdr4k,pan666,susu,thepiratebay,xuexizhinan,panyq,ouge,huban,
cyg,erxiao,miaoso,fox4k,pianku,clmao,wuji,cldi,xiaozhang,libvio,leijing,
xb6v,xys,ddys,hdmoli,yuhuage,u3c3,clxiong,jutoushe,sdso,xiaoji,xdyh,
haisou,bixin,djgou,nyaa,xinjuc,aikanzy,qupanshe,xdpan,discourse,yunsou,qqpd,
ahhhhfs,nsgame,gying,quark4k,quarksoo,sousou,ash
```

**Plugin Notes:**
- If `ENABLED_PLUGINS` is not set, no plugins will be enabled
- Setting to empty string also means no plugins enabled
- Only plugins in the list will be enabled

### Authentication Configuration (Optional)

To enable API authentication, uncomment the following environment variables:

```yaml
environment:
  - AUTH_ENABLED=true
  - AUTH_USERS=admin:admin123,user:pass456
  - AUTH_TOKEN_EXPIRY=24
  - AUTH_JWT_SECRET=your-secret-key-here
```

| Variable | Description | Default |
|----------|-------------|---------|
| `AUTH_ENABLED` | Enable authentication | `false` |
| `AUTH_USERS` | User accounts (format: user1:pass1,user2:pass2) | None |
| `AUTH_TOKEN_EXPIRY` | Token expiry (hours) | `24` |
| `AUTH_JWT_SECRET` | JWT signing key | Auto-generated |

### Proxy Configuration (Optional)

To use a proxy for Telegram access, uncomment the following environment variable:

```yaml
environment:
  - PROXY=socks5://proxy:7897
```

## 📁 Project Structure

```
.
├── docker-compose.yml          # Docker Compose configuration
├── README.md                   # Project documentation
├── backend/
│   └── limitless_search/       # Backend service
│       ├── Dockerfile
│       ├── main.go
│       ├── api/                # API handlers
│       ├── config/             # Configuration management
│       ├── model/              # Data models
│       ├── plugin/             # Search plugins
│       └── docs/               # Documentation
└── web/
    └── limitless_search_web/   # Web frontend
        ├── Dockerfile
        ├── .env.example        # Local development env example
        └── src/                # Source code
```

## 🌐 Supported Cloud Storage Types

- Baidu Netdisk (`baidu`)
- Aliyun Drive (`aliyun`)
- Quark Drive (`quark`)
- Tianyi Cloud (`tianyi`)
- UC Drive (`uc`)
- Mobile Cloud (`mobile`)
- 115 Drive (`115`)
- PikPak (`pikpak`)
- Xunlei Drive (`xunlei`)
- 123 Drive (`123`)
- Google Drive (`google`)
- Magnet Links (`magnet`)
- ED2K Links (`ed2k`)

## 📖 API Documentation

### Search Endpoint

**POST /api/search**

```bash
curl -X POST http://localhost:8888/api/search \
  -H "Content-Type: application/json" \
  -d '{"kw": "xxxxx"}'
```

**GET /api/search**

```bash
curl "http://localhost:8888/api/search?kw=xxxxx"
```

### Health Check

```bash
curl http://localhost:8888/api/health
```

## 🔧 FAQ

### 1. How to add new TG channels?

Modify the `CHANNELS` environment variable in `docker-compose.yml`, add new channel names (comma-separated), then restart the service:

```bash
docker-compose down
docker-compose up -d
```

### 2. How to enable/disable plugins?

Modify the `ENABLED_PLUGINS` environment variable in `docker-compose.yml`, then restart the service.

### 3. Empty search results?

- Check if network connection is normal
- If in mainland China, you may need to configure a proxy to access Telegram
- Check if TG channel names are correct

### 4. How to configure proxy?

Uncomment the `PROXY` environment variable in `docker-compose.yml` and set the proxy address:

```yaml
environment:
  - PROXY=socks5://your-proxy:port
```

## 📄 License

[![CC BY-NC 4.0](https://licensebuttons.net/l/by-nc/4.0/88x31.png)](https://creativecommons.org/licenses/by-nc/4.0/)

This project is licensed under [CC BY-NC 4.0 (Attribution-NonCommercial 4.0 International)](https://creativecommons.org/licenses/by-nc/4.0/).

You are free to:
- **Share** — copy and redistribute the material in any medium or format
- **Adapt** — remix, transform, and build upon the material

Under the following terms:
- **Attribution** — You must give appropriate credit, provide a link to the license, and indicate if changes were made
- **NonCommercial** — You may not use the material for commercial purposes

## 🔗 Related Links

- [Backend Documentation](backend/limitless_search/docs/README.md)
- [Plugin Development Guide](backend/limitless_search/docs/插件开发指南.md)
- [System Design Document](backend/limitless_search/docs/系统开发设计文档.md)

---

Backend based on [PanSou](https://github.com/fish2018/pansou) project for limitless-search-backend. Open source under MIT License.
Frontend limitless-search-web: Maishan Inc. and Freeanime.org organization own all copyrights of the limitless-search-web frontend. Commercial use is prohibited without permission.
