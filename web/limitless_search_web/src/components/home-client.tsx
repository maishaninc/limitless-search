"use client";

import React, { useState, useRef } from "react";
import { Search, ExternalLink, Lock, AlertCircle, Loader2, Clock, FileText, CheckCircle2, Filter, HardDrive, Magnet, Link as LinkIcon, X, ChevronLeft, ChevronRight, ChevronDown, Github } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { About } from "@/components/about";
import { Footer } from "@/components/footer";
import { useLanguage } from "@/lib/i18n";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: Record<string, unknown>) => void;
    };
    hcaptcha?: {
      render: (el: HTMLElement, options: Record<string, unknown>) => void;
    };
  }
}

// --- Types ---

type Link = {
  type?: string;
  url?: string;
  password?: string;
  note?: string;
};

type SearchResult = {
  title: string;
  content?: string;
  links: Link[];
  channel?: string;
  datetime?: string;
  source?: string;
};

type BackendResult = {
  title?: string;
  content?: string;
  links?: Link[];
  channel?: string;
  datetime?: string;
  source?: string;
};

type MergedEntry = {
  url?: string;
  password?: string;
  note?: string;
  datetime?: string;
  source?: string;
};

type SearchResponse = {
  total?: number;
  results?: BackendResult[];
  merged_by_type?: Record<string, MergedEntry[]>;
};

type ApiEnvelope = {
  code?: number;
  message?: string;
  data?: SearchResponse;
};

type ParsedEnvelope = {
  code?: number;
  message?: string;
  data?: SearchResponse | { data?: SearchResponse; code?: number; message?: string };
  results?: BackendResult[];
  merged_by_type?: Record<string, MergedEntry[]>;
  total?: number;
};

const extractSearchData = (raw: unknown): { data: SearchResponse; code?: number; message?: string } => {
  const candidate = raw as ParsedEnvelope;
  const nested = candidate?.data as ParsedEnvelope | SearchResponse | undefined;

  const code =
    typeof candidate?.code === "number"
      ? candidate.code
      : typeof (nested as ParsedEnvelope)?.code === "number"
        ? (nested as ParsedEnvelope).code
        : undefined;

  const message =
    typeof candidate?.message === "string"
      ? candidate.message
      : typeof (nested as ParsedEnvelope)?.message === "string"
        ? (nested as ParsedEnvelope).message
        : undefined;

  const isSearchResponse = (entry: unknown): entry is SearchResponse => {
    if (!entry || typeof entry !== "object") return false;
    const obj = entry as SearchResponse;
    return Array.isArray(obj.results) || !!obj.merged_by_type || typeof obj.total === "number";
  };

  const candidateData = nested;
  const deepData =
    candidateData && typeof candidateData === "object" && "data" in candidateData
      ? (candidateData as ParsedEnvelope).data
      : undefined;

  const possible: SearchResponse[] = [deepData, candidateData as SearchResponse | undefined, candidate as SearchResponse].filter(isSearchResponse);

  for (const entry of possible) {
    if (entry && (Array.isArray(entry.results) || entry.merged_by_type || typeof entry.total === "number")) {
      return { data: entry, code, message };
    }
  }

  // Fallback to empty structure
  return { data: { results: [], merged_by_type: {}, total: 0 }, code, message };
};

type SearchStats = {
  total: number;
  sources: number;
  latencyMs: number;
  clientIp?: string;
  country?: string;
};

type ClientInfo = {
  ip: string;
  country: string;
};

type CaptchaProvider = "turnstile" | "hcaptcha" | "none";

// --- Helper Functions ---

const formatDate = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
};

function normalizeResults(data: SearchResponse): SearchResult[] {
  const items: SearchResult[] = [];

  if (Array.isArray(data?.results)) {
    for (const entry of data.results) {
      items.push({
        title:
          entry?.title ||
          entry?.content?.slice?.(0, 80) ||
          entry?.links?.[0]?.url ||
          "Untitled",
        content: entry?.content,
        links: Array.isArray(entry?.links) ? entry.links : [],
        channel: entry?.channel,
        datetime: entry?.datetime,
        source: entry?.source,
      });
    }
  }

  if (data?.merged_by_type && typeof data.merged_by_type === "object") {
    Object.entries(data.merged_by_type).forEach(
      ([type, entries]: [string, MergedEntry[]]) => {
        if (!Array.isArray(entries)) return;
        entries.forEach((entry) => {
          items.push({
            title: entry?.note || entry?.url || type,
            content: entry?.note || entry?.url,
            links: [
              {
                type,
                url: entry?.url,
                password: entry?.password,
                note: entry?.note,
              },
            ],
            channel: entry?.source,
            datetime: entry?.datetime,
            source: entry?.source,
          });
        });
      },
    );
  }

  const unique = new Map<string, SearchResult>();
  items.forEach((item) => {
    const key = `${item.title}-${item.links[0]?.url ?? ""}`;
    if (!unique.has(key)) {
      unique.set(key, item);
    }
  });

  return Array.from(unique.values());
}

// --- Main Component ---

type ErrorModalState = {
  translation: string;
  details?: string;
};

type AiSuggestion = {
  best_query?: string;
  alternates?: string[];
  reason?: string;
  original_language?: string;
  raw?: unknown;
};

export default function HomeClient() {
  const { t, language } = useLanguage();
  
  const CAPTCHA_PROVIDER = (process.env.NEXT_PUBLIC_CAPTCHA_PROVIDER || "none").toLowerCase() as CaptchaProvider;
  const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
  const HCAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || "";
  const AI_ENABLED = (process.env.NEXT_PUBLIC_AI_SUGGEST_ENABLED ?? "true").toLowerCase() !== "false";
  const AI_THRESHOLD = Number(process.env.NEXT_PUBLIC_AI_SUGGEST_THRESHOLD ?? 50) || 50;
  const AI_REQUIRE_CAPTCHA = (process.env.NEXT_PUBLIC_AI_SUGGEST_REQUIRE_CAPTCHA ?? "false").toLowerCase() === "true";
  
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [selectedDrive, setSelectedDrive] = useState<string>("all");
  const [hasSearched, setHasSearched] = useState(false);
  const [starProgress, setStarProgress] = useState(0);
  const [starCollapsed, setStarCollapsed] = useState(false);
  const [starRunId, setStarRunId] = useState(0);
  const [stats, setStats] = useState<SearchStats | null>(null);
  const [clientInfo, setClientInfo] = useState<ClientInfo>({ ip: "unknown", country: "unknown" });
  const [showCaptchaModal, setShowCaptchaModal] = useState(false);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const captchaContainerRef = useRef<HTMLDivElement | null>(null);
  const captchaTokenRef = useRef<string | null>(null);
  const [errorModal, setErrorModal] = useState<ErrorModalState | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<AiSuggestion | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiToastProgress, setAiToastProgress] = useState(0);
  const [aiToastCollapsed, setAiToastCollapsed] = useState(false);
  const [aiToastRunId, setAiToastRunId] = useState(0);
  const [skipAiNext, setSkipAiNext] = useState(false); // 一键替换后本次搜索不再触发 AI
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const FILTER_TAGS = [
    "1080p",
    "2160p",
    "4K",
    "HEVC",
    "x265",
    "AV1",
    "10bit",
    "HDR",
    "Dolby Vision",
    "AAC",
    "AACI",
  ];

  const showErrorModal = (translation: string, details?: string) => {
    setErrorModal({
      translation,
      details,
    });
  };

  const interpretErrorMessage = (message?: string) => {
    if (!message) return t.search.errors.generic;
    const normalized = message.toLowerCase();

    if (
      message.includes("验证服务未配置") ||
      normalized.includes("turnstile") ||
      normalized.includes("verification service")
    ) {
      return t.search.errors.verificationMissing;
    }

    if (
      normalized.includes("failed to fetch") ||
      normalized.includes("network") ||
      normalized.includes("timeout") ||
      normalized.includes("fetch")
    ) {
      return t.search.errors.backendUnavailable;
    }

    return t.search.errors.generic;
  };

  const performSearch = async (token?: string) => {
    const keyword = query.trim();
    if (!keyword) {
      showErrorModal(t.search.emptyQuery);
      return;
    }

    // 重置 AI 状态
    setAiError(null);
    setAiSuggestion(null);
    setShowAiModal(false);
 
    setLoading(true);
    setResults([]); // Clear previous results on new search
    setErrorModal(null);
    setHasSearched(true);
    setStarRunId((value) => value + 1);
 
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      
      const activeToken = token || captchaTokenRef.current;
      
      console.log("[Search] Config Provider:", CAPTCHA_PROVIDER);
      console.log("[Search] Active Token:", activeToken ? (activeToken.slice(0, 10) + "...") : "null");

      if (activeToken) {
        headers["x-captcha-token"] = activeToken;
        headers["x-captcha-provider"] = CAPTCHA_PROVIDER;
      }

      const payload: Record<string, unknown> = {
        kw: keyword,
        res: "merge",
        captchaToken: activeToken ?? undefined,
        captchaProvider: CAPTCHA_PROVIDER !== "none" ? CAPTCHA_PROVIDER : undefined,
      };

      const started = performance.now();

      const response = await fetch("/api/search", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        cache: "no-store",
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        let message = "";

        if (contentType?.includes("application/json")) {
          const body = await response.json();
          message = body?.message || JSON.stringify(body);
        } else {
          message = await response.text();
        }

        throw new Error(message || t.search.errorGeneric);
      }

      const parsed = (await response.json()) as ApiEnvelope | SearchResponse;
      const { data, code: respCode, message: respMessage } = extractSearchData(parsed);

      if (
        typeof respCode === "number" &&
        respCode !== 0 &&
        respCode !== 200
      ) {
        throw new Error(respMessage || t.search.errorGeneric);
      }

      const normalized = normalizeResults(data);
      setResults(normalized);
      const sources = Array.from(
        new Set(
          normalized
            .map((item) => item.channel || item.source)
            .filter(Boolean) as string[],
        ),
      );
      const latencyMs = performance.now() - started;
      const totalCount = typeof data?.total === "number" ? data.total : normalized.length;
      setStats({
        total: totalCount,
        sources: sources.length,
        latencyMs: Math.round(latencyMs),
        clientIp: clientInfo.ip || undefined,
        country: clientInfo.country || undefined,
      });

      if (skipAiNext) {
        setSkipAiNext(false);
      } else if (AI_ENABLED) {
        const disableAbove = 100;
        if (totalCount >= disableAbove) {
          setShowAiModal(false);
        } else {
          setShowAiModal(false);
          void requestAiSuggestion(totalCount);
        }
      }
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : "";
      const translated = interpretErrorMessage(rawMessage);
      showErrorModal(translated, rawMessage || undefined);
    } finally {
      setLoading(false);
    }
  };

  const requestAiSuggestion = async (currentCount: number) => {
    if (!AI_ENABLED) return;
    const activeToken = captchaTokenRef.current;
    if (AI_REQUIRE_CAPTCHA && !activeToken) {
      setAiError(t.search.suggest.captchaRequired);
      setShowAiModal(true);
      return;
    }

    setAiLoading(true);
    setAiError(null);
    try {
      const resp = await fetch("/api/ai-suggest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(activeToken
            ? { "x-captcha-token": activeToken, "x-captcha-provider": CAPTCHA_PROVIDER }
            : {}),
        },
        body: JSON.stringify({
          query: query.trim(),
          language,
          resultCount: currentCount,
          captchaToken: activeToken ?? undefined,
        }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || t.search.suggest.failed);
      }

      const json = (await resp.json()) as { suggestion?: AiSuggestion };
      setAiSuggestion(json?.suggestion || null);
      if (json?.suggestion) {
        setShowAiModal(true);
        setAiToastRunId((value) => value + 1);
      }
    } catch (err) {
      setShowAiModal(false);
      setAiError(err instanceof Error ? err.message : t.search.suggest.failed);
    } finally {
      setAiLoading(false);
    }
  };

  const applySuggestionToQuery = (value?: string) => {
    const next = value || aiSuggestion?.best_query || aiSuggestion?.alternates?.[0];
    if (!next) return;
    setQuery(next);
    setShowAiModal(false);
    setSkipAiNext(true);
  };

  const handleSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorModal(null);
    setShowCaptchaModal(false);

    const keyword = query.trim();
    if (!keyword) {
      showErrorModal(t.search.emptyQuery);
      return;
    }

    if (CAPTCHA_PROVIDER === "turnstile" && !TURNSTILE_SITE_KEY) {
      showErrorModal("未配置 Turnstile 站点密钥");
      return;
    }
    if (CAPTCHA_PROVIDER === "hcaptcha" && !HCAPTCHA_SITE_KEY) {
      showErrorModal("未配置 hCaptcha 站点密钥");
      return;
    }

    if (CAPTCHA_PROVIDER === "none") {
      performSearch();
    } else {
      captchaTokenRef.current = null;
      setCaptchaLoading(true);
      setShowCaptchaModal(true);
      setTimeout(renderCaptcha, 100);
    }
  };

  // Filter results based on selected source
  const normalizedDriveType = (value?: string) =>
    value?.toLowerCase().trim() ?? "";

  const filteredBySource =
    selectedSource === "all"
      ? results
      : results.filter((item) => (item.channel || item.source) === selectedSource);

  const filteredResults =
    selectedDrive === "all"
      ? filteredBySource
      : filteredBySource.filter((item) =>
          item.links.some(
            (link) => normalizedDriveType(link.type) === selectedDrive,
          ),
        );

  const filteredByTags = filteredResults.filter((item) => {
    if (selectedTags.length === 0) return true;
    const title = item.title.toLowerCase();
    return selectedTags.every((tag) => title.includes(tag.toLowerCase()));
  });

  // Get unique sources for filter dropdown
  const sources = Array.from(new Set(results.map(item => item.channel || item.source).filter(Boolean)));

  const driveLabels: Record<string, string> = {
    baidu: t.drives.baidu,
    aliyun: t.drives.aliyun,
    quark: t.drives.quark,
    tianyi: t.drives.tianyi,
    pikpak: t.drives.pikpak,
    "115": t.drives.pan115,
    pan115: t.drives.pan115,
    xunlei: t.drives.xunlei,
    uc: t.drives.uc,
    yidong: t.drives.yidong,
    "123": t.drives.pan123,
    magnet: t.drives.magnet,
    ed2k: t.drives.ed2k,
    google: t.drives.google,
    googledrive: t.drives.google,
  };

  const availableDriveTypes = Array.from(
    new Set(
      results
        .flatMap((item) => item.links.map((link) => normalizedDriveType(link.type)))
        .filter(Boolean),
    ),
  ).filter((type) => driveLabels[type]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [filteredResults.length, selectedSource, selectedDrive, selectedTags]);

  const totalPages = Math.max(1, Math.ceil(filteredByTags.length / pageSize));
  const paginatedResults = filteredByTags.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  React.useEffect(() => {
    const fetchClientInfo = async () => {
      try {
        const resp = await fetch("/api/client-info", { cache: "no-store" });
        if (resp.ok) {
          const data = (await resp.json()) as ClientInfo;
          setClientInfo(data);
        }
      } catch (err) {
        console.error("Failed to fetch client info", err);
      }
    };
    fetchClientInfo();
  }, []);

  React.useEffect(() => {
    if (!hasSearched) return;
    setStarCollapsed(false);
    setStarProgress(0);
    const durationMs = 10000;
    const start = performance.now();
    let rafId = 0;

    const tick = () => {
      const elapsed = performance.now() - start;
      const pct = Math.min(100, Math.round((elapsed / durationMs) * 100));
      setStarProgress(pct);
      if (elapsed < durationMs) {
        rafId = window.requestAnimationFrame(tick);
      } else {
        setStarCollapsed(true);
      }
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [starRunId, hasSearched]);

  React.useEffect(() => {
    if (!showAiModal || !aiSuggestion) return;
    setAiToastCollapsed(false);
    setAiToastProgress(0);
    const durationMs = 30000;
    const start = performance.now();
    let rafId = 0;

    const tick = () => {
      const elapsed = performance.now() - start;
      const pct = Math.min(100, Math.round((elapsed / durationMs) * 100));
      setAiToastProgress(pct);
      if (elapsed < durationMs) {
        rafId = window.requestAnimationFrame(tick);
      } else {
        setAiToastCollapsed(true);
      }
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [aiToastRunId, showAiModal, aiSuggestion]);

  const sourceOptions = ["all", ...sources];
  const driveOptions = ["all", ...availableDriveTypes];

  const loadCaptchaScript = (provider: CaptchaProvider) =>
    new Promise<void>((resolve, reject) => {
      const id =
        provider === "turnstile"
          ? "cf-turnstile-script"
          : provider === "hcaptcha"
            ? "hcaptcha-script"
            : "";
      if (!id) return resolve();
      if (document.getElementById(id)) return resolve();
      const script = document.createElement("script");
      script.id = id;
      script.async = true;
      script.defer = true;
      script.src =
        provider === "turnstile"
          ? "https://challenges.cloudflare.com/turnstile/v0/api.js"
          : "https://js.hcaptcha.com/1/api.js";
      script.onload = () => resolve();
      script.onerror = (e) => reject(e);
      document.body.appendChild(script);
    });

  const renderCaptcha = async () => {
    const provider = CAPTCHA_PROVIDER;
    if (provider === "none") {
      captchaTokenRef.current = "skip";
      setShowCaptchaModal(false);
      return;
    }
    
    try {
      await loadCaptchaScript(provider);
      if (!captchaContainerRef.current) return;

      // 清空容器
      captchaContainerRef.current.innerHTML = "";

      if (provider === "turnstile") {
        if (window.turnstile) {
          window.turnstile.render(captchaContainerRef.current, {
            sitekey: TURNSTILE_SITE_KEY,
            callback: (token: string) => {
              console.log("[Captcha] Turnstile success, token:", token?.slice(0, 10) + "...");
              captchaTokenRef.current = token;
              setShowCaptchaModal(false);
              performSearch(token);
            },
            "error-callback": () => {
               setCaptchaLoading(false);
            },
            "expired-callback": () => {
               setCaptchaLoading(false);
            },
            theme: "auto",
          });
          setCaptchaLoading(false);
        }
      } else if (provider === "hcaptcha") {
        if (window.hcaptcha) {
          window.hcaptcha.render(captchaContainerRef.current, {
            sitekey: HCAPTCHA_SITE_KEY,
            callback: (token: string) => {
              console.log("[Captcha] hCaptcha success, token:", token?.slice(0, 10) + "...");
              captchaTokenRef.current = token;
              setShowCaptchaModal(false);
              performSearch(token);
            },
          });
          setCaptchaLoading(false);
        }
      }
    } catch (error) {
      console.error("Failed to render captcha", error);
      setCaptchaLoading(false);
    }
  };

  const renderPagination = (isTop: boolean) => {
    if (totalPages <= 1) return null;
    const goTo = (page: number) => {
      const target = Math.min(Math.max(page, 1), totalPages);
      setCurrentPage(target);
      if (!isTop && typeof window !== "undefined") {
        requestAnimationFrame(() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      }
    };

    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + 4);
    const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

    return (
      <div className={`flex flex-col items-center gap-4 ${isTop ? "mb-6" : "mt-6"}`}>
        <div className="hidden md:flex items-center justify-center gap-3">
          <button
            onClick={() => goTo(currentPage - 1)}
            disabled={currentPage === 1}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-sm disabled:opacity-50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {t.search.prevPage}
          </button>

          {pages.map((p) => (
            <button
              key={p}
              onClick={() => goTo(p)}
              className={`px-3 py-1.5 rounded-lg border text-sm ${
                p === currentPage
                  ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white"
                  : "border-neutral-200 dark:border-neutral-800 hover:border-indigo-500"
              }`}
            >
              {p}
            </button>
          ))}

          <button
            onClick={() => goTo(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-sm disabled:opacity-50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            {t.search.nextPage}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="md:hidden flex flex-col items-center gap-4 w-full">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {pages.map((p) => (
              <button
                key={p}
                onClick={() => goTo(p)}
                className={`px-3 py-1.5 rounded-lg border text-sm ${
                  p === currentPage
                    ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white"
                    : "border-neutral-200 dark:border-neutral-800 hover:border-indigo-500"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-center gap-4 w-full max-w-xs">
            <button
              onClick={() => goTo(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex-1 inline-flex items-center justify-center gap-1 px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 text-sm disabled:opacity-50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> {t.search.prevPage}
            </button>
            <button
              onClick={() => goTo(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="flex-1 inline-flex items-center justify-center gap-1 px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 text-sm disabled:opacity-50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              {t.search.nextPage} <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const supportedDrives = [
    { name: t.drives.baidu, icon: HardDrive },
    { name: t.drives.aliyun, icon: HardDrive },
    { name: t.drives.quark, icon: HardDrive },
    { name: t.drives.tianyi, icon: HardDrive },
    { name: t.drives.pan115, icon: HardDrive },
    { name: t.drives.xunlei, icon: HardDrive },
    { name: t.drives.uc, icon: HardDrive },
    { name: t.drives.yidong, icon: HardDrive },
    { name: t.drives.pikpak, icon: HardDrive },
    { name: t.drives.pan123, icon: HardDrive },
    { name: t.drives.google, icon: HardDrive },
    { name: t.drives.magnet, icon: Magnet },
    { name: t.drives.ed2k, icon: LinkIcon },
  ];

  return (
    <main className="min-h-screen bg-white dark:bg-black text-black dark:text-white overflow-x-hidden selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
      <AnimatePresence>
        {errorModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setErrorModal(null)}
            />
            <motion.div
              className="relative z-10 w-full max-w-3xl"
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
            >
              <div className="mx-auto rounded-[40px] bg-white/70 dark:bg-black/70 backdrop-blur-2xl shadow-2xl border border-white/40 dark:border-white/10 px-8 py-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                      <AlertCircle className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">{t.search.errors.title}</p>
                      <p className="text-xl font-semibold text-neutral-900 dark:text-white">{t.search.errors.headline}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setErrorModal(null)}
                    className="p-2 rounded-full bg-white/60 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 transition-colors border border-white/40 dark:border-white/10"
                    aria-label={t.search.errors.close}
                  >
                    <X className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
                  </button>
                </div>
                <p className="text-base text-neutral-700 dark:text-neutral-200 leading-relaxed">{errorModal.translation}</p>
                {errorModal.details && (
                  <div className="mt-4 text-sm text-neutral-600 dark:text-neutral-300">
                    <p className="font-semibold uppercase tracking-[0.2em] text-xs text-neutral-500">{t.search.errors.detailsLabel}</p>
                    <p className="mt-1 break-words bg-white/60 dark:bg-white/5 rounded-2xl px-4 py-3 border border-white/60 dark:border-white/10 text-neutral-700 dark:text-neutral-100">
                      {errorModal.details}
                    </p>
                  </div>
                )}
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setErrorModal(null)}
                    className="px-6 py-2 rounded-full bg-black text-white dark:bg-white dark:text-black font-semibold text-sm hover:opacity-90 transition-opacity"
                  >
                    {t.search.errors.close}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCaptchaModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCaptchaModal(false)}
            />
            <motion.div
              className="relative z-10 w-full max-w-lg"
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
            >
              <div className="mx-auto rounded-[32px] bg-white/80 dark:bg-black/80 backdrop-blur-2xl shadow-2xl border border-white/40 dark:border-white/10 px-6 py-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">{t.search.captcha.title}</p>
                    <p className="text-xl font-semibold text-neutral-900 dark:text-white">{t.search.captcha.description}</p>
                  </div>
                  <button
                    onClick={() => setShowCaptchaModal(false)}
                    className="p-2 rounded-full bg-white/60 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 transition-colors border border-white/40 dark:border-white/10"
                    aria-label="关闭"
                  >
                    <X className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
                  </button>
                </div>
                <div className="flex justify-center relative min-h-[80px]">
                  {captchaLoading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-neutral-500" />
                    </div>
                  )}
                  <div ref={captchaContainerRef} className="min-h-[80px] w-full flex justify-center" />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      <AnimatePresence>
        {showAiModal && aiSuggestion && (
          <div className="fixed top-0 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-2xl">
            <motion.div
              key="ai-toast"
              initial={{ opacity: 0, y: -8, height: 8 }}
              animate={{
                opacity: 1,
                y: aiToastCollapsed ? 0 : 72,
                height: aiToastCollapsed ? 8 : "auto",
              }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.08, ease: "easeOut" }}
              className={`overflow-hidden rounded-2xl bg-white/90 dark:bg-black/85 backdrop-blur-xl shadow-xl border border-neutral-200 dark:border-neutral-800 ${
                aiToastCollapsed ? "pointer-events-none" : "pointer-events-auto"
              }`}
            >
              <div className="h-1.5 w-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                <div
                  className="h-full bg-black dark:bg-white transition-[width] duration-200"
                  style={{ width: `${aiToastProgress}%` }}
                />
              </div>

              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 text-sm font-semibold text-neutral-900 dark:text-white text-center">
                    {t.search.suggest.modalTitle}
                  </div>
                  <button
                    onClick={() => setShowAiModal(false)}
                    className="p-1.5 rounded-full border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 text-center">{t.search.suggest.modalDesc}</p>

                <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-white/5 p-4 space-y-3">
                  <div className="space-y-2">
                    {aiSuggestion.best_query && (
                      <div className="text-base font-semibold text-neutral-900 dark:text-white">
                        {t.search.suggest.recommend}: <span className="text-indigo-600 dark:text-indigo-400">{aiSuggestion.best_query}</span>
                      </div>
                    )}
                    {Array.isArray(aiSuggestion.alternates) && aiSuggestion.alternates.length > 0 && (
                      <div className="text-sm text-neutral-600 dark:text-neutral-300">
                        {aiSuggestion.alternates.join(" · ")}
                      </div>
                    )}
                    {aiSuggestion.reason && (
                      <p className="text-xs text-neutral-500 leading-relaxed">{aiSuggestion.reason}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-center gap-3 mt-2 flex-wrap">
                    <button
                      onClick={() => applySuggestionToQuery()}
                      className="min-w-[140px] px-5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-sm hover:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t.search.suggest.apply}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showAiModal && aiSuggestion && aiToastCollapsed && (
        <button
          type="button"
          onClick={() => setAiToastCollapsed(false)}
          className="fixed top-16 left-1/2 -translate-x-1/2 translate-y-1/2 z-40 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/90 dark:bg-black/85 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 shadow-lg hover:text-neutral-900 dark:hover:text-white"
          aria-label="展开 AI 推荐"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      )}

      <AnimatePresence>
        {showSourcePicker && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSourcePicker(false)}
            />
            <motion.div
              className="relative z-10 w-full max-w-lg"
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
            >
              <div className="mx-auto rounded-[32px] bg-white/90 dark:bg-black/80 backdrop-blur-2xl shadow-2xl border border-white/40 dark:border-white/10 px-6 py-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-lg font-semibold text-neutral-900 dark:text-white">{t.search.selectSource}</p>
                  <button
                    onClick={() => setShowSourcePicker(false)}
                    className="p-2 rounded-full bg-white/60 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 transition-colors border border-white/40 dark:border-white/10"
                    aria-label={t.search.cancel}
                  >
                    <X className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {sourceOptions.map((src) => (
                    <button
                      key={src || "all"}
                      onClick={() => {
                        setSelectedSource(src || "all");
                        setShowSourcePicker(false);
                      }}
                      className={`px-2 py-1.5 rounded-lg border text-xs sm:text-sm text-left ${
                        selectedSource === src || (src === "all" && selectedSource === "all")
                          ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white"
                          : "border-neutral-200 dark:border-neutral-800 hover:border-indigo-500"
                      }`}
                    >
                      {src === "all" ? t.search.allSources : src}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDrivePicker && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDrivePicker(false)}
            />
            <motion.div
              className="relative z-10 w-full max-w-lg"
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
            >
              <div className="mx-auto rounded-[32px] bg-white/90 dark:bg-black/80 backdrop-blur-2xl shadow-2xl border border-white/40 dark:border-white/10 px-6 py-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-lg font-semibold text-neutral-900 dark:text-white">{t.search.selectDrive}</p>
                  <button
                    onClick={() => setShowDrivePicker(false)}
                    className="p-2 rounded-full bg-white/60 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 transition-colors border border-white/40 dark:border-white/10"
                    aria-label={t.search.cancel}
                  >
                    <X className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {driveOptions.map((type) => (
                    <button
                      key={type || "all"}
                      onClick={() => {
                        setSelectedDrive(type || "all");
                        setShowDrivePicker(false);
                      }}
                      className={`px-2 py-1.5 rounded-lg border text-xs sm:text-sm text-left ${
                        selectedDrive === type || (type === "all" && selectedDrive === "all")
                          ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white"
                          : "border-neutral-200 dark:border-neutral-800 hover:border-indigo-500"
                      }`}
                    >
                      {type === "all" ? t.search.selectDrive : driveLabels[type]}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Navbar />
      
      <Hero>
        <form onSubmit={handleSearch} className="relative w-full" id="search-anchor-inline">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
            <div className="relative bg-white dark:bg-neutral-900 rounded-2xl shadow-xl flex items-center p-2 border border-neutral-200 dark:border-neutral-800 transition-colors">
              <Search className="ml-4 text-neutral-400 w-6 h-6" />
              <input 
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.search.placeholder}
                className="w-full bg-transparent border-none focus:outline-none px-4 py-3 text-lg placeholder:text-neutral-400 dark:placeholder:text-neutral-600 text-black dark:text-white"
              />
              <button 
                type="submit"
                disabled={loading}
                className="bg-black text-white dark:bg-white dark:text-black px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="animate-spin w-5 h-5" />
                ) : (
                  <span className="whitespace-nowrap">{t.search.cta}</span>
                )}
              </button>
            </div>
          </div>
          

          {/* Loading Animation */}
          <AnimatePresence>
            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 mt-4 flex items-center justify-center gap-2 text-neutral-500"
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm font-medium animate-pulse">{t.search.loading}</span>
              </motion.div>
            )}
          </AnimatePresence>
          
        </form>
      </Hero>

      <AnimatePresence>
        {hasSearched && !starCollapsed ? (
          <motion.div
            key="star-card"
            className="fixed right-4 bottom-4 z-40 w-[92%] max-w-xs md:w-[320px] rounded-2xl bg-white/90 dark:bg-black/85 backdrop-blur-xl shadow-xl border border-neutral-200 dark:border-neutral-800 p-4"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-sm font-semibold text-neutral-900 dark:text-white">{t.search.starCallout}</div>
            <a
              href="https://github.com/maishaninc/limitless-search"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center justify-center w-full rounded-lg bg-black text-white dark:bg-white dark:text-black text-sm font-semibold px-4 py-2 hover:opacity-90"
            >
              {t.search.starCta}
            </a>
            <div className="mt-3 h-1.5 w-full rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
              <div
                className="h-full bg-black dark:bg-white transition-[width] duration-200"
                style={{ width: `${starProgress}%` }}
              />
            </div>
          </motion.div>
        ) : hasSearched ? (
          <motion.a
            key="star-icon"
            href="https://github.com/maishaninc/limitless-search"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className="fixed right-4 bottom-4 z-40 h-12 w-12 rounded-full bg-white/90 dark:bg-black/85 backdrop-blur-xl shadow-xl border border-neutral-200 dark:border-neutral-800 inline-flex items-center justify-center text-neutral-900 dark:text-white"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25 }}
          >
            <Github className="w-5 h-5" />
          </motion.a>
        ) : null}
      </AnimatePresence>

      {/* Results Section */}
      <section className="container mx-auto px-4 pb-20">
        <AnimatePresence mode="wait">
          {hasSearched && !loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="bg-white/80 dark:bg-neutral-900/70 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-lg">
                <div className="flex flex-col gap-4 mb-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-2xl font-bold">
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                      {t.search.resultsCount.replace("{count}", filteredResults.length.toString())}
                    </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-600 dark:text-neutral-300">
                    <span className="px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                        {t.search.statsPlatformsLabel}：{sources.length}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                        {t.search.statsIpLabel}：{stats?.clientIp || t.search.statsNotProvided}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                        {t.search.statsCountryLabel}：{stats?.country || t.search.statsNotProvided}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                        {t.search.statsLatencyLabel}：{stats ? `${stats.latencyMs}ms` : t.search.statsMeasuring}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-neutral-500" />
                      <button
                        onClick={() => setShowSourcePicker(true)}
                        className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 text-sm hover:border-indigo-500"
                      >
                        {selectedSource === "all" ? t.search.allSources : selectedSource}
                      </button>
                    </div>
                    {availableDriveTypes.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-neutral-500" />
                        <button
                          onClick={() => setShowDrivePicker(true)}
                          className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 text-sm hover:border-indigo-500"
                        >
                          {selectedDrive === "all" ? t.search.selectDrive : driveLabels[selectedDrive]}
                        </button>
                      </div>
                    )}
                    <span className="text-sm text-neutral-500">
                      {t.search.lastUpdated}: {new Date().toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                {/* Filter Tags */}
                <div className="flex flex-wrap items-center gap-2 mb-6">
                  {FILTER_TAGS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                        selectedTags.includes(tag)
                          ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white"
                          : "bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:border-indigo-500"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                {renderPagination(true)}

                {paginatedResults.length > 0 ? (
                  <div className="grid grid-cols-1 gap-6 mt-4">
                  {paginatedResults.map((item, idx) => (
                    <motion.article
                      key={`${item.title}-${(currentPage - 1) * pageSize + idx}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="group bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:bg-white dark:hover:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700"
                    >
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {item.title}
                            </h3>
                            {(item.channel || item.source) && (
                              <button 
                                onClick={() => setSelectedSource(item.channel || item.source || "all")}
                                className="px-2 py-1 rounded-md text-xs font-medium bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors"
                              >
                                {item.channel || item.source}
                              </button>
                            )}
                          </div>
                          
                          {item.datetime && (
                            <div className="flex items-center gap-2 text-xs text-neutral-500">
                              <Clock className="w-3 h-3" />
                              {formatDate(item.datetime)}
                            </div>
                          )}

                          {item.content && (
                            <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed line-clamp-3">
                              {item.content}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-6 flex flex-wrap gap-3">
                        {item.links.length > 0 && item.links.map((link, linkIdx) => (
                          <a
                            key={`${link.url}-${linkIdx}`}
                            href={link.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:shadow-sm min-w-0 w-full sm:w-auto"
                          >
                            <ExternalLink className="w-4 h-4" />
                            <span className="uppercase tracking-wider text-xs font-bold text-neutral-500 group-hover/link:text-indigo-500">
                              {link.type || "LINK"}
                            </span>
                            <span className="max-w-full sm:max-w-[220px] truncate opacity-70 min-w-0">
                                {link.url}
                            </span>
                            {link.password && (
                              <span className="ml-2 flex items-center gap-1 text-xs bg-neutral-100 dark:bg-neutral-900 px-2 py-0.5 rounded text-neutral-600 dark:text-neutral-400">
                                <Lock className="w-3 h-3" />
                                {link.password}
                              </span>
                            )}
                          </a>
                        ))}
                      </div>
                    </motion.article>
                  ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-neutral-500 text-center">
                    <FileText className="w-16 h-16 mb-4 opacity-20" />
                    <p className="text-lg">{t.search.noResults}</p>
                  </div>
                )}

                {renderPagination(false)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Supported Drives Section */}
      <section className="container mx-auto px-4 mb-20">
        <div className="text-center mb-10">
          <h2 className="text-xl font-bold mb-6 text-neutral-400 uppercase tracking-widest text-sm">{t.drives.title}</h2>
          <div className="flex flex-wrap justify-center gap-4 md:gap-8">
            {supportedDrives.map((drive, index) => (
              <div key={index} className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors">
                <drive.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{drive.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <About />
      <Footer />

    </main>
  );
}
