"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Sparkles, Trophy, CalendarDays, Flame, Tv, PlaySquare } from "lucide-react";
import type { RankingDataset, RankingKey, RankingLocale } from "@/lib/rankings";
import { useLanguage } from "@/lib/i18n";

type RankingsClientProps = {
  dataset: RankingDataset;
};

const copy = {
  zh: {
    pageTitle: "AI 动漫排行榜",
    pageDesc: "基于 AI 自动整理的年度预告、当月新番与当日热榜，点击即可回到首页并填好搜索词。",
    yearly: (year: number) => `${year} 年预告热榜`,
    monthly: (month: number) => `${month} 月新番`,
    daily: "当日热榜",
    bili: "BiliBili 排行",
    biliRank: "BiliBili 排行",
    biliHot: "番剧热播榜",
    biliSchedule: "新番时间表",
    name: "名称",
    score: "评分",
    rank: "排名",
    expand: "展开更多",
    collapse: "收起",
    empty: "暂时还没有排行榜数据",
  },
  "zh-TW": {
    pageTitle: "AI 動漫排行榜",
    pageDesc: "由 AI 自動整理的年度預告、當月新番與當日熱榜，點擊即可回到首頁並帶入搜尋詞。",
    yearly: (year: number) => `${year} 年預告熱榜`,
    monthly: (month: number) => `${month} 月新番`,
    daily: "當日熱榜",
    bili: "BiliBili 排行",
    biliRank: "BiliBili 排行",
    biliHot: "番劇熱播榜",
    biliSchedule: "新番時間表",
    name: "名稱",
    score: "評分",
    rank: "排名",
    expand: "展開更多",
    collapse: "收起",
    empty: "暫時沒有排行榜資料",
  },
  en: {
    pageTitle: "AI Anime Rankings",
    pageDesc: "AI-curated upcoming, monthly seasonal, and daily hot anime charts. Click any title to return home with the query prefilled.",
    yearly: (year: number) => `${year} Upcoming`,
    monthly: (month: number) => `${month} Seasonal`,
    daily: "Daily Hot",
    bili: "BiliBili Rank",
    biliRank: "BiliBili Rank",
    biliHot: "Anime Hot Rank",
    biliSchedule: "Anime Schedule",
    name: "Title",
    score: "Score",
    rank: "Rank",
    expand: "Show More",
    collapse: "Show Less",
    empty: "No ranking data yet",
  },
  ja: {
    pageTitle: "AI アニメランキング",
    pageDesc: "AI が自動整理した年間注目作、今月新番、当日人気作。クリックするとトップに戻り検索語を自動入力します。",
    yearly: (year: number) => `${year} 年注目作`,
    monthly: (month: number) => `${month} 月新番`,
    daily: "本日の人気",
    bili: "BiliBili ランキング",
    biliRank: "BiliBili ランキング",
    biliHot: "配信人気",
    biliSchedule: "新番スケジュール",
    name: "作品名",
    score: "スコア",
    rank: "順位",
    expand: "もっと見る",
    collapse: "閉じる",
    empty: "ランキングデータはまだありません",
  },
  ru: {
    pageTitle: "AI Рейтинг Аниме",
    pageDesc: "Автоматические подборки AI: ожидаемые релизы года, новинки месяца и дневной топ. По клику откроется главная страница с готовым запросом.",
    yearly: (year: number) => `${year} Ожидаемые`,
    monthly: (month: number) => `${month} Новинки`,
    daily: "Топ дня",
    bili: "Рейтинг BiliBili",
    biliRank: "Рейтинг BiliBili",
    biliHot: "Топ тайтлов",
    biliSchedule: "Расписание новинок",
    name: "Название",
    score: "Оценка",
    rank: "Ранг",
    expand: "Показать еще",
    collapse: "Свернуть",
    empty: "Данные рейтинга пока недоступны",
  },
  fr: {
    pageTitle: "Classements Anime IA",
    pageDesc: "Classements IA des sorties attendues, des nouveautés du mois et des tendances du jour. Cliquez pour revenir a l'accueil avec la recherche pre-remplie.",
    yearly: (year: number) => `${year} A venir`,
    monthly: (month: number) => `${month} Nouveautes`,
    daily: "Tendance du jour",
    bili: "Classement BiliBili",
    biliRank: "Classement BiliBili",
    biliHot: "Top anime",
    biliSchedule: "Calendrier anime",
    name: "Titre",
    score: "Score",
    rank: "Rang",
    expand: "Afficher plus",
    collapse: "Reduire",
    empty: "Pas encore de donnees de classement",
  },
} as const;

const icons = {
  yearly: Trophy,
  monthly: CalendarDays,
  daily: Flame,
  bili_rank: Tv,
  bili_hot: PlaySquare,
  bili_schedule: Tv,
};

export function RankingsClient({ dataset }: RankingsClientProps) {
  const { language } = useLanguage();
  const lang = (language === "zh" ? "zh" : language) as keyof typeof copy;
  const ui = copy[lang];
  const titleLocale: RankingLocale = language === "zh" ? "zh-CN" : language;
  const [activeKey, setActiveKey] = useState<RankingKey>("yearly");
  const [biliMenuOpen, setBiliMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<RankingKey, boolean>>({
    yearly: false,
    monthly: false,
    daily: false,
    bili_rank: false,
    bili_hot: false,
    bili_schedule: false,
  });

  const tabs = useMemo(
    () => [
      { key: "yearly" as const, label: ui.yearly(dataset.year) },
      { key: "monthly" as const, label: ui.monthly(dataset.month) },
      { key: "daily" as const, label: ui.daily },
    ],
    [dataset.month, dataset.year, ui],
  );

  const biliTabs = useMemo(
    () => [
      { key: "bili_hot" as const, label: ui.biliHot },
      { key: "bili_schedule" as const, label: ui.biliSchedule },
    ],
    [ui],
  );

  const bucket = dataset.rankings[activeKey];
  const isBiliRanking = activeKey === "bili_rank" || activeKey === "bili_hot" || activeKey === "bili_schedule";
  const visibleItems = expanded[activeKey] ? bucket.items : bucket.items.slice(0, 10);

  return (
    <section className="container mx-auto px-4 pt-28 pb-20">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 px-4 py-1.5 text-xs uppercase tracking-[0.24em] text-neutral-500">
            <Sparkles className="w-4 h-4" />
            AI Ranking
          </div>
          <h1 className="mt-5 text-4xl md:text-5xl font-black tracking-tight text-neutral-900 dark:text-white">
            {ui.pageTitle}
          </h1>
          <p className="mt-4 text-base md:text-lg text-neutral-600 dark:text-neutral-300 max-w-3xl mx-auto leading-relaxed">
            {ui.pageDesc}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
          {tabs.map((tab) => {
            const Icon = icons[tab.key];
            const active = tab.key === activeKey;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveKey(tab.key)}
                className={`relative inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-all ${
                  active
                    ? "bg-black text-white dark:bg-white dark:text-black shadow-lg"
                    : "bg-white/80 dark:bg-neutral-900/70 text-neutral-700 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}

          <div className="relative">
            <div className="inline-flex items-center rounded-full border border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/70 overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  setActiveKey("bili_rank");
                  setBiliMenuOpen(false);
                }}
                className={`inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors ${
                  activeKey === "bili_rank" || activeKey === "bili_hot" || activeKey === "bili_schedule"
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "text-neutral-700 dark:text-neutral-200"
                }`}
              >
                <Tv className="w-4 h-4" />
                <span>{ui.bili}</span>
              </button>
              <button
                type="button"
                onClick={() => setBiliMenuOpen((value) => !value)}
                className="px-3 py-3 text-neutral-700 dark:text-neutral-200 border-l border-neutral-200 dark:border-neutral-800"
                aria-label="Toggle BiliBili ranking menu"
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${biliMenuOpen ? "rotate-180" : ""}`} />
              </button>
            </div>

            <AnimatePresence>
              {biliMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute left-1/2 -translate-x-1/2 mt-2 w-52 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl overflow-hidden z-20"
                >
                  {biliTabs.map((tab) => {
                    const active = tab.key === activeKey;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => {
                          setActiveKey(tab.key);
                          setBiliMenuOpen(false);
                        }}
                        className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                          active
                            ? "bg-black text-white dark:bg-white dark:text-black"
                            : "text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeKey}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22 }}
            className="rounded-[28px] border border-neutral-200 dark:border-neutral-800 bg-white/85 dark:bg-neutral-900/75 backdrop-blur-xl shadow-xl overflow-hidden"
          >
            <div className="grid grid-cols-[1fr_auto] gap-4 px-6 py-4 text-xs uppercase tracking-[0.22em] text-neutral-500 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-950/40">
              <span>{ui.name}</span>
              <span>{isBiliRanking ? ui.rank : ui.score}</span>
            </div>

            {visibleItems.length === 0 ? (
              <div className="px-6 py-12 text-center text-neutral-500">{ui.empty}</div>
            ) : (
              <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {visibleItems.map((item, index) => {
                  const localizedQuery = (item.titles[titleLocale] || item.query).trim();

                  return (
                  <Link
                    key={`${item.id}-${index}`}
                    href={`/?q=${encodeURIComponent(localizedQuery)}`}
                    className="grid grid-cols-[1fr_auto] gap-4 px-6 py-4 hover:bg-neutral-50 dark:hover:bg-neutral-950/30 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-sm text-neutral-500 mb-1">#{index + 1}</div>
                      <div className="text-base md:text-lg font-semibold text-neutral-900 dark:text-white truncate">
                        {localizedQuery}
                      </div>
                    </div>
                    <div className="self-center text-lg font-black text-neutral-900 dark:text-white">
                      {isBiliRanking ? index + 1 : item.score.toFixed(1)}
                    </div>
                  </Link>
                  );
                })}
              </div>
            )}

            {bucket.items.length > 10 && (
              <div className="px-6 py-5 border-t border-neutral-200 dark:border-neutral-800 flex justify-center">
                <button
                  type="button"
                  onClick={() =>
                    setExpanded((prev) => ({
                      ...prev,
                      [activeKey]: !prev[activeKey],
                    }))
                  }
                  className="inline-flex items-center gap-2 rounded-full border border-neutral-200 dark:border-neutral-800 px-5 py-2.5 text-sm font-semibold text-neutral-700 dark:text-neutral-200 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
                >
                  {expanded[activeKey] ? ui.collapse : ui.expand}
                  <ChevronDown className={`w-4 h-4 transition-transform ${expanded[activeKey] ? "rotate-180" : ""}`} />
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
