FROM node:20-alpine AS web-deps
WORKDIR /web
COPY web/limitless_search_web/package.json web/limitless_search_web/package-lock.json ./
RUN npm ci

FROM node:20-alpine AS web-builder
WORKDIR /web
COPY --from=web-deps /web/node_modules ./node_modules
COPY web/limitless_search_web/ ./

ARG NEXT_PUBLIC_API_BASE=http://127.0.0.1:8888
ARG NEXT_PUBLIC_CAPTCHA_PROVIDER=none
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY=
ARG NEXT_PUBLIC_HCAPTCHA_SITE_KEY=
ARG NEXT_PUBLIC_AI_SUGGEST_ENABLED=true
ARG NEXT_PUBLIC_AI_SUGGEST_THRESHOLD=50
ARG NEXT_PUBLIC_AI_SUGGEST_REQUIRE_CAPTCHA=false
ARG NEXT_PUBLIC_AI_RANKINGS_ENABLED=false

ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE
ENV NEXT_PUBLIC_CAPTCHA_PROVIDER=$NEXT_PUBLIC_CAPTCHA_PROVIDER
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_PUBLIC_HCAPTCHA_SITE_KEY=$NEXT_PUBLIC_HCAPTCHA_SITE_KEY
ENV NEXT_PUBLIC_AI_SUGGEST_ENABLED=$NEXT_PUBLIC_AI_SUGGEST_ENABLED
ENV NEXT_PUBLIC_AI_SUGGEST_THRESHOLD=$NEXT_PUBLIC_AI_SUGGEST_THRESHOLD
ENV NEXT_PUBLIC_AI_SUGGEST_REQUIRE_CAPTCHA=$NEXT_PUBLIC_AI_SUGGEST_REQUIRE_CAPTCHA
ENV NEXT_PUBLIC_AI_RANKINGS_ENABLED=$NEXT_PUBLIC_AI_RANKINGS_ENABLED
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

FROM --platform=$BUILDPLATFORM golang:1.24-alpine AS backend-builder
RUN apk add --no-cache git ca-certificates tzdata
WORKDIR /backend
COPY backend/limitless_search/go.mod backend/limitless_search/go.sum ./
RUN go mod download
COPY backend/limitless_search/ ./

ARG VERSION=dev
ARG BUILD_DATE=unknown
ARG VCS_REF=unknown
ARG TARGETARCH

RUN CGO_ENABLED=0 GOOS=linux GOARCH=${TARGETARCH} go build -ldflags="-s -w -extldflags '-static'" -o /out/pansou .

FROM node:20-alpine AS runner
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app

RUN mkdir -p /app/cache /app/data/rankings /app/data/admin /app/web/.next

COPY --from=backend-builder /out/pansou /app/pansou
COPY --from=web-builder /web/public /app/web/public
COPY --from=web-builder /web/.next/standalone /app/web
COPY --from=web-builder /web/.next/static /app/web/.next/static
COPY --from=web-builder /web/bootstrap.js /app/web/bootstrap.js
COPY docker/start.sh /app/start.sh

RUN chmod +x /app/pansou /app/start.sh

ENV CACHE_PATH=/app/cache \
    CACHE_ENABLED=true \
    TZ=Asia/Shanghai \
    PORT=8888 \
    WEB_PORT=3200 \
    HOSTNAME=0.0.0.0 \
    NEXT_PUBLIC_API_BASE=http://127.0.0.1:8888 \
    NEXT_TELEMETRY_DISABLED=1 \
    AI_RANKINGS_DATA_DIR=/app/data/rankings \
    ADMIN_DATA_DIR=/app/data/admin \
    ASYNC_PLUGIN_ENABLED=true \
    ASYNC_RESPONSE_TIMEOUT=4 \
    ASYNC_MAX_BACKGROUND_WORKERS=20 \
    ASYNC_MAX_BACKGROUND_TASKS=100 \
    ASYNC_CACHE_TTL_HOURS=1 \
    CHANNELS=tgsearchers4,Aliyun_4K_Movies,bdbdndn11,yunpanx,bsbdbfjfjff,yp123pan,sbsbsnsqq,yunpanxunlei,tianyifc,BaiduCloudDisk,txtyzy,peccxinpd,gotopan,PanjClub,kkxlzy,baicaoZY,MCPH01,MCPH02,MCPH03,bdwpzhpd,ysxb48,jdjdn1111,yggpan,MCPH086,zaihuayun,Q66Share,ucwpzy,shareAliyun,alyp_1,dianyingshare,Quark_Movies,XiangxiuNBB,ydypzyfx,ucquark,xx123pan,yingshifenxiang123,zyfb123,tyypzhpd,tianyirigeng,cloudtianyi,hdhhd21,Lsp115,oneonefivewpfx,qixingzhenren,taoxgzy,Channel_Shares_115,tyysypzypd,vip115hot,wp123zy,yunpan139,yunpan189,yunpanuc,yydf_hzl,leoziyuan,pikpakpan,Q_dongman,yoyokuakeduanju,TG654TG,WFYSFX02,QukanMovie,yeqingjie_GJG666,movielover8888_film3,Baidu_netdisk,D_wusun,FLMdongtianfudi,KaiPanshare,QQZYDAPP,rjyxfx,PikPak_Share_Channel,btzhi,newproductsourcing,cctv1211,duan_ju,QuarkFree,yunpanNB,kkdj001,xxzlzn,pxyunpanxunlei,jxwpzy,kuakedongman,liangxingzhinan,xiangnikanj,solidsexydoll,guoman4K,zdqxm,kduanju,cilidianying,CBduanju,SharePanFilms,dzsgx,BooksRealm,Oscar_4Kmovies,douerpan,baidu_yppan,Q_jilupian,Netdisk_Movies,yunpanquark,ammmziyuan,ciliziyuanku,cili8888,jzmm_123pan \
    ENABLED_PLUGINS=labi,zhizhen,shandian,duoduo,muou,wanou,hunhepan,jikepan,panwiki,pansearch,panta,qupansou,hdr4k,pan666,susu,thepiratebay,xuexizhinan,panyq,ouge,huban,cyg,erxiao,miaoso,fox4k,pianku,clmao,wuji,cldi,xiaozhang,libvio,leijing,xb6v,xys,ddys,hdmoli,yuhuage,u3c3,javdb,clxiong,jutoushe,sdso,xiaoji,xdyh,haisou,bixin,djgou,nyaa,xinjuc,aikanzy,qupanshe,xdpan,discourse,yunsou,qqpd,ahhhhfs,nsgame,gying,quark4k,quarksoo,sousou,ash \
    AUTH_ENABLED=false \
    AUTH_TOKEN_EXPIRY=24

ARG VERSION=dev
ARG BUILD_DATE=unknown
ARG VCS_REF=unknown

LABEL org.opencontainers.image.title="Limitless Search" \
      org.opencontainers.image.description="Limitless Search full-stack image" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.url="https://github.com/fish2018/pansou" \
      org.opencontainers.image.source="https://github.com/fish2018/pansou" \
      maintainer="fish2018"

EXPOSE 3200 8888

CMD ["/app/start.sh"]
