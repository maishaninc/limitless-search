import { promises as fs } from "fs";
import path from "path";
import { rankingsEnabled } from "@/lib/rankings-config";

export type RankingLocale = "zh-CN" | "zh-TW" | "en" | "ja" | "ru" | "fr";
export type RankingKey = "yearly" | "monthly" | "daily";

export type RankingTitles = Record<RankingLocale, string>;

export type RankingItem = {
  id: string;
  query: string;
  score: number;
  titles: RankingTitles;
};

export type RankingBucket = {
  key: RankingKey;
  generatedAt: string;
  total: number;
  items: RankingItem[];
};

export type RankingDataset = {
  generatedAt: string;
  year: number;
  month: number;
  rankings: Record<RankingKey, RankingBucket>;
};

type AiGeneratedItem = {
  query?: string;
  score?: number;
};

type AiGeneratedList = {
  items?: AiGeneratedItem[];
};

type ModerationResult = {
  blocked?: string[];
};

type ScoreResult = {
  items?: Array<{
    query?: string;
    score?: number;
  }>;
};

type TranslationResult = {
  items?: Array<{
    query?: string;
    titles?: Partial<RankingTitles>;
  }>;
};

const localeList: RankingLocale[] = ["zh-CN", "zh-TW", "en", "ja", "ru", "fr"];

const normalizeScore = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value * 10) / 10));
};

const toId = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[-\s]+/g, "-") || "anime";

const uniqueByQuery = (items: RankingItem[]) => {
  const map = new Map<string, RankingItem>();

  for (const item of items) {
    const key = item.query.trim().toLowerCase();
    if (!key) continue;
    if (!map.has(key)) {
      map.set(key, item);
    }
  }

  return Array.from(map.values());
};

const getRuntimeDate = (date = new Date(), timeZone = process.env.AI_RANKINGS_TIMEZONE || "Asia/Shanghai") => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
  };
};

export const getRankingDataFile = () => {
  const baseDir = process.env.AI_RANKINGS_DATA_DIR || path.join(process.cwd(), "data", "rankings");
  return path.join(baseDir, "latest.json");
};

export const getRankingLandingUrls = (dataset: RankingDataset) => {
  const items = uniqueByQuery(
    Object.values(dataset.rankings).flatMap((bucket) => bucket.items),
  );

  return items.map((item) => `/?q=${encodeURIComponent(item.query)}&auto=1`);
};

export const readRankingDataset = async (): Promise<RankingDataset | null> => {
  try {
    const content = await fs.readFile(getRankingDataFile(), "utf8");
    return JSON.parse(content) as RankingDataset;
  } catch {
    return null;
  }
};

const writeRankingDataset = async (dataset: RankingDataset) => {
  const filePath = getRankingDataFile();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(dataset, null, 2), "utf8");
};

const safeJsonParse = (input: string) => {
  try {
    return input ? JSON.parse(input) : null;
  } catch {
    return null;
  }
};

const getAiConfig = () => ({
  baseUrl: (process.env.AI_RANKINGS_BASE_URL || process.env.AI_SUGGEST_BASE_URL || "").replace(/\/$/, ""),
  model: process.env.AI_RANKINGS_MODEL || process.env.AI_SUGGEST_MODEL || "",
  apiKey: process.env.AI_RANKINGS_API_KEY || process.env.AI_SUGGEST_API_KEY || "",
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const callAiJson = async <T>(systemPrompt: string, userPrompt: string): Promise<T> => {
  const { baseUrl, model, apiKey } = getAiConfig();
  if (!baseUrl || !model || !apiKey) {
    throw new Error("AI rankings configuration missing");
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.3,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
        cache: "no-store",
      });

      const text = await response.text();
      if (!response.ok) {
        throw new Error(text || `AI rankings request failed on attempt ${attempt}`);
      }

      const parsed = safeJsonParse(text) as any;
      const content = parsed?.choices?.[0]?.message?.content || text;
      const json = typeof content === "string" ? safeJsonParse(content) : content;
      if (!json || typeof json !== "object") {
        throw new Error(`AI rankings returned invalid JSON on attempt ${attempt}`);
      }

      return json as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("AI rankings request failed");
      if (attempt < 3) {
        await sleep(attempt * 1200);
      }
    }
  }

  throw lastError || new Error("AI rankings request failed after 3 attempts");
};

const defaultListPrompt = (label: string, minItems: number, year: number, month: number) =>
  [
    "You are an anime ranking researcher.",
    "Focus on Japanese anime first and Mainland Chinese animation second.",
    "Return strict JSON only in shape {\"items\":[{\"query\":string,\"score\":number}] }.",
    `Generate at least ${minItems} items for ${label}.`,
    `Current year is ${year}, current month is ${month}.`,
    "Only include anime titles. No live action, no games, no adult content, no illegal phrases.",
    "query must be a concise search-friendly title.",
    "score must be 0-100 and reflect heat/attention.",
  ].join(" ");

const defaultModerationPrompt =
  "You are a safety and compliance reviewer. Return strict JSON only in shape {\"blocked\":[string]}. Block titles that are illegal, pornographic, hateful, violent-extremist, scam-like, or clearly unrelated to anime. If all are safe return an empty array.";

const defaultTranslationPrompt =
  "You are a multilingual anime title translator. Return strict JSON only in shape {\"items\":[{\"query\":string,\"titles\":{\"zh-CN\":string,\"zh-TW\":string,\"en\":string,\"ja\":string,\"ru\":string,\"fr\":string}}]}. Translate titles naturally and keep official names where appropriate.";

const defaultScorePrompt =
  "You are an anime ranking score normalizer. Return strict JSON only in shape {\"items\":[{\"query\":string,\"score\":number}]}. Normalize duplicated or cross-list titles so the same title has one consistent final score from 0 to 100.";

const getPrompt = (name: string, fallback: string) => process.env[name]?.trim() || fallback;

const targetItemCount = (minItems: number) => Math.max(20, minItems);

const mergeCandidateItems = (
  current: Array<{ query: string; score: number }>,
  incoming: AiGeneratedItem[],
  limit: number,
) => {
  const map = new Map<string, { query: string; score: number }>();

  for (const item of current) {
    const query = item.query.trim();
    if (!query) continue;
    map.set(query.toLowerCase(), { query, score: normalizeScore(item.score) });
  }

  for (const item of incoming) {
    const query = (item.query || "").trim();
    if (!query) continue;

    const key = query.toLowerCase();
    const nextScore = normalizeScore(Number(item.score ?? 0));
    const existing = map.get(key);

    if (!existing) {
      map.set(key, { query, score: nextScore });
      continue;
    }

    if (nextScore > existing.score) {
      map.set(key, { query: existing.query, score: nextScore });
    }
  }

  return Array.from(map.values()).slice(0, limit);
};

const fillRankingList = async (key: RankingKey, year: number, month: number, minItems: number) => {
  const limit = targetItemCount(minItems);
  let items = sanitizeGeneratedItems((await generateRawList(key, year, month, limit)).items || [], limit);
  const maxAttempts = 4;

  for (let attempt = 1; attempt < maxAttempts && items.length < limit; attempt += 1) {
    const missing = limit - items.length;
    const existingQueries = items.map((item) => item.query);
    const label =
      key === "yearly"
        ? `${year} upcoming anime ranking`
        : key === "monthly"
          ? `${month} monthly seasonal anime ranking`
          : "today anime hot ranking";

    const refillPrompt = getPrompt(
      key === "yearly"
        ? "AI_RANKINGS_PROMPT_YEARLY"
        : key === "monthly"
          ? "AI_RANKINGS_PROMPT_MONTHLY"
          : "AI_RANKINGS_PROMPT_DAILY",
      defaultListPrompt(label, limit, year, month),
    );

    const refill = await callAiJson<AiGeneratedList>(
      refillPrompt,
      JSON.stringify({
        year,
        month,
        minItems: limit,
        label,
        refillOnly: true,
        missing,
        exclude: existingQueries,
        instruction:
          "Return only new anime titles not present in exclude. Do not repeat any existing title. Keep returning enough new anime to reach the target count.",
      }),
    );

    items = mergeCandidateItems(items, refill.items || [], limit);
  }

  return items.slice(0, limit);
};

const generateRawList = async (key: RankingKey, year: number, month: number, minItems: number) => {
  const label =
    key === "yearly"
      ? `${year} upcoming anime ranking`
      : key === "monthly"
        ? `${month} monthly seasonal anime ranking`
        : "today anime hot ranking";

  const systemPrompt = getPrompt(
    key === "yearly"
      ? "AI_RANKINGS_PROMPT_YEARLY"
      : key === "monthly"
        ? "AI_RANKINGS_PROMPT_MONTHLY"
        : "AI_RANKINGS_PROMPT_DAILY",
    defaultListPrompt(label, minItems, year, month),
  );

  const userPrompt = JSON.stringify({ year, month, minItems, label });
  return callAiJson<AiGeneratedList>(systemPrompt, userPrompt);
};

const moderateQueries = async (queries: string[]) => {
  const systemPrompt = getPrompt("AI_RANKINGS_PROMPT_MODERATION", defaultModerationPrompt);
  const result = await callAiJson<ModerationResult>(systemPrompt, JSON.stringify({ queries }));
  return new Set((result.blocked || []).map((entry) => entry.trim().toLowerCase()));
};

const unifyScores = async (queries: string[], scoreMap: Record<string, number>) => {
  const systemPrompt = getPrompt("AI_RANKINGS_PROMPT_SCORE", defaultScorePrompt);
  const result = await callAiJson<ScoreResult>(systemPrompt, JSON.stringify({ items: queries.map((query) => ({ query, score: scoreMap[query] ?? 0 })) }));
  const next = new Map<string, number>();

  for (const item of result.items || []) {
    const query = (item.query || "").trim();
    if (!query) continue;
    next.set(query, normalizeScore(Number(item.score ?? 0)));
  }

  return next;
};

const translateQueries = async (queries: string[]) => {
  const systemPrompt = getPrompt("AI_RANKINGS_PROMPT_TRANSLATE", defaultTranslationPrompt);
  const result = await callAiJson<TranslationResult>(systemPrompt, JSON.stringify({ queries, locales: localeList }));
  const next = new Map<string, RankingTitles>();

  for (const item of result.items || []) {
    const query = (item.query || "").trim();
    if (!query) continue;
    next.set(query, {
      "zh-CN": item.titles?.["zh-CN"] || query,
      "zh-TW": item.titles?.["zh-TW"] || item.titles?.["zh-CN"] || query,
      en: item.titles?.en || query,
      ja: item.titles?.ja || query,
      ru: item.titles?.ru || query,
      fr: item.titles?.fr || query,
    });
  }

  return next;
};

const sanitizeGeneratedItems = (items: AiGeneratedItem[], minItems: number) => {
  const map = new Map<string, { query: string; score: number }>();

  for (const item of items) {
    const query = (item.query || "").trim();
    if (!query) continue;
    if (!map.has(query)) {
      map.set(query, { query, score: normalizeScore(Number(item.score ?? 0)) });
    }
  }

  return Array.from(map.values()).slice(0, targetItemCount(minItems));
};

export const generateRankings = async () => {
  const minItems = targetItemCount(Number(process.env.AI_RANKINGS_MIN_ITEMS || 20));
  const { year, month } = getRuntimeDate();

  const [yearlyItems, monthlyItems, dailyItems] = await Promise.all([
    fillRankingList("yearly", year, month, minItems),
    fillRankingList("monthly", year, month, minItems),
    fillRankingList("daily", year, month, minItems),
  ]);

  const rawLists = {
    yearly: yearlyItems,
    monthly: monthlyItems,
    daily: dailyItems,
  } satisfies Record<RankingKey, Array<{ query: string; score: number }>>;

  const allQueries = Array.from(new Set(Object.values(rawLists).flatMap((list) => list.map((item) => item.query))));
  const blocked = await moderateQueries(allQueries);
  const filteredLists = Object.fromEntries(
    Object.entries(rawLists).map(([key, items]) => [
      key,
      items.filter((item) => !blocked.has(item.query.trim().toLowerCase())),
    ]),
  ) as Record<RankingKey, Array<{ query: string; score: number }>>;

  const baseScoreMap = Object.values(filteredLists)
    .flat()
    .reduce<Record<string, number>>((acc, item) => {
      acc[item.query] = Math.max(acc[item.query] ?? 0, item.score);
      return acc;
    }, {});

  const uniqueQueries = Object.keys(baseScoreMap);
  const [normalizedScores, translations] = await Promise.all([
    unifyScores(uniqueQueries, baseScoreMap),
    translateQueries(uniqueQueries),
  ]);

  const generatedAt = new Date().toISOString();
  const buildBucket = (key: RankingKey): RankingBucket => {
    const items = filteredLists[key]
      .map((item) => {
        const score = normalizedScores.get(item.query) ?? item.score;
        const titles = translations.get(item.query) || {
          "zh-CN": item.query,
          "zh-TW": item.query,
          en: item.query,
          ja: item.query,
          ru: item.query,
          fr: item.query,
        };

        return {
          id: toId(item.query),
          query: item.query,
          score: normalizeScore(score),
          titles,
        } satisfies RankingItem;
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, targetItemCount(minItems));

    return {
      key,
      generatedAt,
      total: items.length,
      items,
    };
  };

  return {
    generatedAt,
    year,
    month,
    rankings: {
      yearly: buildBucket("yearly"),
      monthly: buildBucket("monthly"),
      daily: buildBucket("daily"),
    },
  } satisfies RankingDataset;
};

export const generateAndStoreRankings = async () => {
  const dataset = await generateRankings();
  await writeRankingDataset(dataset);
  return dataset;
};
