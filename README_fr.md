# Limitless Search

[简体中文](README.md) | [繁體中文](README_zh-TW.md) | [English](README_en.md) | [日本語](README_ja.md) | [Русский](README_ru.md) | **Français**

Limitless Search est un outil de recherche de ressources de stockage cloud open source haute performance, développé par Freeanime.org et Maishan Inc.

## 🌐 Accès en ligne

**Site de démonstration :** [https://search.freeanime.org](https://search.freeanime.org)

**URL de test (nouvelle version) :** [https://search-bate.freeanime.org](https://search-bate.freeanime.org)

**Nouvelles fonctionnalités de la version de test :**
- Ajout d'une entree et d'une page de classement anime par IA (annuel / mensuel / quotidien, avec affichage etendu)
- Le clic sur un titre du classement redirige vers l'accueil avec mot-cle pre-rempli (sans recherche automatique)
- Redirection avec mot-cle localise selon la langue courante du site (en interface chinoise, nom chinois prioritaire)
- Generation du classement avec retries, logs d'erreur et page de repli
- Pages SEO de classement et extension sitemap configurables

> Sponsorisé par [Freeanime.org](https://freeanime.org). Maishan Inc. et l'organisation Freeanime.org détiennent tous les droits d'auteur du frontend limitless-search-web. L'utilisation commerciale est interdite sans autorisation.

## 📸 Aperçu de l'interface

<table>
  <tr>
    <td><img src="img/1.jpg" alt="Page d'accueil" width="400"/></td>
    <td><img src="img/2.jpg" alt="Pied de page" width="400"/></td>
  </tr>
  <tr>
    <td><img src="img/3.jpg" alt="Page CAPTCHA" width="400"/></td>
    <td><img src="img/4.jpg" alt="Recherche en cours" width="400"/></td>
  </tr>
  <tr>
    <td colspan="2" align="center"><img src="img/5.jpg" alt="Affichage des ressources" width="400"/></td>
  </tr>
</table>

## 🆕 Mise à jour de version (2026-03-08)

- Les variables d'environnement du frontend sont désormais configurées dans le service `web` du `docker-compose.yml` racine
- Le frontend ne dépend plus par défaut de `web/limitless_search_web/.env`
- L'adresse backend injectée au build frontend utilise désormais `NEXT_PUBLIC_API_BASE`
- Correction du rendu frontend hCaptcha et de la vérification côté serveur

## 🌍 Support multilingue

**Traduction à 100%** disponible pour les régions suivantes :

| Pays/Région | Langue | Documentation |
|-------------|--------|---------------|
| 🇨🇳 Chine | 简体中文 | [README.md](README.md) |
| 🇹🇼 Taïwan, Chine | 繁體中文 | [README_zh-TW.md](README_zh-TW.md) |
| 🇭🇰 Hong Kong, Chine | 繁體中文 | [README_zh-TW.md](README_zh-TW.md) |
| 🇺🇸 États-Unis | English | [README_en.md](README_en.md) |
| 🇯🇵 Japon | 日本語 | [README_ja.md](README_ja.md) |
| 🇷🇺 Russie | Русский | [README_ru.md](README_ru.md) |
| 🇫🇷 France | Français | [README_fr.md](README_fr.md) |

> Besoin d'autres langues ? Soumettez une [Issue](https://github.com/maishaninc/limitless-search/issues)

## 🚀 Déploiement rapide

### Utilisation de Docker Compose (recommandé)

1. Cloner le projet

```bash
# HTTPS
git clone https://github.com/maishaninc/limitless-search.git

# SSH
git clone git@github.com:maishaninc/limitless-search.git

# GitHub CLI
gh repo clone maishaninc/limitless-search
```

2. Accéder au répertoire du projet :
```bash
cd limitless-search
```

3. Démarrer les services :
```bash
docker-compose up -d
```

4. Accéder aux services :
- Interface Web : http://localhost:3200
- API backend : disponible par défaut uniquement sur le réseau Docker interne via `http://backend:8888`, sans exposition directe sur l'hôte

### Voir les logs

```bash
docker-compose logs -f
```

### Arrêter les services

```bash
docker-compose down
```

## 🔧 Configuration de l'environnement Frontend

Les déploiements Docker n'utilisent plus `web/limitless_search_web/.env`. Les paramètres du frontend sont désormais définis dans le `docker-compose.yml` racine, sous `web.build.args` et `web.environment`.

### Configuration du déploiement Docker

Modifiez directement le service `web:` dans `docker-compose.yml` :

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

### Développement local uniquement

Si vous exécutez le frontend localement sans Docker, copiez le fichier d'exemple :

```bash
cp web/limitless_search_web/.env.example web/limitless_search_web/.env.local
```

### Référence de configuration

| Variable | Description | Par défaut |
|----------|-------------|------------|
| `NEXT_PUBLIC_API_BASE` | URL de l'API backend injectée au moment du build frontend | `http://backend:8888` |
| `NEXT_PUBLIC_CAPTCHA_PROVIDER` | Fournisseur de service CAPTCHA | `none` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile Site Key | Aucun |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile Secret Key | Aucun |
| `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` | hCaptcha Site Key | Aucun |
| `HCAPTCHA_SECRET_KEY` | hCaptcha Secret Key | Aucun |
| `NEXT_PUBLIC_AI_SUGGEST_ENABLED` | Activer la recommandation IA | `true` |
| `NEXT_PUBLIC_AI_SUGGEST_THRESHOLD` | Seuil de déclenchement IA | `50` |
| `NEXT_PUBLIC_AI_SUGGEST_REQUIRE_CAPTCHA` | Exiger un CAPTCHA avant la suggestion IA | `false` |
| `AI_SUGGEST_BASE_URL` | Point de terminaison API OpenAI | Aucun |
| `AI_SUGGEST_MODEL` | Nom du modèle OpenAI | Aucun |
| `AI_SUGGEST_API_KEY` | Clé API OpenAI | Aucun |
| `AI_SUGGEST_PROMPT` | Prompt personnalisé | Prompt intégré |

> **Note** : Pour un déploiement Docker, ne créez pas `web/limitless_search_web/.env`. Seul le développement local du frontend a éventuellement besoin de `web/limitless_search_web/.env.local`.

> **Complément** : Le `docker-compose.yml` racine actuel publie uniquement le port `3200`. Le port `8888` du backend reste accessible seulement depuis les conteneurs du réseau `limitless-network`. Si vous avez besoin d'un accès direct depuis l'hôte pour le débogage backend, ajoutez vous-même un mapping `ports` au service `backend`.

### Mise à jour du déploiement Docker (recommandé)

Mettre à jour vers la dernière version et reconstruire sur le serveur :

```bash
cd limitless-search

git pull

docker-compose down

docker-compose build --no-cache

docker-compose up -d
```

### Mise à jour du développement local

```bash
cd limitless-search

git pull
```

> Si vous avez modifié le code local, veuillez d'abord sauvegarder ou utiliser git stash pour enregistrer les modifications.

## ⚙️ Guide de configuration

### Variables d'environnement Backend

Configurer les variables d'environnement du service backend dans `docker-compose.yml` :

| Variable | Description | Par défaut |
|----------|-------------|------------|
| `PORT` | Port d'écoute backend | `8888` |
| `CHANNELS` | Liste des canaux TG (séparés par virgule) | Voir ci-dessous |
| `ENABLED_PLUGINS` | Liste des plugins activés (séparés par virgule) | Voir ci-dessous |
| `CACHE_ENABLED` | Activer le cache | `true` |
| `CACHE_PATH` | Chemin du cache | `/app/cache` |
| `CACHE_MAX_SIZE` | Taille maximale du cache (Mo) | `100` |
| `CACHE_TTL` | TTL du cache (minutes) | `60` |
| `ASYNC_PLUGIN_ENABLED` | Activer les plugins asynchrones | `true` |
| `ASYNC_RESPONSE_TIMEOUT` | Timeout de réponse asynchrone (secondes) | `4` |
| `ASYNC_MAX_BACKGROUND_WORKERS` | Max workers en arrière-plan | `20` |
| `ASYNC_MAX_BACKGROUND_TASKS` | Max tâches en arrière-plan | `100` |
| `ASYNC_CACHE_TTL_HOURS` | TTL du cache asynchrone (heures) | `1` |
| `PROXY` | Paramètres proxy (optionnel) | Aucun |

### Configuration des canaux TG (CHANNELS)

La variable d'environnement `CHANNELS` configure la liste des canaux Telegram à rechercher, séparés par des virgules.

**Canaux actuellement configurés :**

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

### Configuration des plugins (ENABLED_PLUGINS)

La variable d'environnement `ENABLED_PLUGINS` configure les plugins de recherche à activer, séparés par des virgules.

**Plugins actuellement configurés :**

```
labi,zhizhen,shandian,duoduo,muou,wanou,hunhepan,jikepan,panwiki,pansearch,
panta,qupansou,hdr4k,pan666,susu,thepiratebay,xuexizhinan,panyq,ouge,huban,
cyg,erxiao,miaoso,fox4k,pianku,clmao,wuji,cldi,xiaozhang,libvio,leijing,
xb6v,xys,ddys,hdmoli,yuhuage,u3c3,clxiong,jutoushe,sdso,xiaoji,xdyh,
haisou,bixin,djgou,nyaa,xinjuc,aikanzy,qupanshe,xdpan,discourse,yunsou,qqpd,
ahhhhfs,nsgame,gying,quark4k,quarksoo,sousou,ash
```

**Notes sur les plugins :**
- Si `ENABLED_PLUGINS` n'est pas défini, aucun plugin ne sera activé
- Définir une chaîne vide signifie également aucun plugin activé
- Seuls les plugins de la liste seront activés

### Configuration de l'authentification (optionnel)

Pour activer l'authentification API, décommenter les variables d'environnement suivantes :

```yaml
environment:
  - AUTH_ENABLED=true
  - AUTH_USERS=admin:admin123,user:pass456
  - AUTH_TOKEN_EXPIRY=24
  - AUTH_JWT_SECRET=your-secret-key-here
```

| Variable | Description | Par défaut |
|----------|-------------|------------|
| `AUTH_ENABLED` | Activer l'authentification | `false` |
| `AUTH_USERS` | Comptes utilisateurs (format : user1:pass1,user2:pass2) | Aucun |
| `AUTH_TOKEN_EXPIRY` | Expiration du token (heures) | `24` |
| `AUTH_JWT_SECRET` | Clé de signature JWT | Auto-générée |

### Configuration du proxy (optionnel)

Pour utiliser un proxy pour accéder à Telegram, décommenter la variable d'environnement suivante :

```yaml
environment:
  - PROXY=socks5://proxy:7897
```

## 📁 Structure du projet

```
.
├── docker-compose.yml          # Configuration Docker Compose
├── README.md                   # Documentation du projet
├── backend/
│   └── limitless_search/       # Service backend
│       ├── Dockerfile
│       ├── main.go
│       ├── api/                # Gestionnaires API
│       ├── config/             # Gestion de configuration
│       ├── model/              # Modèles de données
│       ├── plugin/             # Plugins de recherche
│       └── docs/               # Documentation
└── web/
    └── limitless_search_web/   # Frontend web
        ├── Dockerfile
        ├── .env.example        # Exemple d'environnement pour le dev local
        └── src/                # Code source
```

## 🌐 Types de stockage cloud pris en charge

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
- Liens Magnet (`magnet`)
- Liens ED2K (`ed2k`)

## 📖 Documentation API

### Point de terminaison de recherche

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

### Vérification de santé

```bash
curl http://localhost:8888/api/health
```

## 🔧 FAQ

### 1. Comment ajouter de nouveaux canaux TG ?

Modifier la variable d'environnement `CHANNELS` dans `docker-compose.yml`, ajouter de nouveaux noms de canaux (séparés par virgule), puis redémarrer le service :

```bash
docker-compose down
docker-compose up -d
```

### 2. Comment activer/désactiver les plugins ?

Modifier la variable d'environnement `ENABLED_PLUGINS` dans `docker-compose.yml`, puis redémarrer le service.

### 3. Résultats de recherche vides ?

- Vérifier si la connexion réseau est normale
- Si vous êtes en Chine continentale, vous devrez peut-être configurer un proxy pour accéder à Telegram
- Vérifier si les noms des canaux TG sont corrects

### 4. Comment configurer le proxy ?

Décommenter la variable d'environnement `PROXY` dans `docker-compose.yml` et définir l'adresse du proxy :

```yaml
environment:
  - PROXY=socks5://your-proxy:port
```

## 📄 Licence

[![CC BY-NC 4.0](https://licensebuttons.net/l/by-nc/4.0/88x31.png)](https://creativecommons.org/licenses/by-nc/4.0/)

Ce projet est sous licence [CC BY-NC 4.0 (Attribution-Pas d'Utilisation Commerciale 4.0 International)](https://creativecommons.org/licenses/by-nc/4.0/deed.fr).

Vous êtes libre de :
- **Partager** — copier et redistribuer le matériel sous n'importe quel format
- **Adapter** — remixer, transformer et créer à partir du matériel

Selon les conditions suivantes :
- **Attribution** — Vous devez créditer l'œuvre, fournir un lien vers la licence et indiquer si des modifications ont été effectuées
- **Pas d'Utilisation Commerciale** — Vous ne pouvez pas utiliser le matériel à des fins commerciales

## 🔗 Liens connexes

- [Documentation Backend](backend/limitless_search/docs/README.md)
- [Guide de développement de plugins](backend/limitless_search/docs/插件开发指南.md)
- [Document de conception système](backend/limitless_search/docs/系统开发设计文档.md)

---

Backend basé sur le projet [PanSou](https://github.com/fish2018/pansou) pour la partie limitless-search-backend. Open source sous licence MIT.
Frontend limitless-search-web : Maishan Inc. et l'organisation Freeanime.org détiennent tous les droits d'auteur du frontend limitless-search-web. L'utilisation commerciale est interdite sans autorisation.
