# Limitless Search

[简体中文](README.md) | [繁體中文](README_zh-TW.md) | [English](README_en.md) | **日本語** | [Русский](README_ru.md) | [Français](README_fr.md)

Limitless Searchは、Freeanime.orgとMaishan Inc.が開発した高性能なオープンソースのクラウドストレージリソース検索ツールです。

## 🌐 オンラインアクセス

**デモサイト：** [https://search.freeanime.org](https://search.freeanime.org)  ベータ版：[https://search-bate.freeanime.org](https://search-bate.freeanime.org)

> [Freeanime.org](https://freeanime.org)がスポンサー。Maishan Inc.とFreeanime.org組織は、limitless-search-webフロントエンドのすべての著作権を所有しています。許可なく商用利用および再配布は禁止されています。

## 📸 インターフェースプレビュー

<table>
  <tr>
    <td><img src="img/1.jpg" alt="ホームページ" width="400"/></td>
    <td><img src="img/2.jpg" alt="フッター" width="400"/></td>
  </tr>
  <tr>
    <td><img src="img/3.jpg" alt="CAPTCHA ページ" width="400"/></td>
    <td><img src="img/4.jpg" alt="検索中" width="400"/></td>
  </tr>
  <tr>
    <td colspan="2" align="center"><img src="img/5.jpg" alt="リソース表示" width="400"/></td>
  </tr>
</table>

## 📋 最近の更新

**2026-01-25**
- 🗑️ javdbプラグインを削除
- 🎨 ウェブサイトのホームページレイアウトを更新
- 🔍 検索機能を最適化

## 🚀 クイックデプロイ

### Docker Composeを使用（推奨）

1. プロジェクトをクローン

```bash
# HTTPS
git clone https://github.com/maishaninc/limitless-search.git

# SSH
git clone git@github.com:maishaninc/limitless-search.git

# GitHub CLI
gh repo clone maishaninc/limitless-search
```

2. プロジェクトディレクトリに移動：
```bash
cd limitless-search
```

3. サービスを起動：
```bash
docker-compose up -d
```

4. サービスにアクセス：
- Webインターフェース：http://localhost:3200
- バックエンドAPI：http://localhost:8888 [デフォルト]

### ログを表示

```bash
docker-compose logs -f
```

### サービスを停止

```bash
docker-compose down
```

## 🔐 CAPTCHA設定

Webフロントエンドは、悪意のあるクローラーや不正使用を防ぐためのCAPTCHA認証機能をサポートしています。設定ファイルは `web/limitless_search_web/.env` にあります。

### サポートされている認証サービス

| プロバイダー | 説明 |
|-------------|------|
| `turnstile` | Cloudflare Turnstile（推奨） |
| `hcaptcha` | hCaptcha（推奨） |
| `none` | 無効（デフォルト） |

### 設定方法

`web/limitless_search_web/.env` ファイルを編集：

```env
# バックエンドAPI URL
NEXT_PUBLIC_API_BASE=http://backend:8888

# --- CAPTCHA設定 ---
# 認証プロバイダーを選択: "turnstile" | "hcaptcha" | "none" 
NEXT_PUBLIC_CAPTCHA_PROVIDER=none

# [Cloudflare Turnstile設定]
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-site-key
TURNSTILE_SECRET_KEY=your-secret-key

# [hCaptcha設定]
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=your-site-key
HCAPTCHA_SECRET_KEY=your-secret-key
```

### Cloudflare Turnstileセットアップ手順

1. [Cloudflare Dashboard](https://dash.cloudflare.com/)にアクセス
2. **Turnstile**ページに移動
3. **Add Site**をクリックして新しいサイトを作成
4. **Site Key**と**Secret Key**を取得
5. `.env`ファイルで設定：
   ```env
   NEXT_PUBLIC_CAPTCHA_PROVIDER=turnstile
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAA...
   TURNSTILE_SECRET_KEY=0x4AAAAAAA...
   ```

### hCaptchaセットアップ手順

1. [hCaptcha Dashboard](https://dashboard.hcaptcha.com/)にアクセス
2. 登録して新しいサイトを作成
3. **Site Key**と**Secret Key**を取得
4. `.env`ファイルで設定：
   ```env
   NEXT_PUBLIC_CAPTCHA_PROVIDER=hcaptcha
   NEXT_PUBLIC_HCAPTCHA_SITE_KEY=your-site-key
   HCAPTCHA_SECRET_KEY=your-secret-key
   ```

## 🆕 バージョン更新

### Dockerデプロイ更新（推奨）

サーバーで最新バージョンに更新して再ビルド：

```bash
cd limitless-search

git pull

docker-compose down

docker-compose build --no-cache

docker-compose up -d
```

### ローカル開発更新

```bash
cd limitless-search

git pull
```

> ローカルコードを変更した場合は、先にバックアップするか、git stashを使用して変更を保存してください。

## 🤖 AIレコメンデーション設定

フロントエンドは、検索結果数に基づいてオリジナル名の提案を提供するAIレコメンデーションクエリ機能をサポートしています。設定ファイルは `web/limitless_search_web/.env` にあります。

```env
# --- AIレコメンデーション設定 ---
# AIレコメンデーションを有効にする（デフォルトtrue）
NEXT_PUBLIC_AI_SUGGEST_ENABLED=true

# トリガー閾値（結果数 <= 閾値でトリガー）
NEXT_PUBLIC_AI_SUGGEST_THRESHOLD=50

# 先にCAPTCHA認証を要求
NEXT_PUBLIC_AI_SUGGEST_REQUIRE_CAPTCHA=false
```

> 注意：設定されていないか`false`に設定されている場合、AIレコメンデーションは表示されません。

## ⚙️ 設定ガイド

### バックエンド環境変数

`docker-compose.yml`でバックエンドサービスの環境変数を設定：

| 変数 | 説明 | デフォルト |
|------|------|-----------|
| `PORT` | バックエンドリスニングポート | `8888` |
| `CHANNELS` | TGチャンネルリスト（カンマ区切り） | 下記参照 |
| `ENABLED_PLUGINS` | 有効なプラグインリスト（カンマ区切り） | 下記参照 |
| `CACHE_ENABLED` | キャッシュを有効にする | `true` |
| `CACHE_PATH` | キャッシュパス | `/app/cache` |
| `CACHE_MAX_SIZE` | 最大キャッシュサイズ（MB） | `100` |
| `CACHE_TTL` | キャッシュTTL（分） | `60` |
| `ASYNC_PLUGIN_ENABLED` | 非同期プラグインを有効にする | `true` |
| `ASYNC_RESPONSE_TIMEOUT` | 非同期レスポンスタイムアウト（秒） | `4` |
| `ASYNC_MAX_BACKGROUND_WORKERS` | 最大バックグラウンドワーカー数 | `20` |
| `ASYNC_MAX_BACKGROUND_TASKS` | 最大バックグラウンドタスク数 | `100` |
| `ASYNC_CACHE_TTL_HOURS` | 非同期キャッシュTTL（時間） | `1` |
| `PROXY` | プロキシ設定（オプション） | なし |

### TGチャンネル設定 (CHANNELS)

`CHANNELS`環境変数は、検索するTelegramチャンネルリストを設定します（カンマ区切り）。

**現在設定されているチャンネル：**

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

### プラグイン設定 (ENABLED_PLUGINS)

`ENABLED_PLUGINS`環境変数は、有効にする検索プラグインを設定します（カンマ区切り）。

**現在設定されているプラグイン：**

```
labi,zhizhen,shandian,duoduo,muou,wanou,hunhepan,jikepan,panwiki,pansearch,
panta,qupansou,hdr4k,pan666,susu,thepiratebay,xuexizhinan,panyq,ouge,huban,
cyg,erxiao,miaoso,fox4k,pianku,clmao,wuji,cldi,xiaozhang,libvio,leijing,
xb6v,xys,ddys,hdmoli,yuhuage,u3c3,clxiong,jutoushe,sdso,xiaoji,xdyh,
haisou,bixin,djgou,nyaa,xinjuc,aikanzy,qupanshe,xdpan,discourse,yunsou,qqpd,
ahhhhfs,nsgame,gying,quark4k,quarksoo,sousou,ash
```

**プラグインの注意事項：**
- `ENABLED_PLUGINS`が設定されていない場合、プラグインは有効になりません
- 空文字列に設定してもプラグインは有効になりません
- リストにあるプラグインのみが有効になります

### 認証設定（オプション）

API認証を有効にするには、以下の環境変数のコメントを解除：

```yaml
environment:
  - AUTH_ENABLED=true
  - AUTH_USERS=admin:admin123,user:pass456
  - AUTH_TOKEN_EXPIRY=24
  - AUTH_JWT_SECRET=your-secret-key-here
```

| 変数 | 説明 | デフォルト |
|------|------|-----------|
| `AUTH_ENABLED` | 認証を有効にする | `false` |
| `AUTH_USERS` | ユーザーアカウント（形式：user1:pass1,user2:pass2） | なし |
| `AUTH_TOKEN_EXPIRY` | トークン有効期限（時間） | `24` |
| `AUTH_JWT_SECRET` | JWT署名キー | 自動生成 |

### プロキシ設定（オプション）

Telegramアクセスにプロキシを使用するには、以下の環境変数のコメントを解除：

```yaml
environment:
  - PROXY=socks5://proxy:7897
```

## 📁 プロジェクト構造

```
.
├── docker-compose.yml          # Docker Compose設定
├── README.md                   # プロジェクトドキュメント
├── backend/
│   └── limitless_search/       # バックエンドサービス
│       ├── Dockerfile
│       ├── main.go
│       ├── api/                # APIハンドラー
│       ├── config/             # 設定管理
│       ├── model/              # データモデル
│       ├── plugin/             # 検索プラグイン
│       └── docs/               # ドキュメント
└── web/
    └── limitless_search_web/   # Webフロントエンド
        ├── Dockerfile
        ├── .env                # 環境変数
        └── src/                # ソースコード
```

## 🌐 サポートされているクラウドストレージタイプ

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
- マグネットリンク (`magnet`)
- ED2Kリンク (`ed2k`)

## 📖 APIドキュメント

### 検索エンドポイント

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

### ヘルスチェック

```bash
curl http://localhost:8888/api/health
```

## 🔧 よくある質問

### 1. 新しいTGチャンネルを追加するには？

`docker-compose.yml`の`CHANNELS`環境変数を変更し、新しいチャンネル名を追加（カンマ区切り）してからサービスを再起動：

```bash
docker-compose down
docker-compose up -d
```

### 2. プラグインを有効/無効にするには？

`docker-compose.yml`の`ENABLED_PLUGINS`環境変数を変更してからサービスを再起動。

### 3. 検索結果が空？

- ネットワーク接続が正常か確認
- 中国本土にいる場合、Telegramにアクセスするためにプロキシの設定が必要な場合があります
- TGチャンネル名が正しいか確認

### 4. プロキシを設定するには？

`docker-compose.yml`の`PROXY`環境変数のコメントを解除してプロキシアドレスを設定：

```yaml
environment:
  - PROXY=socks5://your-proxy:port
```

## 📄 ライセンス
MIT License
Maishan Inc. - [無料オープンソースソフトウェアライセンス契約](https://www.maishanzero.com/license/free-opensource-software-licensing-agreement/)

## 🔗 関連リンク

- [バックエンドドキュメント](backend/limitless_search/docs/README.md)
- [プラグイン開発ガイド](backend/limitless_search/docs/插件开发指南.md)
- [システム設計ドキュメント](backend/limitless_search/docs/系统开发设计文档.md)

---

バックエンドは[PanSou](https://github.com/fish2018/pansou)プロジェクトに基づいてlimitless-search-backend部分を開発。MITライセンスでオープンソース。
フロントエンドlimitless-search-web：Maishan Inc.とFreeanime.org組織がlimitless-search-webフロントエンドのすべての著作権を所有しています。許可なく商用利用および再配布は禁止されています。
