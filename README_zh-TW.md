# Limitless Search

[简体中文](README.md) | **繁體中文** | [English](README_en.md) | [日本語](README_ja.md) | [Русский](README_ru.md) | [Français](README_fr.md)

Limitless Search 是一個高性能的開源網盤資源搜索工具，由Freeanime.org與Maishan Inc開發。 

## 🌐 線上訪問

**線上體驗地址：** [https://search.freeanime.org](https://search.freeanime.org)  新版本測試地址：[https://search-bate.freeanime.org](https://search-bate.freeanime.org)

> 由 [Freeanime.org](https://freeanime.org) 贊助 Maishan Inc. 與 Freeanime.org組織 擁有 limitless-search-web 前端頁面的全部版權，未經許可禁止商用及二次分發。

## 📸 界面預覽

<table>
  <tr>
    <td><img src="img/1.jpg" alt="主頁" width="400"/></td>
    <td><img src="img/2.jpg" alt="底部" width="400"/></td>
  </tr>
  <tr>
    <td><img src="img/3.jpg" alt="人機驗證頁面" width="400"/></td>
    <td><img src="img/4.jpg" alt="搜索中" width="400"/></td>
  </tr>
  <tr>
    <td colspan="2" align="center"><img src="img/5.jpg" alt="展示資源" width="400"/></td>
  </tr>
</table>

## 🌍 多語言支持

已支持以下語言的 **100% 翻譯**：

| 語言 | 文檔 |
|------|------|
| 🇨🇳 简体中文 | [README.md](README.md) |
| 🇹🇼 繁體中文 | [README_zh-TW.md](README_zh-TW.md) |
| 🇺🇸 English | [README_en.md](README_en.md) |
| 🇯🇵 日本語 | [README_ja.md](README_ja.md) |
| 🇷🇺 Русский | [README_ru.md](README_ru.md) |
| 🇫🇷 Français | [README_fr.md](README_fr.md) |

> 需要更多語言？請提交 [Issues](https://github.com/maishaninc/limitless-search/issues)

## 📋 最近更新

**2026-01-25**
- 🗑️ 刪除插件 javdb
- 🎨 更新了網站主頁排版
- 🔍 優化了搜索功能
- 🌐 添加 Google 雲端硬碟搜索支持

## 🚀 快速部署

### 使用 Docker Compose（推薦）

1. 克隆項目文件

```bash
# HTTPS
git clone https://github.com/maishaninc/limitless-search.git

# SSH
git clone git@github.com:maishaninc/limitless-search.git

# GitHub CLI
gh repo clone maishaninc/limitless-search
```

2. 進入項目目錄：
```bash
cd limitless-search
```

3. 啟動服務：
```bash
docker-compose up -d
```

4. 訪問服務：
- Web 界面：http://localhost:3200
- 後端 API：http://localhost:8888 [默認]

### 查看日誌

```bash
docker-compose logs -f
```

### 停止服務

```bash
docker-compose down
```

## 🔐 人機驗證配置

Web 前端支持人機驗證功能，可以防止惡意爬蟲和濫用。配置文件位於 `web/limitless_search_web/.env`。

### 支持的驗證服務

| 服務提供商 | 說明 |
|-----------|------|
| `turnstile` | Cloudflare Turnstile（推薦） |
| `hcaptcha` | hCaptcha （推薦） |
| `none` | 不啟用驗證（默認） |

### 配置方法

編輯 `web/limitless_search_web/.env` 文件：

```env
# 後端 API 地址
NEXT_PUBLIC_API_BASE=http://backend:8888

# --- 人機驗證配置 ---
# 選擇驗證服務提供商: "turnstile" | "hcaptcha" | "none" 
NEXT_PUBLIC_CAPTCHA_PROVIDER=none

# [Cloudflare Turnstile 配置]
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-site-key
TURNSTILE_SECRET_KEY=your-secret-key

# [hCaptcha 配置]
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=your-site-key
HCAPTCHA_SECRET_KEY=your-secret-key
```

### Cloudflare Turnstile 配置步驟

1. 訪問 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 進入 **Turnstile** 頁面
3. 點擊 **Add Site** 創建新站點
4. 獲取 **Site Key** 和 **Secret Key**
5. 在 `.env` 文件中配置：
   ```env
   NEXT_PUBLIC_CAPTCHA_PROVIDER=turnstile
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAA...
   TURNSTILE_SECRET_KEY=0x4AAAAAAA...
   ```

### hCaptcha 配置步驟

1. 訪問 [hCaptcha Dashboard](https://dashboard.hcaptcha.com/)
2. 註冊並創建新站點
3. 獲取 **Site Key** 和 **Secret Key**
4. 在 `.env` 文件中配置：
   ```env
   NEXT_PUBLIC_CAPTCHA_PROVIDER=hcaptcha
   NEXT_PUBLIC_HCAPTCHA_SITE_KEY=your-site-key
   HCAPTCHA_SECRET_KEY=your-secret-key
   ```

## 🆕 版本更新

### Docker 部署更新（推薦）

在服務器上更新到最新版本並重新構建：

```bash
cd limitless-search

git pull

docker-compose down

docker-compose build --no-cache

docker-compose up -d
```

### 本地開發更新

```bash
cd limitless-search

git pull
```

> 如果你修改過本地代碼，請先備份或使用 git stash 保存改動。

## 🤖 AI 推薦配置

前端支持 AI 推薦查詢功能，可根據搜索結果數量給出原版名稱建議。配置文件位於 `web/limitless_search_web/.env`。

```env
# --- AI 推薦配置 ---
# 是否啟用 AI 推薦（默認 true）
NEXT_PUBLIC_AI_SUGGEST_ENABLED=true

# 觸發閾值（結果條數 <= 閾值時觸發）
NEXT_PUBLIC_AI_SUGGEST_THRESHOLD=50

# 是否強制要求先通過人機驗證
NEXT_PUBLIC_AI_SUGGEST_REQUIRE_CAPTCHA=false
```

> 說明：若未配置或設置為 `false`，AI 推薦將不顯示。

## ⚙️ 配置說明

### 後端環境變量

在 `docker-compose.yml` 中配置後端服務的環境變量：

| 環境變量 | 描述 | 默認值 |
|----------|------|--------|
| `PORT` | 後端監聽端口 | `8888` |
| `CHANNELS` | TG 頻道列表（逗號分隔） | 見下方說明 |
| `ENABLED_PLUGINS` | 啟用的插件列表（逗號分隔） | 見下方說明 |
| `CACHE_ENABLED` | 是否啟用緩存 | `true` |
| `CACHE_PATH` | 緩存路徑 | `/app/cache` |
| `CACHE_MAX_SIZE` | 最大緩存大小(MB) | `100` |
| `CACHE_TTL` | 緩存有效期(分鐘) | `60` |
| `ASYNC_PLUGIN_ENABLED` | 是否啟用異步插件 | `true` |
| `ASYNC_RESPONSE_TIMEOUT` | 異步響應超時(秒) | `4` |
| `ASYNC_MAX_BACKGROUND_WORKERS` | 最大後台工作者數量 | `20` |
| `ASYNC_MAX_BACKGROUND_TASKS` | 最大後台任務數量 | `100` |
| `ASYNC_CACHE_TTL_HOURS` | 異步緩存有效期(小時) | `1` |
| `PROXY` | 代理設置（可選） | 無 |

### TG 頻道配置 (CHANNELS)

`CHANNELS` 環境變量用於配置要搜索的 Telegram 頻道列表，多個頻道用逗號分隔。

**當前配置的頻道列表：**

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

`ENABLED_PLUGINS` 環境變量用於配置要啟用的搜索插件，多個插件用逗號分隔。

**當前配置的插件列表：**

```
labi,zhizhen,shandian,duoduo,muou,wanou,hunhepan,jikepan,panwiki,pansearch,
panta,qupansou,hdr4k,pan666,susu,thepiratebay,xuexizhinan,panyq,ouge,huban,
cyg,erxiao,miaoso,fox4k,pianku,clmao,wuji,cldi,xiaozhang,libvio,leijing,
xb6v,xys,ddys,hdmoli,yuhuage,u3c3,clxiong,jutoushe,sdso,xiaoji,xdyh,
haisou,bixin,djgou,nyaa,xinjuc,aikanzy,qupanshe,xdpan,discourse,yunsou,qqpd,
ahhhhfs,nsgame,gying,quark4k,quarksoo,sousou,ash
```

**插件說明：**
- 如果不設置 `ENABLED_PLUGINS`，則不啟用任何插件
- 設置為空字符串也表示不啟用任何插件
- 只有在列表中的插件才會被啟用

### 認證配置（可選）

如需啟用 API 認證，取消註釋以下環境變量：

```yaml
environment:
  - AUTH_ENABLED=true
  - AUTH_USERS=admin:admin123,user:pass456
  - AUTH_TOKEN_EXPIRY=24
  - AUTH_JWT_SECRET=your-secret-key-here
```

| 環境變量 | 描述 | 默認值 |
|----------|------|--------|
| `AUTH_ENABLED` | 是否啟用認證 | `false` |
| `AUTH_USERS` | 用戶賬號配置（格式：user1:pass1,user2:pass2） | 無 |
| `AUTH_TOKEN_EXPIRY` | Token 有效期（小時） | `24` |
| `AUTH_JWT_SECRET` | JWT 簽名密鑰 | 自動生成 |

### 代理配置（可選）

如需使用代理訪問 Telegram，取消註釋以下環境變量：

```yaml
environment:
  - PROXY=socks5://proxy:7897
```

## 📁 項目結構

```
.
├── docker-compose.yml          # Docker Compose 配置文件
├── README.md                   # 項目說明文檔
├── backend/
│   └── limitless_search/       # 後端服務
│       ├── Dockerfile
│       ├── main.go
│       ├── api/                # API 處理
│       ├── config/             # 配置管理
│       ├── model/              # 數據模型
│       ├── plugin/             # 搜索插件
│       └── docs/               # 文檔
└── web/
    └── limitless_search_web/   # Web 前端
        ├── Dockerfile
        ├── .env                # 環境變量配置
        └── src/                # 源代碼
```

## 🌐 支持的網盤類型

- 百度網盤 (`baidu`)
- 阿里雲盤 (`aliyun`)
- 夸克網盤 (`quark`)
- 天翼雲盤 (`tianyi`)
- UC網盤 (`uc`)
- 移動雲盤 (`mobile`)
- 115網盤 (`115`)
- PikPak (`pikpak`)
- 迅雷網盤 (`xunlei`)
- 123網盤 (`123`)
- Google 雲端硬碟 (`google`)
- 磁力鏈接 (`magnet`)
- 電驢鏈接 (`ed2k`)

## 📖 API 文檔

### 搜索接口

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

### 健康檢查

```bash
curl http://localhost:8888/api/health
```

## 🔧 常見問題

### 1. 如何添加新的 TG 頻道？

修改 `docker-compose.yml` 中的 `CHANNELS` 環境變量，添加新的頻道名稱（用逗號分隔），然後重啟服務：

```bash
docker-compose down
docker-compose up -d
```

### 2. 如何啟用/禁用插件？

修改 `docker-compose.yml` 中的 `ENABLED_PLUGINS` 環境變量，然後重啟服務。

### 3. 搜索結果為空？

- 檢查網絡連接是否正常
- 如果在中國大陸，可能需要配置代理訪問 Telegram
- 檢查 TG 頻道名稱是否正確

### 4. 如何配置代理？

在 `docker-compose.yml` 中取消註釋 `PROXY` 環境變量並設置代理地址：

```yaml
environment:
  - PROXY=socks5://your-proxy:port
```

## 📄 許可證

[![CC BY-NC 4.0](https://licensebuttons.net/l/by-nc/4.0/88x31.png)](https://creativecommons.org/licenses/by-nc/4.0/)

本項目採用 [CC BY-NC 4.0 (署名-非商業性使用 4.0 國際)](https://creativecommons.org/licenses/by-nc/4.0/deed.zh-hant) 許可證。

您可以自由地：
- **分享** — 在任何媒介以任何形式複製、發行本作品
- **演繹** — 修改、轉換或以本作品為基礎進行創作

惟須遵守下列條件：
- **署名** — 您必須給出適當的署名，提供指向本許可證的連結，同時標明是否（對原始作品）作了修改
- **非商業性使用** — 您不得將本作品用於商業目的

## 🔗 相關鏈接

- [後端詳細文檔](backend/limitless_search/docs/README.md)
- [插件開發指南](backend/limitless_search/docs/插件開發指南.md)
- [系統設計文檔](backend/limitless_search/docs/系統開發設計文檔.md)

---

後端 基於 [PanSou](https://github.com/fish2018/pansou) 項目開發 limitless-search-backend 部分。以MIT許可證開源。
前端 limitless-search-web Maishan Inc. 與 Freeanime.org組織 擁有 limitless-search-web 前端頁面的全部版權，未經許可禁止商用及二次分發。
