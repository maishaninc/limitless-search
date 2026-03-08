# Limitless Search

[简体中文](README.md) | [繁體中文](README_zh-TW.md) | [English](README_en.md) | **日本語** | [Русский](README_ru.md) | [Français](README_fr.md)

Limitless Searchは、Freeanime.orgとMaishan Inc.が開発した高性能なオープンソースのクラウドストレージリソース検索ツールです。

## 🌐 オンラインアクセス

**デモサイト：** [https://search.freeanime.org](https://search.freeanime.org)

**新バージョン テストURL：** [https://search-bate.freeanime.org](https://search-bate.freeanime.org)

**テスト版の追加機能：**
- AI アニメランキング入口とページを追加（年次 / 月次 / 日次、展開表示対応）
- ランキング項目をクリックするとトップへ遷移し、検索語を自動入力（自動検索はしない）
- 現在のサイト言語に合わせてキーワードをローカライズ（中国語表示時は中国語名を優先）
- ランキング生成にリトライ、失敗ログ、フォールバック表示を追加
- ランキングSEOページとサイトマップ拡張を設定で制御可能

> [Freeanime.org](https://freeanime.org)がスポンサー。Maishan Inc.とFreeanime.org組織は、limitless-search-webフロントエンドのすべての著作権を所有しています。許可なく商用利用は禁止されています。

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

## 🆕 バージョン更新（2026-03-08）

- フロントエンド環境変数はルート `docker-compose.yml` の `web` サービスで統一して設定
- フロントエンドは既定で `web/limitless_search_web/.env` に依存しない構成へ変更
- フロントエンドのビルド時に注入するバックエンド接続先を `NEXT_PUBLIC_API_BASE` に統一
- hCaptcha のフロントエンド描画とサーバー側検証の問題を修正

## 🌍 多言語サポート

以下の地域の言語で **100% 翻訳** 対応：

| 国/地域 | 言語 | ドキュメント |
|---------|------|-------------|
| 🇨🇳 中国 | 简体中文 | [README.md](README.md) |
| 🇹🇼 中国台湾 | 繁體中文 | [README_zh-TW.md](README_zh-TW.md) |
| 🇭🇰 中国香港 | 繁體中文 | [README_zh-TW.md](README_zh-TW.md) |
| 🇺🇸 アメリカ | English | [README_en.md](README_en.md) |
| 🇯🇵 日本 | 日本語 | [README_ja.md](README_ja.md) |
| 🇷🇺 ロシア | Русский | [README_ru.md](README_ru.md) |
| 🇫🇷 フランス | Français | [README_fr.md](README_fr.md) |

> 他の言語が必要ですか？[Issues](https://github.com/maishaninc/limitless-search/issues) を提出してください

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
- バックエンドAPI：デフォルトでは Docker 内部ネットワーク上の `http://backend:8888` のみで利用可能で、ホストには直接公開されません

### ログを表示

```bash
docker-compose logs -f
```

### サービスを停止

```bash
docker-compose down
```

## 🔧 フロントエンド環境設定

Docker デプロイでは `web/limitless_search_web/.env` は不要です。フロントエンド関連の設定は、ルートの `docker-compose.yml` にある `web.build.args` と `web.environment` で管理します。

### Docker デプロイ設定

`docker-compose.yml` の `web:` サービスで直接設定します：

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

### ローカル開発のみ（任意）

Docker を使わずにフロントエンドをローカル実行する場合のみ、サンプルをコピーします：

```bash
cp web/limitless_search_web/.env.example web/limitless_search_web/.env.local
```

### 設定リファレンス

| 変数 | 説明 | デフォルト |
|------|------|-----------|
| `NEXT_PUBLIC_API_BASE` | フロントエンドのビルド時に埋め込まれるバックエンド API URL | `http://backend:8888` |
| `NEXT_PUBLIC_CAPTCHA_PROVIDER` | CAPTCHAサービスプロバイダー | `none` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile Site Key | なし |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile Secret Key | なし |
| `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` | hCaptcha Site Key | なし |
| `HCAPTCHA_SECRET_KEY` | hCaptcha Secret Key | なし |
| `NEXT_PUBLIC_AI_SUGGEST_ENABLED` | AIレコメンデーションを有効にする | `true` |
| `NEXT_PUBLIC_AI_SUGGEST_THRESHOLD` | AIレコメンデーショントリガー閾値 | `50` |
| `NEXT_PUBLIC_AI_SUGGEST_REQUIRE_CAPTCHA` | AI提案の前に CAPTCHA を必須にする | `false` |
| `AI_SUGGEST_BASE_URL` | OpenAI互換APIエンドポイント | なし |
| `AI_SUGGEST_MODEL` | OpenAI互換モデル名 | なし |
| `AI_SUGGEST_API_KEY` | OpenAI互換API Key | なし |
| `AI_SUGGEST_PROMPT` | カスタムプロンプト | 内蔵プロンプト |

> **注意**：Docker デプロイでは `web/limitless_search_web/.env` を作成しないでください。ローカル開発時のみ、必要に応じて `web/limitless_search_web/.env.local` を作成してください。

> **補足**：現在のルート `docker-compose.yml` では `3200` ポートのみを公開しています。`backend` の `8888` ポートは `limitless-network` 上のコンテナからのみアクセス可能です。ホストから直接デバッグしたい場合は、`backend` サービスに `ports` マッピングを追加してください。

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
        ├── .env.example        # ローカル開発用の環境変数サンプル
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
- Google ドライブ (`google`)
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

[![CC BY-NC 4.0](https://licensebuttons.net/l/by-nc/4.0/88x31.png)](https://creativecommons.org/licenses/by-nc/4.0/)

本プロジェクトは [CC BY-NC 4.0 (表示-非営利 4.0 国際)](https://creativecommons.org/licenses/by-nc/4.0/deed.ja) ライセンスの下で公開されています。

以下の条件で自由に：
- **共有** — どのような媒体や形式でも資料を複製・再配布できます
- **翻案** — 資料をリミックス、変形、または加工できます

以下の条件に従う必要があります：
- **表示** — 適切なクレジットを表示し、ライセンスへのリンクを提供し、変更があったかどうかを示す必要があります
- **非営利** — 営利目的で資料を使用することはできません

## 🔗 関連リンク

- [バックエンドドキュメント](backend/limitless_search/docs/README.md)
- [プラグイン開発ガイド](backend/limitless_search/docs/插件开发指南.md)
- [システム設計ドキュメント](backend/limitless_search/docs/系统开发设计文档.md)

---

バックエンドは[PanSou](https://github.com/fish2018/pansou)プロジェクトに基づいてlimitless-search-backend部分を開発。MITライセンスでオープンソース。
フロントエンドlimitless-search-web：Maishan Inc.とFreeanime.org組織がlimitless-search-webフロントエンドのすべての著作権を所有しています。許可なく商用利用は禁止されています。
