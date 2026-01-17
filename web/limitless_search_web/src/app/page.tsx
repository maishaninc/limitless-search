import type { Metadata } from "next";
import HomeClient from "@/components/home-client";

export const dynamic = "force-dynamic";

const siteUrl = "https://search.freeanime.org";

type LangConfig = {
  title: string;
  description: string;
  keywords: string[];
  ogLocale: string;
};

const langMap: Record<string, LangConfig> = {
  "zh-CN": {
    title: "Limitless Search | 无限搜索",
    description: "免费搜索动漫与网盘资源，无需登录，快速聚合多平台结果。",
    keywords: ["免费搜索动漫", "搜索动漫", "免费动漫", "无需登录", "网盘搜索", "动漫搜索"],
    ogLocale: "zh_CN",
  },
  "zh-TW": {
    title: "Limitless Search | 無限搜尋",
    description: "免費搜尋動漫與網盤資源，無需登入，快速聚合多平台結果。",
    keywords: ["免費搜尋動漫", "搜尋動漫", "免費動漫", "無需登入", "網盤搜尋", "動漫搜尋"],
    ogLocale: "zh_TW",
  },
  en: {
    title: "Limitless Search | Anime Search",
    description: "Free anime and netdisk search with no login required, fast multi-source results.",
    keywords: ["anime search", "free anime", "no login", "netdisk search", "anime resources"],
    ogLocale: "en_US",
  },
  ja: {
    title: "Limitless Search | アニメ検索",
    description: "無料でアニメとクラウド資源を検索、ログイン不要、複数ソースを高速統合。",
    keywords: ["アニメ検索", "無料アニメ", "ログイン不要", "クラウド検索"],
    ogLocale: "ja_JP",
  },
  ru: {
    title: "Limitless Search | Поиск аниме",
    description: "Бесплатный поиск аниме и облачных ресурсов без входа, быстрые результаты.",
    keywords: ["поиск аниме", "бесплатное аниме", "без входа", "поиск облака"],
    ogLocale: "ru_RU",
  },
  fr: {
    title: "Limitless Search | Recherche Anime",
    description: "Recherche gratuite d'anime et de ressources cloud sans connexion, résultats rapides.",
    keywords: ["recherche anime", "anime gratuit", "sans connexion", "recherche cloud"],
    ogLocale: "fr_FR",
  },
};

const resolveLang = (value?: string) => {
  if (!value) return "zh-CN";
  const normalized = value.toLowerCase();
  if (normalized === "zh" || normalized === "zh-cn" || normalized === "zh_cn") return "zh-CN";
  if (normalized === "zh-tw" || normalized === "zh_tw") return "zh-TW";
  if (normalized === "en") return "en";
  if (normalized === "ja" || normalized === "jp") return "ja";
  if (normalized === "ru") return "ru";
  if (normalized === "fr") return "fr";
  return "zh-CN";
};

export function generateMetadata({
  searchParams,
}: {
  searchParams?: { lang?: string };
}): Metadata {
  const lang = resolveLang(searchParams?.lang);
  const config = langMap[lang];
  const langParam = `?lang=${encodeURIComponent(lang)}`;

  return {
    title: config.title,
    description: config.description,
    keywords: config.keywords,
    alternates: {
      canonical: `/${langParam}`,
      languages: {
        "zh-CN": `/?lang=zh-CN`,
        "zh-TW": `/?lang=zh-TW`,
        en: `/?lang=en`,
        ja: `/?lang=ja`,
        ru: `/?lang=ru`,
        fr: `/?lang=fr`,
      },
    },
    openGraph: {
      title: config.title,
      description: config.description,
      url: `${siteUrl}/${langParam}`,
      siteName: "Limitless Search",
      locale: config.ogLocale,
      alternateLocale: ["zh_CN", "zh_TW", "en_US", "ja_JP", "ru_RU", "fr_FR"].filter(
        (locale) => locale !== config.ogLocale,
      ),
      type: "website",
    },
    twitter: {
      card: "summary",
      title: config.title,
      description: config.description,
    },
  };
}

export default function Page() {
  return (
    <HomeClient />
  );
}
