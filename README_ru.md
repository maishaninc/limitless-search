# Limitless Search

[简体中文](README.md) | [繁體中文](README_zh-TW.md) | [English](README_en.md) | [日本語](README_ja.md) | **Русский** | [Français](README_fr.md)

Limitless Search — это высокопроизводительный инструмент поиска ресурсов облачного хранилища с открытым исходным кодом, разработанный Freeanime.org и Maishan Inc.

## 🌐 Онлайн-доступ

**Демо-сайт:** [https://search.freeanime.org](https://search.freeanime.org)  Бета-версия: [https://search-bate.freeanime.org](https://search-bate.freeanime.org)

> Спонсор [Freeanime.org](https://freeanime.org). Maishan Inc. и организация Freeanime.org владеют всеми авторскими правами на фронтенд limitless-search-web. Коммерческое использование и распространение без разрешения запрещены.

## 📸 Предварительный просмотр интерфейса

<table>
  <tr>
    <td width="70%">
      <table>
        <tr>
          <td><img src="img/1.jpg" alt="Главная страница" width="350"/></td>
          <td><img src="img/2.jpg" alt="Подвал" width="350"/></td>
        </tr>
        <tr>
          <td><img src="img/3.jpg" alt="Страница CAPTCHA" width="350"/></td>
          <td><img src="img/4.jpg" alt="Поиск" width="350"/></td>
        </tr>
        <tr>
          <td colspan="2" align="center"><img src="img/5.jpg" alt="Отображение ресурсов" width="350"/></td>
        </tr>
      </table>
    </td>
    <td width="30%" valign="top">
      <h3>🌍 Многоязычная поддержка</h3>
      <p><strong>100% перевод</strong> доступен для:</p>
      <ul>
        <li>🇨🇳 简体中文</li>
        <li>🇹🇼 繁體中文</li>
        <li>🇺🇸 English</li>
        <li>🇯🇵 日本語</li>
        <li>🇷🇺 Русский</li>
        <li>🇫🇷 Français</li>
      </ul>
      <p><em>Нужны другие языки? Создайте <a href="https://github.com/maishaninc/limitless-search/issues">Issue</a></em></p>
    </td>
  </tr>
</table>

## 📋 Последние обновления

**2026-01-25**
- 🗑️ Удалён плагин javdb
- 🎨 Обновлён макет главной страницы сайта
- 🔍 Оптимизирована функция поиска

## 🚀 Быстрое развёртывание

### Использование Docker Compose (рекомендуется)

1. Клонируйте проект

```bash
# HTTPS
git clone https://github.com/maishaninc/limitless-search.git

# SSH
git clone git@github.com:maishaninc/limitless-search.git

# GitHub CLI
gh repo clone maishaninc/limitless-search
```

2. Перейдите в каталог проекта:
```bash
cd limitless-search
```

3. Запустите сервисы:
```bash
docker-compose up -d
```

4. Доступ к сервисам:
- Веб-интерфейс: http://localhost:3200
- Backend API: http://localhost:8888 [По умолчанию]

### Просмотр логов

```bash
docker-compose logs -f
```

### Остановка сервисов

```bash
docker-compose down
```

## 🔐 Настройка CAPTCHA

Веб-фронтенд поддерживает проверку CAPTCHA для предотвращения вредоносных краулеров и злоупотреблений. Файл конфигурации находится в `web/limitless_search_web/.env`.

### Поддерживаемые сервисы проверки

| Провайдер | Описание |
|-----------|----------|
| `turnstile` | Cloudflare Turnstile (рекомендуется) |
| `hcaptcha` | hCaptcha (рекомендуется) |
| `none` | Отключено (по умолчанию) |

### Метод настройки

Отредактируйте файл `web/limitless_search_web/.env`:

```env
# URL Backend API
NEXT_PUBLIC_API_BASE=http://backend:8888

# --- Настройка CAPTCHA ---
# Выберите провайдера проверки: "turnstile" | "hcaptcha" | "none" 
NEXT_PUBLIC_CAPTCHA_PROVIDER=none

# [Настройка Cloudflare Turnstile]
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-site-key
TURNSTILE_SECRET_KEY=your-secret-key

# [Настройка hCaptcha]
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=your-site-key
HCAPTCHA_SECRET_KEY=your-secret-key
```

### Шаги настройки Cloudflare Turnstile

1. Посетите [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Перейдите на страницу **Turnstile**
3. Нажмите **Add Site** для создания нового сайта
4. Получите **Site Key** и **Secret Key**
5. Настройте в файле `.env`:
   ```env
   NEXT_PUBLIC_CAPTCHA_PROVIDER=turnstile
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAA...
   TURNSTILE_SECRET_KEY=0x4AAAAAAA...
   ```

### Шаги настройки hCaptcha

1. Посетите [hCaptcha Dashboard](https://dashboard.hcaptcha.com/)
2. Зарегистрируйтесь и создайте новый сайт
3. Получите **Site Key** и **Secret Key**
4. Настройте в файле `.env`:
   ```env
   NEXT_PUBLIC_CAPTCHA_PROVIDER=hcaptcha
   NEXT_PUBLIC_HCAPTCHA_SITE_KEY=your-site-key
   HCAPTCHA_SECRET_KEY=your-secret-key
   ```

## 🆕 Обновление версии

### Обновление Docker-развёртывания (рекомендуется)

Обновите до последней версии и пересоберите на сервере:

```bash
cd limitless-search

git pull

docker-compose down

docker-compose build --no-cache

docker-compose up -d
```

### Обновление локальной разработки

```bash
cd limitless-search

git pull
```

> Если вы изменили локальный код, сначала сделайте резервную копию или используйте git stash для сохранения изменений.

## 🤖 Настройка AI-рекомендаций

Фронтенд поддерживает функцию AI-рекомендаций, предоставляя предложения оригинальных названий на основе количества результатов поиска. Файл конфигурации находится в `web/limitless_search_web/.env`.

```env
# --- Настройка AI-рекомендаций ---
# Включить AI-рекомендации (по умолчанию true)
NEXT_PUBLIC_AI_SUGGEST_ENABLED=true

# Порог срабатывания (срабатывает когда результаты <= порог)
NEXT_PUBLIC_AI_SUGGEST_THRESHOLD=50

# Требовать сначала проверку CAPTCHA
NEXT_PUBLIC_AI_SUGGEST_REQUIRE_CAPTCHA=false
```

> Примечание: Если не настроено или установлено в `false`, AI-рекомендации не будут отображаться.

## ⚙️ Руководство по настройке

### Переменные окружения Backend

Настройте переменные окружения backend-сервиса в `docker-compose.yml`:

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `PORT` | Порт прослушивания backend | `8888` |
| `CHANNELS` | Список TG-каналов (через запятую) | См. ниже |
| `ENABLED_PLUGINS` | Список включённых плагинов (через запятую) | См. ниже |
| `CACHE_ENABLED` | Включить кэширование | `true` |
| `CACHE_PATH` | Путь к кэшу | `/app/cache` |
| `CACHE_MAX_SIZE` | Максимальный размер кэша (МБ) | `100` |
| `CACHE_TTL` | TTL кэша (минуты) | `60` |
| `ASYNC_PLUGIN_ENABLED` | Включить асинхронные плагины | `true` |
| `ASYNC_RESPONSE_TIMEOUT` | Таймаут асинхронного ответа (секунды) | `4` |
| `ASYNC_MAX_BACKGROUND_WORKERS` | Макс. фоновых воркеров | `20` |
| `ASYNC_MAX_BACKGROUND_TASKS` | Макс. фоновых задач | `100` |
| `ASYNC_CACHE_TTL_HOURS` | TTL асинхронного кэша (часы) | `1` |
| `PROXY` | Настройки прокси (опционально) | Нет |

### Настройка TG-каналов (CHANNELS)

Переменная окружения `CHANNELS` настраивает список Telegram-каналов для поиска, разделённых запятыми.

**Текущие настроенные каналы:**

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

### Настройка плагинов (ENABLED_PLUGINS)

Переменная окружения `ENABLED_PLUGINS` настраивает плагины поиска для включения, разделённые запятыми.

**Текущие настроенные плагины:**

```
labi,zhizhen,shandian,duoduo,muou,wanou,hunhepan,jikepan,panwiki,pansearch,
panta,qupansou,hdr4k,pan666,susu,thepiratebay,xuexizhinan,panyq,ouge,huban,
cyg,erxiao,miaoso,fox4k,pianku,clmao,wuji,cldi,xiaozhang,libvio,leijing,
xb6v,xys,ddys,hdmoli,yuhuage,u3c3,clxiong,jutoushe,sdso,xiaoji,xdyh,
haisou,bixin,djgou,nyaa,xinjuc,aikanzy,qupanshe,xdpan,discourse,yunsou,qqpd,
ahhhhfs,nsgame,gying,quark4k,quarksoo,sousou,ash
```

**Примечания по плагинам:**
- Если `ENABLED_PLUGINS` не установлен, плагины не будут включены
- Установка пустой строки также означает отсутствие включённых плагинов
- Будут включены только плагины из списка

### Настройка аутентификации (опционально)

Чтобы включить API-аутентификацию, раскомментируйте следующие переменные окружения:

```yaml
environment:
  - AUTH_ENABLED=true
  - AUTH_USERS=admin:admin123,user:pass456
  - AUTH_TOKEN_EXPIRY=24
  - AUTH_JWT_SECRET=your-secret-key-here
```

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `AUTH_ENABLED` | Включить аутентификацию | `false` |
| `AUTH_USERS` | Учётные записи пользователей (формат: user1:pass1,user2:pass2) | Нет |
| `AUTH_TOKEN_EXPIRY` | Срок действия токена (часы) | `24` |
| `AUTH_JWT_SECRET` | Ключ подписи JWT | Автогенерация |

### Настройка прокси (опционально)

Чтобы использовать прокси для доступа к Telegram, раскомментируйте следующую переменную окружения:

```yaml
environment:
  - PROXY=socks5://proxy:7897
```

## 📁 Структура проекта

```
.
├── docker-compose.yml          # Конфигурация Docker Compose
├── README.md                   # Документация проекта
├── backend/
│   └── limitless_search/       # Backend-сервис
│       ├── Dockerfile
│       ├── main.go
│       ├── api/                # API-обработчики
│       ├── config/             # Управление конфигурацией
│       ├── model/              # Модели данных
│       ├── plugin/             # Плагины поиска
│       └── docs/               # Документация
└── web/
    └── limitless_search_web/   # Веб-фронтенд
        ├── Dockerfile
        ├── .env                # Переменные окружения
        └── src/                # Исходный код
```

## 🌐 Поддерживаемые типы облачных хранилищ

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
- Google Диск (`google`)
- Magnet-ссылки (`magnet`)
- ED2K-ссылки (`ed2k`)

## 📖 Документация API

### Эндпоинт поиска

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

### Проверка работоспособности

```bash
curl http://localhost:8888/api/health
```

## 🔧 Часто задаваемые вопросы

### 1. Как добавить новые TG-каналы?

Измените переменную окружения `CHANNELS` в `docker-compose.yml`, добавьте новые названия каналов (через запятую), затем перезапустите сервис:

```bash
docker-compose down
docker-compose up -d
```

### 2. Как включить/отключить плагины?

Измените переменную окружения `ENABLED_PLUGINS` в `docker-compose.yml`, затем перезапустите сервис.

### 3. Пустые результаты поиска?

- Проверьте, нормально ли работает сетевое подключение
- Если вы в материковом Китае, возможно, потребуется настроить прокси для доступа к Telegram
- Проверьте правильность названий TG-каналов

### 4. Как настроить прокси?

Раскомментируйте переменную окружения `PROXY` в `docker-compose.yml` и установите адрес прокси:

```yaml
environment:
  - PROXY=socks5://your-proxy:port
```

## 📄 Лицензия
MIT License
Maishan Inc. - [Лицензионное соглашение на бесплатное программное обеспечение с открытым исходным кодом](https://www.maishanzero.com/license/free-opensource-software-licensing-agreement/)

## 🔗 Связанные ссылки

- [Документация Backend](backend/limitless_search/docs/README.md)
- [Руководство по разработке плагинов](backend/limitless_search/docs/插件开发指南.md)
- [Документ проектирования системы](backend/limitless_search/docs/系统开发设计文档.md)

---

Backend основан на проекте [PanSou](https://github.com/fish2018/pansou) для части limitless-search-backend. Открытый исходный код под лицензией MIT.
Фронтенд limitless-search-web: Maishan Inc. и организация Freeanime.org владеют всеми авторскими правами на фронтенд limitless-search-web. Коммерческое использование и распространение без разрешения запрещены.
