"use client";

import Link from "next/link";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

const copy = {
  zh: {
    title: "排行榜暂不可用",
    desc: "当前没有可展示的排行榜最新数据，或排行榜功能已关闭。",
    hint: "如果 AI 连接失败，系统会自动重试 3 次；仍失败时会显示这个提示。",
    back: "返回首页",
  },
  "zh-TW": {
    title: "排行榜暫不可用",
    desc: "目前沒有可顯示的排行榜最新資料，或排行榜功能已關閉。",
    hint: "如果 AI 連線失敗，系統會自動重試 3 次；仍失敗時會顯示這個提示。",
    back: "返回首頁",
  },
  en: {
    title: "Rankings Unavailable",
    desc: "No latest ranking data is available right now, or the rankings feature is disabled.",
    hint: "If the AI connection fails, the system retries 3 times before showing this fallback.",
    back: "Back Home",
  },
  ja: {
    title: "ランキングは利用できません",
    desc: "最新のランキングデータがまだないか、ランキング機能が無効です。",
    hint: "AI 接続に失敗した場合は 3 回まで自動再試行し、それでも失敗したときにこの案内を表示します。",
    back: "ホームへ戻る",
  },
  ru: {
    title: "Рейтинг недоступен",
    desc: "Сейчас нет свежих данных рейтинга или функция рейтингов отключена.",
    hint: "Если AI недоступен, система автоматически повторит попытку 3 раза, а затем покажет это сообщение.",
    back: "На главную",
  },
  fr: {
    title: "Classement indisponible",
    desc: "Aucune donnee recente n'est disponible pour le moment, ou la fonction de classement est desactivee.",
    hint: "En cas d'echec de connexion a l'IA, le systeme reessaie 3 fois avant d'afficher cet ecran.",
    back: "Retour a l'accueil",
  },
} as const;

export function RankingsUnavailable() {
  const { language } = useLanguage();
  const lang = (language === "zh" ? "zh" : language) as keyof typeof copy;
  const t = copy[lang];

  return (
    <section className="container mx-auto px-4 pt-28 pb-20">
      <div className="max-w-3xl mx-auto rounded-[28px] border border-neutral-200 dark:border-neutral-800 bg-white/85 dark:bg-neutral-900/75 backdrop-blur-xl shadow-xl p-8 md:p-12 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-neutral-900 dark:text-white">
          {t.title}
        </h1>
        <p className="mt-4 text-base md:text-lg text-neutral-600 dark:text-neutral-300 leading-relaxed">
          {t.desc}
        </p>
        <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4" />
          {t.hint}
        </p>
        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black px-6 py-3 text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            {t.back}
          </Link>
        </div>
      </div>
    </section>
  );
}
