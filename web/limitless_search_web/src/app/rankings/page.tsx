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
      description: "查看 AI 自动整理的年度预告、当月新番、当日热榜与 BiliBili 排行榜，点击任意作品即可回到首页并填入搜索词。",
    },
    "zh-TW": {
      title: "AI 動漫排行榜 | Limitless Search",
      description: "查看 AI 自動整理的年度預告、當月新番、當日熱榜與 BiliBili 排行榜，點擊作品即可返回首頁並帶入搜尋詞。",
    },
    en: {
      title: "AI Anime Rankings | Limitless Search",
      description: "Browse AI-generated upcoming, monthly seasonal, daily hot, and BiliBili anime rankings. Open any title and jump back to the homepage with the search prefilled.",
    },
    ja: {
      title: "AI アニメランキング | Limitless Search",
      description: "AI が自動整理した年間注目作、今月新番、当日人気、BiliBiliランキングを表示。作品を開くとトップに戻って検索語を入力できます。",
    },
    ru: {
      title: "AI Рейтинг Аниме | Limitless Search",
      description: "Смотрите подборки AI: ожидаемые релизы года, новинки месяца, хиты дня и рейтинг BiliBili. По клику запрос откроется на главной странице.",
    },
    fr: {
      title: "Classements Anime IA | Limitless Search",
      description: "Consultez les classements IA: sorties attendues, nouveautes du mois, tendances du jour et classement BiliBili. Chaque titre renvoie vers l'accueil avec recherche pre-remplie.",
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
