import type { Metadata } from "next";
import { headers } from "next/headers";
import { Footer } from "@/components/footer";
import { LanguageInitializer } from "@/components/language-initializer";
import { Navbar } from "@/components/navbar";
import { RankingsClient } from "@/components/rankings-client";
import { RankingsUnavailable } from "@/components/rankings-unavailable";
import { detectPreferredLanguage, normalizeLanguage } from "@/lib/i18n";
import { ensureRankingDataset } from "@/lib/rankings";
import { rankingsEnabled, rankingsNavEnabled } from "@/lib/rankings-config";

export const dynamic = "force-dynamic";

const siteUrl = "https://search.freeanime.org";

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: Promise<{ lang?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const requestHeaders = await headers();
  const initialLanguage = params?.lang
    ? normalizeLanguage(params.lang)
    : detectPreferredLanguage(requestHeaders.get("accept-language"));

  const metadataByLang = {
    zh: {
      title: "AI 动漫排行榜 | Limitless Search",
      description: "查看 AI 自动整理的年度预告、当月新番与当日热榜动漫排行榜，点击任意作品即可一键回到首页并搜索。",
    },
    "zh-TW": {
      title: "AI 動漫排行榜 | Limitless Search",
      description: "查看 AI 自動整理的年度預告、當月新番與當日熱榜動漫排行榜，點擊作品即可一鍵返回首頁搜尋。",
    },
    en: {
      title: "AI Anime Rankings | Limitless Search",
      description: "Browse AI-generated upcoming, monthly seasonal, and daily hot anime rankings. Open any title and jump back to the homepage with the search prefilled.",
    },
    ja: {
      title: "AI アニメランキング | Limitless Search",
      description: "AI が自動整理した年間注目作、今月新番、当日人気アニメを一覧表示。作品を開くとトップに戻ってそのまま検索できます。",
    },
    ru: {
      title: "AI Рейтинг Аниме | Limitless Search",
      description: "Смотрите AI-подборки ожидаемых релизов года, новинок месяца и хитов дня. По клику запрос сразу откроется на главной странице.",
    },
    fr: {
      title: "Classements Anime IA | Limitless Search",
      description: "Consultez les classements IA des anime attendus, des nouveautes du mois et des tendances du jour. Chaque titre renvoie vers l'accueil avec la recherche pre-remplie.",
    },
  } as const;

  const locale = (initialLanguage === "zh" ? "zh" : initialLanguage) as keyof typeof metadataByLang;
  const meta = metadataByLang[locale];

  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: "/rankings",
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `${siteUrl}/rankings`,
      siteName: "Limitless Search",
      type: "website",
    },
    twitter: {
      card: "summary",
      title: meta.title,
      description: meta.description,
    },
  };
}

export default async function RankingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ lang?: string }>;
}) {
  const params = await searchParams;
  const requestHeaders = await headers();
  const initialLanguage = params?.lang
    ? normalizeLanguage(params.lang)
    : detectPreferredLanguage(requestHeaders.get("accept-language"));
  const enabled = rankingsEnabled();
  const showRankings = rankingsNavEnabled();
  const dataset = enabled ? await ensureRankingDataset() : null;

  return (
    <>
      <LanguageInitializer initialLanguage={initialLanguage} />
      <Navbar showRankings={showRankings} />
      {enabled && dataset ? <RankingsClient dataset={dataset} /> : <RankingsUnavailable />}
      <Footer />
    </>
  );
}
